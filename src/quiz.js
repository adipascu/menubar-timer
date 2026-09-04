import { SOURCE_RULE, bookStep, cardsStep, historyStep, poolStep, quizStep } from './edition.js'

const buildPrompt = ({ poolFile, feedbackFile, quizFile, library }) => {
  const { cardsFile, bookFile } = library.nextEdition()
  return [
    'Quiz me on what my coach has been showing me, then use the result to retrain it. Work through this in order.',
    '',
    poolStep(1, poolFile, library),
    '',
    `2. Read ${feedbackFile}. It is a JSON object keyed by card title with the card's topic, how many times it has been shown, a status of "known" or "not-interested" where I marked one, and an "interested" count where I asked for more like it. Cards with a shown count are the ones I have actually seen. Leave not-interested cards out entirely, even when they also carry an interested count. Interested cards are the ones I asked for more of, so make sure they come up.`,
    '',
    quizStep(3, quizFile, 'Cards I got wrong before come first, cards I got right are a spot check, and topics I keep asking for are my topics of interest.'),
    '',
    historyStep(4, library),
    '',
    '5. Ask me which topics I want today, defaulting to what the history and the feedback point at, and how many questions I have time for. Then quiz me one question at a time. Draw mostly from cards I have seen and not marked known, mix in a few marked known to check they stuck, and cover definitions before the finer points. Ask for the idea in my own words or for how I would apply it, never for the title. Say straight away whether I had it and what the card actually says, then move on.',
    '',
    `6. When we stop, append this session to ${quizFile} in the shape above, creating the file if it is missing. Then update ${feedbackFile}: set "status": "known" on every card I clearly had, so the coach stops showing it, and leave the ones I missed alone so they keep coming round.`,
    '',
    cardsStep(
      7,
      cardsFile,
      'Weight them toward the topics I asked for. Aim them at the gaps the quiz exposed and at the next step in those topics: come back at what I missed from a different angle, build on what I got right, go further on the cards I marked interested, and introduce what follows. Keep cards from the last edition that I have not been quizzed on yet when they still fit.',
    ),
    '',
    bookStep(8, bookFile),
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
