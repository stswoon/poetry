import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Limit } from '../types'

// The account-wide figures /usage shows: they count every chat, not just this one.
const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage'
const REFRESH_MS = 60000
const STALE_MINUTES = 3

const limits = atom({ plugin: 'limits-band', key: 'limits' } as const, [])
const now = atom({ plugin: 'limits-band', key: 'now' } as const, 0)
const updatedAt = atom({ plugin: 'limits-band', key: 'updatedAt' } as const, 0)

const NAMES: Record<string, string> = {
  five_hour: '5 ч',
  seven_day: 'неделя',
  seven_day_opus: 'неделя Opus',
  seven_day_sonnet: 'неделя Sonnet',
  spend_limit: 'расходы',
}
const ORDER = Object.keys(NAMES)

export function remaining(limit: Limit): number {
  return Math.max(0, Math.round(100 - limit.percentUsed))
}

export function untilReset(resetsAt: string | undefined, at: number): string {
  const resetMs = resetsAt ? Date.parse(resetsAt) : NaN
  if (Number.isNaN(resetMs)) return ''

  const minutes = Math.max(0, Math.ceil((resetMs - at) / 60000))
  const days = Math.floor(minutes / 1440)
  const hours = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60

  if (days > 0) return `${days}д ${hours}ч`
  if (hours > 0) return `${hours}ч ${mins}м`
  return `${mins}м`
}

// `{ five_hour: { utilization, resets_at }, seven_day: {...}, seven_day_opus: null, ... }`
export function parseAccountUsage(text: string): Limit[] {
  const body: unknown = JSON.parse(text)
  if (typeof body !== 'object' || body === null) return []

  const list: Limit[] = []
  for (const [kind, value] of Object.entries(body)) {
    if (kind === 'extra_usage' || typeof value !== 'object' || value === null) continue

    const { utilization, resets_at } = value as { utilization?: unknown; resets_at?: unknown }
    if (typeof utilization !== 'number') continue

    list.push({
      kind,
      percentUsed: utilization,
      resetsAt: typeof resets_at === 'string' ? resets_at : undefined,
    })
  }

  return sortLimits(list)
}

function sortLimits(list: Limit[]): Limit[] {
  const rank = (kind: string) => {
    const i = ORDER.indexOf(kind)
    return i === -1 ? ORDER.length : i
  }

  return [...list].sort((a, b) => rank(a.kind) - rank(b.kind))
}

// This session's own readings update the windows they name and keep the rest.
function mergeLimits(old: Limit[], fresh: readonly Limit[]): Limit[] {
  const byKind = new Map(old.map(limit => [limit.kind, limit]))
  for (const limit of fresh) {
    byKind.set(limit.kind, { kind: limit.kind, percentUsed: limit.percentUsed, resetsAt: limit.resetsAt })
  }

  return sortLimits([...byKind.values()])
}

async function fetchAccountLimits($: EngineInterface): Promise<Limit[] | null> {
  try {
    const auth = await $.session.authorize()
    if (auth?.kind !== 'bearer') return null

    const res = await $.http.fetch(USAGE_URL, {
      auth: auth.handle,
      headers: { 'anthropic-beta': 'oauth-2025-04-20' },
    })
    if (!res.ok) return null

    const list = parseAccountUsage(res.text)
    return list.length > 0 ? list : null
  } catch {
    return null
  }
}

async function refresh($: EngineInterface): Promise<void> {
  const at = await $.clock.now()
  await update($, now, () => at)

  const account = await fetchAccountLimits($)
  if (account) {
    await update($, limits, () => account)
    await update($, updatedAt, () => at)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const usage = await $.session.usage()
    if (usage.rateLimits.length > 0) {
      await update($, limits, old => mergeLimits(old, usage.rateLimits))
      await update($, updatedAt, () => usage.startedAt)
    }

    void refresh($)
    $.clock.every(REFRESH_MS, () => {
      void refresh($)
    })

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    if (e.changed.includes('rateLimits') && e.rateLimits.length > 0) {
      const at = await $.clock.now()
      await update($, limits, old => mergeLimits(old, e.rateLimits))
      await update($, updatedAt, () => at)
      await update($, now, () => at)
    }

    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) {
      return next(e)
    }

    const { Box, Text } = $.ui.resolve(e)
    const list = await read($, limits)
    const at = await read($, now)
    const updated = await read($, updatedAt)

    if (list.length === 0) {
      return (
        <Box>
          <Text dimColor>Лимиты: данных пока нет — появятся после первого ответа</Text>
        </Box>
      )
    }

    const parts = list.flatMap((limit, i) => {
      const left = remaining(limit)
      const color = left <= 10 ? 'error' : left <= 25 ? 'warning' : undefined
      const reset = untilReset(limit.resetsAt, at)

      return [
        <Text dimColor>{i > 0 ? ' · ' : ''}{NAMES[limit.kind] ?? limit.kind} </Text>,
        <Text color={color} tabular weight="semibold">{left}%</Text>,
        <Text dimColor>{reset ? ` (сброс через ${reset})` : ''}</Text>,
      ]
    })

    const age = updated > 0 ? Math.floor((at - updated) / 60000) : 0

    return (
      <Box>
        <Text>
          <Text dimColor>Осталось: </Text>
          {parts}
          <Text dimColor>{age >= STALE_MINUTES ? ` · данные ${age} мин назад` : ''}</Text>
        </Text>
      </Box>
    )
  })
}
