import { describe, expect, it } from 'vitest'
import { jsonEquals } from '../../src/rules/json-equals.js'

describe('jsonEquals', () => {
  it('compares scalars', () => {
    expect(jsonEquals(18, 18)).toBe(true)
    expect(jsonEquals(18, 19)).toBe(false)
    expect(jsonEquals('BIB', 'BIB')).toBe(true)
    expect(jsonEquals(true, false)).toBe(false)
  })

  it('does not confuse a number with its string form', () => {
    expect(jsonEquals(1, '1')).toBe(false)
  })

  it('treats null as a value, not as absence', () => {
    expect(jsonEquals(null, null)).toBe(true)
    expect(jsonEquals(null, [])).toBe(false)
    expect(jsonEquals(['BIB'], null)).toBe(false)
  })

  it('keeps list order significant: a route out of order is a wrong route', () => {
    expect(jsonEquals(['BIB', 'RU', 'CE'], ['BIB', 'RU', 'CE'])).toBe(true)
    expect(jsonEquals(['BIB', 'RU', 'CE'], ['BIB', 'CE', 'RU'])).toBe(false)
  })

  it('compares list length', () => {
    expect(jsonEquals(['BIB'], ['BIB', 'CE'])).toBe(false)
  })

  it('ignores key order in objects', () => {
    expect(jsonEquals({ from: 'BIB', to: 'CE' }, { to: 'CE', from: 'BIB' })).toBe(true)
  })

  it('fails on an extra field', () => {
    expect(jsonEquals({ from: 'BIB' }, { from: 'BIB', to: 'CE' })).toBe(false)
  })

  it('fails on a missing field', () => {
    expect(jsonEquals({ from: 'BIB', to: 'CE' }, { from: 'BIB' })).toBe(false)
  })

  it('recurses through nested structures', () => {
    const left = { path: ['BIB', 'CE'], meta: { visited: 18 } }
    expect(jsonEquals(left, { path: ['BIB', 'CE'], meta: { visited: 18 } })).toBe(true)
    expect(jsonEquals(left, { path: ['BIB', 'CE'], meta: { visited: 19 } })).toBe(false)
  })

  it('does not mistake an array for an object', () => {
    expect(jsonEquals([], {})).toBe(false)
  })
})
