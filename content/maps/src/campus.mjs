// The campus map: the one that carries the graph (ADR 0012). Layout follows the real
// campus (unifor.br/mapa-campus, "mapa_geral_2026"): the entrance sits where the paths
// fan out, the sports cluster is off to one side, the library/convivência/auditório
// cluster together, and Centro de Dados sits where TEC Unifor is on the real map — it and
// Prédio do Servidor/Sala 404 are the one fictional addition (see ADR 0058).
//
// Buildings are placed on a coarse 3x3 grid of plots (40x34 tiles each) so that even the
// two largest stamps (28x28 tiles) never touch: half of 28 is 14, and adjacent plots are
// 40 (or 34) tiles apart, center to center.

import { createGrid, line, toRows } from './grid.mjs'

const TILE = 16
const PLOT_W = 40
const PLOT_H = 34

const plotCenter = (col, row) => [col * PLOT_W + PLOT_W / 2, row * PLOT_H + PLOT_H / 2]

const [entrX, entrY] = plotCenter(2, 0)
const [bibX, bibY] = plotCenter(2, 1)
const [ccvX, ccvY] = plotCenter(1, 1)
const [audX, audY] = plotCenter(1, 2)
const [ceX, ceY] = plotCenter(0, 0)
const [cdX, cdY] = plotCenter(0, 2)
const [lagX, lagY] = plotCenter(0, 1)

const WIDTH = 3 * PLOT_W
const HEIGHT = 3 * PLOT_H

function footprint(centerX, centerY, tiles) {
  const half = tiles / 2
  return {
    x: (centerX - half) * TILE,
    y: (centerY - half) * TILE,
    width: tiles * TILE,
    height: tiles * TILE,
  }
}

const buildings = [
  { id: 'biblioteca', label: 'Biblioteca', asset: 'house_large', ...footprint(bibX, bibY, 28) },
  {
    id: 'centro-de-convivencia',
    label: 'Centro de Convivência',
    asset: 'house_small',
    ...footprint(ccvX, ccvY, 20),
  },
  { id: 'auditorio', label: 'Auditório', asset: 'house_large_alt', ...footprint(audX, audY, 28) },
  {
    id: 'centro-esportivo',
    label: 'Centro Esportivo',
    asset: 'house_small_alt',
    ...footprint(ceX, ceY, 20),
  },
  {
    id: 'centro-de-dados',
    label: 'Centro de Dados',
    asset: 'hospital',
    ...footprint(cdX, cdY, 24),
  },
  {
    id: 'portao-esquerdo',
    label: 'Entrada',
    asset: 'gate_pillar',
    x: (entrX - 5) * TILE,
    y: (entrY - 4) * TILE,
    width: 4 * TILE,
    height: 8 * TILE,
  },
  {
    id: 'portao-direito',
    label: 'Entrada',
    asset: 'gate_pillar',
    x: (entrX + 1) * TILE,
    y: (entrY - 4) * TILE,
    width: 4 * TILE,
    height: 8 * TILE,
  },
]

const shapes = [
  {
    id: 'lagoa',
    label: 'Lagoa',
    kind: 'ellipse',
    color: '#3b82c4',
    x: (lagX - 7) * TILE,
    y: (lagY - 4) * TILE,
    width: 14 * TILE,
    height: 8 * TILE,
  },
]

const grid = createGrid(WIDTH, HEIGHT, '.')
const lPath = (x1, y1, x2, y2) => {
  line(grid, x1, y1, x2, y1, '#')
  line(grid, x2, y1, x2, y2, '#')
}

lPath(entrX, entrY, bibX, bibY)
lPath(entrX, entrY, audX, audY)
lPath(entrX, entrY, ceX, ceY)
lPath(entrX, entrY, cdX, cdY)
lPath(cdX, cdY, lagX, lagY)
lPath(bibX, bibY, ccvX, ccvY)
lPath(audX, audY, ccvX, ccvY)

const distance = (ax, ay, bx, by) => Math.round(Math.hypot(ax - bx, ay - by) * TILE)

const nodes = [
  { id: 'ENTR', label: 'Entrada e Praça Central', x: entrX * TILE, y: entrY * TILE },
  { id: 'BIB', label: 'Biblioteca', x: bibX * TILE, y: bibY * TILE },
  { id: 'CCV', label: 'Centro de Convivência', x: ccvX * TILE, y: ccvY * TILE },
  { id: 'AUD', label: 'Auditório', x: audX * TILE, y: audY * TILE },
  { id: 'CE', label: 'Centro Esportivo', x: ceX * TILE, y: ceY * TILE },
  { id: 'CD', label: 'Centro de Dados', x: cdX * TILE, y: cdY * TILE },
  { id: 'LAG', label: 'Lagoa', x: lagX * TILE, y: lagY * TILE },
]

const edges = [
  { from: 'ENTR', to: 'BIB', weight: distance(entrX, entrY, bibX, bibY) },
  { from: 'ENTR', to: 'AUD', weight: distance(entrX, entrY, audX, audY) },
  { from: 'ENTR', to: 'CE', weight: distance(entrX, entrY, ceX, ceY) },
  { from: 'ENTR', to: 'CD', weight: distance(entrX, entrY, cdX, cdY) },
  { from: 'CD', to: 'LAG', weight: distance(cdX, cdY, lagX, lagY) },
  { from: 'BIB', to: 'CCV', weight: distance(bibX, bibY, ccvX, ccvY) },
  { from: 'AUD', to: 'CCV', weight: distance(audX, audY, ccvX, ccvY) },
]

/** @type {import('@unifor-quest/campus').MapDescription} */
export const campusDescription = {
  id: 'campus',
  tileset: 'world',
  width: WIDTH,
  height: HEIGHT,
  terrain: toRows(grid),
  buildings,
  shapes,
  graph: { nodes, edges },
}
