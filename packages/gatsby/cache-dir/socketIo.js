import io from "socket.io-client"
import { reportError, clearError } from "./error-overlay-handler"
// import normalizePagePath from "./normalize-page-path"
import { invalidatePageDb } from "./loader"

let socket = null

const inFlightGetPageDataPromiseCache = {}
let staticQueryData = {}
let pageQueryData = {}

export const getStaticQueryData = () => staticQueryData
export const getPageQueryData = () => pageQueryData

window.getPageQueryData = getPageQueryData
window.inFlightGetPageDataPromiseCache = inFlightGetPageDataPromiseCache
export default function socketIo() {
  if (process.env.NODE_ENV !== `production`) {
    if (!socket) {
      // Try to initialize web socket if we didn't do it already
      try {
        // force websocket as transport
        socket = io({
          transports: [`websocket`],
        })

        // when websocket fails, we'll try polling
        socket.on(`reconnect_attempt`, () => {
          socket.io.opts.transports = [`polling`, `websocket`]
        })

        const didDataChange = (msg, queryData) => {
          const id = msg.type === msg.payload.id
          return (
            !(id in queryData) ||
            JSON.stringify(msg.payload.result) !== JSON.stringify(queryData[id])
          )
        }

        socket.on(`connect`, () => {
          // we might have disconnected so we loop over the page-data requests in flight
          // so we can get the data again
          Object.keys(inFlightGetPageDataPromiseCache).forEach(pathname => {
            socket.emit(`getDataForPath`, pathname)
          })
        })

        socket.on(`message`, msg => {
          if (msg.type === `staticQueryResult`) {
            if (didDataChange(msg, staticQueryData)) {
              staticQueryData = {
                ...staticQueryData,
                [msg.payload.id]: msg.payload.result,
              }
            }
          } else if (msg.type === `pageQueryResult`) {
            if (didDataChange(msg, pageQueryData)) {
              pageQueryData = {
                ...pageQueryData,
                [msg.payload.id]: msg.payload.result,
              }
            }
          } else if (msg.type === `overlayError`) {
            if (msg.payload.message) {
              reportError(msg.payload.id, msg.payload.message)
            } else {
              clearError(msg.payload.id)
            }
          } else if (msg.type === `invalidateQueryResults`) {
            console.log(`invalidating query results`, {
              payload: msg.payload,
              pageQueryData,
              pageDb: window._pageDb,
            })
            pageQueryData = {
              ...pageQueryData,
            }
            msg.payload.forEach(id => {
              delete pageQueryData[id]
            })
            invalidatePageDb(msg.payload)

            console.log(`invalidated query results`, {
              pageQueryData,
              pageDb: window._pageDb,
            })
          }

          if (msg.type && msg.payload) {
            ___emitter.emit(msg.type, msg.payload)
          }
        })

        // Prevents certain browsers spamming XHR 'ERR_CONNECTION_REFUSED'
        // errors within the console, such as when exiting the develop process.
        socket.on(`disconnect`, () => {
          console.warn(`[socket.io] Disconnected from dev server.`)
        })
      } catch (err) {
        console.error(`Could not connect to socket.io on dev server.`)
      }
    }
    return socket
  } else {
    return null
  }
}

// window.printCaches = () => {
//   console.log(`Caches`, {
//     pageQueryData,
//     inFlightGetPageDataPromiseCache,
//     pageDb: window._pageDb,
//   })
// }

function getPageData(pathname) {
  // console.log(`calling getPageData`, pathname)
  // pathname = normalizePagePath(pathname)
  if (inFlightGetPageDataPromiseCache[pathname]) {
    // console.log(`calling getPageData - returning inflight`, {
    //   pathname,
    //   promise: inFlightGetPageDataPromiseCache[pathname],
    // })
    return inFlightGetPageDataPromiseCache[pathname]
  } else {
    inFlightGetPageDataPromiseCache[pathname] = new Promise(resolve => {
      if (pageQueryData[pathname]) {
        // console.log(`calling getPageData - returning from cache`, {
        //   pathname,
        //   promise: pageQueryData[pathname],
        // })
        delete inFlightGetPageDataPromiseCache[pathname]
        resolve(pageQueryData[pathname])
      } else {
        if (!socket) {
          // hack - socket is not initiated yet
          socketIo()
        }
        const onPageDataCallback = msg => {
          if (
            msg.type === `pageQueryResult` &&
            msg.requestedPath === pathname
          ) {
            socket.off(`message`, onPageDataCallback)
            delete inFlightGetPageDataPromiseCache[pathname]
            // console.log(`calling getPageData - response from websocket`, {
            //   pathname,
            //   resolved: pageQueryData[msg.payload.id],
            // })
            resolve(pageQueryData[msg.payload.id])
          }
        }
        socket.on(`message`, onPageDataCallback)

        // console.log(`calling getPageData - asking websocket`, {
        //   pathname,
        // })
        socket.emit(`getDataForPath`, pathname)
      }
    })
  }
  return inFlightGetPageDataPromiseCache[pathname]
}

// Tell websocket-manager.js the new path we're on.
// This will help the backend prioritize queries for this
// path.
function registerPath(path) {
  socket.emit(`registerPath`, path)
}

// Unregister the former path
function unregisterPath(path) {
  socket.emit(`unregisterPath`, path)
}

export { getPageData, registerPath, unregisterPath }
