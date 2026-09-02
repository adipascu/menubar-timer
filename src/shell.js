import { execFile } from 'node:child_process'

const COMMAND_TIMEOUT_MS = 5000

export const run = (command, args, input = '') =>
  new Promise((resolve) => {
    const child = execFile(command, args, { timeout: COMMAND_TIMEOUT_MS }, (error, stdout) =>
      resolve(error ? '' : stdout),
    )
    child.stdin.on('error', () => {})
    child.stdin.end(input)
  })
