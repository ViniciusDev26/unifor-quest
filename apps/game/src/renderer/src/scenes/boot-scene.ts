import Phaser from 'phaser'

/** Cena vazia: existe apenas para provar que o pipeline Electron + Vite + Phaser roda. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  create(): void {
    this.add
      .text(this.scale.width / 2, this.scale.height / 2, 'UNIFOR Quest', {
        fontFamily: 'monospace',
        fontSize: '32px',
        color: '#e8e8f0',
      })
      .setOrigin(0.5)
  }
}
