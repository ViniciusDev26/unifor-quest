import { type Quest, questSchema } from '@unifor-quest/core'

/**
 * The quest that closes Phase A (ADR 0029). It is not game content: it exists to prove the
 * whole cycle runs — open the challenge, write code, execute, pass, complete, apply the
 * effect. Its text is in Portuguese because the player reads it (ADR 0031).
 */
export const helloWorldQuest: Quest = questSchema.parse({
  id: 'hello-world',
  title: 'Primeiras palavras',
  npc: 'Monitor',
  dialogue: {
    offer: [
      {
        speaker: 'Monitor',
        text: 'Todo mundo comeca por aqui. Escreve uma funcao que cumprimenta alguem pelo nome.',
      },
      {
        speaker: 'Monitor',
        text: 'Se eu passar o nome "Vini", ela devolve "Ola, Vini!". Simples assim.',
      },
    ],
    success: [
      {
        speaker: 'Monitor',
        text: 'Funcionou. Voce acabou de rodar seu proprio codigo dentro do jogo.',
      },
    ],
  },
  challenge: {
    functionName: 'greet',
    parameters: [{ name: 'name', type: { kind: 'string' } }],
    returns: { kind: 'string' },
    cases: [
      { name: 'Cumprimenta pelo nome', input: ['Vini'], expected: 'Ola, Vini!' },
      { name: 'Funciona com outro nome', input: ['Ana'], expected: 'Ola, Ana!' },
      { name: 'Nome vazio', input: [''], expected: 'Ola, !' },
    ],
    referenceSolutions: {
      typescript: 'export function greet(name: string): string {\n  return `Ola, ${name}!`\n}\n',
      go: 'package main\n\nfunc greet(name string) string {\n\treturn "Ola, " + name + "!"\n}\n',
      python: 'def greet(name: str) -> str:\n    return f"Ola, {name}!"\n',
      java: 'public class Solution {\n    public static String greet(String name) {\n        return "Ola, " + name + "!";\n    }\n}\n',
    },
  },
  onSuccess: [{ kind: 'setFlag', flag: 'falou-com-o-monitor' }],
})
