const _ = require(`lodash`)
const Promise = require(`bluebird`)
const path = require(`path`)
const fs = require(`fs-extra`)
const slugify = require(`slugify`)
const url = require(`url`)
const getpkgjson = require(`get-package-json-from-github`)
const parseGHUrl = require(`parse-github-url`)
const { GraphQLClient } = require(`graphql-request`)
const moment = require(`moment`)

if (
  process.env.gatsby_executing_command === `build` &&
  !process.env.GITHUB_API_TOKEN
) {
  throw new Error(
    `A GitHub token is required to build the site. Check the README.`
  )
}

// used to gather repo data on starters
const githubApiClient = process.env.GITHUB_API_TOKEN
  ? new GraphQLClient(`https://api.github.com/graphql`, {
      headers: {
        authorization: `Bearer ${process.env.GITHUB_API_TOKEN}`,
      },
    })
  : null

// convert a string like `/some/long/path/name-of-docs/` to `name-of-docs`
const slugToAnchor = slug =>
  slug
    .split(`/`) // split on dir separators
    .filter(item => item !== ``) // remove empty values
    .pop() // take last item

exports.createPages = require(`./gatsby-node-pages`).createPages

// Create slugs for files, set released status for blog posts.
exports.onCreateNode = ({ node, actions, getNode, reporter }) => {
  const { createNodeField } = actions
  let slug
  if (node.internal.type === `File`) {
    const parsedFilePath = path.parse(node.relativePath)
    if (node.sourceInstanceName === `docs`) {
      if (parsedFilePath.name !== `index` && parsedFilePath.dir !== ``) {
        slug = `/${parsedFilePath.dir}/${parsedFilePath.name}/`
      } else if (parsedFilePath.dir === ``) {
        slug = `/${parsedFilePath.name}/`
      } else {
        slug = `/${parsedFilePath.dir}/`
      }
    }
    if (slug) {
      createNodeField({ node, name: `slug`, value: slug })
    }
  } else if (
    [`MarkdownRemark`, `Mdx`].includes(node.internal.type) &&
    getNode(node.parent).internal.type === `File`
  ) {
    const fileNode = getNode(node.parent)
    const parsedFilePath = path.parse(fileNode.relativePath)
    // Add slugs for docs pages
    if (fileNode.sourceInstanceName === `docs`) {
      if (parsedFilePath.name !== `index` && parsedFilePath.dir !== ``) {
        slug = `/${parsedFilePath.dir}/${parsedFilePath.name}/`
      } else if (parsedFilePath.dir === ``) {
        slug = `/${parsedFilePath.name}/`
      } else {
        slug = `/${parsedFilePath.dir}/`
      }

      // Set released status and `published at` for blog posts.
      if (_.includes(parsedFilePath.dir, `blog`)) {
        let released = false
        const date = _.get(node, `frontmatter.date`)
        if (date) {
          released = moment.utc().isSameOrAfter(moment.utc(date))
        }
        createNodeField({ node, name: `released`, value: released })

        const canonicalLink = _.get(node, `frontmatter.canonicalLink`)
        const publishedAt = _.get(node, `frontmatter.publishedAt`)

        createNodeField({
          node,
          name: `publishedAt`,
          value: canonicalLink
            ? publishedAt || url.parse(canonicalLink).hostname
            : null,
        })
      }
    }
    // Add slugs for package READMEs.
    if (
      fileNode.sourceInstanceName === `packages` &&
      parsedFilePath.name === `README`
    ) {
      slug = `/packages/${parsedFilePath.dir}/`
      createNodeField({
        node,
        name: `title`,
        value: parsedFilePath.dir,
      })
      createNodeField({ node, name: `package`, value: true })
    }
    if (slug) {
      createNodeField({ node, name: `anchor`, value: slugToAnchor(slug) })
      createNodeField({ node, name: `slug`, value: slug })
    }
  } else if (node.internal.type === `AuthorYaml`) {
    slug = `/contributors/${slugify(node.id, {
      lower: true,
    })}/`
    createNodeField({ node, name: `slug`, value: slug })
  } else if (node.internal.type === `SitesYaml` && node.main_url) {
    const parsed = url.parse(node.main_url)
    const cleaned = parsed.hostname + parsed.pathname
    slug = `/showcase/${slugify(cleaned)}`
    createNodeField({ node, name: `slug`, value: slug })

    // determine if screenshot is available
    const screenshotNode = node.children
      .map(childID => getNode(childID))
      .find(node => node.internal.type === `Screenshot`)

    createNodeField({ node, name: `hasScreenshot`, value: !!screenshotNode })
  } else if (node.internal.type === `StartersYaml` && node.repo) {
    // To develop on the starter showcase, you'll need a GitHub
    // personal access token. Check the `www` README for details.
    // Default fields are to avoid graphql errors.
    const { owner, name: repoStub } = parseGHUrl(node.repo)
    const defaultFields = {
      slug: `/${owner}/${repoStub}/`,
      stub: repoStub,
      name: ``,
      description: ``,
      stars: 0,
      lastUpdated: ``,
      owner: ``,
      githubFullName: ``,
      gatsbyMajorVersion: [[`no data`, `0`]],
      allDependencies: [[`no data`, `0`]],
      gatsbyDependencies: [[`no data`, `0`]],
      miscDependencies: [[`no data`, `0`]],
    }

    // determine if screenshot is available
    const screenshotNode = node.children
      .map(childID => getNode(childID))
      .find(node => node.internal.type === `Screenshot`)

    createNodeField({ node, name: `hasScreenshot`, value: !!screenshotNode })

    if (!process.env.GITHUB_API_TOKEN || process.env.SKIP_GITHUB) {
      return createNodeField({
        node,
        name: `starterShowcase`,
        value: {
          ...defaultFields,
        },
      })
    } else {
      return Promise.all([
        getpkgjson(node.repo),
        githubApiClient.request(`
            query {
              repository(owner:"${owner}", name:"${repoStub}") {
                name
                stargazers {
                  totalCount
                }
                createdAt
                pushedAt
                owner {
                  login
                }
                nameWithOwner
              }
            }
          `),
      ])
        .then(results => {
          const [pkgjson, githubData] = results
          const {
            stargazers: { totalCount: stars },
            pushedAt: lastUpdated,
            owner: { login: owner },
            name,
            nameWithOwner: githubFullName,
          } = githubData.repository

          const { dependencies = [], devDependencies = [] } = pkgjson
          const allDependencies = Object.entries(dependencies).concat(
            Object.entries(devDependencies)
          )

          const gatsbyMajorVersion = allDependencies
            .filter(([key, _]) => key === `gatsby`)
            .map(version => {
              let [gatsby, versionNum] = version
              if (versionNum === `latest` || versionNum === `next`) {
                return [gatsby, `2`]
              }
              return [gatsby, versionNum.replace(/\D/g, ``).charAt(0)]
            })

          // If a new field is added here, make sure a corresponding
          // change is made to "defaultFields" to not break DX
          const starterShowcaseFields = {
            slug: `/${owner}/${repoStub}/`,
            stub: repoStub,
            name,
            description: pkgjson.description,
            stars,
            lastUpdated,
            owner,
            githubFullName,
            gatsbyMajorVersion,
            allDependencies,
            gatsbyDependencies: allDependencies
              .filter(
                ([key, _]) => ![`gatsby-cli`, `gatsby-link`].includes(key) // remove stuff everyone has
              )
              .filter(([key, _]) => key.includes(`gatsby`)),
            miscDependencies: allDependencies.filter(
              ([key, _]) => !key.includes(`gatsby`)
            ),
          }
          createNodeField({
            node,
            name: `starterShowcase`,
            value: starterShowcaseFields,
          })
        })
        .catch(err => {
          reporter.panicOnBuild(
            `Error getting repo data for starter "${repoStub}":\n
            ${err.message}`
          )
        })
    }
  } else if (node.internal.type === `CreatorsYaml`) {
    // Creator pages
    const validTypes = {
      individual: `people`,
      agency: `agencies`,
      company: `companies`,
    }

    if (!validTypes[node.type]) {
      throw new Error(
        `Creators must have a type of “individual”, “agency”, or “company”, but invalid type “${node.type}” was provided for ${node.name}.`
      )
    }
    slug = `/creators/${validTypes[node.type]}/${slugify(node.name, {
      lower: true,
    })}`
    createNodeField({ node, name: `slug`, value: slug })
  }
  // end Creator pages
  return null
}

exports.onCreatePage = require(`./gatsby-node-pages`).onCreatePage

exports.onPostBuild = () => {
  fs.copySync(
    `../docs/blog/2017-02-21-1-0-progress-update-where-came-from-where-going/gatsbygram.mp4`,
    `./public/gatsbygram.mp4`
  )
}

// XXX this should probably be a plugin or something.
exports.sourceNodes = ({ actions: { createTypes }, schema }) => {
  /*
   * NOTE: This _only_ defines the schema we currently query for. If anything in
   * the query at `src/pages/contributing/events.js` changes, we need to make
   * sure these types are updated as well.
   *
   * But why?! Why would I do something this fragile?
   *
   * Gather round, children, and I’ll tell you the tale of @jlengstorf being too
   * lazy to make upstream fixes...
   */
  const typeDefs = `
    type Airtable implements Node {
      id: ID!
      data: AirtableData
    }

    type SitesYaml implements Node {
      title: String!
      main_url: String!
      url: String!
      source_url: String
      featured: Boolean
      categories: [String]!
      built_by: String
      built_by_url: String
      description: String
      screenshotFile: Screenshot # added by gatsby-transformer-screenshot
    }

    type StartersYaml implements Node {
      url: String!
      repo: String!
      description: String
      tags: [String!]
      features: [String!]
      screenshotFile: Screenshot # added by gatsby-transformer-screenshot
    }

    type AirtableData @dontInfer {
      name: String @proxy(from: "Name_of_Event")
      organizerFirstName: String @proxy(from: "Organizer_Name")
      organizerLastName: String @proxy(from: "Organizer's_Last_Name")
      date: Date @dateformat @proxy(from: "Date_of_Event")
      location: String @proxy(from: "Location_of_Event")
      url: String @proxy(from: "Event_URL_(if_applicable)")
      type: String @proxy(from: "What_type_of_event_is_this?")
      hasGatsbyTeamSpeaker: Boolean @proxy(from: "Gatsby_Speaker_Approved")
      approved: Boolean @proxy(from: "Approved_for_posting_on_event_page")
    }
`

  // type NpmPackage implements Node @dontInfer {
  //   title: String!
  //   slug: String!
  //   name: String!
  //   description: String!
  //   humanDownloadsLast30Days: String!
  //   lastPublisher: NPMPackageLastPublisher

  //   keywords: [String!]!
  //   readme: NpmPackageReadme! @link(from: "readme___NODE")
  // }

  // type NpmPackageReadme implements Node @dontInfer @mimeTypes(types: ["text/markdown"]) {
  //   slug: String!
  // }

  // type NPMPackageLastPublisher {
  //   name: String
  //   email: String
  //   avatar: String
  //   link: String
  // }

  createTypes(typeDefs)
}

exports.onCreateWebpackConfig = ({ actions, plugins }) => {
  const currentCommitSHA = require(`child_process`)
    .execSync(`git rev-parse HEAD`, {
      encoding: `utf-8`,
    })
    .trim()

  actions.setWebpackConfig({
    plugins: [
      plugins.define({
        "process.env.COMMIT_SHA": JSON.stringify(currentCommitSHA),
      }),
    ],
  })
}

// Patch `DocumentationJs` type to handle custom `@availableIn` jsdoc tag
exports.createResolvers = ({ createResolvers }) => {
  createResolvers({
    DocumentationJs: {
      availableIn: {
        type: `[String]`,
        resolve(source) {
          const { tags } = source
          if (!tags || !tags.length) {
            return []
          }

          const availableIn = tags.find(tag => tag.title === `availableIn`)
          if (availableIn) {
            return availableIn.description
              .split(`\n`)[0]
              .replace(/[[\]]/g, ``)
              .split(`,`)
              .map(api => api.trim())
          }

          return []
        },
      },
    },
  })
}
