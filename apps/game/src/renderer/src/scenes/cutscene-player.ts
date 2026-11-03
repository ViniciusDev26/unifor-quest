import type { Cutscene, CutsceneStep, TilePoint } from '@unifor-quest/core'
import Phaser from 'phaser'
import type { DialogueBox } from './dialogue-box.js'
import { ensureWalkAnimations, facing, PLAYER_SCALE, walkKey } from './player.js'

const TILE_SIZE = 16
/** Slower than the player's own 180 px/s: a cutscene is watched, not raced through. */
const WALK_SPEED = 90

/**
 * A visual effect the scene knows how to draw, asked for by name from a `cue` step. Calls
 * `done` when it is over — at once for something instant, later for an animation.
 */
export type Cue = (scene: Phaser.Scene, done: () => void) => void

export type CutsceneCast = {
  /** Actors already in the scene when the cutscene starts (the player), by the steps' id. */
  onStage: ReadonlyMap<string, Phaser.GameObjects.Sprite>
  /** Texture key of each actor a `spawn` step may bring in; the scene preloads them. */
  offstage: Readonly<Record<string, string>>
}

export type CutscenePlayer = {
  /** True while a cutscene runs — the scene locks movement and E on it. */
  readonly active: boolean
  /** Performs the steps in sequence and calls `onDone` after the last one. */
  play: (cutscene: Cutscene, onDone: () => void) => void
}

/**
 * Performs a cutscene (ADR 0066): the steps are data from `core`, and this is the only
 * place that turns them into tweens, camera fades and the dialogue box. Each step ends
 * before the next one begins.
 *
 * A step naming an actor or a cue the scene does not have is a developer error, and it
 * fails loud before the first step plays rather than halfway through or not at all.
 *
 * Esc still pauses: the pause menu freezes the scene's clock and tweens, which are what
 * `wait` and `move` run on, so the cutscene stops with it.
 */
export function createCutscenePlayer(
  scene: Phaser.Scene,
  options: {
    cast: CutsceneCast
    cues: Readonly<Record<string, Cue>>
    dialogueBox: DialogueBox
  },
): CutscenePlayer {
  const actors = new Map(options.cast.onStage)
  let active = false

  const perform = (step: CutsceneStep, next: () => void): void => {
    switch (step.kind) {
      case 'say':
        options.dialogueBox.show(step.lines, next)
        return

      case 'wait':
        scene.time.delayedCall(step.ms, next)
        return

      case 'spawn': {
        const texture = options.cast.offstage[step.actor]
        if (texture === undefined) {
          throw new Error(`unknown cutscene actor: ${step.actor}`)
        }
        ensureWalkAnimations(scene, texture)
        const at = toPixels(step.at)
        const sprite = scene.add.sprite(at.x, at.y, texture, 0)
        sprite.setScale(PLAYER_SCALE)
        sprite.setDepth(1)
        actors.set(step.actor, sprite)
        next()
        return
      }

      case 'despawn':
        actorNamed(step.actor).destroy()
        actors.delete(step.actor)
        next()
        return

      case 'move': {
        const sprite = actorNamed(step.actor)
        const to = toPixels(step.to)
        const dx = to.x - sprite.x
        const dy = to.y - sprite.y
        const distance = Math.hypot(dx, dy)
        if (distance === 0) {
          next()
          return
        }
        sprite.anims.play(walkKey(sprite.texture.key, facing(dx, dy)), true)
        scene.tweens.add({
          targets: sprite,
          x: to.x,
          y: to.y,
          duration: (distance / WALK_SPEED) * 1000,
          onComplete: () => {
            sprite.anims.stop()
            next()
          },
        })
        return
      }

      case 'fade': {
        const camera = scene.cameras.main
        if (step.direction === 'out') {
          camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, next)
          camera.fadeOut(step.ms, 0, 0, 0)
        } else {
          camera.once(Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE, next)
          camera.fadeIn(step.ms, 0, 0, 0)
        }
        return
      }

      case 'cue': {
        const cue = options.cues[step.name]
        if (cue === undefined) {
          throw new Error(`unknown cutscene cue: ${step.name}`)
        }
        cue(scene, next)
        return
      }

      default: {
        const unreachable: never = step
        throw new Error(`unknown cutscene step: ${JSON.stringify(unreachable)}`)
      }
    }
  }

  const actorNamed = (id: string): Phaser.GameObjects.Sprite => {
    const sprite = actors.get(id)
    if (sprite === undefined) {
      throw new Error(`cutscene actor is not on stage: ${id}`)
    }
    return sprite
  }

  return {
    get active() {
      return active
    },

    play(cutscene, onDone) {
      checkCast(cutscene, options.cast, actors, options.cues)
      active = true

      const run = (index: number): void => {
        const step = cutscene.steps[index]
        if (step === undefined) {
          active = false
          onDone()
          return
        }
        perform(step, () => run(index + 1))
      }

      run(0)
    },
  }
}

function toPixels(point: TilePoint): { x: number; y: number } {
  return { x: point.x * TILE_SIZE, y: point.y * TILE_SIZE }
}

/**
 * Walks the steps without performing them, tracking who is on stage, so a missing actor
 * or cue is reported before anything moves on screen.
 */
function checkCast(
  cutscene: Cutscene,
  cast: CutsceneCast,
  actors: ReadonlyMap<string, unknown>,
  cues: Readonly<Record<string, Cue>>,
): void {
  const present = new Set(actors.keys())
  const problems: string[] = []

  for (const step of cutscene.steps) {
    switch (step.kind) {
      case 'spawn':
        if (cast.offstage[step.actor] === undefined) {
          problems.push(`spawn of unknown actor "${step.actor}"`)
        } else if (present.has(step.actor)) {
          problems.push(`spawn of "${step.actor}", already on stage`)
        }
        present.add(step.actor)
        break
      case 'despawn':
      case 'move':
        if (!present.has(step.actor)) {
          problems.push(`${step.kind} of "${step.actor}", not on stage`)
        }
        if (step.kind === 'despawn') {
          present.delete(step.actor)
        }
        break
      case 'cue':
        if (cues[step.name] === undefined) {
          problems.push(`unknown cue "${step.name}"`)
        }
        break
      case 'say':
      case 'wait':
      case 'fade':
        break
      default: {
        const unreachable: never = step
        throw new Error(`unknown cutscene step: ${JSON.stringify(unreachable)}`)
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(`cutscene "${cutscene.id}" cannot play here: ${problems.join('; ')}`)
  }
}
