import { type LspMessage, lspMessageSchema } from './protocol.js'

const HEADER_SEPARATOR = '\r\n\r\n'
const CONTENT_LENGTH = /content-length:\s*(\d+)/i

export type FrameReader = {
  /** Feeds whatever arrived on stdout; complete messages come back through `onMessage`. */
  push: (chunk: Buffer) => void
}

/**
 * Reassembles JSON-RPC messages from a stream.
 *
 * A language server writes `Content-Length: N\r\n\r\n` followed by exactly N bytes, and a
 * chunk from the pipe respects none of that: it can hold half a message, three messages, or
 * a header split down the middle. The length is in **bytes**, not characters, which is why
 * the buffer is sliced before being decoded.
 */
export function createFrameReader(onMessage: (message: LspMessage) => void): FrameReader {
  let pending = Buffer.alloc(0)

  return {
    push(chunk) {
      pending = Buffer.concat([pending, chunk])

      for (;;) {
        const headerEnd = pending.indexOf(HEADER_SEPARATOR)
        if (headerEnd === -1) {
          return
        }

        const header = pending.subarray(0, headerEnd).toString('ascii')
        const bodyStart = headerEnd + HEADER_SEPARATOR.length
        const declared = CONTENT_LENGTH.exec(header)?.[1]

        if (declared === undefined) {
          // A header we cannot make sense of: drop it and look for the next message.
          pending = pending.subarray(bodyStart)
          continue
        }

        const length = Number(declared)
        if (pending.length < bodyStart + length) {
          // The body has not arrived in full yet.
          return
        }

        const body = pending.subarray(bodyStart, bodyStart + length).toString('utf8')
        pending = pending.subarray(bodyStart + length)

        let parsed: unknown
        try {
          parsed = JSON.parse(body)
        } catch {
          continue
        }

        const message = lspMessageSchema.safeParse(parsed)
        if (message.success) {
          onMessage(message.data)
        }
      }
    },
  }
}

/** Frames one message for writing to a server's stdin. */
export function encodeFrame(message: LspMessage): Buffer {
  const body = Buffer.from(JSON.stringify(message), 'utf8')
  return Buffer.concat([
    Buffer.from(`Content-Length: ${body.byteLength}${HEADER_SEPARATOR}`, 'ascii'),
    body,
  ])
}
