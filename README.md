# TimerBar

A macOS menu bar timer with two modes and a coach that only talks when you are not working.

**Flow mode on.** You give the session a label, it counts down next to that label in the menu bar, and it flashes when you hit zero. No tips interrupt you while the clock is running.

**Flow mode off.** A Clippy-style card slides into the corner every four to twelve minutes with one idea about building a SaaS, drawn from 110 tips distilled from free sources. It sits above every window and every space until you press OK, so it survives switching apps. The second button opens a Claude Code session seeded with that tip so you can argue with it.

Once a week the usual tip is replaced by a tune-up card. Acting on it opens a Claude Code session that reads your recent session transcripts, works out what you have actually been building, interviews you about your goals and where you are stuck, and rewrites the tip pool around your situation. Until you run it, it is the only card you get.

## Where the tips come from

All free, all downloaded and distilled in `resources/`:

| Source | Tips |
| --- | --- |
| [Getting Real](https://basecamp.com/gettingreal), 37signals, all 91 chapters | 88 |
| [Paul Graham essays](https://paulgraham.com/articles.html) | 16 |
| [SaaS Starter Stack](https://github.com/timb-103/saas-starter-stack) | 4 |
| [Open SaaS](https://opensaas.sh/) | 2 |

The corpus itself is not redistributed here. Regenerate it with `python3 resources/fetch.py && python3 resources/extract.py && python3 resources/build-tips.py`, which downloads the sources, strips them to text and rebuilds `src/tips.json`. Every tip keeps its source and a link back, so the provenance is checkable rather than invented.

## The problem it solves

The original app was a countdown and nothing else. The gap it left is that the menu bar is the one surface you stop looking at the moment you stop working, which is exactly when a nudge would land. TimerBar inverts that: it is quiet while the timer runs and only speaks when the timer is off.

That has a measurable failure mode. When another app is fullscreen the menu bar is gone entirely, so the timer is invisible and the app is silently useless. TimerBar detects that case and shows the card anyway.

## Findings worth writing down

- **`workArea` does not change under fullscreen.** The obvious way to detect a hidden menu bar is to compare `screen.getPrimaryDisplay().bounds` with `workArea`. On macOS both are identical whether or not an app is fullscreen (`y: 33, height: 1084` in every state measured), because the values describe the primary space, not the active one. The working detection is an Accessibility query for `AXFullScreen` on the frontmost process's windows.
- **That query costs 464 ms.** Run synchronously on the main process it stalls the countdown and every animation. Measured with a 20 ms interval counter: 20 ticks fired during the check once it was moved to async `execFile`, against the roughly 23 expected, versus a hard stall before. Any AppleScript bridge belongs off the main thread.
- **A tray-only Electron app quits itself the first time a window closes.** With no `window-all-closed` handler, Electron's default is to quit. The app had no windows at all before, so the bug only appeared once the first popup was dismissed, and it took the whole menu bar item with it.
- **`focusable: false` is what makes an interrupting popup tolerable.** The card appears while you are typing. Without it the popup steals the keystroke you were mid-way through.
- **`'screen-saver'` is the always-on-top level that clears fullscreen apps.** `'floating'` is not enough, and `visibleOnFullScreen` has to be set through `setVisibleOnAllWorkspaces`, not the constructor.

## Install

```bash
corepack enable
pnpm install
pnpm start          # run from source
pnpm run build:mac  # produces a dmg in dist/
```

Node 22.x, as pinned in the `engines` field.

Start at login defaults to off. The app offers it once on first run, and it is scriptable:

```bash
/Applications/TimerBar.app/Contents/MacOS/TimerBar --enable-login-item
/Applications/TimerBar.app/Contents/MacOS/TimerBar --disable-login-item
/Applications/TimerBar.app/Contents/MacOS/TimerBar --status
```

The fullscreen card needs Accessibility access in System Settings, Privacy & Security. Everything else works without it, and the log says so when the check is refused.

Logs rotate at 1 MB to `~/Library/Logs/TimerBar.log`.
