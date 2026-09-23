import { describe, expect, it } from 'vitest'
import { createFrameReader, encodeFrame } from '../src/framing.js'
import type { LspMessage } from '../src/protocol.js'

function frame(payload: unknown): Buffer {
  const body = Buffer.from(JSON.stringify(payload), 'utf8')
  return Buffer.concat([Buffer.from(`Content-Length: ${body.byteLength}\r\n\r\n`), body])
}

function collect(): { reader: ReturnType<typeof createFrameReader>; seen: LspMessage[] } {
  const seen: LspMessage[] = []
  return { reader: createFrameReader((message) => seen.push(message)), seen }
}

describe('createFrameReader', () => {
  it('reads one message', () => {
    const { reader, seen } = collect()
    reader.push(frame({ jsonrpc: '2.0', method: 'initialized', params: {} }))
    expect(seen).toHaveLength(1)
    expect(seen[0]?.method).toBe('initialized')
  })

  it('reads several messages arriving in a single chunk', () => {
    const { reader, seen } = collect()
    reader.push(
      Buffer.concat([
        frame({ jsonrpc: '2.0', method: 'a' }),
        frame({ jsonrpc: '2.0', method: 'b' }),
        frame({ jsonrpc: '2.0', method: 'c' }),
      ]),
    )
    expect(seen.map((message) => message.method)).toEqual(['a', 'b', 'c'])
  })

  it('waits for a message split across chunks', () => {
    const { reader, seen } = collect()
    const whole = frame({ jsonrpc: '2.0', method: 'split' })

    reader.push(whole.subarray(0, 10))
    expect(seen).toHaveLength(0)

    reader.push(whole.subarray(10, whole.length - 5))
    expect(seen).toHaveLength(0)

    reader.push(whole.subarray(whole.length - 5))
    expect(seen.map((message) => message.method)).toEqual(['split'])
  })

  it('counts the body in bytes, not characters', () => {
    const { reader, seen } = collect()
    // Every accented character costs two bytes: slicing by length would cut it in half.
    reader.push(frame({ jsonrpc: '2.0', method: 'x', params: { texto: 'ação não série' } }))
    expect(seen[0]?.params).toEqual({ texto: 'ação não série' })
  })

  it('skips a header it cannot read and recovers on the next message', () => {
    const { reader, seen } = collect()
    reader.push(Buffer.from('Nonsense: 3\r\n\r\n'))
    reader.push(frame({ jsonrpc: '2.0', method: 'depois' }))
    expect(seen.map((message) => message.method)).toEqual(['depois'])
  })

  it('drops a body that is not JSON without losing what follows', () => {
    const { reader, seen } = collect()
    reader.push(Buffer.from('Content-Length: 3\r\n\r\nnot'))
    reader.push(frame({ jsonrpc: '2.0', method: 'depois' }))
    expect(seen.map((message) => message.method)).toEqual(['depois'])
  })
})

describe('encodeFrame', () => {
  it('announces the byte length, and the reader agrees', () => {
    const { reader, seen } = collect()
    reader.push(encodeFrame({ jsonrpc: '2.0', method: 'ida e volta', params: { acentuação: 1 } }))
    expect(seen[0]?.method).toBe('ida e volta')
  })
})
