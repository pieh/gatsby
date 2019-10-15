import { Action, LogAction, IPCMessage } from "gatsby"

const assertOptionalString = (a?: string) => {}
const assertRequiredString = (a: string) => {}
const assertOptionalNumber = (a?: number) => {}
const assertRequiredNumber = (a: number) => {}

const a = (something: IPCMessage) => {
  something.notInType // not allowed

  switch (something.type) {
    case `LOG_ACTION`: {
      something.notInType // not allowed

      switch (something.action.type) {
        case `SET_STATUS`: {
          assertRequiredString(something.action.timestamp)

          // hacky way to verify possible statuses
          switch (something.action.payload) {
            case `IN_PROGRESS`:
            case `INTERRUPTED`:
            case `SUCCESS`:
            case `FAILED`:
            case `wat`: // this should be not allowed
              break
            default:
              break
          }
          return
        }
        case `LOG`: {
          assertRequiredString(something.action.timestamp)
          assertRequiredString(something.action.payload.text)

          switch (something.action.payload.level) {
            case `INFO`:
            case `WARNING`: {
              assertRequiredString(something.action.payload.text)
              break
            }
            case `ERROR`: {
              assertOptionalString(something.action.payload.code)
              assertOptionalString(something.action.payload.type)
              assertOptionalString(something.action.payload.filePath)

              if (something.action.payload.location) {
                assertRequiredNumber(
                  something.action.payload.location.start.line
                )
              }
            }
            case `LOG`: // this should be not allowed
            case `SUCCESS`: // this should be not allowed
            case `DEBUG`: // this should be not allowed
            case `VERBOSE`: // this should be not allowed
            case `wat`: // this should be not allowed
          }
        }
      }
    }
    case `not_LOG_ACTION`: {
      // this should be not allowed
    }
  }
}

// && something.payload.level === "ERROR") {
//   something.payload.
// }
