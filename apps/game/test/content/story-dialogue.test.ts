import { describe, expect, it } from 'vitest'
import { storyQuests } from '../../src/renderer/src/content/story.js'

/**
 * Each quest's `success` lines are the story between one place and the next (ADR 0089):
 * said in the room once the editor closes, they tell the player where to go now. The last
 * quest leads to the ending instead.
 */
const NEXT_PLACE: Readonly<Record<string, string>> = {
  'placas-embaralhadas': 'Biblioteca',
  'arvore-do-acervo': 'Centro de Convivência',
  'fila-do-centro-de-convivencia': 'Bloco de Tecnologia',
}

describe('story dialogue', () => {
  it('points every quest but the last at the next place', () => {
    for (const [questId, place] of Object.entries(NEXT_PLACE)) {
      const quest = storyQuests.find((candidate) => candidate.id === questId)
      const said = quest?.dialogue.success.map((line) => line.text).join(' ') ?? ''
      expect(said, questId).toContain(place)
    }
  })

  it('says what the function does before the editor opens', () => {
    for (const quest of storyQuests) {
      const said = quest.dialogue.offer.map((line) => line.text.toLowerCase()).join(' ')
      expect(said, quest.id).toMatch(/fun[cç][aã]o|devolve|consulta/)
    }
  })

  it('gives every NPC something to say after their quest is done', () => {
    for (const quest of storyQuests.filter((candidate) => candidate.npc !== 'NULL')) {
      expect(quest.dialogue.afterwards, quest.id).toBeDefined()
    }
  })

  it('keeps each conversation short (docs/story.md, Ritmo)', () => {
    for (const quest of storyQuests) {
      expect(quest.dialogue.offer.length, quest.id).toBeLessThanOrEqual(6)
      expect(quest.dialogue.success.length, quest.id).toBeLessThanOrEqual(6)
    }
  })
})
