import { IGatsbyState } from "../../../redux/types"

export type ConfigKeyValueType = string | boolean
type ConfigKeyRegistrationGetterFn = () => ConfigKeyValueType

const configurationKeysRegistrations = new Map<
  string,
  ConfigKeyRegistrationGetterFn
>()

export const registerConfigKey = (
  name: string,
  getter: ConfigKeyRegistrationGetterFn
) => {
  configurationKeysRegistrations.set(name, getter)
}

export const collectConfigKeyChanges = (
  state: IGatsbyState
): {
  changedCacheKeys: string[]
  cacheKeys: { [key: string]: ConfigKeyValueType }
} => {
  const changedCacheKeys: string[] = []
  const cacheKeys = {}

  configurationKeysRegistrations.forEach((getter, name) => {
    const newValue = (cacheKeys[name] = getter())
    const storedValue = state.status.cacheKeys?.[name]
    if (newValue !== storedValue) {
      changedCacheKeys.push(name)
    }
  })

  return {
    changedCacheKeys,
    cacheKeys,
  }
}
