import type Phaser from 'phaser'

/** The minimap's size on screen, in screen pixels; the campus keeps its own proportions. */
const WIDTH = 212
const MARGIN = 12
const TITLE_HEIGHT = 18
const DEPTH = 1950

export type CampusMinimap = {
  /** Screen-space root: the scene places and counter-scales it with the rest of the HUD. */
  container: Phaser.GameObjects.Container
  /** Where the minimap's top-left corner goes on screen, before the zoom correction. */
  anchor: () => { x: number; y: number }
  /** Moves the player's dot; called every frame. */
  follow: (x: number, y: number) => void
  setVisible: (visible: boolean) => void
}

/**
 * The minimap Marcos hands over with the first quest (#16): the whole campus in a corner of
 * the screen, the player as a dot, and the door of the next objective pulsing, so the way to
 * the next building is always on screen. The picture is the same pre-shrunk overview the M
 * map uses; this only draws it smaller.
 */
export function createCampusMinimap(
  scene: Phaser.Scene,
  options: {
    mapWidth: number
    mapHeight: number
    /** The door of the building the story goes to next, in map pixels, if there is one. */
    objective: { x: number; y: number; name: string } | undefined
  },
): CampusMinimap {
  const height = Math.round((WIDTH * options.mapHeight) / options.mapWidth)
  const toMini = (x: number, y: number): { x: number; y: number } => ({
    x: (x / options.mapWidth) * WIDTH,
    y: TITLE_HEIGHT + (y / options.mapHeight) * height,
  })

  const container = scene.add.container(0, 0).setScrollFactor(0).setDepth(DEPTH)
  container.add(
    scene.add
      .rectangle(-4, -4, WIDTH + 8, TITLE_HEIGHT + height + 8, 0x0b1626, 0.86)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0x7aa2ff, 0.9),
  )
  container.add(
    scene.add
      .text(2, 1, 'MINIMAPA', {
        fontFamily: 'monospace',
        fontSize: '11px',
        fontStyle: 'bold',
        color: '#cfe0ff',
      })
      .setOrigin(0, 0),
  )
  container.add(
    scene.add
      .image(0, TITLE_HEIGHT, 'campus-overview')
      .setOrigin(0, 0)
      .setDisplaySize(WIDTH, height),
  )

  if (options.objective !== undefined) {
    const at = toMini(options.objective.x, options.objective.y)
    const ring = scene.add.circle(at.x, at.y, 6).setStrokeStyle(2, 0xffd34d, 1)
    const core = scene.add.circle(at.x, at.y, 3, 0xffd34d)
    container.add([ring, core])
    scene.tweens.add({
      targets: ring,
      scale: 1.9,
      alpha: 0,
      duration: 1100,
      repeat: -1,
    })
    container.add(
      scene.add
        .text(WIDTH - 2, 1, options.objective.name.toUpperCase(), {
          fontFamily: 'monospace',
          fontSize: '10px',
          color: '#ffd34d',
        })
        .setOrigin(1, 0),
    )
  }

  const dot = scene.add.circle(0, 0, 3.5, 0xffffff).setStrokeStyle(1.5, 0x1d3a6b)
  container.add(dot)

  return {
    container,
    anchor: () => ({
      x: scene.scale.width - WIDTH - MARGIN,
      y: scene.scale.height - TITLE_HEIGHT - height - MARGIN,
    }),
    follow: (x, y) => {
      const at = toMini(x, y)
      dot.setPosition(at.x, at.y)
    },
    setVisible: (visible) => {
      container.setVisible(visible)
    },
  }
}
