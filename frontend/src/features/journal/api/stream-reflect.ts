export interface StreamHandlers {
  onChunk: (value: string) => void
  onDone: () => void
  onError: (message: string) => void
}

export const streamReflect = (entryId: string, handlers: StreamHandlers): (() => void) => {
  const source = new EventSource(`/api/v1/journal/entries/${entryId}/reflect/stream`)

  source.addEventListener('chunk', (event) => {
    try {
      if (!(event instanceof MessageEvent) || typeof event.data !== 'string') {
        handlers.onError('Unable to parse stream chunk')
        return
      }
      const payload = JSON.parse(event.data) as { text?: string }
      if (payload.text) handlers.onChunk(payload.text)
    } catch {
      handlers.onError('Unable to parse stream chunk')
    }
  })
  source.addEventListener('done', () => {
    handlers.onDone()
    source.close()
  })
  source.addEventListener('error', (event) => {
    const data = (event as MessageEvent).data
    handlers.onError(typeof data === 'string' ? data : 'Streaming failed')
    source.close()
  })
  source.onmessage = (event) => {
    if (event.data === '[DONE]') {
      handlers.onDone()
      source.close()
    }
  }

  return () => source.close()
}
