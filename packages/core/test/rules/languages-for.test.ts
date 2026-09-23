import { describe, expect, it } from 'vitest'
import { languagesFor } from '../../src/rules/languages-for.js'
import { helloWorld } from '../fixtures.js'

describe('languagesFor', () => {
  it('offers every language on an ordinary challenge', () => {
    expect(languagesFor(helloWorld.challenge)).toEqual(['typescript', 'java', 'go', 'python'])
  })

  it('offers only the languages with a reference solution when tests are hand-written', () => {
    expect(
      languagesFor({
        ...helloWorld.challenge,
        customTests: true,
        referenceSolutions: { java: 'class Solution {}' },
      }),
    ).toEqual(['java'])
  })
})
