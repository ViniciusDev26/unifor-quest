import type { api } from './index.js'

/**
 * The shape the renderer sees. This file is not named `index.d.ts` on purpose: TypeScript
 * treats a `.d.ts` sitting next to a `.ts` of the same name as that file's output and
 * ignores it, so the global augmentation would silently never apply.
 */
declare global {
  interface Window {
    api: typeof api
  }
}
