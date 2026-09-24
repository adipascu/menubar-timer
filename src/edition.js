import { daysBetween } from './tune-up.js'

const CARD_SHAPE =
  'Each entry is {"topic": one of "saas", "psychology" or "psychiatry", "title": a short imperative line, "body": two or three sentences, "source": where the idea comes from, "url": a real link or omitted}.'

const BOOK_SHAPE =
  'The file is {"title": the book\'s title, "subtitle": one line on what it covers, "chapters": [{"title": the chapter title, "topic": one of "saas", "psychology" or "psychiatry", "sections": [{"heading": a short line, "body": the writing itself, with paragraphs separated by blank lines, "source": where it comes from, "url": a real link or omitted}]}]}.'

const QUIZ_SHAPE =
  'It is a JSON array of earlier quiz sessions, each {"at": an ISO timestamp, "topics": the topics I asked for, "answers": [{"title", "topic", "correct": true or false}]}.'

export const SOURCE_RULE =
  'Anything you file under "psychology" or "psychiatry" has to come from a real source you can link, stay inside what that source supports, and never read as a diagnosis. Point me at a professional instead when that is the honest answer.'

export const poolStep = (number, poolFile, library) => {
  const latestCards = library.latestCardsFile()
  return `${number}. Read ${poolFile}, the pool of cards the coach draws from${latestCards ? `, and ${latestCards}, the personalised cards written for the last edition` : ''}. Each card has a topic of "saas", "psychology" or "psychiatry", a title, a body and a source. Cards with "definition": true define the field or one of its core terms.`
}

const feedbackStep = (number, feedbackFile) =>
  `${number}. Read ${feedbackFile}. It is a JSON object keyed by card title. Each entry carries the card's topic, "shown", how many times it has been shown, and two logs. "showings" has one record per time the card came up since I started logging them: its "number", "shownAt", "via" for how it came up ("schedule", "on-demand", "timer-ran-out", or "again" when I asked to see it again), then "closedAt" and "closedBy" for when and how it went away (one of the feedback actions below, "got-it", "escape", "discuss", "opened-source", "timer-started" when I started the timer, "replaced" by another card, "dropped", "quit" or "window-closed"). "feedback" is every button I pressed on the card, oldest first, each with an "action" of "known" when I said I already knew it, "not-interested" when I said I did not want it, "interested" when I asked for more like it, "useful" when it taught me something, or "note" with the "text" I typed, plus the time "at" and the "showing" number it was given on. Feedback from before the showings were logged has no showing number. The same card can carry the same action many times and actions that disagree, since I see it again and change my mind: read them in order, count repeats as weight, and where they disagree the later one is where I stand now. The gap between "shownAt" and "closedAt" is how long I sat with a card, and a showing with no "closedAt" was cut off by the app stopping without a clean quit. Known cards are learned, so build on them rather than repeating them. Not-interested cards tell you which angles to drop. Interested cards are the ones to go deeper on, the more often I asked the more so: write what follows from them, the ideas next to them and the sources behind them. Useful cards are ones I learned from, which is not the same as wanting more of them: they show the depth, the sources and the kind of idea that actually lands for me, so write at that level, and treat what they taught as newly learned, building on it rather than repeating it. Every note is an instruction for this edition, whatever else the card is marked: answer it, explain what it asks about, or take the card where it points. Cards shown many times without any feedback are the ones I keep sitting with, so those themes are still open.`

export const ideasStep = (number, ideasFile) =>
  `${number}. Read ${ideasFile} if it exists. It is a JSON array of the notes and ideas I wrote about myself rather than about any one card, each {"text": what I wrote, "at": an ISO timestamp}, oldest first. This is the standing brief: what I am building, where I am stuck, what I want the coaching aimed at. Every note is an instruction for this edition, so answer it in the cards and the book rather than filing it as background, and where two of them pull in different directions the later one wins.`

export const quizStep = (number, quizFile, aim) => `${number}. Read ${quizFile} if it exists. ${QUIZ_SHAPE} ${aim}`

export const historyStep = (number, library) =>
  `${number}. Look through the earlier editions in ${library.dir}. cards-0001.json and up are the popups the coach showed before, book-0001.json and up are the books written alongside them, each notes-0001.json holds what I marked while reading that book, and each reading-0001.json lists the chapters of it I finished. A note is keyed by chapter and section index, both counted from zero, so "2.3" is the fourth section of the third chapter. "highlighted" true means that passage landed and I want more in that direction. "comment" is what I said about it, and every comment is an instruction for this edition: answer it, go further, or drop the thread when that is what I asked. "finished" is the list of chapter indexes I paged past, and what I did not finish tells you as much as what I marked: an edition I stopped partway through was too long, off target or both, so look at where I stopped and what came after it, and bring back what still matters in a shape I will get through. Never edit or delete an earlier edition or its notes, they are the record of where I was.`

export const cardsStep = (number, cardsFile, aim) =>
  `${number}. Then write my new cards to ${cardsFile} as a JSON array. ${CARD_SHAPE} Write 20 to 40 of them. ${aim}`

export const bookStep = (number, bookFile) =>
  `${number}. Then write my book to ${bookFile}. I read it where there is no network, on a flight or a train, so everything I need has to be in the file: write the ideas out in full rather than pointing at a link, and use the links as citations only. ${BOOK_SHAPE} Make it about two hours of reading at a normal pace, around thirty thousand words: ten to twelve chapters of five or six sections each, and every section around five hundred words that teaches one thing properly, with the reasoning and the examples, not a card. Build it from the same material as the cards: go deep on what I asked for more of, build on what I already know and on what the useful cards taught me rather than repeating it, leave out what I marked not interested, answer every comment from the earlier editions and give every highlighted passage a sequel.`

const onDay = (at) => new Date(at).toISOString().slice(0, 10)

const howLongAgo = (since, now) => {
  const days = daysBetween(Date.parse(onDay(since)), Date.parse(onDay(now)))
  if (days === 0) return 'earlier today'
  return days === 1 ? 'yesterday' : `${days} days ago`
}

export const tuneUpPrompt = ({ feedbackFile, ideasFile, library }, since, now) => {
  const { cardsFile, bookFile } = library.nextEdition()
  const lastTunedOn = onDay(since)
  return [
    `Time to tune my coaching. The last tune-up was ${lastTunedOn}, ${howLongAgo(since, now)}. Work through this in order.`,
    '',
    `1. Read my Claude Code session history on disk to work out what I have actually been doing since ${lastTunedOn}. The transcripts are JSONL files under ~/.claude/projects/, one directory per project path and one .jsonl file per session. Use modification times to find the sessions active since then. They are large, so sample the most recently active ones rather than reading everything. Work out what I am building, what I keep getting stuck on, and where my time is actually going.`,
    '',
    feedbackStep(2, feedbackFile),
    '',
    ideasStep(3, ideasFile),
    '',
    historyStep(4, library),
    '',
    '5. Tell me in a few sentences what you found, then interview me. Start from the notes and ideas: take each one in turn and ask what has moved on it since I wrote it. Then ask what making money with SaaS actually means for me, what "there" looks like and by when, where I am struggling right now, what I have already tried, and what my real constraints are in time, money, skill and risk. Then ask about the other half of it: how the working itself has been going, what my attention, sleep and stress have been like, and what keeps draining me. Ask one question at a time and keep going until you genuinely have enough to coach me well rather than generically.',
    '',
    cardsStep(
      6,
      cardsFile,
      'Spread them evenly across the three topics. They must be specific to my situation, my goal and where I am stuck, and together they should form a path from where I am now to where I said I want to be. Mix concrete next actions with the principles behind them.',
    ),
    '',
    bookStep(7, bookFile),
    '',
    SOURCE_RULE,
    '',
    'The cards become the popups that interrupt me while I work all week, so make every one worth the interruption, and the book is what I read when the popups cannot reach me.',
  ].join('\n')
}

const buildPrompt = ({ poolFile, feedbackFile, ideasFile, quizFile, library }) => {
  const { cardsFile, bookFile } = library.nextEdition()
  return [
    'Write me a new edition: a fresh set of cards for the coach to show while I work, and a book to read where the cards cannot reach me. Work through this in order.',
    '',
    poolStep(1, poolFile, library),
    '',
    feedbackStep(2, feedbackFile),
    '',
    ideasStep(3, ideasFile),
    '',
    quizStep(
      4,
      quizFile,
      'What I got wrong still needs teaching, and the topics I keep asking for are my topics of interest.',
    ),
    '',
    historyStep(5, library),
    '',
    '6. Tell me in a few sentences what you found, then ask me one thing and no more: what this edition should lean into. Then get on with it.',
    '',
    cardsStep(
      7,
      cardsFile,
      'Go further on what I asked for more of, come back at what I got wrong in the quiz from a different angle, build on what I know, drop what I said I did not want, and keep cards from the last edition that I have not seen yet when they still fit.',
    ),
    '',
    bookStep(8, bookFile),
    '',
    SOURCE_RULE,
    '',
    'Finish by telling me what the new cards push on and what the book covers, one line per chapter.',
  ].join('\n')
}

export const editionCard = (sources) => ({
  kind: 'edition',
  title: 'New edition',
  prompt: () => buildPrompt(sources),
})
