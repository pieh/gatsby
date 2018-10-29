const sharp = require(`sharp`)
const imagemin = require(`imagemin`)
const imageminMozjpeg = require(`imagemin-mozjpeg`)
const imageminPngquant = require(`imagemin-pngquant`)
const imageminWebp = require(`imagemin-webp`)
const fs = require(`fs`)
const debug = require(`debug`)(`gatsby:gatsby-plugin-sharp`)

// const { reportError } = require(`./utils.js`)
const duotone = require(`./duotone`)

const useMozjpeg = process.env.GATSBY_JPEG_ENCODER === `MOZJPEG`

// this will run batch jobs for same input file
module.exports = jobs => {
  let file = jobs[0].inputPath

  let pipeline
  try {
    pipeline = sharp(file).rotate()
  } catch (err) {
    jobs.forEach(job => job.onError(`Failed to process image ${file}`, err))
    throw err
    // throw new Error(`Failed to process image ${file}`, err)
  }

  return Promise.all(
    jobs.map(
      async job =>
        new Promise(async (resolve, reject) => {
          debug(`Start processing ${job.outputPath}`)
          const args = job.args
          let clonedPipeline
          if (jobs.length > 1) {
            clonedPipeline = pipeline.clone()
          } else {
            clonedPipeline = pipeline
          }

          // Sharp only allows ints as height/width. Since both aren't always
          // set, check first before trying to round them.
          let roundedHeight = args.height
          if (roundedHeight) {
            roundedHeight = Math.round(roundedHeight)
          }

          let roundedWidth = args.width
          if (roundedWidth) {
            roundedWidth = Math.round(roundedWidth)
          }

          clonedPipeline
            .resize(roundedWidth, roundedHeight, {
              position: args.cropFocus,
            })
            .png({
              compressionLevel: args.pngCompressionLevel,
              adaptiveFiltering: false,
              force: args.toFormat === `png`,
            })
            .webp({
              quality: args.quality,
              force: args.toFormat === `webp`,
            })
            .tiff({
              quality: args.quality,
              force: args.toFormat === `tiff`,
            })

          // jpeg
          if (!useMozjpeg) {
            clonedPipeline = clonedPipeline.jpeg({
              quality: args.quality,
              progressive: args.jpegProgressive,
              force: args.toFormat === `jpg`,
            })
          }

          // grayscale
          if (args.grayscale) {
            clonedPipeline = clonedPipeline.grayscale()
          }

          // rotate
          if (args.rotate && args.rotate !== 0) {
            clonedPipeline = clonedPipeline.rotate(args.rotate)
          }

          // duotone
          if (args.duotone) {
            clonedPipeline = await duotone(
              args.duotone,
              args.toFormat,
              clonedPipeline
            )
          }

          const onFinish = err => {
            if (err) {
              debug(`Error in job ${job.outputPath}`)
              job.onError(`Failed to process image ${file}`, err)
              reject(err)
              throw err
            } else {
              debug(`Finished processing ${job.outputPath}`)
              job.onFinish()
              resolve()
            }
          }

          if (args.toFormat === `png`) {
            clonedPipeline
              .toBuffer()
              .then(sharpBuffer =>
                imagemin
                  .buffer(sharpBuffer, {
                    plugins: [
                      imageminPngquant({
                        quality: `${args.quality}-${Math.min(
                          args.quality + 25,
                          100
                        )}`, // e.g. 40-65
                      }),
                    ],
                  })
                  .then(imageminBuffer => {
                    fs.writeFile(job.outputPath, imageminBuffer, onFinish)
                  })
                  .catch(onFinish)
              )
              .catch(onFinish)
            // Compress jpeg
          } else if (
            useMozjpeg &&
            (args.toFormat === `jpg` || args.toFormat === `jpeg`)
          ) {
            clonedPipeline
              .toBuffer()
              .then(sharpBuffer =>
                imagemin
                  .buffer(sharpBuffer, {
                    plugins: [
                      imageminMozjpeg({
                        quality: args.quality,
                        progressive: args.jpegProgressive,
                      }),
                    ],
                  })
                  .then(imageminBuffer => {
                    fs.writeFile(job.outputPath, imageminBuffer, onFinish)
                  })
                  .catch(onFinish)
              )
              .catch(onFinish)
            // Compress webp
          } else if (args.toFormat === `webp`) {
            clonedPipeline
              .toBuffer()
              .then(sharpBuffer =>
                imagemin
                  .buffer(sharpBuffer, {
                    plugins: [imageminWebp({ quality: args.quality })],
                  })
                  .then(imageminBuffer => {
                    fs.writeFile(job.outputPath, imageminBuffer, onFinish)
                  })
                  .catch(onFinish)
              )
              .catch(onFinish)
            // any other format (tiff) - don't compress it just handle output
          } else {
            clonedPipeline.toFile(job.outputPath, onFinish)
          }
        })
    )
  )
}
