import { Run } from '../../lib/state.js';

const STATUSES = {
  uploaded: ['uploaded', 'overwritten'],
  skipped: ['skipped'],
  conflicts: ['conflict'],
  failed: ['failed'],
  wouldUpload: ['would-upload', 'would-overwrite'],
  wouldSkip: ['would-skip'],
};

/**
 * Прогон загрузки на Диск: общий Run плюс results[] и totals,
 * по которым человек или агент понимает, что уже загружено.
 */
export class UploadRun extends Run {
  constructor(dir, { source = [], remote = null, dryRun = false } = {}) {
    super(dir, {
      source,
      remote,
      dryRun,
      totals: {
        files: 0,
        bytes: 0,
        uploaded: 0,
        skipped: 0,
        conflicts: 0,
        failed: 0,
        wouldUpload: 0,
        wouldSkip: 0,
      },
      results: [],
    });
  }

  addResult(result) {
    this.data.results.push(result);
    for (const [total, statuses] of Object.entries(STATUSES)) {
      this.data.totals[total] = this.data.results.filter((item) => statuses.includes(item.status)).length;
    }
    this.set({});
  }

  finish({ files, bytes } = {}) {
    if (files !== undefined) this.data.totals.files = files;
    if (bytes !== undefined) this.data.totals.bytes = bytes;
    const failed = this.data.totals.failed > 0 || Boolean(this.data.error);
    this.set({ stage: failed ? 'failed' : 'done' });
  }
}
