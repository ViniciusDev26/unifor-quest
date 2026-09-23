import type { LanguageAdapter, LanguageId } from '@unifor-quest/core'
import { goAdapter } from '@unifor-quest/lang-go'
import { typescriptAdapter } from '@unifor-quest/lang-typescript'

/** The adapters this build ships. Adding a language is adding one entry here (ADR 0003). */
export const adapters: readonly LanguageAdapter[] = [typescriptAdapter, goAdapter]

export function adapterFor(language: LanguageId): LanguageAdapter | undefined {
  return adapters.find((adapter) => adapter.id === language)
}
