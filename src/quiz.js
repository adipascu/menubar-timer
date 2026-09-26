import { SOURCE_RULE, bookStep, cardsStep, historyStep, ideasStep, poolStep, quizStep } from './edition.js'

const buildPrompt = ({ poolFile, feedbackFile, ideasFile, quizFile, library }) => {
  const { cardsFile, bookFile } = library.nextEdition()
  return [
    'Quiz me on what my coach has been showing me, then use the result to retrain it. Work through this in order.',
    '',
    poolStep(1, poolFile, library),
    '',
    `2. Read ${feedbackFile}. It is a JSON object keyed by card title. Each entry carries the card's topic, "shown", how many times it has been shown, and two logs. "showings" has one record per time the card came up since I started logging them: its "number", "shownAt", "via" for how it came up ("schedule", "on-demand", "timer-ran-out", or "again" when I asked to see it again), then "closedAt" and "closedBy" for when and how it went away (one of the feedback actions below, "got-it", "escape", "discuss", "opened-source", "timer-started" when I started the timer, "on-track" when the timer ran out but I was still on it and restarted it from the card, "replaced" by another card, "dropped", "quit" or "window-closed"). "feedback" is every button I pressed on the card, oldest first, each with an "action" of "known" when I said I already knew it, "not-interested" when I said I did not want it, "interested" when I asked for more like it, "useful" when it taught me something, or "note" with the "text" I typed, plus the time "at" and the "showing" number it was given on. Feedback from before the showings were logged has no showing number. The same card can carry the same action many times and actions that disagree, since I see it again and change my mind: read them in order, count repeats as weight, and where they disagree the later one is where I stand now. The gap between "shownAt" and "closedAt" is how long I sat with a card, and a showing with no "closedAt" was cut off by the app stopping without a clean quit. Cards with a shown count are the ones I have actually seen. Leave out cards whose latest verdict is not-interested. Interested cards are the ones I asked for more of, so make sure they come up. Useful cards taught me something new, so check that it stuck. A note says what I wanted from a card, so honour it in the questions on that card and in the cards you write after.`,
    '',
    ideasStep(3, ideasFile),
    '',
    quizStep(
      4,
      quizFile,
      'Cards I got wrong before come first, cards I got right are a spot check, and topics I keep asking for are my topics of interest.',
    ),
    '',
    historyStep(5, library),
    '',
    '6. Ask me which topics I want today, defaulting to what the history and the feedback point at, and how many questions I have time for. Then quiz me one question at a time. Draw mostly from cards I have seen and not marked known, mix in a few marked known to check they stuck, and cover definitions before the finer points. Ask for the idea in my own words or for how I would apply it, never for the title. Say straight away whether I had it and what the card actually says, then move on.',
    '',
    `7. When we stop, append this session to ${quizFile} in the shape above, creating the file if it is missing. Then update ${feedbackFile}: append {"action": "known", "at": the current ISO timestamp, "by": "quiz"} to the "feedback" of every card I clearly had, keeping everything already there, so the coach stops showing it, and leave the ones I missed alone so they keep coming round.`,
    '',
    cardsStep(
      8,
      cardsFile,
      'Weight them toward the topics I asked for. Aim them at the gaps the quiz exposed and at the next step in those topics: come back at what I missed from a different angle, build on what I got right, go further on the cards I marked interested, and introduce what follows. Keep cards from the last edition that I have not been quizzed on yet when they still fit.',
    ),
    '',
    bookStep(9, bookFile),
    '',
    SOURCE_RULE,
    '',
    'Finish by telling me the score per topic, what the new cards will push on and what the book covers, one line per chapter.',
  ].join('\n')
}

export const quizCard = (sources) => ({
  kind: 'quiz',
  title: 'Quiz me',
  prompt: () => buildPrompt(sources),
})
