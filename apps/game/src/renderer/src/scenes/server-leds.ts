import type Phaser from 'phaser'

/** Where a server rack is drawn, as in tech-assets.generated.ts. */
type Rack = { x: number; y: number; width: number; height: number; depthY: number }

/** NULL's colours while it runs the racks; the network's once it is gone. */
const NULL_COLOURS = [0xc06cf0, 0xe6a6ff, 0x7ef0b0, 0x3a3556, 0x3a3556] as const
const OK_COLOURS = [0x7ef0b0, 0x4fd18f, 0x2f7a57] as const

/**
 * The LEDs on NULL's server racks, blinking (GDD §4: "racks piscando"). They sit exactly on
 * the dots scripts/render-tech-pixel-art.py draws on each rack (`server_art`: a row every
 * 8 pixels, a dot every 5), one pixel each, just above the rack. While NULL holds the
 * building they flicker fast in its purple; `restore` turns them to a slow green.
 */
export function createServerLeds(
  scene: Phaser.Scene,
  racks: readonly Rack[],
): { restore: () => void } {
  const leds: Phaser.GameObjects.Rectangle[] = []
  for (const rack of racks) {
    for (let y = 10; y < rack.height - 12; y += 8) {
      for (let x = 8; x < rack.width - 9; x += 5) {
        leds.push(
          scene.add
            .rectangle(rack.x + x, rack.y + y + 2, 1, 1, NULL_COLOURS[0])
            .setOrigin(0, 0)
            .setDepth(100 + rack.depthY + 1),
        )
      }
    }
  }

  let colours: readonly number[] = NULL_COLOURS
  let share = 0.3
  const blink = (): void => {
    for (const led of leds) {
      if (Math.random() < share) {
        led.setFillStyle(colours[Math.floor(Math.random() * colours.length)] ?? colours[0])
      }
    }
  }
  let timer = scene.time.addEvent({ delay: 140, loop: true, callback: blink })
  blink()

  return {
    restore: () => {
      colours = OK_COLOURS
      share = 0.15
      timer.remove()
      timer = scene.time.addEvent({ delay: 600, loop: true, callback: blink })
      blink()
    },
  }
}
