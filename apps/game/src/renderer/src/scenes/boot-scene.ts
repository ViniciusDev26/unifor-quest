import Phaser from 'phaser'

/** Empty scene: it exists only to prove the Electron + Vite + Phaser pipeline runs. */
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
