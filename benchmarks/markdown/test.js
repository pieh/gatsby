const manager = require(`cache-manager`)
const fsStore = require(`cache-manager-fs`)

const MAX_CACHE_SIZE = 250
const ONE_HOUR = 60 * 60

const cache = manager.caching({
  store: fsStore,
  // options: {
  //   path: `.cache/caches/test`
  // }
})

cache.set(`a`, { b: true }, (a, b, c) => {
  console.log(`set`, a, b, c)
  cache.get(`a`, (err, res) => {
    console.log(`inside`, err, res)
  })
})

cache.get(`a`, (err, res) => {
  console.log(`outside`, err, res)
})
