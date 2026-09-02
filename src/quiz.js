import { PERSONAL_TIP_SHAPE, SOURCE_RULE } from './personal-tips.js'

const buildPrompt = ({ poolFile, tipsFile, feedbackFile, quizFile }) =>
  [
    'Quiz me on what my coach has been showing me, then use the result to retrain it. Work through this in order.',
    '',
    `1. Read ${poolFile}, the pool of cards the coach draws from, and ${tipsFile} if it exists, the personalised cards written at the last tune-up. Each card has a topic of "saas", "psychology" or "psychiatry", a title, a body and a source. Cards with "definition": true define the field or one of its core terms.`,
    '',
    `2. Read ${feedbackFile}. It is a JSON object keyed by card title with the card's topic, how many times it has been shown, and a status of "known" or "not-interested" where I marked one. Cards with a shown count are the ones I have actually seen. Leave not-interested cards out entirely.`,
    '',
    `3. Read ${quizFile} if it exists. It is a JSON array of earlier quiz sessions, each {"at": an ISO timestamp, "topics": the topics I asked for, "answers": [{"title", "topic", "correct": true or false}]}. Cards I got wrong before come first, cards I got right are a spot check, and topics I keep asking for are my topics of interest.`,
    '',
    '4. Ask me which topics I want today, defaulting to what the history and the feedback point at, and how many questions I have time for. Then quiz me one question at a time. Draw mostly from cards I have seen and not marked known, mix in a few marked known to check they stuck, and cover definitions before the finer points. Ask for the idea in my own words or for how I would apply it, never for the title. Say straight away whether I had it and what the card actually says, then move on.',
    '',
    `5. When we stop, append this session to ${quizFile} in the shape above, creating the file if it is missing. Then update ${feedbackFile}: set "status": "known" on every card I clearly had, so the coach stops showing it, and leave the ones I missed alone so they keep coming round.`,
    '',
    `6. Then rewrite ${tipsFile} as a JSON array. ${PERSONAL_TIP_SHAPE} Write 20 to 40 of them, weighted toward the topics I asked for. Aim them at the gaps the quiz exposed and at the next step in those topics: come back at what I missed from a different angle, build on what I got right, and introduce what follows. Keep cards from the old file that I have not been quizzed on yet when they still fit.`,
    '',
    SOURCE_RULE,
    '',
    'Finish by telling me the score per topic and what the new cards will push on.',
  ].join('\n')

export const quizCard = (files) => ({
  kind: 'quiz',
  title: 'Quiz me',
  prompt: buildPrompt(files),
})
