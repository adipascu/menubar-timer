# TimerBar

A macOS menu bar timer with two modes and a coach that only talks when you are not working.

In the menu they are one radio group, Freebasing at the top and the eight timer lengths under it, so exactly one is checked at a time. Picking Freebasing stops the timer, running or flashing, and picking a length starts one, which is also how you restart the one already running.

**Timer running.** Pick a length from the menu, five minutes to ninety. You give the session a label, it counts down next to that label in the menu bar, and it flashes when you hit zero. No tips interrupt you while the clock is running, though the power and goal cards still come through, since both are about the session you are in rather than a distraction from it. The label dialog keeps what you typed if it closes because focus went elsewhere, to another app or another screen, and shows that draft again the next time it opens. Revert puts the saved label back into the field and only lights up while the field differs from it. Escape drops the draft, and so does saving.

**Categories.** Every session is filed under a category of work. The menu lists them as a radio group under the timer lengths, Work, Side project and Life admin until you change them. Each category keeps its own label, the one the timer shows in the menu bar, and the menu lists it next to the category's name, so picking a category also picks what you were doing in it. Switching category mid-session swaps the label in the menu bar at once, and if the category you switched to has none yet the label dialog opens for it, naming the category it is asking about. The single label an earlier release kept goes to whichever category was active. **Edit categories…** opens a window where each one gets a name and a color. It is an ordinary titled window you can drag and resize, it opens on whichever space you are in, over a fullscreen app included, and it never grows past the screen it opens on: past that point the list scrolls while Save and Cancel stay in view. The palette is seven of the eight colors the menu bar can paint behind text, white left out because it is a background on a background, each paired with black or white ink so the chip reads on a light bar and a dark one alike. While a timer runs the countdown wears the active category's chip, and switching category mid-session takes effect at once. Every moment the app runs goes to `focus-log.jsonl` in the app's user data as an unbroken run of segments while the Mac is awake and unlocked, each with its start, end, mode, category, task label, planned length and how it ended. The mode is `timer` while the clock runs, `expired` while it flashes after running out, and `freebasing` with no timer, and every segment carries the category picked in the menu and that category's label, so time after a timer ran out is filed under the category it ran out in, and an `expired` segment also records the `popup` that came up the moment it began, which makes its length the time from that card to your next move. When no new card came up, because one was already on screen or you were away, it has no `popup`. A segment closes whenever anything about it changes: `started` or `restarted` when you pick a length, `completed` when the timer runs out, `stopped` when you pick Freebasing, `switched` or `relabelled` when you change category or label in any mode, `asleep` when the Mac goes to sleep and `locked` when the screen locks, so time away never counts, with a new segment opening on wake or unlock, `quit` on a clean exit, and `lost` when the app was cut off, in which case the next launch closes the segment at its last heartbeat, written every fifteen seconds. Records written before modes existed have no `mode` and are all timer time. `TimerBar.log` gets a line for each of those segments too, and for every label edit and category switch with the old and new value. **Focus time** in the menu reads that log back as today, this week from Monday, this month and all time, each with the total and the split per category, then how many times the timer ran out with the time spent after it and the average per run, in seconds when it was under a minute, and the time spent freebasing, and can reveal the file for any analysis of your own. Only timer time counts toward a category and toward the goals. The other two modes are recorded and shown on their own lines, never added to a category's total.

**Goals.** Each category carries a share of your timed work, set as a percentage in the same card. Where you stand is always measured over the last fourteen days of timed work against the split you have now, so changing a share changes the targets and never throws the history away, and the card says so above the rows. Each time a share changes, the split that held until then is recorded in `categories.json` as a goal period, and **Focus time › Goal periods** reads every one of them back against the shares it was set with, newest first, so a change of plan is judged against what was planned at the time. The shares are weights rather than a budget, so they are normalized over the categories that have one, and the card only saves a split that adds up to exactly 100. Whenever the total is off in either direction, the hint says by how much, Save waits, and a Redistribute to 100% button scales every share there in proportion to what you set. A file saved before this rule whose shares add up to something else is scaled to 100 when it loads, which keeps the proportions and so starts no goal period. A category at 0% is kept for its history but drops out of the menu and out of the goals. Archiving is the explicit way to retire one: its time stays in Focus time under its name, it leaves the menu and the goals, and the share it held is left unassigned, so the total drops below 100 until you redistribute it or hand it out yourself. Archived categories sit in their own section at the bottom of the card, each with the share it will come back at. Restoring one puts that share back as it was, which takes the total past 100 once the others were redistributed, and the same button brings it back. Saved categories offer Archive rather than delete, so a category you are done with never takes its history with it, and only a row added and not yet saved can be removed outright. The card opens with the rows ordered by share, biggest first, so what you are asking most of is at the top and anything retired sits at the bottom. Rows added while the card is open stay where you put them until it is reopened.

The **Focus time** submenu opens with the goal block for those fourteen days: the timed total, then each category with how far it stands from its share in hours and as the share you gave it against the share you asked for. Hours rather than percentage points, because ten points is one hour over ten hours and five over fifty. A category more than five points off its share is behind or ahead, and anything closer is on track, so being near target is left alone and the order does not flicker. Nothing is judged until five hours are in the window, which the block says while it waits. The categories you pick from in the menu carry the same standing next to their names and come in that order: behind first, most hours first, then on track by share, then ahead, least ahead first, so the top one is the one to catch up on. Before there is enough to judge they simply come by share.

When the gap gets wide the coach says so out loud. Starting a session in a category that is ahead of its share, or reaching the end of one, brings up a card naming the category furthest behind and asking you to point the next session at it. It never switches anything for you. It speaks only when the fourteen days hold at least five hours, the category furthest behind is outside its band, and the one you are in is ahead of its own, and it says how many hours each is off. It comes at most once an hour for as long as the app stays up, and **Talk it through** opens a session with the whole ledger to work out whether the split itself is still right.

**Freebasing.** No timer and no goal you are held to, just the coach's cards and whatever the wandering ADHD brain lands on next. It is a mode you pick on purpose rather than the absence of the other one, because creativity tends to come out of that chaos. Nothing asks what you are working on. The menu says No task, on purpose where a timer session would carry a label, and the menu bar drops the one the last session left behind. [Flashy](docs/flashy.md), Clippy's cousin who did better for himself, slides a card into the corner every four to twelve minutes with one idea, drawn from 366 tips distilled from free sources. It sits above every window and every space until you press Got it, so it survives switching apps. It comes up on the display the pointer is on. When a timer runs out a card comes up the same moment, without waiting to see whether you have touched the keyboard lately, so even a one minute break gets one. A due goal nudge takes that slot, a card already on screen stays, and a timer that runs out while the screen is locked or the Mac is asleep leaves its card to the usual schedule, so it comes once you are back. `TimerBar.log` notes how many milliseconds each card took to appear. Stopping a timer early keeps the card that was already on its way, within a minute once the session has outlasted it. A card already up, a power alert or the goal nudge, or you being away from the keyboard, holds the next one back until then. Flashy and the dots under him are a handle: drag them to move the card off whatever it is covering, it stays within the display it is on, and the next card comes back to the corner. The handle keeps clear of the text, so a drag never starts a selection and a selection never moves the card, and a card that grows while it sits somewhere else, for the note box, keeps its bottom edge where it was. Talk it through opens a Claude Code session seeded with that tip so you can argue with it. Already know this and Not interested retire the card for good. More like this keeps the card in play and counts as a vote for more in that direction. Add a note opens a box on the card for whatever you want to say about it, an abbreviation that wants spelling out, a question, a direction to take, and Save note or Cmd+Enter closes the card with it kept. The title, the body and the source are selectable text, so one drag from the top of the card to the source takes all three, a right click offers Copy and Select All, plus Copy Link when the click is on the source, and the moment a drag or a double click has selected something the card asks for keyboard focus so that Cmd+C lands on it rather than on the app behind. Whenever the source is part of what you copy, its address goes on the last line. Once the card has focus, Escape closes it, or puts away the note box first when one is open, and closing it hands focus back to the app you came from.

![A card with the title, body and source selected in one drag](docs/popup-selection.png)

Each card carries a beacon along its top edge, there to catch an attention that drifts. It is a small canvas animation in one of seven presets, picked from the Beacon item in the menu, which names the one in use, and described in [docs/beacons.md](docs/beacons.md). The default, Hackerspace, is phosphor green and picks at random from Matrix rain, a decode marquee and a port scan log, or a spectrum analyser when something is playing audio at half volume or louder, or at any level through an output that reports no volume of its own. Its three random ones invert the whole strip 2.5 times a second. The analyser listens to the Mac's own output through a system audio loopback, so its bars are the real spectrum of whatever is playing, 40 Hz to 16 kHz across the strip, and every beat it hears in the bass slams the bars to the top and lights the strip up for a blink. That needs Screen Recording access, which is what macOS gates an app hearing its own output behind. Without it the card logs why and falls back to one of the random three. The other six, Arcade, Bloom, Breathe, Cardio, Lo-fi and Markets, follow what young professionals spend their time on, chosen so that interests that skew towards women and ones that skew towards men are both covered, each with two animations in its own palette and its own flash. Switching presets redraws a card that is already up, and the choice is kept in `beacon.json` in the app's user data. Hover the card and the beacon goes dark so the tip can be read in peace. Between the title and the body sits a line the card never shows, timerbar.pascu.be, so a copy that runs from the title into the body says where it came from. Unticking Include timerbar.pascu.be in copies in the menu, ticked by default, turns that line off, and the choice is kept in `site-line.json` in the app's user data.

![The coach popup cycling through its four beacon animations](docs/coach-popup.gif)

The tips cover three subjects, 122 cards each: building a SaaS, the psychology of attention, motivation and habit, and the psychiatry around working with your own head. Cards rotate through the subjects in turn, so each gets exactly a third of the airtime whatever is left in its pool. Inside a subject the definitions come first, what SaaS, psychology and psychiatry even are and the vocabulary the other cards lean on, then the rest in a shuffled order. Each subject seeds a different conversation when you press Talk it through, and the psychiatry one is told to stay inside its source, avoid diagnosing, and name when something belongs with a doctor.

Every card you see is recorded in `feedback.json` in the app's user data, keyed by title, with its subject, how many times it has shown, the status you gave it, how many times you asked for more like it, and the notes you left on it, each with its time. Retired cards never come back, a subject whose cards are all retired drops out of the rotation, and when nothing is left the tune-up card takes over. Cards you asked for more of keep coming round, the count survives a later known mark, a later Not interested mark wins over it, and both the tune-up and the quiz read those cards as the places to go further. A note goes to them too, as an instruction: answer it, explain what it asks about, or take the card where it points.

That session starts in `/tmp`, and its prompt names TimerBar's own checkout, so an argument about a tip can turn into a change to the coach. A packaged build learns that checkout path from the first run out of the source tree, because the bundle only knows its own location inside `/Applications`.

**Notes and ideas…** in the menu is where the standing brief goes, everything the coach should know that belongs to no single tip: what you are building, where you keep getting stuck, an idea worth chasing. The card lists what is on file and takes as many notes as you want to write, where the note box on a card takes one line about that card. Notes are kept in `ideas.json` in the app's user data, oldest first, each stamped with the time it was written and shown on the card with its date, and stay there until you delete one. The weekly tune-up, the quiz and every new edition read that file as the standing brief and are written around it, the later note winning where two pull apart, and the tune-up opens its interview by asking what has moved on each one.

Once a week the usual tip is replaced by a tune-up card. Acting on it opens a Claude Code session that reads your recent session transcripts and the feedback file, works out what you have actually been building, what you already know and what you asked for more of, interviews you about your goals and where you are stuck and how your attention, sleep and stress have been, and writes a new edition of the personal cards and the book around your situation, spread evenly over the three subjects. Until you run it, it is the only card you get.

**Tune up the coach…** in the menu runs that same session whenever you want it, waiting on nothing, and carries the schedule on its own label: `due in 5 days` while the week runs down, `due now` once the week is up, then `a day late` and on from there. Beside the label is a gauge that fills by a seventh for each day gone by and sits full from the day it is due, drawn at runtime as a template image so it takes the menu's own text colour. Both are counted in whole days from the moment the last edition was written rather than from midnight. Running it early costs nothing: the next due date is measured from whenever the last edition of the cards was written, so an early tune-up simply moves the whole week along, and the session is told how long it has actually been rather than assuming a week.

**Pebble.** The timer reaches a Pebble Time 2 through [TimerBar for Pebble](https://github.com/peblum/timerbar-for-pebble), a watchapp with an Android companion in between, since a Pebble pairs with a phone and not with a Mac. The app advertises itself on the local network with Bonjour and serves its state on port 47421 from `src/bridge.js`: the mode, the label, the seconds left, and the menu's lengths and hints so the watch shows the same menu. The companion finds the Mac whenever both are on the same Wi-Fi, keeps an event stream open, and relays every change to the wrist, where the countdown runs on the watch's own clock and a long buzz marks Time's up. Picking a length on the watch starts the timer here, and a start with no label opens the same label prompt a menu click would, with the watch saying so until the label is typed on the phone or the Mac. The `Pebble:` line in the menu shows the six digit pairing code the companion has to be given once, and reads `Pebble: connected` while a phone is on the stream.

**Show a card now** in the menu brings the next card up on the spot, in any timer state, including while a timer is running and the cards are otherwise paused. It draws from the same rotation the gaps between timers use, counts as shown like any other card, and pushes the scheduled one out by a fresh gap so the next does not arrive right behind it. The only card it holds back is the one about a fullscreen window hiding the menu bar, which says nothing to someone who has just opened that menu.

**Quiz me…** in the menu is there whenever you want it, timer or not. It opens a Claude Code session that reads the card pool, your feedback file and the earlier sessions in `quiz.json`, asks which topics you want today, and quizzes you one question at a time on cards you have seen, definitions first. Cards you clearly had get marked known so they stop coming round, and the session ends by writing a new edition of the personal cards and the book around what you missed, what follows from the cards you asked for more of, and what comes next in the topics you asked for. The card pool is copied to `tips-builtin.json` in the app's user data on every launch so the session can read it out of a packaged build.

**Read the book…** opens a reader for the editions in `library/` in the app's user data. Every session that rewrites the personal cards, the weekly tune-up, the quiz and the reader's own **Write a new edition** button, writes a numbered pair of data files there: `cards-000N.json`, the popups the coach shows from then on, and `book-000N.json`, about two hours of reading in ten to twelve chapters written from the same material, the cards you asked for more of, what you marked known, what the quiz caught you out on and the notes you left on the earlier editions. The book is for when the popups cannot reach you, a flight or a train with no network, so it is written out in full and the links are citations only.

The reader pages through it a chapter at a time, with a contents list and the arrow keys, and every section has a Highlight toggle and a comment box. Those go to `notes-000N.json` beside the book they belong to, and the next edition reads them: a highlight asks for more in that direction, a comment is an instruction. The reader also keeps `reading-000N.json`, the chapters you finished. A chapter only counts once you have paged past it, a Finish the book button stands in for the page after the last one, and the contents list ticks the ones that count. The next edition reads that too, since an edition you stopped partway through was too long or off target, and it is told to say which. Nothing in `library/` is ever overwritten, so old cards, old books and the notes on them stay as the record of where you were, and the edition picker in the reader goes back through them. The button opens one Claude Code session that asks one question, what to lean into, then writes both files, and the reader picks the new edition up the next time it is focused. A new edition takes the number after the highest one already in `library/`, so a session you abandon before it writes anything leaves no gap in the numbering. A `tips-personal.json` left by an earlier build becomes `cards-0001.json` on the first launch.

**Power draw.** On battery, away from a charger, the menu bar shows the draw the app is watching: the median of the readings taken every thirty seconds over the last five minutes, the same number it compares against the 22 W limit. It sits in the flame's slot, drawn in the menu bar's own text colour, as a bare number with no unit after it, and from 100 W the decimal is dropped so it still fits. Under the limit it is just the number. Over it the flame flashes in the number's place, swapping in and out every half second, and once that median has a full five minutes of readings behind it, a card asks you to plug in wherever a charger is within reach. Every Wi-Fi network counts as having one, and no network at all counts as having none, until you untick **Charger available at** in the menu there, which records that network as having none, and ticking it again brings it back. A second card comes up at those places when the battery drops under 40 percent. Where a charger is within reach the slot stays empty, number and flame both, since watching the draw only helps where plugging in is not an option and the cards already do the asking. Plug in and it empties too, since the battery current then measures charging rather than the machine, and any power card still up goes with it, the moment macOS reports the adapter rather than at the next sample. One card does come up while plugged in: after five minutes of the battery giving back 5 W or more with the adapter in, the charger is not covering the load, and the card says so with the adapter's own rating from `AdapterDetails` in it. Samples where the battery is not discharging count as zero rather than resetting the five minutes, so a load that dips under the adapter's rating now and then still gets the card, and a machine that only trickles does not. That one ignores the charger places, since being plugged in settles the question of whether a charger is in reach.

**Battery.** The charge itself sits in the menu, on a row that cannot be clicked: `Battery 53%`, with `· charging` or `· plugged in` when the adapter is in, beside a battery icon whose bar fills to that same percentage and takes a bolt struck through it while it charges. The icon is drawn at runtime at both screen scales into a template image, so it follows the menu's own text colour. The row appears once the first reading lands, stays out of the menu on a Mac with no battery, and is rebuilt only when the percentage or the state changes rather than on every thirty second sample.

## Where the tips come from

All free, all downloaded and distilled in `resources/`:

| Source | Subject | Tips |
| --- | --- | --- |
| [Getting Real](https://basecamp.com/gettingreal), 37signals, all 91 chapters | SaaS | 88 |
| [Paul Graham essays](https://paulgraham.com/articles.html) | SaaS | 16 |
| [SaaS Starter Stack](https://github.com/timb-103/saas-starter-stack) | SaaS | 4 |
| [Open SaaS](https://opensaas.sh/) | SaaS | 2 |
| [Wikipedia](https://en.wikipedia.org/) article summaries, 244 concepts | SaaS, psychology, psychiatry | 244 |
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
- **`focusable: false` is what makes an interrupting popup tolerable.** The card appears while you are typing. Without it the popup steals the keystroke you were mid-way through. The cost is that such a window can never become key, so a selection made in it with the mouse cannot be copied with Cmd+C: the keystroke goes to the app that is still active. The card therefore flips itself focusable through `setFocusable(true)` and asks for activation only once text has been selected, and a right click offers Copy for the case where macOS declines, since Sonoma honours an app activating itself only on the back of a real user event. A focused card also holds Cmd+Q and Cmd+H, which under Electron's default menu would quit or hide the whole app, so the application menu is trimmed to Edit and Close, a focused card hides the app as it closes so that focus returns to where it was, and the card turns unfocusable again the moment focus moves elsewhere.
- **`'screen-saver'` is the always-on-top level that clears fullscreen apps.** `'floating'` is not enough, and `visibleOnFullScreen` has to be set through `setVisibleOnAllWorkspaces`, not the constructor.
- **`InstantAmperage` from `ioreg` is a 64-bit two's complement value, and `Number` cannot hold it.** On battery the current is negative, so it arrives as an unsigned integer just under 2^64, where JavaScript doubles are spaced 2048 apart. Parsed with `Number`, every reading rounded to a multiple of 2048 mA, so the app only ever saw 0, 24 or 48 W and the 22 W threshold was really tripping at about 12 W. `BigInt.asIntN(64, ...)` recovers the exact value.
- **A tray title that changes width shifts every menu bar item to its left.** The flame prefix flashing in and out moved the rest of the bar by about 23 points twice a second, and the system font's proportional digits moved it by up to 9 points on every tick of the countdown, since `11:11` is narrower than `00:00`. The title is set with `fontType: 'monospacedDigit'`, and anything that flashes is a tray image of fixed size. `swift scripts/render-flame.swift` regenerates the flame bitmaps from the emoji at the menu bar font size, and `swift scripts/render-glyphs.swift` renders the digits and the dot with the monospaced-digit system font the title uses. `src/readout.js` composes the wattage from those glyphs at runtime into a slot the width of `00.0`, flagged as a template image so macOS paints it in the menu bar's own text colour, and centres the flame in a slot of the same size, so flashing swaps two images of one size. Measured with `tray.getBounds()`, `00:00` and `11:11` come out at the same width, and so do `9.8`, `99.9`, `120` and the flame.
- **`pmset -g assertions` knows when audio is playing.** While any app has an output stream open, `coreaudiod` holds a `PreventUserIdleSystemSleep` assertion whose resource line starts with `audio-out`. That one shell call, next to `get volume settings` from `osascript`, is enough to tell loud music from silence without a private framework.
- **Electron's `loopback` audio works on macOS, whatever the docs say.** `setDisplayMediaRequestHandler` documents `audio: 'loopback'` as Windows only, but the Chromium inside Electron 35 carries a ScreenCaptureKit loopback input, and answering an audio-only `getDisplayMedia` request with `{ audio: 'loopback' }` yields a live `System audio` track of whatever the Mac is playing, Bluetooth headphones included. Three things trip it. Asking for video as well fails with `Error starting capture`. Asking for the unprocessed stream, with `echoCancellation`, `noiseSuppression` and `autoGainControl` all off, returns silence, so the analyser leaves auto gain on and the other two off. And a default `AudioContext` opens the output device even when nothing is connected to it, which errored on a Bluetooth headset, so the analyser's context is created with `sinkId: { type: 'none' }`.
- **macOS 26 redacts the Wi-Fi name from every command line tool, but leaves it inside `scutil`.** `networksetup -getairportnetwork`, `ipconfig getsummary` and `system_profiler` all print `<redacted>` or claim there is no network unless the caller has Location Services access, which an Electron main process has no way to ask for. `scutil` blanks `SSID_STR` in `State:/Network/Interface/en0/AirPort` as well, but the `CachedScanRecord` next to it is an `NSKeyedArchiver` plist of the access point the interface joined, and its `SSID_STR` is intact. The app decodes that with a small binary plist reader, takes the raw `SSID` bytes from the same record when its `SSID_STR` is empty, and only then falls back to the DHCP domain name, which is why the charger menu item used to read `fritz.box`: that is the domain a FRITZ!Box hands out, not the network name. When none of those has a name, the menu says **this Wi-Fi** rather than showing the router's hardware address, and the log line for the network change notes whether the scan record was missing or nameless.
- **Wikipedia's REST API rate-limits a generic User-Agent.** Fetching a few dozen summaries as `Mozilla/5.0` worked, and fetching two hundred returned 429 for most of them. A descriptive User-Agent naming the project, as their policy asks, let every request through at the same pace.

## Install

The landing page at [timerbar.pascu.be](https://timerbar.pascu.be), served from Cloudflare Pages where it also answers as [timerbar.pages.dev](https://timerbar.pages.dev), links the latest dmg and walks through the first launch, which macOS refuses until you allow the ad-hoc signed build in Privacy & Security or clear its quarantine flag. The page is `site/index.html`, with its favicon, `robots.txt` and `llms.txt` beside it, and `pnpm site:deploy` stages them with the card screenshot and publishes through a `wrangler` you have installed and logged in. The build names the dmg `TimerBar.dmg`, without a version, so the page's download link stays the same across releases.

To build from source:

```bash
corepack enable
pnpm install
pnpm start          # run from source
pnpm lint           # eslint, including the inline scripts in src/*.html
pnpm format:check   # prettier
pnpm knip           # unused files, exports and dependencies
pnpm test           # a syntax pass over src/ and scripts/, then the unit tests over the pure modules, failing under 100% coverage of them
pnpm run build:mac  # produces a dmg in dist/
```

Node 22.x, as pinned in the `engines` field.

Every pull request runs those same checks on GitHub Actions, builds the DMG and keeps it as an artifact for a week. A push to `main` also republishes the `latest` release and then downloads it back to check the asset it just published.

Start at login defaults to off. The app offers it once on first run, and it is scriptable:

```bash
/Applications/TimerBar.app/Contents/MacOS/TimerBar --enable-login-item
/Applications/TimerBar.app/Contents/MacOS/TimerBar --disable-login-item
/Applications/TimerBar.app/Contents/MacOS/TimerBar --status
```

Quit shows at the bottom of the menu by default. Unticking the Show Quit in menu checkbox, next to Start at login, hides it. The checkbox stays in the menu, so bringing Quit back is one click.

The fullscreen card needs Accessibility access in System Settings, Privacy & Security, and the spectrum analyser needs Screen Recording access from the same place, since that is the permission macOS puts system audio capture behind. Everything else works without them, and the log says so when a check is refused or the capture fails.

Logs rotate at 1 MB to `~/Library/Logs/TimerBar.log`.

The Pebble bridge listens on port 47421 on every interface, falls back to a free port when that one is taken, and needs no configuration beyond the pairing code it prints to the log and the menu. The code lives in `companion.json` in the app's user data.

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

50. /mr-new /mr-polish and merge in and reinstall app,  instead of flow mode and all timers, just have a no timer mode, and only one is checked at a time, no timer mode is basically what we have now when flow mode is disabled, use a different name for this, call it freebasing or something (since it will be chaotic, no goal is being kept, we get the popups, we;re doing random ADHD stuff etc). This might be something we want since creativity can happen more in this chaotic state

51. resume

52. /mr-new and /mr-polish and merge in and reinstall app, make Charger Avialble at x actually show wifi SSID name, idk where the current fritz.box entry comes from, because that is not my wifi name

53. resume

54. "Wealth is what people want, not money" — Paul Graham, https://paulgraham.com/wealth.html

    You make wealth by making something people want. Money is just a way of moving wealth around, so measure yourself by the thing you made, not the round you raised.

    That tip just popped up while I was working. Help me think it through and work out what it means for the SaaS I am building. Ask me what I am building before you give advice.

    The popup came from TimerBar, a menu bar coach I built myself and keep changing, so if this turns into a change worth making to the coach we can go and make it. Its source is at /Users/adrian/repos/menubar-timer.

    *Written by the coach itself, from the Talk it through button on a card. Counted.*

55. in this better, I am missing the point

56. what is the % of popups for each topic now?

57. exit any claude worktrees from this session

58. add more, I want to have an equal spint for each type

59. also add a button, similar to I know this already, or another button for I'm not interested, rename these into best practices for buttons and keep track of the status for each tooltip, so when we retrain we take feedback into account

60. another /mr-new /mr-polish , add a button into the menu bar, called quiz mode or something similar best practice name for this new menu button, this is always available, when clicked it opens a claude code session to quiz me on my knoledge based on tooltips and topics of interest, it then takes into account previous feedback stats, my quiz result and more and retrains things and sets new popups in place to make sure I progress learning topics of interest and cover any gaps. Merge this in when done.

61. Also make sure there are tooltips with definitions on what we are learning as well, I might not know the definitions of what things like psychology even is, do this in first MR

62. /mr-new /mr-polish and merge it in with the new changes

63. resume

64. anything else to remianing to do?

65. is my pc still over 22?

66. check the current state and condition etc

67. /mr-new /mr-polish show avg power draw all the time in the widget (show the same number that is used for the calculation), and only flash the flame when over limit

68. make that power reading and the fireball take the same spot, fireball flashes over the power reading /mr-new /mr-polish and merge, update installed app as well

69. /mr-new /mr-polish and merge it in, add another buttin to the popups with tips to show that I am interested, use the best practice name/label for this button and make sure to track this into stats as well When done, merge in the MR

70. resume

71. resume.

72. make sure to reinstall the app to have latest updates

73. do this /mr-new and /mr-polish and merge in another MR that will elable text selecton in the popup so I can copy parts of the popup, also make this copy pastable across both title and content parts at the same time, so I can copy the entire thing, desc, sources all in one copy paste selection. Add UI screenshots before and after this change into the MR descriton, when done restart app.

74. Btw, I like the customer development is one third of a lean startup tip, I am interested in more, add +1 on this just for my machine right now, in its data folder etc, thank you.

75. add a doc about our mascot, he's called flashy, he is is clippy's more scucesful cousin, he plated himself in pure gold and likes to show off how much he knows (not humble at all). He is the one giving the popups. /mr-new and /mr-polish

76. /mr-new /mr-polish add a feature to switch between multiple animation presets for the popup, cater to different demographics, make sure to have the picked demograhics reflect popular ones in age group of young professionals. (make sure gender is also taken into account somehow) Build out the animations themsleves for each, and keep the current one, give it a custom name, this will be the only one just based on the author's personality (me) and not any target demographics. note to self for later: check if the preset names are good

77. do not name the demographics directly into the preset names, just use something that is most suitable preset name for them.

78. /mr-new /mr-polish rename the app and project itself something that is most in line with the age gap and main target democraphic is

79. /mr-new /mr-polish Make the thing have a hidden stuff that gets copied into the text in between the title and content, make it hidden text that will show on paste (normally or like the rest of the text). In here just add the domain on where the app is hosted (it's landing page) actually build a landing page for it first, something under .pascu.be for now (configure that using cloudflare). and have that landing page also in the MR, /mr-polish and merge in, make sure landing page shows up as expected after all lands and is merged in. Keep the MR with the hidden stuff that gets copied in separate, also with it add an opt-out setting in the settings to amke this dissapear yet make the setting default it to on. This separate MR /mr-polish ye don't merge in. So first MR that gets merged in will have the landing page stuff, just not reffered to it via hidden field.

80. I am preparing to board a flight, add a feature to download as much relevant content as I need as a generated book, add a menu to paginate and to hilight different sections and to add comments, these comments will be used to further iterate on this.

    Based it on my current feedback you have so far, and when regenerating, add an updated version of the book as well, keep old books and their notes as historical

    /mr-new /mr-polish  merge in and reinstall app with this feature

81. Generate this book when regenerating the popups, add a dedicated button to kickstart this process

82. Generate a new version of the book and regenerating the popups at the same time, add a dedicated button to kickstart this process.

83. THis probably also involves separating the popup and book conent from the app itself, these will be data files.

    Also keep old popups in history when removed or edited similar to old books.

84. Make the book be about for 2h of reading.
    make sure to track how much of it was read, only count passed pages as finished, track this metric to be used by the regenration feature

85. /mr-new /mr-polish and merge

    I want to track my time spent under different categories of work, for example Freelance, latindance.be business, unemployment process.

    I am looking at total focus time for each and the splits for each. I have specific goals for different periods of time, so make sure this is tracked as granular as possible as I might want to change the stat analysis later.

    Make the labels customizable yet easy to switch later. Make each alter the color of the timer itself, allow me to pick the color as well as the name for each, have a simplified color pallet to pick from that is visible well on the bar for both dark and white display modes.

    Merge the mr when done

86. Make sure in my installed app, I have the UMP label first.

    Then Freelance second.

    Then latindance third.

    Make sure these are not hardcoded, just set them via app config/settings in my install.

    (yes this means installing the latest app as it is).

    /mr-new /mr-polish and merge, have a settings panel to set the goals for each as a percentage split. Have this over a window with a start date of now.

    Set the splits on my tasks as Freelance 20%, UMP 20%, Belgabot (add in new) 10% and the rest for latindance.be.

    Let's brainstorma. bit before implementing if these should be calcualted over a rolling window or something else. Also when  I am really of on one of these, make the popups appear informing me that I need to switch and suggest what to switch to.

87. let's do the brainstorming here now in chat

88. Also add 10% time spent in process improvements for me (this is stuff like buying equipment, uprading notion, menu bar etc)

89. quality of life / quality of work things

90. pause the work so we can brainstorm together

91. let's continue brainstorming

92. only when timer is running, that is the only focus time I care about. Also make sure to order the options in the menu in the recommended order. basically first on what we're low on, thats the lowest nudge level that always should exist.

    idk what lookback is best and what start date, keep in mind I will periodically adust the percentage splits to suit current needs.

93. pause and let's finish the braoinstorming first

94. Make the lookback just be the exact time as the entire goal period, only do the nudge if we have sufficient data and sufficient percentage off to nudge. I don;t want to get nudget to early when we are close to goals or have insifucient measurements.

95. You decide, do the best practice UI/UX for this: How you enter the split

96. What the card offers: yes, it should tell me to switch, it should not switch to me. What the menu shows next to the name: nothing new, only use the color scheme, space in the menu is precious. A new category with no goal yet: yes sounds good, don't even show it anywhere else if the goal is 0%

97. keep it paused, let's finish the brainstorming together, what info do you still need to know?

98. changing it on the day is enough, yes, changing it on the day is enough

99. Does 0% also hide it from the menu radios? yes

    I am too tired to decide on more brainstorming topics, leave the rest as backlogged tickets to reconsider later and so far you do the best practice decision. FInish everyhting and emrge in MRs and make sure teh app is installed with the splits and goals I asked for.

100. Btw, when the timer is expired, count it as freebased time so neither of the categories is active

101. I mean if timer is expired, don't add time or percentage to the active selected goal thing or category thing etc

102. /mr-new /mr-polish and merge, when reopening that set categories menu thingy, make them be sorted by the current percentage values. merge in this MR when done

103. add an option to remove the quit button in the menu, make the default to show. If you need an UI panel ebcause of too many settings, you can do it. /mr-polish /mr-new

104. when changing the label of what we are working on, if the dialog gets dismissed because focus is lost, like when we switched apps / screens etc, still keep the edited draft somehwere, so if we reopen the edit dialog later, I want to ahve the old draft there and not discarded, have a dedicated button to fill in what is actively working on, have this button disabled untill the field is different than what is actively being worked on /mr-new /mr-polish

105. /mr-new /mr-polish and merge, make power usage show only when charger is not available, also stop sowing that W prefix in the title

    merge when ready.

106. /mr-new /mr-polish and merge in, in the menu when clicked, show the battery percentage, just information no click supported

107. show battery percentage and maybe even a small battery icon reflecting the state of the battery

108. When you get the popup with the gmusic graphics analyzer, the one that is used only for loud volume of musiv being played,  make it literally blip and sync the logic analyzer to real audio.

109. /mr-new /mr-polish and merge in

110. resume

111. backlog to make a pebble integration for this app

112. into gh

113. Build and install the pebble compation app for this, publish it uinder our pebble org. Make sure it's installed on my pebble when done, make it also have a companion app for android for any inputs that are too complex for the phone app etc.

    Publish it as a private repo for now, and backlog start date 3 weeks form now to consider open sorucing it.

114. Also build an android companion app, make sure somehow all of this sync with my mac when they are nearby

115. have a monorepo for both the android and pebble apps

116. "Keep CAC payback under twelve months" — David Skok, SaaS Metrics 2.0, https://www.forentrepreneurs.com/saas-metrics-2/

    Skok's two guardrails are LTV at least three times CAC and CAC recovered within twelve months. For a bootstrapper the second one is the one that bites, because a customer who pays back in 24 months is a profit on paper and a cash hole in the bank. Payback in months is CAC divided by monthly gross profit per customer.

    That tip just popped up while I was working. Help me think it through and work out what it means for the SaaS I am building. Ask me what I am building before you give advice.

    The popup came from TimerBar, a menu bar coach I built myself and keep changing, so if this turns into a change worth making to the coach we can go and make it. Its source is at /Users/adrian/repos/menubar-timer.

    *Written by the coach itself, from the Talk it through button on a card. Counted.*

117. /mr-new /mr-polish add another button into a populp to add notes, for example here I want to add the note on this popup that "interesting yet in the future I'd like to have such abreviatioins explained to me", merge this MR and also add the note for me for this one. then install latest version of the app.

118. The /mr-new /mr-new prompts are to alter the app itself and its code, Do that instead, ignore the very first prompt that quites the popul, and process the other two directly on the repo

119. /mr-new /mr-polish and merge, allow to drag the popup, yet when a new one comes in, it should go into the same spot. Make sure dragging it won't interfere with selecting any of the text, have some small separate distinct drag area on it that has no overlap with the text.

120. always have latest version installed on this computer

121. /mr-new /mr-polish and merge, make sure the popup always shows when in freebase mode or shortly after timer expires and stays expired. Also make sure it is visible under all sort of fullscreen modes and in multi window settings.

122. /mr-new /mr-polish and merge: add a way to add general notes and ideas into the app that will be used at that popup regenration step:

    Add in this first note into my client will be that I am struggling with launching products, I either build the product and has no clients (yet this is ebtter recently, see my other chat sessions on the job plaement project). Yet now I struggle to see if the project can be implemented and to plan a future for it around the current early client I have.

    When done, make sure the latest version of th eapp is installed and running

123. /mr-new /mr-polish and merge. Have a button to allow triggering the retraining early, yet also on this button show the suggested retraining time (too early, too late etc)

124. allow retraining at any tiem, not just early yet do have a visual indiactor of when the suggested retraining time is.

125. /mr-new /mr-polish and merge, the project switch popup can't be dismissed, fix it

126. /mr-new /mr-polish and merge: add a button to trigger one of the popups on demand, show the same popups as freebase mode

127. /mr-polish and merge: make sure the battery popup dissapears instantly when it's plugged to charge.

128. /mr-new /mr-new and merge: have a notificaiton when battery is discarging unedr load while charger is conneted, when the charger is too small fot he load. Very similar timing as the current battery popup

129. I just saw a bunch of JS error dialogs

130. Uncaught Exception:
     Error: ENOENT: no such file or directory, open '/private/tmp/claude-501/-Users-adrian-repos-menubar-timer/1e7cd3b7-5253-4502-9226-c482154c9feb/scratchpad/harness-home/Library/Logs/TimerBar.log'
     at Object.writeFileSync (node:fs:2426:20)
     at appendFileSync (node:fs:2508:6)
     at log (file:///Users/adrian/repos/menubar-timer/.claude/worktrees/popup-dismiss/src/log.js:12:3)
     at IpcMainImpl.<anonymous> (file:///Users/adrian/repos/menubar-timer/.claude/worktrees/popup-dismiss/src/coach.js:284:49)
     at IpcMainImpl.emit (node:events:518:28)
     at WebContents.<anonymous> (node:electron/js2c/browser_init:2:88875)
     at WebContents.emit (node:events:518:28)

131. etc

132. do everything as I asked, all the remaining things, for each do /mr-new /mr-polish and merge them in after polished

133. including PR 45, literally everything I asked

134. if the project is not /promote yet, then /promote via /mr-new /mr-polish and merge

135. /mr-new /mr-polish and merge and install latest app: fix the categories UI, somehow parts of it are cropped off and inaccessible, make sure it's a normal window that can also be dragged around etc and all content is accessible when I have a fullscreen macos app running already or windowed apps.

136. /mr-new /mr-polish and merge, I want the  what you are working on to be project specific, so it's shown next to the project when picking the project and also it's swapped automatically when changing projects in the bar itself

137. Also I am scrapping a project today, mynextjob.be yet I want the stats to persist. Do /mr-new /mr-polish and merge to make sure this is the case, allow reviving old categories from an archive section of the settings. Do not archive it, I want to archive it myself to see if this works well, make sure to redistribute the percentages correctly after archiving since the archived project will go to 0%. When restored, it will go back to it's original percentage int he menu showing total of over 100%. When over 100%, have a button to redistribute the things back to 100%, make the redistribution directly proportional of the over100% shares.

138. /mr-new /mr-polish and merge. Make sure logs are as granular as possible and that they include things like changing the label of what I am working on and changing categories etc. Also track time spent with timer expired vs freebase mode granuraly, when spent with timer expried track in what category that was etc.

139. /mr-new /mr-polish and merge: immediately show a popup when the menu bar timer expires, with no delay. Adapt any logged stats to make use of this feature etc.

140. why was 0004 skipped?

141. fix htat bug /mr-new /mr-polish and merge

142. /mr-new /mr-polish and merge, when archiving again allow total to be under 100% and have this button fix it before allowing to press save. hae the same process for any value under or over 100%

143. /mr-new /mr-polish and merge: when selecting a category to work from, order them by the ones I need to catch up to first

144. Ignore what the project is doing and tell me what the best practices are for how the % is calculated for what I spent my time on, in order to course correct somehow

145. Tell me how its done now vs what is the best practice for such a system

146. /mr-new /mr-polish and merge: do the 14 days rolling window and adopt all other best practices, also update any UI/UX to use these best practices as well.

147. make sure to show something as well in the menu on stats on how behind or on track we are on teh categories when picking them

148. /mr-new /mr-polish and merge, make charger available the default on unkown wifi networds, also seems like on the current wifi we can't see the SSID, only show the BSSID, fix this as well

148 prompts. 2 multiple-choice answers. 0 lines of code written or edited by a human.

Redactions: prompts 10 and 23 are withheld as unrelated to this project and concerning a third party's private affairs. Nothing else needed masking.

Prompts 1 to 10 produced the app as published. Prompts 11 to 23 added the power alerts, single instance enforcement, the ad-hoc signing identity fix, and cleaned up two stale builds that had been shadowing the real one in the menu bar. Prompt 24 widened the coach past SaaS into psychology and psychiatry, which meant a second and third corpus, a topic on every tip, a draw order that keeps the three mixed, and a different conversation behind the second button for each. Prompts 25 to 29 added the beacon and the overheat snooze, then chased a system load question that turned out to be partly this app leaking its own popups. Prompt 30 was a standalone brainstorm a week before the rest, and prompts 31 to 34 folded it in as charger places: the power alerts now only fire on networks marked as having a charger within reach, markable from the menu, with the place list kept out of the repo in the app's user data. Prompts 35 to 39 took the snooze back out, leaving the power card with OK and the discussion button, and the threshold question turned up that the amperage parse had been rounding every reading to a multiple of about 24 W, so the alert was tripping at half the intended draw. The reading is exact now and the threshold is derived from the battery's design capacity: it fires once the sustained current would drain a full battery in under four hours, about 25 W on a 16 inch M5 Pro. Prompts 40 to 42 stopped the menu bar reflowing: the flame became a fixed-size image slot, the countdown digits went tabular, and the result was merged and reinstalled. Prompts 43 to 48 replaced the beacon: an artifact lined up five candidate animations at the popup's real size, three of them now play at random, the spectrum analyser is held back for when music is loud, and the strip goes dark while the card is hovered. Prompt 49 put the limit back to a fixed 22 W, compared against the exact reading, so the number in the knob is finally the number the alert fires at. Prompts 50 and 51 turned the flow mode toggle into a radio group: Freebasing at the top, the timer lengths under it, exactly one checked at a time, with Stop timer folded into picking Freebasing. Prompts 52 and 53 put the Wi-Fi name on the charger menu item: the label had been showing the DHCP domain name, which a FRITZ!Box reports as fritz.box. macOS 26 hides the SSID from every shell tool without Location Services, so the name now comes out of the cached scan record that scutil still exposes. Prompt 54 was the coach opening a session from one of its own cards, and prompts 55 to 57 poked at the split, which turned out to be two thirds SaaS. Prompts 58 to 61 rebalanced the three subjects to 122 cards each, put field definitions first, added Already know this and Not interested with a per-card record behind them that the tune-up now reads, and asked for the quiz item that the next round adds. Prompts 62 and 63 landed that work on a main that had moved twice underneath it, then added Quiz me…: a menu item, available in every timer state, that opens a Claude Code session to quiz you on the cards you have seen, score it into quiz.json, retire what you clearly know and rewrite the personal cards around the gaps. Prompt 64 asked what was left, and prompts 65 to 67 followed a morning of overheat alerts: a check that the draw had dropped back under the limit, then the number itself moved into the menu bar. The median the alert is judged on now shows whenever the Mac is on battery, and the flame only flashes over 22 W. Prompt 68 put the number and the flame in the same spot: the reading is drawn into the tray image from pre-rendered glyphs of the title's own font, and above the limit the flame flashes in its place every half second. Prompts 69 to 72 added More like this, a third feedback button beside the two that retire a card: it keeps the card in play, counts the presses in the same per-card file, separately from the status so a later known mark does not erase them, and the tune-up and the quiz are both told to go further on those cards. Prompt 73 asked for text selection on the card, and prompt 74 counted the first card by hand in the app's user data, ahead of the button landing. This round adds the selection: the title, the body and the source are selectable text, one drag takes all three, a right click offers Copy and Select All, and the card only asks for focus once text has been selected, so that Cmd+C reaches it. Prompts 75 to 78 asked for a page about the mascot, animation presets for the beacon and a new name for the app, which later rounds take up. Prompt 79 asked for a landing page first, and this round put one on Cloudflare Pages: a static page in the repo, published with the card screenshot beside it, with timerbar.pascu.be attached as the project's custom domain and the CNAME in the zone left as the one step for a hand with DNS access, since the wrangler login here has none. The hidden line that names the domain when a card is copied, with its opt-out, is the separate round the same prompt asked to keep apart. Prompts 80 to 84 were written at a departure gate: a book to read offline, generated from the feedback so far, with a reader that pages, highlights and takes comments that the next edition answers. This round adds it as editions in the app's user data: every rewrite of the personal cards, the weekly tune-up, the quiz and the reader's own button, now writes a numbered cards file and a numbered book in one session, nothing there is ever overwritten, and the notes sit beside the book they were made on. The book is briefed at about two hours of reading, and the reader counts a chapter as read only once it has been paged past, into a file the next edition reads alongside the notes. Prompts 85 to 89 asked for the time to be tracked per category of work, with goals behind it. This round adds the categories: named and colored in an editor, switched from a radio group in the menu, worn by the countdown as a colored chip while a timer runs, with every segment written to a focus log in the app's user data and a Focus time submenu that reads it back as today, this week, this month and all time with the split per category. Prompts 90 to 101 were the brainstorm those prompts asked for, held in the chat over several interruptions, and the goals that came out of it. The window question was the whole of it: a fixed start date reports honestly but goes numb, a rolling window stays correctable but forgets debt. The answer was to drop the second window entirely and measure everything over the goal period, gated so it stays quiet until it has something to say. Only time with a timer actually running counts, which left the menu checking no category while Freebasing or while the expired clock flashes. The menu order carries the nudge in the ordinary case, most starved category first, with no numbers added beside the names because the menu is short on room. The card names the category to switch to and never switches for you, after eight hours in the period and ten points of gap, at most once an hour. A category at 0% keeps its history and leaves the menu, which is how one gets retired. Prompt 102 carried the ordering into the editor card itself, which had still been listing the rows in the order they happened to be stored. Prompt 103 made Quit optional: a Show Quit in menu checkbox next to Start at login, on by default, drops the Quit item when unticked and stays in the menu itself so it can be brought back, with the choice kept in the app's user data. Prompt 104 asked the label dialog to stop losing what was typed: a draft now outlives the dialog closing on a focus loss and is back the next time it opens, and a Revert button, lit only while the field differs from the saved label, puts that label back. Prompt 105 narrowed the reading down to where it is worth reading: the number and the flame now show only on battery at places not marked as having a charger, and the unit came off the number, since the menu bar has room for four characters rather than six and nothing else there is labelled either. The mascot page from prompt 75 is this round: docs/flashy.md introduces Flashy, the gold paperclip in the corner of every card, and what each button means to him. Prompts 106 and 107 put the battery in the menu, on a row that only reports: the percentage, whether the adapter is in, and a battery icon drawn beside it that fills to the same number and takes a bolt through it while it charges. Prompts 108 to 110 wired the spectrum analyser to the audio it had only been pretending to show: the card now captures the Mac's own output through Electron's loopback, the bars are a real FFT of it, and the strip blips on every beat in the bass instead of on a metronome. Prompts 76 and 77 asked for beacon presets, and this round adds six beside Hackerspace, the author's own: Arcade, Bloom, Breathe, Cardio, Lo-fi and Markets, each named for what it draws rather than for whom, chosen from survey data on what adults do with their time, the younger end where a survey splits it out, and where that skews by gender, with the animations moved out of the card page into src/beacons.js and a Beacon submenu in the tray. The hidden line from prompt 79 is this round: a line between the title and the body that the card keeps off screen but that comes along with any copy spanning it, naming timerbar.pascu.be, with Include timerbar.pascu.be in copies in the menu as the opt-out, on by default and kept in site-line.json. Prompts 111 and 112 filed the Pebble idea as an issue, and prompts 113 to 115 built it: the bridge in `src/bridge.js` that advertises the app on the local network and serves its state to a phone, and the watchapp and Android companion in their own repository under the Pebble organisation, kept private for now with a dated reminder to consider opening it. Prompts 116 to 118 came out of a card on CAC payback: the coach's own prompt, then the ask for somewhere to write on a card. This round adds Add a note: a box on the card for whatever you want to say about it, kept in the same per-card record as the other buttons with the time it was written, and the tune-up, the quiz and the reader's edition are all told to read every note as an instruction. The note that started it, that abbreviations like CAC want spelling out, went into the record by hand ahead of the button landing. Prompt 119 asked for the card to be draggable without giving up the text selection, and this round adds a handle: Flashy's column, with the dots under him, moves the card and keeps it within its display, the text beside it never does, and a card that grows while it sits somewhere else keeps its bottom edge where it was. The next card still comes to the corner. Prompt 120 made reinstalling the latest build part of every merge. Prompt 121 asked for the card to be dependable: in Freebasing, right after a timer runs out, over fullscreen apps and across displays. This round lands the schedule written for it two days earlier, which brings a card forward to seconds after the timer hits zero instead of rearming a fresh gap that the next session cut short, and puts every card on the display the pointer is on rather than the primary one. The window already sat above every Space and every fullscreen app, and stays that way. Prompt 122 asked for somewhere to put what is not about any one card, and this round adds Notes and ideas…: a card in the menu for the standing brief, kept in `ideas.json` with the time each note was written, which the weekly tune-up, the quiz and every new edition of the cards and the book now read and write themselves around, with the tune-up opening its interview on what has moved on each note. The first note, that the hard part has been launching rather than building, went in by hand once the build was installed. Prompts 123 and 124 took the tune-up off its weekly leash: Tune up the coach… sits in the menu, runs the same session on demand whatever the calendar says, and says where the schedule stands both in words and in a gauge that fills across the week. The drawing behind that gauge and behind the battery icon is one module now rather than two. Prompt 125 was the project switch card refusing to go away. A replacement card is on screen before the card it replaced reports itself closed, and that late report was clearing the coach's handle on the live card, which left Got it and Escape with nothing to close. The switch card ran into it whenever a card was already up, which in the gaps between timers it usually is, since the switch card always arrives right after one has been closed. The card on screen now lives in `src/card-slot.js`, which ignores a closed report from any window but the one it is holding. Prompt 126 put Flashy on call: Show a card now sits with the other things he does in the menu and slides the next card in whatever the timer is doing, out of the same rotation the gaps between timers draw from. The one card it holds back is the nudge about a fullscreen window hiding the menu bar, which is no use to someone who has just opened that menu. Prompt 127 takes the power card back the moment the adapter goes in. macOS says so through `powerMonitor`'s on-ac event rather than leaving it to the next thirty second sample, so the card closes there and then and a fresh reading follows it, which is what clears the draw from the menu bar and puts charging on the battery row. A reading already in flight when the adapter arrived is thrown away rather than believed, so the card cannot come back off a measurement taken a moment before the plug went in. Only power cards go: a tip or a switch card has nothing to do with the charger and stays where it is. Prompt 128 added the card for the other direction: plugged in and losing charge anyway, which is what a charger too small for the load looks like. It reads the adapter's own rating out of `AdapterDetails` to name it, waits out the same five minute median as the heavy draw card, and skips the charger places gate, since somebody plugged in is plainly somewhere with a charger. A sample where the battery is not discharging counts as zero rather than resetting the window, because a load heavy enough to outrun the adapter dips under it now and then, and requiring ten in a row would have meant a card that almost never came. The floor is 5 W, so the trickle a Mac holding at 80 percent gives back is left alone, and a window that has sat through sleep is thrown away rather than read as five minutes of anything. Prompts 129 to 131 were a harness of mine putting error dialogs on his screen: it pointed a test build at a fake home directory with no `Library/Logs` in it, so the app's own logger was the thing that crashed. Prompts 132 and 133 said to take the whole queue through to merged, and prompt 134 asked whether the repo had been through the quality bar yet. Most of it was already there from the round that added the pre-commit hook, the pinned actions and CodeQL, so what was left was coverage: `pnpm test` now fails under 100% on lines, branches and functions across every module the tests load, which is the pure logic rather than the app shell, since anything importing electron cannot be loaded by `node --test` at all. Getting there took three tests for the corners of the binary plist reader, two for the gap the tip schedule picks when nothing hands it one, two for the card pool step before any edition exists, and the deletion of a `goalTotal > 0` guard that could never be false. The power watch's sample window moved into `src/power-window.js` so the push, the trim, the median and the clearing sit under the gate too, since that is where the five minutes is actually decided. Prompt 135 turned the categories editor from a frameless floating card into a normal window: the card had grown with every row and every line of help text with no ceiling, sat 90 pixels below the top of the primary display and could be neither moved nor resized, so on a short screen Save ended up below the bottom edge with no way to reach it. It now caps itself at the work area of the screen under the pointer, scrolls the list inside a fixed header and footer, stops fitting itself to its content the moment you resize it by hand, and marks itself as allowed on fullscreen spaces so it keeps opening on the one you are in, over a fullscreen app included. Prompt 136 gave every category its own label: `task.json` now holds one label per category id, the category items in the menu read as the name followed by what you are doing in it, and switching category swaps the menu bar label with it, opening the label dialog for a category that has none while a timer is running. Prompt 137 added archiving, so a project can be dropped without losing its stats: an archived category keeps its segments and its name in Focus time, leaves the menu and the goals, and hands its share to the others in proportion, largest remainder first so the whole numbers still add up. Restoring it brings the old share back over 100 on purpose, with a button that scales everything back down in proportion, and the share arithmetic lives in `src/shares.js` under the coverage gate while the card asks the main process for it over IPC, since a renderer here cannot import a module. The card widened to 640 points so the Archive button does not squeeze the longest names. Prompt 138 made the focus log a complete timeline rather than a record of timed work alone: freebasing and the flashing after a timer runs out are now segments too, each carrying a `mode` along with the category and label picked at the time, any change of mode, category or label closes one segment and opens the next, and sleep or a locked screen closes the open one so a night away is not logged as freebasing. The open segment's marker also carries the process id, so an instance that lingers after a relaunch lets go of it instead of counting its segment twice. The category totals and goals keep counting timer time only, through a `timed` filter in `src/focus-stats.js`, while Focus time gains a line each for the other two modes. Prompt 139 made the card come up the moment a timer runs out rather than up to five seconds later, and not at all while the Mac thought you were away: the expiry now calls the coach directly, past the idle and fullscreen checks, and the tip schedule lost the `timerEnded` path it no longer needs. The expired segment that opens at that moment records which card it was, Focus time counts each run of time after an expiry once, however often a category switch split it, with the average per run, and the log measures each card from request to screen, 130 ms in the harness. Prompts 140 and 141 found why editions 0001 and 0004 were never written: every prompt the app built took a number from an in-memory counter, and an abandoned session kept it. The next edition is now read from the files in `library/` alone. Prompt 142 stopped archiving from spreading the freed share by itself: the total now drops below 100 and stays there until Redistribute to 100% or your own edits bring it back, and that button and the held Save now apply to any total other than 100, short or over, where before a short total saved as it was. Prompts 143 to 147 replaced the goal period as the measure with a rolling fourteen day window of timed work read against the current split, after a first attempt that summed every shortfall since the first day was dropped for never letting a category live down a bad week: standing is now in hours, inside a five point band a category is on track, nothing is judged below five hours, the picker shows each category's standing and lists the ones to catch up on first, the nudge card speaks in hours, and the goal periods became a look back under Focus time, each judged against the split it was set with. Prompt 148 made a charger the default on any network not marked otherwise, so the power cards and the hidden readout apply on a new network from the first minute, with `charger-places.json` now holding an explicit answer per network and older entries read as yes. It also stopped the charger item from showing a router's hardware address as a network name: the name is read from the raw bytes of the scan record when the spelled out one is empty, and a network with no readable name is called this Wi-Fi.
