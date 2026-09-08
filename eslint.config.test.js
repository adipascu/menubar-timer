import test from 'node:test'
import assert from 'node:assert/strict'
import { ESLint } from 'eslint'

const eslint = new ESLint()

const resolve = async (file) => {
  const { languageOptions, plugins, rules } = await eslint.calculateConfigForFile(file)
  return {
    sourceType: languageOptions.sourceType,
    globals: languageOptions.globals ?? {},
    plugins: Object.keys(plugins ?? {}),
    rules,
  }
}

const nodeOnlyGlobals = ['process', '__dirname', 'require']
const browserOnlyGlobals = ['window', 'document', 'requestAnimationFrame']

test('main process modules run as ES modules with node globals', async () => {
  const { sourceType, globals } = await resolve('src/main.js')

  assert.equal(sourceType, 'module')
  for (const name of nodeOnlyGlobals) assert.ok(name in globals, `expected ${name} to be defined`)
  for (const name of browserOnlyGlobals) assert.ok(!(name in globals), `expected ${name} to be undefined`)
})

test('preload scripts run as commonjs with node globals', async () => {
  const { sourceType, globals } = await resolve('src/popup-preload.cjs')

  assert.equal(sourceType, 'commonjs')
  assert.ok('require' in globals)
  assert.ok(!('window' in globals))
})

test('renderer scripts loaded by a script tag get browser globals and no node globals', async () => {
  const { sourceType, globals } = await resolve('src/beacons.js')

  assert.equal(sourceType, 'script')
  for (const name of browserOnlyGlobals) assert.ok(name in globals, `expected ${name} to be defined`)
  for (const name of nodeOnlyGlobals) assert.ok(!(name in globals), `expected ${name} to be undefined`)
})

test('renderer html is linted by the html plugin with browser globals', async () => {
  const { sourceType, globals, plugins } = await resolve('src/popup.html')

  assert.equal(sourceType, 'script')
  assert.ok(plugins.includes('html'))
  for (const name of browserOnlyGlobals) assert.ok(name in globals, `expected ${name} to be defined`)
  assert.ok(!('process' in globals))
})

const authoredCode = [
  'src/main.js',
  'src/beacons.js',
  'src/popup-preload.cjs',
  'src/popup.html',
  'scripts/assert-node-version.js',
]

test('unused variables are an error everywhere authored code lives', async () => {
  for (const file of authoredCode) {
    const { rules } = await resolve(file)
    const [severity] = rules['no-unused-vars']

    assert.equal(severity, 2, `expected no-unused-vars to be an error for ${file}`)
  }
})

test('console is banned everywhere authored code lives', async () => {
  for (const file of authoredCode) {
    const { rules } = await resolve(file)
    const [severity] = rules['no-console']

    assert.equal(severity, 2, `expected no-console to be an error for ${file}`)
  }
})

test('build output and agent scratch directories are not linted', async () => {
  for (const path of ['dist/main.js', '.claude/worktrees/scratch/src/main.js']) {
    assert.ok(await eslint.isPathIgnored(path), `expected ${path} to be ignored`)
  }
})
