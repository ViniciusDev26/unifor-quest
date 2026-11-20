// electron-builder `afterPack` hook (ADR 0084): signs the macOS app ad hoc with Apple's own
// codesign, instead of letting electron-builder do it.
//
// electron-builder's signer (@electron/osx-sign) first opens every file of the bundle at
// once to find the binaries, and with the runtimes inside (tens of thousands of files) that
// ran out of file descriptors on CI (EMFILE), no matter the ulimit. codesign walks the
// bundle one file at a time. The runtimes' own executables already carry the ad-hoc
// signature their linkers give them on Apple Silicon; this seals the app around them.
const { execFileSync } = require('node:child_process')
const { join } = require('node:path')

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'darwin') {
    return
  }
  const app = join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`)
  execFileSync('codesign', ['--force', '--deep', '--sign', '-', app], { stdio: 'inherit' })
  execFileSync('codesign', ['--verify', '--deep', '--strict', app], { stdio: 'inherit' })
  console.log(`  • signed ad hoc  file=${app}`)
}
