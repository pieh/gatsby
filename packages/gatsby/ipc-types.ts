interface BaseLogObject {
  /**
   * Log text content
   */
  text: string
}

type GenericLogObject = BaseLogObject & {
  level: "WARNING" | "INFO"
}

type ActivityLogObject = BaseLogObject & {
  level: "ACTIVITY_SUCCESS" | "ACTIVITY_FAILED" | "ACTIVITY_INTERRUPTED"
  /**
   * Any additional text meant to be displayed along main "text"
   * Can contain content like "10/10 1.23/s" (as meaningful result of running activity)
   */
  statusText?: string
  /**
   * Time from start to finish of activity in seconds
   */
  duration: number

  activity_uuid: string
  activity_type: string
  activity_current?: number
  activity_total?: number
}

interface Position {
  line: number
  column?: number
}

type ErrorLogObject = BaseLogObject & {
  level: `ERROR`
  /**
   * Error code. Not all errors will have codes, as not all of them have been converted yet.
   */
  code?: string
  /**
   * General classification of error. At time of writing it, this can be
   * one of `GRAPHQL`, `CONFIG`, `WEBPACK`, `PLUGIN`.
   */
  type?: string
  /**
   * Absolute path to file originating the error. Not all errors will have this field.
   */
  filePath?: string
  /**
   * Location of error inside file. Use to generated codeframes together with "filePath".
   * Not all errors will have this field
   */
  location?: {
    start: Position
    end?: Position
  }
  /**
   * Link to documentation about handling error ... or "https://gatsby.dev/issue-how-to"
   * for errors that don't have dedicated docs
   */
  docsUrl?: string

  /**
   * For now this is gatsby internals (it's used to generate "text", by pushing context through error text template).
   * In future this could be used to present dedicated error cards in web UIs.
   */
  context: Record<string, any>

  /**
   * Optional stack field (not all errors will have it)
   */
  stack?: CallSite[]
}

type CallSite = {
  fileName: string
  functionName?: string
  lineNumber?: number
  columnNumber?: number
}

type LogObject = ErrorLogObject | ActivityLogObject | GenericLogObject

type ActivityStatus =
  | "IN_PROGRESS"
  | "NOT_STARTED"
  | "FAILED"
  | "INTERRUPTED"
  | "SUCCESS"

/**
 * TO-DO add meaningful description to each status
 */
type GlobalStatus = `IN_PROGRESS` | "FAILED" | "SUCCESS" | "INTERRUPTED"

type ActivityType = "progress" | "spinner"

interface ActivityObject {
  /**
   * Identifier of action. It might be set to same thing as "text" if "id" wasn't explicitely provided.
   */
  id: string

  /**
   * Unique identifier of activity.
   */
  uuid: string
  /**
   * One of "progress", "spinner", "pending".
   * "pending" type activities are not meant to be displayed in UI, they are there
   * so gatsby internally can track if there is any more work to be done before going
   * into idle/error state from working state.
   */
  type: ActivityType
  /**
   * Text description of activity. (i.e. "source and transform nodes" or "building schema")
   */
  text: string
  /**
   * One of "IN_PROGRESS", "NOT_STARTED", "FAILED", "INTERRUPTED", "SUCCESS"
   * Only "IN_PROGRESS" should be displayed in UI, rest of statuses is for gatsby internals
   */
  status: ActivityStatus
  /**
   * Any additional text meant to be displayed along main "text"
   * Can contain content like "10/10 1.23/s" (as meaningful result of running activity)
   */
  statusText?: string

  /**
   * Time from start to finish of activity in seconds
   */
  duration?: number

  /**
   * Only in `"type": "progress"` - current tick
   */
  current?: number
  /**
   * Only in `"type": "progress"` - total ticks
   */
  total?: number
}

interface ActivityUpdatePayload {
  id: string

  text?: string
  status?: ActivityStatus
  type?: ActivityType
  startTime?: number[]
  statusText?: string
  current?: number
  total?: number
}

interface ActivityEndPayload {
  id: string

  status: ActivityStatus
  duration: number
}

const LOG = "LOG"
const ACTIVITY_UPDATE = `ACTIVITY_UPDATE`
const ACTIVITY_START = `ACTIVITY_START`
const ACTIVITY_END = `ACTIVITY_END`
const SET_STATUS = `SET_STATUS`

interface StructuredLoggingAction {
  /**
   * Date string using `YYYY-MM-DDTHH:mm:ss.sssZ` format
   */
  timestamp: string
}

export type LogAction = StructuredLoggingAction & {
  type: typeof LOG
  payload: LogObject
}

export type ActivityStartAction = StructuredLoggingAction & {
  type: typeof ACTIVITY_START
  payload: ActivityObject
}

export type ActivityUpdateAction = StructuredLoggingAction & {
  type: typeof ACTIVITY_UPDATE
  payload: ActivityUpdatePayload
}

export type ActivityEndAction = StructuredLoggingAction & {
  type: typeof ACTIVITY_END
  payload: ActivityEndPayload
}

export type SetStatusAction = StructuredLoggingAction & {
  type: typeof SET_STATUS
  payload: GlobalStatus
}

export type Action =
  | LogAction
  | ActivityStartAction
  | ActivityUpdateAction
  | ActivityEndAction
  | SetStatusAction

export interface IPCMessageLog {
  type: `LOG_ACTION`
  action: Action
}

export type IPCMessage = IPCMessageLog
