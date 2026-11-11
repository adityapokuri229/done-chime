import type { Register } from 'claude-code'

// Each platform's own built-in sound, tried in order until one plays: no file ships with the mod.
const PLAYERS: string[][] = [
  ['afplay', '/System/Library/Sounds/Glass.aiff'], // macOS
  ['paplay', '/usr/share/sounds/freedesktop/stereo/complete.oga'], // Linux (PulseAudio / PipeWire)
  ['pw-play', '/usr/share/sounds/freedesktop/stereo/complete.oga'], // Linux (PipeWire)
  ['canberra-gtk-play', '-i', 'complete'], // Linux (desktop sound theme)
]
const WINDOWS = ['powershell', '-NoProfile', '-Command', "(New-Object Media.SoundPlayer 'C:\\Windows\\Media\\chimes.wav').PlaySync()"]

const chime = async ($: any): Promise<void> => {
  const isWindows = (await $.env.get('OS').catch(() => undefined)) === 'Windows_NT'
  for (const argv of isWindows ? [WINDOWS] : PLAYERS) {
    const r = await $.process.run(argv, { timeoutMs: 10_000 }).catch(() => null)
    if (r && r.exitCode === 0) return
  }
}
const LONG_MS = 20_000
const getLongMs = async ($: any): Promise<number> => {
  const v = await $.store.get('longMs').catch(() => undefined)
  return typeof v === 'number' && v > 0 ? v : LONG_MS
}

const getMode = async ($: any): Promise<'always' | 'long'> =>
  (await $.store.get('mode').catch(() => undefined)) === 'long' ? 'long' : 'always'
const isOn = async ($: any): Promise<boolean> =>
  (await $.store.get('on').catch(() => undefined)) !== false

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'done-chime',
      description: 'Chime when Claude finishes: on, off, always, long, custom <seconds>',
    })
    return next(e)
  })

  on('command.run', { command: 'done-chime' }, async ($, e) => {
    const arg = (e.args ?? '').trim().toLowerCase()
    if (arg === 'on' || arg === 'off') await $.store.set('on', arg === 'on')
    else if (arg === 'always' || arg === 'long') await $.store.set('mode', arg)
    else if (arg.startsWith('custom')) {
      const secs = Number(arg.slice(6).trim())
      if (!Number.isFinite(secs) || secs <= 0) return { text: 'Usage: /done-chime custom <seconds>, e.g. /done-chime custom 30' }
      await $.store.set('longMs', Math.round(secs * 1000))
      await $.store.set('mode', 'long')
    } else if (arg) return { text: 'Usage: /done-chime on | off | always | long | custom <seconds>' }
    const mode = await getMode($)
    const longMs = await getLongMs($)
    const state = (await isOn($)) ? 'on' : 'off'
    return { text: `done-chime is ${state}, mode ${mode}${mode === 'long' ? ` (turns over ${longMs / 1000}s)` : ''}.` }
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (!e.agentId && e.reason === 'answer' && (await isOn($))) {
      if ((await getMode($)) === 'always' || e.durationMs >= (await getLongMs($))) {
        void chime($)
      }
    }
    return result
  })
}
