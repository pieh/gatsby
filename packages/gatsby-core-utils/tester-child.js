const { fetchRemoteFile } = require(`./dist/fetch-remote-file`)
const { getCache } = require(`gatsby/dist/utils/get-cache`) 

// const cache = getCache(`w`)
// console.log({ cache})

exports.fetch = function fetch({ url, cacheName }) {
  try {
    const cache = getCache(cacheName)
    return fetchRemoteFile({
      url,
      cache
    }).catch(e => {
      console.log(e)
      throw e
    })
  } catch (e) {
    console.log(e)
    return null
  }
}