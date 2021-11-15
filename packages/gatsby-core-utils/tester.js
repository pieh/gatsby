
const fs = require(`fs-extra`)
const { WorkerPool} = require(`gatsby-worker`)

async function run() {
  for (let i = 0; true; i++) {
    const pool = new WorkerPool(require.resolve(`./tester-child`), {
      numWorkers: 5
    })
    
    const names = await Promise.all(pool.all.fetch({
      url: `https://images.ctfassets.net/fmalxlcsic8b/6Od9v3wzLOysiMum0Wkmme/285a95b22f0cdbd5e47a041f3dd6b2ff/cameron-kirby-88711.jpg`,
      cacheName: `wat-${i}`
    }).map(promise => promise.then(name => {
      return fs.readFile(name).then(() => name)
    })))

    const distinctNames = new Set(names)

    console.log( distinctNames)
    await Promise.all(pool.end())
    await new Promise(resolve => setTimeout(resolve, 2500))
  }
}

run()