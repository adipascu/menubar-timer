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

export const feedbackStep = (number, feedbackFile) =>
  `${number}. Read ${feedbackFile}. It is a JSON object keyed by card title. Each entry carries the card's topic, how many times it has been shown, a status of "known" when I said I already knew it or "not-interested" when I said I did not want it, and an "interested" count of how many times I asked for more like it. Known cards are learned, so build on them rather than repeating them. Not-interested cards tell you which angles to drop, and that verdict wins over any interested count on the same card. Interested cards are the ones to go deeper on, the higher the count the more so: write what follows from them, the ideas next to them and the sources behind them. Cards shown many times without a mark are the ones I keep sitting with, so those themes are still open.`

export const quizStep = (number, quizFile, aim) => `${number}. Read ${quizFile} if it exists. ${QUIZ_SHAPE} ${aim}`

export const historyStep = (number, library) =>
  `${number}. Look through the earlier editions in ${library.dir}. cards-0001.json and up are the popups the coach showed before, book-0001.json and up are the books written alongside them, each notes-0001.json holds what I marked while reading that book, and each reading-0001.json lists the chapters of it I finished. A note is keyed by chapter and section index, both counted from zero, so "2.3" is the fourth section of the third chapter. "highlighted" true means that passage landed and I want more in that direction. "comment" is what I said about it, and every comment is an instruction for this edition: answer it, go further, or drop the thread when that is what I asked. "finished" is the list of chapter indexes I paged past, and what I did not finish tells you as much as what I marked: an edition I stopped partway through was too long, off target or both, so look at where I stopped and what came after it, and bring back what still matters in a shape I will get through. Never edit or delete an earlier edition or its notes, they are the record of where I was.`

export const cardsStep = (number, cardsFile, aim) =>
  `${number}. Then write my new cards to ${cardsFile} as a JSON array. ${CARD_SHAPE} Write 20 to 40 of them. ${aim}`

export const bookStep = (number, bookFile) =>
  `${number}. Then write my book to ${bookFile}. I read it where there is no network, on a flight or a train, so everything I need has to be in the file: write the ideas out in full rather than pointing at a link, and use the links as citations only. ${BOOK_SHAPE} Make it about two hours of reading at a normal pace, around thirty thousand words: ten to twelve chapters of five or six sections each, and every section around five hundred words that teaches one thing properly, with the reasoning and the examples, not a card. Build it from the same material as the cards: go deep on what I asked for more of, build on what I already know rather than repeating it, leave out what I marked not interested, answer every comment from the earlier editions and give every highlighted passage a sequel.`

const buildPrompt = ({ poolFile, feedbackFile, quizFile, library }) => {
  const { cardsFile, bookFile } = library.nextEdition()
  return [
    'Write me a new edition: a fresh set of cards for the coach to show while I work, and a book to read where the cards cannot reach me. Work through this in order.',
    '',
    poolStep(1, poolFile, library),
    '',
    feedbackStep(2, feedbackFile),
    '',
    quizStep(3, quizFile, 'What I got wrong still needs teaching, and the topics I keep asking for are my topics of interest.'),
    '',
    historyStep(4, library),
    '',
    '5. Tell me in a few sentences what you found, then ask me one thing and no more: what this edition should lean into. Then get on with it.',
    '',
    cardsStep(
      6,
      cardsFile,
      'Go further on what I asked for more of, come back at what I got wrong in the quiz from a different angle, build on what I know, drop what I said I did not want, and keep cards from the last edition that I have not seen yet when they still fit.',
    ),
    '',
    bookStep(7, bookFile),
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
