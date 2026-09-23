import { existsSync, readdirSync, realpathSync } from 'node:fs'
import { delimiter, dirname, join } from 'node:path'
import { env } from './env'

/**
 * Starts the Java language server without needing anything the game does not already ship.
 *
 * The distribution comes with a `bin/jdtls` launcher, and that launcher is a **Python
 * script**. Using it would mean a Java game that requires Python on the player's machine,
 * which is exactly what this project refuses (ADR 0046). So the Equinox launcher is invoked
 * directly, by the same JVM the game already carries to run Java challenges — the server
 * costs no second runtime (ADR 0051).
 */
export function jdtlsCommand(
  javaExecutable: string,
  dataDir: string,
): {
  executable: string
  args: string[]
  env: Record<string, string>
} | null {
  const install = findInstall()
  if (install === undefined) {
    return null
  }

  const launcher = findLauncher(install)
  const configuration = join(install, configurationFolder())

  if (launcher === undefined || !existsSync(configuration)) {
    return null
  }

  const javaHome = dirname(dirname(javaExecutable))

  return {
    executable: javaExecutable,
    args: [
      '-Declipse.application=org.eclipse.jdt.ls.core.id1',
      '-Dosgi.bundles.defaultStartLevel=4',
      '-Declipse.product=org.eclipse.jdt.ls.core.product',
      '-Dosgi.checkConfiguration=true',
      `-Dosgi.sharedConfiguration.area=${configuration}`,
      '-Dosgi.sharedConfiguration.area.readOnly=true',
      '-Dosgi.configuration.cascaded=true',
      '-Xms1g',
      '--add-modules=ALL-SYSTEM',
      '--add-opens',
      'java.base/java.util=ALL-UNNAMED',
      '--add-opens',
      'java.base/java.lang=ALL-UNNAMED',
      '-jar',
      launcher,
      '-data',
      dataDir,
    ],
    env: { JAVA_HOME: javaHome, PATH: `${join(javaHome, 'bin')}${delimiter}${env.PATH ?? ''}` },
  }
}

/**
 * Where the server was unpacked. In development it is found through the `PATH`, by
 * following the launcher back to the directory above `bin`; a packaged build will point
 * straight at the copy inside the app (ADR 0021).
 */
function findInstall(): string | undefined {
  const launcherName = process.platform === 'win32' ? 'jdtls.bat' : 'jdtls'

  for (const entry of (env.PATH ?? '').split(delimiter)) {
    if (entry === '') {
      continue
    }

    const candidate = join(entry, launcherName)
    if (existsSync(candidate)) {
      // The entry may be a symlink into the real distribution.
      return dirname(dirname(realpathSync(candidate)))
    }
  }

  return undefined
}

/** The jar carries its version in the file name, so it has to be looked up. */
function findLauncher(install: string): string | undefined {
  const plugins = join(install, 'plugins')
  if (!existsSync(plugins)) {
    return undefined
  }

  const jar = readdirSync(plugins).find(
    (name) => name.startsWith('org.eclipse.equinox.launcher_') && name.endsWith('.jar'),
  )

  return jar === undefined ? undefined : join(plugins, jar)
}

/** The distribution ships one configuration folder per platform and architecture. */
function configurationFolder(): string {
  const arm = process.arch === 'arm64'

  if (process.platform === 'win32') {
    return 'config_win'
  }
  if (process.platform === 'darwin') {
    return arm ? 'config_mac_arm' : 'config_mac'
  }
  return arm ? 'config_linux_arm' : 'config_linux'
}
