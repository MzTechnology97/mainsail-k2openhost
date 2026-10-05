import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebSocketClient } from '@/plugins/webSocketClient'

class FakeWebSocket {
    static readonly CONNECTING = 0
    static readonly OPEN = 1
    static readonly CLOSING = 2
    static readonly CLOSED = 3

    static instances: FakeWebSocket[] = []

    readonly url: string
    readyState = FakeWebSocket.CONNECTING
    onopen: ((event: Event) => void) | null = null
    onclose: ((event: CloseEvent) => void) | null = null
    onerror: ((event: Event) => void) | null = null
    onmessage: ((event: MessageEvent) => void) | null = null

    constructor(url: string) {
        this.url = url
        FakeWebSocket.instances.push(this)
    }

    open(): void {
        this.readyState = FakeWebSocket.OPEN
        this.onopen?.({} as Event)
    }

    close(): void {
        this.serverClose(true)
    }

    serverClose(wasClean = false): void {
        this.readyState = FakeWebSocket.CLOSED
        this.onclose?.({ wasClean } as CloseEvent)
    }

    send(): void {
        // No-op for connection lifecycle tests.
    }
}

const createStore = () =>
    ({
        dispatch: vi.fn(),
        state: {
            socket: {
                initializationList: [],
            },
        },
    }) as any

describe('WebSocketClient reconnect handling', () => {
    beforeEach(() => {
        vi.useFakeTimers()
        FakeWebSocket.instances = []
        vi.stubGlobal('window', globalThis)
        vi.stubGlobal('WebSocket', FakeWebSocket)
    })

    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

    it('reconnects after an unexpected clean close', async () => {
        const client = new WebSocketClient({
            url: 'ws://printer/websocket',
            store: createStore(),
            reconnectInterval: 1000,
        })

        await client.connect()
        FakeWebSocket.instances[0].open()
        FakeWebSocket.instances[0].serverClose(true)

        await vi.advanceTimersByTimeAsync(999)
        expect(FakeWebSocket.instances).toHaveLength(1)

        await vi.advanceTimersByTimeAsync(1)
        expect(FakeWebSocket.instances).toHaveLength(2)
    })

    it('does not reconnect after an explicit close', async () => {
        const store = createStore()
        const client = new WebSocketClient({
            url: 'ws://printer/websocket',
            store,
            reconnectInterval: 1000,
        })

        await client.connect()
        FakeWebSocket.instances[0].open()
        client.close()

        await vi.advanceTimersByTimeAsync(20000)

        expect(FakeWebSocket.instances).toHaveLength(1)
        expect(store.dispatch).toHaveBeenCalledWith('socket/onClose')
    })

    it('reconnects when the heartbeat expires', async () => {
        const client = new WebSocketClient({
            url: 'ws://printer/websocket',
            store: createStore(),
            reconnectInterval: 1000,
        })

        await client.connect()
        FakeWebSocket.instances[0].open()

        await vi.advanceTimersByTimeAsync(client.heartbeatTimeout)
        expect(FakeWebSocket.instances[0].readyState).toBe(FakeWebSocket.CLOSED)

        await vi.advanceTimersByTimeAsync(1000)
        expect(FakeWebSocket.instances).toHaveLength(2)
    })

    it('keeps slow background retries after the normal retry budget is exhausted', async () => {
        const store = createStore()
        const client = new WebSocketClient({
            url: 'ws://printer/websocket',
            store,
            maxReconnects: 1,
            reconnectInterval: 1000,
        })

        await client.connect()
        FakeWebSocket.instances[0].serverClose(false)

        await vi.advanceTimersByTimeAsync(1000)
        expect(FakeWebSocket.instances).toHaveLength(2)

        FakeWebSocket.instances[1].serverClose(false)
        expect(store.dispatch).toHaveBeenCalledWith('socket/onClose', expect.anything())

        await vi.advanceTimersByTimeAsync(9999)
        expect(FakeWebSocket.instances).toHaveLength(2)

        await vi.advanceTimersByTimeAsync(1)
        expect(FakeWebSocket.instances).toHaveLength(3)
    })
})
