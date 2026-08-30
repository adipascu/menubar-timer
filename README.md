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

---

## How this was built

Every prompt in the session that produced this app, verbatim and in order, typos included.

1. donwload free resources on how to build a saas, and make random important information randomly pop into my coputer via pop ups, similar like clippy, every random idk how long time, when I am active at the computer, and don't have the timer turned on, see menubar timer, actually make this a menubar timer feature, have a stop timer button, and that enables these random popups about how to build a saas, a new claude skill is being built, wait for it to appear, it's the how to publish as a prod app skill invoke it for this project menu bar thimg. Also make it autostart same way like the other app that is built via this productionize app skill, you can talk tha tsession and ask for details, its a sibling session that is active now

2. also make the menu bar clock have a field where I can input what I am working on, it will always show that text, next ot the time

3. also make it ahve two modes of operation, can be toggled, one of them is when I am seeking flow in an active task, meaning I have the popup and the timer also gets triggered, or when off. Basically when on it needs to count down, flash like now when 0, and requires a label for tha tthing I am working on, in this mode it will not shop popups with tips, when timer is off, then it shows the tip popups, it should also show popups with tips when it ran out of time and is staying in a flashing state

4. Also make it show a popup when the timer is off, and the re is a fullscreen window hiding the bar that contains the timer

5. Also render the popups in a way that they are oerlayed on everything, meaning that even whole I switch woindows and am active with the computer this popup will be there untill I dissmiss it by pressing ok, also add a button on it titled something else, make this other button to open a claude code cli session where the initial prompt is the tip, and I can ask followup questions the tip shown, when either button is clicked, the thing dissapears

6. once every week, have the popup instead of showing the usual stuff, have a special one that when acted upon will invoce claude code cli in a way that it will learn things from past weeks or since this was ran claude code sessions, all sessions from disk with relevant dates or last activity, learn what I am doing overall and then adapt the tips to my current situation to drive me to better undertand how to make money with saas, just take me from where I am to where I want to be, this cli code session will aslo ask me questions about my goals, and anything else needed to have better tooltips for me to learn to reach goals and whatever else we talk about in this session, make sure it asks where i struggle as well and take my situation into consideration, make it gather as much context about me as needed to have efficient relevant popups, make sure this is scheduled, once more than 7 days pass, this will be the only popup type shown

7. also add an mcp server that can send notifications to my mobile on command, I think that will be useful later on

   *Two multiple-choice answers followed here, choosing the notification channel and where the server should live. Not counted as prompts.*

8. the tooltips seem to dissapear by themselves very quickly, make sure they work proper

9. use the [ublish app skill that is actively authored, idk if done, wait for the skill to exist first, when it exists, use it to publish the app on my website etc

10. *An unrelated one-line clipboard request about a third party's order. Withheld here rather than published, since it concerns someone who did not agree to appear in this repo. It is counted as a prompt.*

10 prompts. 2 multiple-choice answers. 0 lines of code written or edited by a human.

Redactions: prompt 10 is withheld for the reason given above. Nothing in prompts 1 to 9 needed masking.
