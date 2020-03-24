import { IGatsbyState } from "../../redux/types"

type CacheKeyValueType = string | boolean
type CacheKeyRegistrationGetterFn = () => CacheKeyValueType

interface CacheKeyRegistration {
  getter: CacheKeyRegistrationGetterFn
  defaultValue: CacheKeyValueType
}

const cacheKeysRegistrations = new Map<string, CacheKeyRegistration>()
export const registerCacheKey = (
  name: string,
  getter: CacheKeyRegistrationGetterFn,
  defaultValue: CacheKeyValueType
) => {
  cacheKeysRegistrations.set(name, { getter, defaultValue })
}

// export const generateCacheKeys = (): { [key: string]: CacheKeyValueType } => {
//   const value = {}
//   cacheKeysRegistrations.forEach(({ getter }, name) => {
//     value[name] = getter()
//   })

//   return value
// }

export const collectCacheKeyChanges = (
  state: IGatsbyState
): {
  changedCacheKeys: string[]
  updatedCacheKeys: { [key: string]: CacheKeyValueType }
} => {
  const changedCacheKeys: string[] = []
  const updatedCacheKeys = {}
  cacheKeysRegistrations.forEach(({ getter, defaultValue }, name) => {
    const newValue = (updatedCacheKeys[name] = getter())
    const storedValue = state.status.cacheKeys?.[name] ?? defaultValue
    if (newValue !== storedValue) {
      changedCacheKeys.push(name)
    }
  })

  return {
    changedCacheKeys,
    updatedCacheKeys,
  }
}
