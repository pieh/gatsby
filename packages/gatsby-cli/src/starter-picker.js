const express = require(`express`)
const opn = require(`opn`)

exports.pickStarter = () =>
  new Promise(async (resolve, reject) => {
    let finished = false
    const app = express()
    const port = 7999

    app.get(`/pick-starter`, (req, res) => {
      finished = true
      const starter = req.query.starter
      res.send(`OK`)
      resolve(starter)
      server.close()
    })

    const server = app.listen(port, () =>
      console.log(`Example app listening on port ${port}!`)
    )

    const process = await opn(`http://localhost:8000/starters?v=2&cli=${port}`)

    process.on(`close`, () => {
      // this doesn't seem to work - heroku auth seems to use this (but probably as fallback)
      console.log(`closed`)
      if (!finished) {
        finished = true
        console.log(`user didn't finish`)
        reject()
      }
    })

    // implement hearbeat
    // .org would need to check if `cli` query is used and periodically fetch localhost:port/hearbeat
    // to let cli now it's still alive
  })
