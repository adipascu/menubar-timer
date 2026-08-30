const { execFileSync } = require('node:child_process')
const { join } = require('node:path')

exports.default = async ({ appOutDir, packager }) => {
  const appPath = join(appOutDir, `${packager.appInfo.productFilename}.app`)
  const identifier = packager.appInfo.id

  execFileSync('codesign', ['--force', '--sign', '-', '--identifier', identifier, appPath], {
    stdio: 'inherit',
  })

  process.stdout.write(`ad-hoc signed ${appPath} as ${identifier}\n`)
}
