import { readFileSync } from 'node:fs'

const { engines } = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
const wanted = engines.node
const wantedMajor = Number(wanted.match(/\d+/)[0])
const runningMajor = Number(process.versions.node.split('.')[0])

if (runningMajor !== wantedMajor) {
  process.stderr.write(
    `Node ${process.versions.node} does not satisfy engines.node "${wanted}" (expected major ${wantedMajor})\n`,
  )
  process.exit(1)
}

process.stdout.write(`Node ${process.versions.node} satisfies engines.node "${wanted}"\n`)
