const SEPARATOR = /^\s*=+\s*ТЕКСТ\s+ДЛЯ\s+ОЗВУЧКИ(?=\s|—|–|-|$).*=*\s*$/i;
const HEADER_START = /^\s*=+\s*ГОЛОС(?=\s|—|–|-|\(|$)/i;

/** Количество символов в Unicode code points — так же считает ElevenLabs. */
export function codePointLength(text) {
  return Array.from(String(text ?? '')).length;
}

export function modelSupportsAudioTags(modelId) {
  return modelId === 'eleven_v4' || modelId === 'eleven_v4_turbo' || modelId.startsWith('eleven_v3');
}

export function modelSupportsSsmlBreak(modelId) {
  return !modelSupportsAudioTags(modelId);
}

export function modelSupportsStitching(modelId) {
  // Request stitching не работает для моделей eleven_v3.
  return !modelId.startsWith('eleven_v3');
}

/**
 * Разбирает elevenlabs.txt: отделяет блок «Голос» от текста для озвучки,
 * убирает BOM/CRLF, при необходимости снимает знаки ударения и
 * переводит SSML <break> в аудио-теги для v3/v4.
 */
export function parseElevenlabsText(raw, { stress = 'keep', modelId = 'eleven_v4' } = {}) {
  const warnings = [];
  const normalized = String(raw ?? '')
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n');

  const lines = normalized.split('\n');
  const separatorIndex = lines.findIndex((line) => SEPARATOR.test(line));

  let header = '';
  let body = normalized;

  if (separatorIndex !== -1) {
    header = lines.slice(0, separatorIndex).join('\n');
    body = lines.slice(separatorIndex + 1).join('\n');
  } else if (HEADER_START.test(lines.find((line) => line.trim()) || '')) {
    throw new Error(
      'В файле есть блок «ГОЛОС», но нет разделителя «ТЕКСТ ДЛЯ ОЗВУЧКИ».\n' +
        '      Добавь строку вида: =========== ТЕКСТ ДЛЯ ОЗВУЧКИ — копировать отсюда ===========',
    );
  }

  body = body
    .split('\n')
    .filter((line) => !/^\s*=+\s*$/.test(line))
    .join('\n')
    .trim()
    .replace(/\n{3,}/g, '\n\n');

  if (!body) {
    throw new Error('Текст для озвучки пуст. Проверь elevenlabs.txt и разделитель «ТЕКСТ ДЛЯ ОЗВУЧКИ».');
  }

  const stressCount = (body.match(/[\u0301\u0341]/g) || []).length;
  if (stress === 'strip') {
    body = body.replace(/[\u0301\u0341]/g, '');
    if (stressCount > 0) warnings.push(`Снято знаков ударения: ${stressCount} (--stress strip).`);
  } else if (stressCount > 0) {
    warnings.push(
      `В тексте знаки ударения U+0301 (${stressCount} шт.). ElevenLabs не документирует их поддержку; ` +
        'если в голосе слышны артефакты, запусти с --stress strip.',
    );
  }

  if (modelSupportsAudioTags(modelId) && /<break\b/i.test(body)) {
    const before = body;
    body = body.replace(/<break\s+time\s*=\s*["']?([\d.]+)\s*(ms|s)?["']?\s*\/?>/gi, (_, value, unit) => {
      const seconds = Number(value) * (String(unit).toLowerCase() === 'ms' ? 0.001 : 1);
      if (!Number.isFinite(seconds)) return '[pause]';
      if (seconds >= 1) return '[long pause]';
      if (seconds >= 0.5) return '[pause]';
      return '[short pause]';
    });
    if (body !== before) {
      warnings.push('SSML <break> заменён на аудио-теги: Eleven v3/v4 не поддерживают SSML.');
    }
  }

  if (modelSupportsAudioTags(modelId) && /<\/?(?:phoneme|prosody|emphasis|say-as|voice)\b/i.test(body)) {
    warnings.push('В тексте остались SSML-теги, которые Eleven v3/v4 не поддерживают. Убери их вручную.');
  }

  if (!modelSupportsAudioTags(modelId) && /\[(?:short pause|pause|long pause)\]/i.test(body)) {
    body = body.replace(/\[(short pause|pause|long pause)\]/gi, (_, tag) => {
      const value = String(tag).toLowerCase();
      if (value === 'short pause') return '<break time="0.4s" />';
      if (value === 'long pause') return '<break time="1.5s" />';
      return '<break time="0.8s" />';
    });
    warnings.push(
      `Аудио-теги пауз заменены на SSML <break>: модель ${modelId} не поддерживает теги v3/v4.`,
    );
  }

  const tags = [...new Set([...body.matchAll(/\[([^\[\]\n]{1,60})\]/g)].map((m) => m[1].trim()))];
  if (tags.length > 0 && !modelSupportsAudioTags(modelId)) {
    warnings.push(
      `В тексте есть аудио-теги (${tags.slice(0, 6).join(', ')}), но ${modelId} их не поддерживает — ` +
        'модель может прочитать их вслух.',
    );
  }

  const contentLines = body
    .split('\n')
    .map((line) => line.replace(/\[[^\]]*\]/g, '').replace(/<break\b[^>]*\/?>/gi, '').trim())
    .filter(Boolean);
  const stanzas = body
    .split(/\n\s*\n/)
    .map((stanza) =>
      stanza
        .split('\n')
        .map((line) => line.replace(/\[[^\]]*\]/g, '').replace(/<break\b[^>]*\/?>/gi, '').trim())
        .filter(Boolean),
    )
    .filter((stanza) => stanza.length > 0);

  return {
    header,
    text: body,
    warnings,
    stressCount,
    tags,
    stats: {
      characters: codePointLength(body),
      lines: contentLines.length,
      stanzas: stanzas.length,
    },
  };
}

/** Ищет основной голос в блоке «Голос» elevenlabs.txt. */
export function detectVoice(header) {
  const headerLines = String(header ?? '').split('\n');
  const voiceLine =
    headerLines.find((line) => /^\s*Голос\s*[:：]/i.test(line)) ||
    headerLines.find((line) => /^\s*Voice\s*[:：]/i.test(line)) ||
    '';

  const source = voiceLine || String(header ?? '');
  const idMatch =
    source.match(/\bID(?:\s+голоса)?\s*[:：]\s*([A-Za-z0-9_-]{8,})/i) ||
    source.match(/\bvoice[_-]?id\s*[:=]\s*["']?([A-Za-z0-9_-]{8,})/i) ||
    String(header ?? '').match(/\bvoice[_-]?id\s*[:=]\s*["']?([A-Za-z0-9_-]{8,})/i);

  let name = null;
  if (voiceLine) {
    const match = voiceLine.match(/^\s*(?:Голос|Voice)\s*[:：]\s*(.+?)\s*(?:\(ID\s*[:：]|$)/i);
    if (match) name = match[1].trim();
  }

  return {
    id: idMatch?.[1] || null,
    name,
    line: voiceLine || null,
  };
}

/** Режет текст на куски не длиннее maxChars, стараясь не рвать строки и строфы. */
export function splitText(text, maxChars) {
  const source = String(text ?? '').trim();
  const limit = Math.max(1, Number(maxChars) || 1);
  if (codePointLength(source) <= limit) return source ? [source] : [];

  const chunks = [];
  let current = '';

  const flush = () => {
    const value = current.trim();
    if (value) chunks.push(value);
    current = '';
  };

  for (const stanza of source.split(/\n{2,}/)) {
    const candidate = current ? `${current}\n\n${stanza}` : stanza;
    if (codePointLength(candidate) <= limit) {
      current = candidate;
      continue;
    }

    flush();

    if (codePointLength(stanza) <= limit) {
      current = stanza;
      continue;
    }

    const parts = splitBlock(stanza, limit);
    chunks.push(...parts.slice(0, -1));
    current = parts.at(-1) || '';
  }

  flush();
  return chunks;
}

function splitBlock(block, limit) {
  if (codePointLength(block) <= limit) return [block];

  const lines = block.split('\n');
  if (lines.length > 1) {
    const packed = pack(lines, '\n', limit);
    if (packed.length > 1) return packed;
  }

  const sentences = block.split(/(?<=[.!?…;:])\s+/).filter(Boolean);
  if (sentences.length > 1) {
    const packed = pack(sentences, ' ', limit);
    if (packed.length > 1) return packed;
  }

  const words = block.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const packed = pack(words, ' ', limit);
    if (packed.length > 1) return packed;
  }

  return hardSplit(block, limit);
}

function pack(units, joiner, limit) {
  const out = [];
  let current = '';

  for (const unit of units) {
    if (!unit) continue;
    const candidate = current ? `${current}${joiner}${unit}` : unit;
    if (codePointLength(candidate) <= limit) {
      current = candidate;
      continue;
    }

    if (current) out.push(current);

    if (codePointLength(unit) <= limit) {
      current = unit;
      continue;
    }

    const parts = hardSplit(unit, limit);
    out.push(...parts.slice(0, -1));
    current = parts.at(-1) || '';
  }

  if (current) out.push(current);
  return out;
}

function hardSplit(text, limit) {
  const chars = Array.from(text);
  const out = [];
  for (let i = 0; i < chars.length; i += limit) {
    out.push(chars.slice(i, i + limit).join('').trim());
  }
  return out.filter(Boolean);
}

export function head(text, maxChars) {
  const chars = Array.from(String(text ?? ''));
  return chars.length <= maxChars ? chars.join('') : chars.slice(0, maxChars).join('');
}

export function tail(text, maxChars) {
  const chars = Array.from(String(text ?? ''));
  return chars.length <= maxChars ? chars.join('') : chars.slice(-maxChars).join('');
}
