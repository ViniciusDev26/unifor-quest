// Small helper for building a `terrain` grid by describing straight segments instead of
// typing 40 lines of ASCII art by hand. Used by every map description in this directory.

export function createGrid(width, height, fill = '.') {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill))
}

/** Draws a straight horizontal or vertical segment. Diagonal calls are a mistake, not a line. */
export function line(grid, x1, y1, x2, y2, char = '#') {
  if (x1 !== x2 && y1 !== y2) {
    throw new Error(`line is not straight: (${x1},${y1}) -> (${x2},${y2})`)
  }

  if (x1 === x2) {
    const [from, to] = y1 <= y2 ? [y1, y2] : [y2, y1]
    for (let y = from; y <= to; y++) {
      grid[y][x1] = char
    }
  } else {
    const [from, to] = x1 <= x2 ? [x1, x2] : [x2, x1]
    for (let x = from; x <= to; x++) {
      grid[y1][x] = char
    }
  }
}

export function toRows(grid) {
  return grid.map((row) => row.join(''))
}
