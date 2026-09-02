import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const SOURCE_DIRS = ['src', 'scripts']
const SCRIPT_EXTENSIONS = ['.js', '.cjs']

const scriptsIn = (dir) =>
  readdirSync(join(root, dir))
    .filter((name) => SCRIPT_EXTENSIONS.some((extension) => name.endsWith(extension)))
    .map((name) => join(dir, name))

for (const file of SOURCE_DIRS.flatMap(scriptsIn)) {
  test(`${file} parses`, () => {
    execFileSync(process.execPath, ['--check', join(root, file)], { stdio: 'pipe' })
  })
}
