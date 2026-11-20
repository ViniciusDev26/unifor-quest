/**
 * What the credits scene rolls after the ending (ADR 0076). Content, not scene code: the
 * scene only knows how to scroll a list of sections. Third-party art and sound are the ones
 * whose licence asks for, or deserves, a credit (assets/<pack>/LICENSE*).
 */
export type CreditsSection = {
  heading: string
  lines: readonly string[]
}

export const credits: readonly CreditsSection[] = [
  {
    heading: 'UNIFOR Quest',
    lines: ['Um jogo feito para uma disciplina da Universidade de Fortaleza.'],
  },
  {
    heading: 'Equipe',
    lines: ['Carlos Vinicius', 'Daniel Lucio de Castro', 'Henrique', 'GuiAbrunheiro'],
  },
  {
    heading: 'Música',
    lines: ['15 Melodic RPG Chiptunes — Aureolus_Omicron (CC0)'],
  },
  {
    heading: 'Efeitos sonoros',
    lines: ['Interface Sounds, RPG Audio e Sci-fi Sounds — Kenney (CC0)'],
  },
  {
    heading: 'Prédios do campus',
    lines: ['Gerados por modelo de imagem (GPT Image) e reduzidos a pixel art'],
  },
  {
    heading: 'Obrigado por jogar!',
    lines: ['O campus está a salvo. Até o próximo semestre.'],
  },
]
