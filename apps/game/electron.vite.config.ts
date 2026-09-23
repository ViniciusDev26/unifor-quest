import { defineConfig, externalizeDepsPlugin } from 'electron-vite'

// Os pacotes do proprio monorepo sao empacotados junto do main, em vez de externalizados:
// eles sao ESM, o main e CJS, e empacotar evita depender de require(esm) em runtime.
const workspacePackages = [
  '@unifor-quest/core',
  '@unifor-quest/runner',
  '@unifor-quest/lang-typescript',
]

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin({ exclude: workspacePackages })],
  },
  preload: {
    plugins: [externalizeDepsPlugin({ exclude: workspacePackages })],
  },
  renderer: {},
})
