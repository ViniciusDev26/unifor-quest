// Downloads the runtimes the installer carries (ADR 0021, 0082) into
// apps/game/runtimes/<os>-<arch>/, where electron-builder picks them up (ADR 0081).
//
//   node scripts/fetch-runtimes.mjs [--target linux-x64|win-x64|mac-arm64|mac-x64]
//
// Every archive is pinned by URL and sha256 in apps/game/runtimes.lock.json, and nothing is
// used before its hash matches. Downloads are kept in runtimes/.downloads, so running it
// again only re-lays the folders. The target defaults to this machine; gopls is built from
// source with the `go` on the PATH, cross-compiled when the target is another platform.
//
// The layout is the same on every platform, which is what the main process looks for
// (apps/game/src/main/bundled-runtimes.ts):
//   go/  jdk/  python/  erlang/  elixir/  elixir-ls/  jdtls/  gopls/
// plus, on the target itself, the caches the game would otherwise build on the player's
// machine (ADR 0083): go-cache/ (a warm GOCACHE) and elixir-ls/prebuilt/ (ElixirLS compiled).
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  chmodSync,
  copyFileSync,
  createWriteStream,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { delimiter, join, resolve } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'

const ROOT = resolve(import.meta.dirname, '..')
const GAME = join(ROOT, 'apps', 'game')
const LOCK = JSON.parse(readFileSync(join(GAME, 'runtimes.lock.json'), 'utf8'))
const RUNTIMES = join(GAME, 'runtimes')
const DOWNLOADS = join(RUNTIMES, '.downloads')

const HOST = `${{ linux: 'linux', win32: 'win', darwin: 'mac' }[process.platform]}-${process.arch}`
const targetFlag = process.argv.indexOf('--target')
const TARGET = targetFlag === -1 ? HOST : process.argv[targetFlag + 1]
const [OS, ARCH] = TARGET.split('-')
const NATIVE = TARGET === HOST

const pinned = LOCK.targets[TARGET]
if (pinned === undefined) {
  throw new Error(`Unknown target: ${TARGET}. Use one of: ${Object.keys(LOCK.targets).join(', ')}`)
}
const tools = { ...pinned, ...LOCK.anyTarget }
const OUT = join(RUNTIMES, TARGET)
const STAMP = join(OUT, '.lock.json')
const wanted = JSON.stringify({ tools, gopls: LOCK.gopls })

if (existsSync(STAMP) && readFileSync(STAMP, 'utf8') === wanted) {
  console.log(`runtimes for ${TARGET} are already up to date`)
  process.exit(0)
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })
mkdirSync(DOWNLOADS, { recursive: true })

for (const [name, entry] of Object.entries(tools)) {
  const archive = await download(entry)
  lay(name, archive, entry.inside)
}
if (OS !== 'win') relocateErlang(join(OUT, 'erlang'))
buildGopls(join(OUT, 'gopls'))
if (NATIVE) {
  smokeTest()
  warmGoCache(join(OUT, 'go-cache'))
  prebuildElixirLs(join(OUT, 'elixir-ls'))
} else {
  console.warn(`no warm caches: ${TARGET} is not this machine (${HOST})`)
}

writeFileSync(STAMP, wanted)
console.log(`runtimes for ${TARGET} ready in ${OUT}`)

async function download({ url, sha256 }) {
  const file = join(DOWNLOADS, `${sha256.slice(0, 16)}-${decodeURIComponent(url.split('/').pop())}`)
  if (!existsSync(file) || hashOf(file) !== sha256) {
    console.log(`downloading ${url}`)
    const response = await fetch(url)
    if (!response.ok || response.body === null) {
      throw new Error(`Download failed for ${url}: ${response.status}`)
    }
    await pipeline(Readable.fromWeb(response.body), createWriteStream(`${file}.part`))
    renameSync(`${file}.part`, file)
  }
  const actual = hashOf(file)
  if (actual !== sha256) {
    rmSync(file)
    throw new Error(`Wrong checksum for ${url}: expected ${sha256}, got ${actual}`)
  }
  return file
}

function hashOf(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex')
}

/** Extracts an archive and moves its contents (its single top folder, if it has one) to OUT/name. */
function lay(name, archive, inside) {
  const scratch = join(RUNTIMES, '.extract', name)
  rmSync(scratch, { recursive: true, force: true })
  mkdirSync(scratch, { recursive: true })
  extract(archive, scratch)

  let root = scratch
  const entries = readdirSync(root).filter((entry) => !entry.startsWith('._'))
  if (entries.length === 1 && statSync(join(root, entries[0])).isDirectory()) {
    root = join(root, entries[0])
  }
  if (inside !== undefined) root = join(root, inside)
  if (!existsSync(root)) throw new Error(`${name}: ${inside} is not in the archive`)

  renameSync(root, join(OUT, name))
  rmSync(scratch, { recursive: true, force: true })
  console.log(`  ${name} ready`)
}

function extract(archive, into) {
  if (archive.endsWith('.zip') && process.platform === 'linux') {
    run('unzip', ['-q', archive, '-d', into])
  } else if (process.platform === 'win32') {
    // Windows' own bsdtar, which reads zip too; Git's GNU tar may come first on the PATH.
    run(join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe'), [
      '-xf',
      archive,
      '-C',
      into,
    ])
  } else {
    // bsdtar on macOS reads zip as well as tar.gz.
    run('tar', ['-xf', archive, '-C', into])
  }
}

/**
 * Erlang's `erl` and `start` scripts carry the absolute path they were installed to. The
 * game lives wherever the player put it (an AppImage even mounts at a new path on every
 * run), so each script is rewritten to find its root from its own location.
 */
function relocateErlang(dir) {
  const install = join(dir, 'Install')
  if (existsSync(install)) {
    // The Hex builds (Linux) ship unfinished: Install writes the scripts in bin/.
    run(install, ['-minimal', dir], { cwd: dir })
  }
  const scripts = [
    join(dir, 'bin'),
    ...readdirSync(dir)
      .filter((e) => e.startsWith('erts-'))
      .map((e) => join(dir, e, 'bin')),
  ]
  // From bin/ the root is one level up; from erts-*/bin/, two. Written so the same line works
  // in both, and through a symlink from one to the other.
  const relative =
    'ROOTDIR="$(cd "$(dirname "$0")/.." && pwd -P)"; ' +
    'case "$ROOTDIR" in */erts-*) ROOTDIR="$(dirname "$ROOTDIR")" ;; esac'
  for (const bin of scripts) {
    for (const script of ['erl', 'start', 'start_erl']) {
      const path = join(bin, script)
      if (!existsSync(path) || lstatSync(path).isSymbolicLink()) continue
      const text = readFileSync(path, 'utf8')
      if (!/^ROOTDIR=/m.test(text)) continue
      writeFileSync(path, text.replace(/^ROOTDIR=.*$/m, relative))
      chmodSync(path, 0o755)
    }
  }
  console.log('  erlang relocatable')
}

function buildGopls(dir) {
  const gopath = join(RUNTIMES, '.gopath')
  const exe = OS === 'win' ? 'gopls.exe' : 'gopls'
  const goos = { linux: 'linux', win: 'windows', mac: 'darwin' }[OS]
  const goarch = { x64: 'amd64', arm64: 'arm64' }[ARCH]
  // The target's own Go when it runs here, so gopls is built by the same compiler it ships with.
  const go = NATIVE ? join(OUT, 'go', 'bin', OS === 'win' ? 'go.exe' : 'go') : 'go'
  run(go, ['install', '-trimpath', `golang.org/x/tools/gopls@${LOCK.gopls}`], {
    env: {
      ...withoutGobin(process.env),
      GOPATH: gopath,
      GOOS: goos,
      GOARCH: goarch,
      CGO_ENABLED: '0',
      GOTOOLCHAIN: 'local',
      GOFLAGS: '',
    },
  })
  const built = [join(gopath, 'bin', exe), join(gopath, 'bin', `${goos}_${goarch}`, exe)].find(
    existsSync,
  )
  if (built === undefined) throw new Error('gopls was not built')
  mkdirSync(dir, { recursive: true })
  renameSync(built, join(dir, exe))
  console.log(`  gopls ${LOCK.gopls} ready`)
}

/**
 * A GOCACHE with every standard package the Go harness and the player's usual code import,
 * already compiled. The game copies it to its writable cache on the first Go run (ADR 0083),
 * so the first "Executar" in Go does not compile the standard library on the player's
 * machine — the slow part on Windows (ADR 0022). Entries do not depend on where Go is.
 */
function warmGoCache(dir) {
  const project = join(RUNTIMES, '.go-warm')
  rmSync(project, { recursive: true, force: true })
  mkdirSync(project, { recursive: true })
  writeFileSync(join(project, 'go.mod'), 'module warm\n\ngo 1.27\n')
  const packages = [
    'bufio',
    'container/heap',
    'container/list',
    'encoding/json',
    'errors',
    'fmt',
    'io',
    'maps',
    'math',
    'os',
    'slices',
    'sort',
    'strconv',
    'strings',
    'time',
    'unicode',
  ]
  writeFileSync(
    join(project, 'main.go'),
    `package main\n\nimport (\n${packages.map((p) => `\t_ "${p}"`).join('\n')}\n)\n\nfunc main() {}\n`,
  )
  const go = join(OUT, 'go', 'bin', OS === 'win' ? 'go.exe' : 'go')
  run(go, ['build', '-o', join(project, OS === 'win' ? 'warm.exe' : 'warm'), '.'], {
    cwd: project,
    env: {
      ...withoutGobin(process.env),
      GOCACHE: dir,
      CGO_ENABLED: '0',
      GOTOOLCHAIN: 'local',
      GOFLAGS: '-mod=mod',
    },
  })
  rmSync(project, { recursive: true, force: true })
  console.log('  go-cache ready')
}

/**
 * ElixirLS compiles itself on first use, through Mix.install, which needs network, Hex and
 * git (ADR 0083). It is done here instead, and only the compiled modules ship, in
 * elixir-ls/prebuilt/, next to the script the game starts it with.
 */
function prebuildElixirLs(dir) {
  const home = join(RUNTIMES, '.elixir-ls-build')
  rmSync(home, { recursive: true, force: true })
  const env = {
    ...process.env,
    PATH: [join(OUT, 'erlang', 'bin'), join(OUT, 'elixir', 'bin'), process.env.PATH].join(
      delimiter,
    ),
    MIX_HOME: join(home, 'mix'),
    HEX_HOME: join(home, 'hex'),
    MIX_INSTALL_DIR: join(home, 'installs'),
    LANG: 'C.UTF-8',
  }
  const elixir = join(OUT, 'elixir', 'bin', OS === 'win' ? 'elixir.bat' : 'elixir')
  execFileSync(elixir, [join(dir, 'quiet_install.exs')], {
    env,
    // Mix.install refuses to run inside a Mix project; this folder is not one.
    cwd: RUNTIMES,
    stdio: ['ignore', 'ignore', 'inherit'],
    // A .bat only runs through the shell (CVE-2024-27980).
    shell: OS === 'win',
  })
  const [build] = globDirs(join(home, 'installs'), 2)
    .map((d) => join(d, '_build', 'dev', 'lib'))
    .filter(existsSync)
  if (build === undefined) throw new Error('ElixirLS was not compiled')
  // Resolved: _build links priv/ back into deps/, which do not ship.
  copyResolved(build, join(dir, 'prebuilt'))
  copyFileSync(join(GAME, 'packaging', 'elixir-ls-launch.exs'), join(dir, 'launch-bundled.exs'))
  // Hex, which ElixirLS insists on finding even for a project with no dependencies; without
  // it, it asks to install it and waits for an answer that never comes.
  copyResolved(join(home, 'mix'), join(dir, 'mix-home'))
  rmSync(home, { recursive: true, force: true })
  console.log('  elixir-ls precompiled')
}

/**
 * Copies a tree with every link replaced by what it points to. `cpSync`'s `dereference`
 * is not enough on Windows: Mix links priv/ with directory junctions there, and those are
 * copied as junctions, left pointing at a folder that is about to be deleted.
 */
function copyResolved(from, to) {
  // statSync follows symlinks and junctions alike.
  if (statSync(from).isDirectory()) {
    mkdirSync(to, { recursive: true })
    for (const entry of readdirSync(from)) copyResolved(join(from, entry), join(to, entry))
  } else {
    copyFileSync(from, to)
  }
}

/** Every directory exactly `depth` levels under `root`. */
function globDirs(root, depth) {
  let level = [root]
  for (let i = 0; i < depth; i++) {
    level = level.flatMap((dir) =>
      readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => join(dir, entry.name)),
    )
  }
  return level
}

/** GOBIN (set by mise, for one) would send the binary elsewhere, and Go refuses it when cross-compiling. */
function withoutGobin(environment) {
  const { GOBIN: _ignored, ...rest } = environment
  return rest
}

/** On the target itself, each runtime is asked for its version: a broken layout fails here. */
function smokeTest() {
  const exe = (path) => (OS === 'win' ? `${path}.exe` : path)
  const checks = [
    [exe(join(OUT, 'go', 'bin', 'go')), ['version']],
    [exe(join(OUT, 'jdk', 'bin', 'java')), ['-version']],
    [
      OS === 'win' ? join(OUT, 'python', 'python.exe') : join(OUT, 'python', 'bin', 'python3'),
      ['--version'],
    ],
    [
      exe(join(OUT, 'erlang', 'bin', 'erl')),
      ['-noshell', '-eval', 'io:format("~s~n", [erlang:system_info(otp_release)]), halt().'],
    ],
    [exe(join(OUT, 'gopls', 'gopls')), ['version']],
  ]
  for (const [command, args] of checks) {
    const result = spawnSync(command, args, { encoding: 'utf8' })
    if (result.status !== 0) {
      throw new Error(`${command} does not run: ${result.error ?? result.stderr}`)
    }
    console.log(`  ok: ${(result.stdout || result.stderr).trim().split('\n')[0]}`)
  }
}

function run(command, args, options = {}) {
  execFileSync(command, args, { stdio: ['ignore', 'ignore', 'inherit'], ...options })
}
