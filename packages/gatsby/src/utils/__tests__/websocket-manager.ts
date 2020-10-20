import { createServer } from "http"
import * as io from "socket.io-client"
import { WebsocketManager } from "../websocket-manager"

describe(`websocket-manager`, () => {
  let websocketManager
  let httpServerAddr

  async function getClientSocket(): Promise<typeof io.Socket> {
    return new Promise(resolve => {
      const clientSocket = io.default(
        `http://[${httpServerAddr.address}]:${httpServerAddr.port}`
      )
      clientSocket.on(`connect`, () => {
        resolve(clientSocket)
      })
    })
  }

  beforeAll(done => {
    const httpServer = createServer().listen()
    httpServerAddr = httpServer.address()

    if (typeof httpServerAddr === `string`) {
      // https://nodejs.org/api/net.html#net_server_address
      throw new Error(
        `Type guard - "address" can return string when letting up server on a pipe or Unix domain socket, which we don't use here`
      )
    } else if (!httpServerAddr) {
      throw new Error(
        `Type guard - "address" can return null in some cases, but we expect object`
      )
    }

    websocketManager = new WebsocketManager()
    websocketManager.init({ server: httpServer })

    done()
  })

  afterAll(done => {
    websocketManager.websocket.close()
    done()
  })

  it(`Can connect`, async () => {
    expect.assertions(1)
    const clientSocket = await getClientSocket()
    expect(clientSocket.connected).toBe(true)
    clientSocket.disconnect()
  })

  describe(`Active path tracking`, () => {})

  describe(`Page data`, () => {})

  describe(`Static query results`, () => {})

  describe(`Errors`, () => {
    it(`Emits errors to display by clients`, async done => {
      expect.assertions(1)

      const clientSocket = await getClientSocket()

      function handler(msg): void {
        if (
          msg.type === `overlayError` &&
          msg.payload.id === `test` &&
          msg.payload?.message?.[0]?.id === `error-code`
        ) {
          clientSocket.off(`message`, handler)
          expect(true).toBe(true)
          clientSocket.disconnect()
          done()
        }
      }

      clientSocket.on(`message`, handler)
      websocketManager.emitError(`test`, [{ id: `error-code` }])
    })

    it(`Emits stored errors to new clients`, async done => {
      expect.assertions(1)

      const clientSocket = await getClientSocket()

      function handler(msg): void {
        if (
          msg.type === `overlayError` &&
          msg.payload.id === `test` &&
          msg.payload?.message?.[0]?.id === `error-code`
        ) {
          clientSocket.off(`message`, handler)
          expect(true).toBe(true)
          clientSocket.disconnect()
          done()
        }
      }

      clientSocket.on(`message`, handler)
      // we don't emit error here, instead rely on error we emitted in previous test
    })

    it(`Can clear errors by emitting empty "overlayError" msg`, async done => {
      expect.assertions(1)

      const clientSocket = await getClientSocket()

      function handler(msg): void {
        if (
          msg.type === `overlayError` &&
          msg.payload.id === `test` &&
          msg.payload.message === null
        ) {
          clientSocket.off(`message`, handler)
          expect(true).toBe(true)
          done()
        }
      }

      clientSocket.on(`message`, handler)
      websocketManager.emitError(`test`, null)
    })
  })
})
