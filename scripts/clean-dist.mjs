// Removes the `dist` of whichever package is running it.
//
// It used to be an inline `node -e` inside each package's build script, with nested quotes
// that cmd.exe on Windows does not survive. A file has no quoting problem.

import { rmSync } from 'node:fs'

rmSync('dist', { recursive: true, force: true })
