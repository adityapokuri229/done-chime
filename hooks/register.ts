import type { Register } from 'claude-code'

// Each platform's own built-in sound, tried in order until one plays: no file ships with the mod.
const LINUX_SOUND = '/usr/share/sounds/freedesktop/stereo/complete.oga'
const PLAYERS: Record<'mac' | 'windows' | 'linux', string[][]> = {
  mac: [['afplay', '/System/Library/Sounds/Glass.aiff']],
  windows: [['powershell', '-NoProfile', '-Command', "(New-Object Media.SoundPlayer 'C:\\Windows\\Media\\chimes.wav').PlaySync()"]],
  linux: [['paplay', LINUX_SOUND], ['pw-play', LINUX_SOUND], ['canberra-gtk-play', '-i', 'complete']],
}

const platformOf = async ($: any): Promise<'mac' | 'windows' | 'linux'> => {
  if ((await $.env.get('OS').catch(() => undefined)) === 'Windows_NT') return 'windows'
  const home = (await $.env.get('HOME').catch(() => undefined)) ?? ''
  return home.startsWith('/Users/') ? 'mac' : 'linux'
}

// Tries this platform's players in order until one plays.
const chime = async ($: any): Promise<void> => {
  for (const argv of PLAYERS[await platformOf($)]) {
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
      description: 'Chime when Claude finishes',
      argumentHint: 'on | off | always | long | custom <seconds>',
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
