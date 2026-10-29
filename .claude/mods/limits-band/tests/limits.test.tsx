import { expect, mock, test } from 'claude-code/testing'

const NOW = Date.parse('2026-10-25T18:00:00Z')

const BAND = {
  plugin: 'limits-band',
  component: 'AbovePrompt',
  props: {
    hasSurvey: false,
    isWorking: false,
    maxRows: 10,
    bodyColumns: 80,
    scroll: { offset: 0, bodyRows: 10 },
    view: {},
  },
} as const

function accountUsage(fiveHour: number, sevenDay: number): string {
  return JSON.stringify({
    five_hour: { utilization: fiveHour, resets_at: '2026-10-25T20:15:00Z' },
    seven_day: { utilization: sevenDay, resets_at: '2026-10-28T22:00:00Z' },
    seven_day_opus: null,
    extra_usage: { is_enabled: false, utilization: null },
  })
}

test('the timer refreshes the account-wide percentages every minute', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })
  let body = accountUsage(30, 50)
  const asked: { url: string; auth?: string }[] = []

  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: NOW, context: { window: 200000 }, rateLimits: [] },
  }))
  on('session.authorize', () => ({ value: { handle: 'h1', kind: 'bearer' } }))
  on('http.fetch', (_, e) => {
    asked.push({ url: e.url, auth: e.init?.auth })
    return { value: { status: 200, ok: true, headers: {}, text: body } }
  })

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await clock.settle()

  expect(asked[0]).toEqual({ url: 'https://api.anthropic.com/api/oauth/usage', auth: 'h1' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ ...BAND, surface })
    expect(await ui.find({ type: 'Text', text: /^70%$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /^50%$/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /сброс через 2ч 15м/ })).toBeDefined()
    await ui.unmount()
  }

  // Another chat spent some of the limit in the meantime.
  body = accountUsage(45, 52)
  await clock.advance(60000)

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /^55%$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^48%$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /сброс через 2ч 14м/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /мин назад/ })).toBeUndefined()
  await ui.unmount()
})

test('without an account reading it shows the session figures and says when they get old', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })

  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.authorize', () => ({ value: null }))
  on('session.usage', () => ({
    value: {
      startedAt: NOW,
      context: { window: 200000 },
      rateLimits: [
        { kind: 'seven_day', percentUsed: 92, resetsAt: '2026-10-28T22:00:00Z' },
        { kind: 'five_hour', percentUsed: 23.5, resetsAt: '2026-10-25T20:15:00Z' },
      ],
    },
  }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await clock.settle()

  let ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /^77%$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^8%$/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /сброс через 3д 4ч/ })).toBeDefined()
  await ui.unmount()

  await clock.advance(3 * 60000)

  ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /данные 3 мин назад/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /сброс через 2ч 12м/ })).toBeDefined()
  await ui.unmount()
})

test('before any reading the band says there is no data yet', async ($, on) => {
  const clock = mock.clock(on, { now: NOW })

  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.authorize', () => ({ value: null }))
  on('session.usage', () => ({
    value: { startedAt: NOW, context: { window: 200000 }, rateLimits: [] },
  }))

  await $.session.start({ cwd: '/', surface: 'desktop', isInteractive: true })
  await clock.settle()

  const ui = await $.ui.mount({ ...BAND, surface: 'desktop' })
  expect(await ui.find({ type: 'Text', text: /данных пока нет/ })).toBeDefined()
  await ui.unmount()
})
