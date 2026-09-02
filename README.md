# TimerBar

A macOS menu bar timer with two modes and a coach that only talks when you are not working.

In the menu they are one radio group, Freebasing at the top and the eight timer lengths under it, so exactly one is checked at a time. Picking Freebasing stops the timer, running or flashing, and picking a length starts one, which is also how you restart the one already running.

**Timer running.** Pick a length from the menu, five minutes to ninety. You give the session a label, it counts down next to that label in the menu bar, and it flashes when you hit zero. No tips interrupt you while the clock is running.

**Freebasing.** No timer and no goal you are held to, just the coach's cards and whatever the wandering ADHD brain lands on next. It is a mode you pick on purpose rather than the absence of the other one, because creativity tends to come out of that chaos. A Clippy-style card slides into the corner every four to twelve minutes with one idea, drawn from 161 tips distilled from free sources. It sits above every window and every space until you press OK, so it survives switching apps. The second button opens a Claude Code session seeded with that tip so you can argue with it.

Each card carries a beacon along its top edge, there to catch an attention that drifts. It is a small canvas animation in phosphor green, picked at random from Matrix rain, a decode marquee and a port scan log, or a spectrum analyser when something is playing audio at half volume or louder, or at any level through an output that reports no volume of its own. The three random ones invert the whole strip 2.5 times a second and the analyser slams every bar to the top at the same rate. Hover the card and the beacon goes dark so the tip can be read in peace.

![The coach popup cycling through its four beacon animations](docs/coach-popup.gif)

The tips cover three subjects: building a SaaS, the psychology of attention, motivation and habit, and the psychiatry around working with your own head. Cards are drawn so the three stay mixed, roughly one card in three away from SaaS, rather than letting the largest pool crowd out the rest. Each subject seeds a different conversation when you press the second button, and the psychiatry one is told to stay inside its source, avoid diagnosing, and name when something belongs with a doctor.

That session starts in `/tmp`, and its prompt names TimerBar's own checkout, so an argument about a tip can turn into a change to the coach. A packaged build learns that checkout path from the first run out of the source tree, because the bundle only knows its own location inside `/Applications`.

Once a week the usual tip is replaced by a tune-up card. Acting on it opens a Claude Code session that reads your recent session transcripts, works out what you have actually been building, interviews you about your goals and where you are stuck and how your attention, sleep and stress have been, and rewrites the tip pool around your situation. Until you run it, it is the only card you get.

## Where the tips come from

All free, all downloaded and distilled in `resources/`:

| Source | Subject | Tips |
| --- | --- | --- |
| [Getting Real](https://basecamp.com/gettingreal), 37signals, all 91 chapters | SaaS | 88 |
| [Paul Graham essays](https://paulgraham.com/articles.html) | SaaS | 16 |
| [SaaS Starter Stack](https://github.com/timb-103/saas-starter-stack) | SaaS | 4 |
| [Open SaaS](https://opensaas.sh/) | SaaS | 2 |
| [Wikipedia](https://en.wikipedia.org/) article summaries, 39 concepts | Psychology, psychiatry | 39 |
| [NIMH](https://www.nimh.nih.gov/) and [NHLBI](https://www.nhlbi.nih.gov/), public domain | Psychiatry | 12 |

The corpus itself is not redistributed here. Regenerate it with `python3 resources/fetch.py && python3 resources/extract.py && python3 resources/build-tips.py`, which downloads the sources, strips them to text and rebuilds `src/tips.json`. Every tip keeps its source and a link back, so the provenance is checkable rather than invented.

Wikipedia arrives through the REST summary API, one lead paragraph per concept, which is already the shape of a card. NIMH and NHLBI pages are US government work in the public domain and say so on the page, which is why the health tips can quote them closely and only need the citation. The card titles are the one editorial layer: they frame the idea, the body underneath is the source. None of it is medical advice, and the cards that touch clinical ground point at getting a professional rather than substituting for one.

## The problem it solves

The original app was a countdown and nothing else. The gap it left is that the menu bar is the one surface you stop looking at the moment you stop working, which is exactly when a nudge would land. TimerBar inverts that: it is quiet while the timer runs and only speaks when the timer is off.

That has a measurable failure mode. When another app is fullscreen the menu bar is gone entirely, so the timer is invisible and the app is silently useless. TimerBar detects that case and shows the card anyway.

## Findings worth writing down

- **`workArea` does not change under fullscreen.** The obvious way to detect a hidden menu bar is to compare `screen.getPrimaryDisplay().bounds` with `workArea`. On macOS both are identical whether or not an app is fullscreen (`y: 33, height: 1084` in every state measured), because the values describe the primary space, not the active one. The working detection is an Accessibility query for `AXFullScreen` on the frontmost process's windows.
- **That query costs 464 ms.** Run synchronously on the main process it stalls the countdown and every animation. Measured with a 20 ms interval counter: 20 ticks fired during the check once it was moved to async `execFile`, against the roughly 23 expected, versus a hard stall before. Any AppleScript bridge belongs off the main thread.
- **A tray-only Electron app quits itself the first time a window closes.** With no `window-all-closed` handler, Electron's default is to quit. The app had no windows at all before, so the bug only appeared once the first popup was dismissed, and it took the whole menu bar item with it.
- **`focusable: false` is what makes an interrupting popup tolerable.** The card appears while you are typing. Without it the popup steals the keystroke you were mid-way through.
- **`'screen-saver'` is the always-on-top level that clears fullscreen apps.** `'floating'` is not enough, and `visibleOnFullScreen` has to be set through `setVisibleOnAllWorkspaces`, not the constructor.
- **`InstantAmperage` from `ioreg` is a 64-bit two's complement value, and `Number` cannot hold it.** On battery the current is negative, so it arrives as an unsigned integer just under 2^64, where JavaScript doubles are spaced 2048 apart. Parsed with `Number`, every reading rounded to a multiple of 2048 mA, so the app only ever saw 0, 24 or 48 W and the 22 W threshold was really tripping at about 12 W. `BigInt.asIntN(64, ...)` recovers the exact value.
- **A tray title that changes width shifts every menu bar item to its left.** The flame prefix flashing in and out moved the rest of the bar by about 23 points twice a second, and the system font's proportional digits moved it by up to 9 points on every tick of the countdown, since `11:11` is narrower than `00:00`. The flame is now a fixed-size tray image, swapped for a transparent image of the same size while it is unlit, and the title is set with `fontType: 'monospacedDigit'`. Measured with `tray.getBounds()`, lit, unlit, `00:00` and `11:11` all come out at the same width. `swift scripts/render-flame.swift` regenerates the flame bitmaps from the emoji at the menu bar font size.
- **`pmset -g assertions` knows when audio is playing.** While any app has an output stream open, `coreaudiod` holds a `PreventUserIdleSystemSleep` assertion whose resource line starts with `audio-out`. That one shell call, next to `get volume settings` from `osascript`, is enough to tell loud music from silence without a private framework.

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

11. phone pluggied in

12. 3Mmake the menu bar timer show low battery popups all the time when abttery is either draining quickly like today , or even better maybe when sustained cpu load is high and we are on battery, also make it show generally when battery is low under 40 percent. make these show often every few minutes in all states of the timer, when its off, on or even timed out, make it work with both low battery and sustained high power consumption (better use power comsumption, total consumption, gpu, cpu led etc better than battery percentage.

13. High power consumption means sustained higher than just normal desktop operation, meaning more than just browseing the web or doing light coding for some time idk, use best practices so I plug it in.

14. Under light load I don't care much

15. Make sure it also has the same prompt button where we can promt claude to adjust this feature etc

16. again, like the other apps this skill make, make sure this auto starts same config

17. backlog to consolidate these into a superapp for adhd or second life management, put this under business ideas in notion tasks

18. see the second life task

19. btw I stil don't see that label thing I asked about

20. done?

21. remove any old apps, make sure latest is running

22. publish everything and have last version installed

23. *A one-line reply confirming the withheld prompt 10 had been dealt with. Withheld for the same reason as prompt 10, and counted.*

24. resume the session where we worked on menubar timer, make it also show tooltips about psichology and psychiatry, make sure to commit and publish the new changes

25. on the menu bar timer app, make the poipup contain a permanent flashing element that I can't hide, make the flash frequency sufficiently high , more than 1hz for sure, make it trigger somebody with adhd by visual stimulus

26. also add an ability to snooze the overheat by 10m when on battery

27. Make sure to reinstall and restar the app

28. ok, now what is causing our system load?

29. what about now?

30. I want my mac to have some location specific warnings when going low battery, it should beep and say low battery only when either at HSBXL, or home. It can determine location easily based on wifi. Brainstorm solutions

31. what was this session about?

32. we folded this into the menu bar project, get up to date with whats there, and then update it to also have the current wifi marked as a place where a charger is available and should alert

33. get up to date by browsing other claude sessions on the topic first

34. See what the other sessions did , make sure to commit everything over multiple commits

35. Whats the current logic for the pull in popup?

36. /mr-new /mr-polish and merge it in when done, have a single button for ok, no snooze.

37. also reinstall the app to ahve the new update

38. Is the Heavy load threshold good? Adapt this to my model mac

39. How quickly does load at exactlty the Heavy load threshold kill a full 100% battery on this machine?

40. /mr-new /mr-polish make a new MR to reserve the possible dynamic elements in the bar, like the fire icon and anything else that can spontaniosly pop in, right for example the fire icon causes the rest of the menu to reflow and it's very jarring

41. finish /mr-polish and merge it in

42. make sure to reinstall latest app version

43. On the popup, I want a nicer animation, make it something more hacker like

44. The one that is meant to grab attention for somebody with ADHD

45. /mr-new and /mr-polish with a new animation, add a preview gif into the MR description

46. Before that actually make a few animations in a claude artifact and let's pick the best one

47. Don't use A, only use Spectrum when music is playing relatively loud, use the rest randomly.

    /mr-new /mr-polish and merge it in, when done reinstall the app to have latest update.

48. also in this MR, make the animation dissapear when the popup is hovered, so I can read the tooltip in peace

49. /mr-new /mr-polish and merge to make sure that 22W limit works correctly, when done reinstall the app

49 prompts. 2 multiple-choice answers. 0 lines of code written or edited by a human.

Redactions: prompts 10 and 23 are withheld as unrelated to this project and concerning a third party's private affairs. Nothing else needed masking.

Prompts 1 to 10 produced the app as published. Prompts 11 to 23 added the power alerts, single instance enforcement, the ad-hoc signing identity fix, and cleaned up two stale builds that had been shadowing the real one in the menu bar. Prompt 24 widened the coach past SaaS into psychology and psychiatry, which meant a second and third corpus, a topic on every tip, a draw order that keeps the three mixed, and a different conversation behind the second button for each. Prompts 25 to 29 added the beacon and the overheat snooze, then chased a system load question that turned out to be partly this app leaking its own popups. Prompt 30 was a standalone brainstorm a week before the rest, and prompts 31 to 34 folded it in as charger places: the power alerts now only fire on networks marked as having a charger within reach, markable from the menu, with the place list kept out of the repo in the app's user data. Prompts 35 to 39 took the snooze back out, leaving the power card with OK and the discussion button, and the threshold question turned up that the amperage parse had been rounding every reading to a multiple of about 24 W, so the alert was tripping at half the intended draw. The reading is exact now and the threshold is derived from the battery's design capacity: it fires once the sustained current would drain a full battery in under four hours, about 25 W on a 16 inch M5 Pro. Prompts 40 to 42 stopped the menu bar reflowing: the flame became a fixed-size image slot, the countdown digits went tabular, and the result was merged and reinstalled. Prompts 43 to 48 replaced the beacon: an artifact lined up five candidate animations at the popup's real size, three of them now play at random, the spectrum analyser is held back for when music is loud, and the strip goes dark while the card is hovered. Prompt 49 put the limit back to a fixed 22 W, compared against the exact reading, so the number in the knob is finally the number the alert fires at.
