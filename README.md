# done-chime

A Claude Code mod that plays a short chime when Claude finishes answering, so you can switch to another window during a long task and hear when it's done.

It uses no tokens: when a turn ends, it plays your system's own sound locally. It makes no model calls and adds nothing to the prompt.

## Install

At the prompt of a terminal session:

```
/plugin install done-chime --marketplace adityapokuri229/done-chime
```

From a shell:

```bash
claude plugin install done-chime --marketplace adityapokuri229/done-chime
```

In the desktop app: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `adityapokuri229/done-chime`, then **Add plugin**.

## Use

| Command | What it does |
| --- | --- |
| `/done-chime` | Shows the current setting |
| `/done-chime on` / `off` | Turns the chime on or off |
| `/done-chime always` | Chimes after every answer (default) |
| `/done-chime long` | Chimes only after turns of 20 seconds or more |
| `/done-chime custom 30` | Chimes only after turns of 30 seconds or more (any number of seconds) |

Settings are remembered across sessions. It stays quiet for subagents and for turns you interrupt.

## Platforms

It plays a sound already on your system, so nothing extra is needed:

- **macOS:** `afplay` with the Glass sound
- **Windows:** PowerShell with `C:\Windows\Media\chimes.wav`
- **Linux:** `paplay`, `pw-play` or `canberra-gtk-play` with the freedesktop "complete" sound. Minimal installs without a sound theme stay silent.

## License

MIT
