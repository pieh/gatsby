---
title: Recipes
---

<!-- Basic template for a Gatsby recipe:

## Task to accomplish.
1-2 sentences about it. The more concise and focused, the better!

### Prerequisites
- System/version requirements
- Everything necessary to set up the task
- Including setting up accounts at other sites, like Netlify
- See [docs templates](/docs/docs-templates/) for formatting tips

### Step-by-step directions
Each step should be repeatable and to-the-point. Anything not critical to the task should be omitted.

#### Live example (optional)
A live example may not be possible depending on the nature of the recipe, in which case it is fine to omit.

### Additional resources
- Tutorials
- Docs pages
- Plugin READMEs
- etc.

See [docs templates](/docs/docs-templates/) in the contributing docs for more help.
-->

Craving a happy medium between [full-length tutorials](/tutorial/) and crawling the [docs](/docs/)? Here's a cookbook of guiding recipes on how to build things, Gatsby style.

## Table of Contents

- [Using Gatsby without Graphql](#using-gatsby-without-graphql)
- [Gatsby project structure](#gatsby-project-structure)
- [Using a starter](#using-a-starter)
- [Creating pages](#creating-pages)
- [Linking between pages](#linking-between-pages)
- [Styling](#styling)
- [Creating layouts](#creating-layouts)
- [Deploying](#deploying)
- [Querying data](#querying-data)
- [Sourcing data](#sourcing-data)
- [Transforming data](#transforming-data)

## Using Gatsby without GraphQL

You can use the node `createPages` API to pull unstructured data directly into Gatsby sites rather than through GraphQL and source plugins. This is a great choice for small sites, while GraphQL and source plugins can help save time with more complex sites.

- Learn how to pull unstructured data into Gatsby sites in [Using Gatsby without GraphQL](/docs/using-gatsby-without-graphql/)
- Learn when and how to use GraphQL and source plugins for more complex Gatsby sites in [Querying data with GraphQL](/docs/querying-with-graphql/)

## Gatsby project structure

Read the [Gatsby project structure](/docs/gatsby-project-structure/) guide for a tour of the folders and files you may see inside a Gatsby project.

## Using a starter

Starters are boilerplate Gatsby sites maintained officially, or by the community.

- Learn how to use the Gatsby CLI tool to use starters in [tutorial part one](/tutorial/part-one/#using-gatsby-starters)
- Browse the [Starter Library](/starters/)
- Check out Gatsby's [official default starter](https://github.com/gatsbyjs/gatsby-starter-default)

## Creating pages

You can create pages in Gatsby explicitly by defining React components in `src/pages/`, or programmatically by using the `createPages` API.

- Walk through creating a page by defining a React component in `src/pages` in [tutorial part one](/tutorial/part-one/#familiarizing-with-gatsby-pages)
- Walk through programmatically creating pages in [tutorial part seven](/tutorial/part-seven/)
- Check out the docs overview on [creating and modifying pages](/docs/creating-and-modifying-pages/)

## Linking between pages

Routing in Gatsby relies on the `<Link />` component.

### Prerequisites

- A Gatsby site with two page components: `index.js` and `contact.js`
- The Gatsby `<Link />` component
- The [Gatsby CLI](/docs/gatsby-cli/) to run `gatsby develop`

### Directions

1. Open the index page component (`src/pages/index.js`), import the `<Link />` component from Gatsby, add a `<Link />` component above the header, and give it a `to` property with the value of `"/contact/"` for the pathname:

```jsx:title=src/pages/index.js
import React from "react"
import { Link } from "gatsby"

export default () => (
  <div style={{ color: `purple` }}>
    <Link to="/contact/">Contact</Link>
    <p>What a world.</p>
  </div>
)
```

2. Run `gatsby develop` and navigate to the index page. You should have a link that takes you to the contact page when clicked!

> **Note**: Gatsby's `<Link />` component is a wrapper around [`@reach/router`'s Link component](https://reach.tech/router/api/Link). For more information about Gatsby's `<Link />` component, consult the [API reference for `<Link />`](/docs/gatsby-link/).

## Styling

There are so many ways to add styles to your website; Gatsby supports almost every possible option, through official and community plugins.

- Walk through adding global styles to an example site in [tutorial part two](/tutorial/part-two/#creating-global-styles)
  - More on global styles [with standard CSS files](/docs/creating-global-styles/#how-to-add-global-styles-in-gatsby-with-standard-css-files)
  - More on global styles with [CSS-in-JS](/docs/creating-global-styles/#how-to-add-global-styles-in-gatsby-using-css-in-js)
  - More on global styles [with CSS files and no layout component](/docs/creating-global-styles/#add-global-styles-with-css-files-and-no-layout-component)
- Use the CSS-in-JS library [Glamor](/docs/glamor/)
- Use the CSS-in-JS library [Styled Components](/docs/styled-components/)
- Use [CSS Modules](/tutorial/part-two/#css-modules)

## Creating layouts

To wrap pages with layouts, use normal React components.

- Walk through creating a layout component in [tutorial part three](/tutorial/part-three/#your-first-layout-component)
- Gatsby v1 approached layouts differently. If the context is helpful, learn about the [differences in v2](/blog/2018-06-08-life-after-layouts/)

## Deploying

Showtime.

- Walk through building and deploying an example site in [tutorial part one](/tutorial/part-one/#deploying-a-gatsby-site)
- Learn how to make sure your site is configured properly to be [searchable, shareable, and properly navigable](/docs/preparing-for-site-launch/)
- Learn about [performance optimization](/docs/performance/)
- Read about [other deployment related topics](/docs/deploying-and-hosting/)

## Querying data

### The StaticQuery Component

`StaticQuery` is a component for retrieving data from Gatsby's data layer in [non-page components](/docs/static-query/).

#### Directions

1. The `StaticQuery` Component requires two render props: `query` and `render`.

```jsx:title=src/components/NonPageComponent.js
import React from "react"
import { StaticQuery, graphql } from "gatsby"

const NonPageComponent = () => (
  <StaticQuery
    query={graphql`
      query NonPageQuery {
        site {
          siteMetadata {
            title
          }
        }
      }
    `}
    render={data => (
      <h1>
        Querying title from NonPageComponent with StaticQuery:
        {data.site.siteMetadata.title}
      </h1>
    )}
  />
)

export default NonPageComponent
```

2. You can now use this component as you would [any other component](/docs/building-with-components#non-page-components).

### Querying data with the useStaticQuery hook

Since Gatsby v2.1.0, you can use the `useStaticQuery` hook to query data with a JavaScript function instead of a component.

#### Prerequisites

- You'll need React and ReactDOM 16.8.0 or later (keeping Gatsby updated handles this).
- The [Rules of React Hooks](https://reactjs.org/docs/hooks-rules.html)

#### Directions

The `useStaticQuery` hook is a JavaScript function that takes a GraphQL query and returns the requested data.

1. Import `useStaticQuery` and `graphql` from `gatsby` in order to use the hook query the data.

2. In the start of a stateless functional component, assign a variable to the value of `useStaticQuery` with your `graphql` query passed as an argument.

3. In the JSX code returned from your component, you can reference that variable to handle the returned data.

```jsx:title=src/components/NonPageComponent.js
import React from "react"
import { useStaticQuery, graphql } from "gatsby"

const NonPageComponent = () => {
  const data = useStaticQuery(graphql`
    query NonPageQuery {
      site {
        siteMetadata {
          title
        }
      }
    }
  `)
  return (
    <h1>
      Querying title from NonPageComponent: {data.site.siteMetadata.title}
    </h1>
  )
}

export default NonPageComponent
```

#### Additional resources

- [More on Static Query for querying data in components](/docs/static-query/)
- [The difference between a static query and a page query](/docs/static-query/#how-staticquery-differs-from-page-query)
- [More on the useStaticQuery hook](/docs/use-static-query/)
- [Visualize your data with GraphiQL](/docs/introducing-graphiql/)

## Sourcing data

Data sourcing in Gatsby is plugin-driven; Source plugins fetch data from their source (e.g. the `gatsby-source-filesystem` plugin fetches data from the file system, the `gatsby-source-wordpress` plugin fetches data from the WordPress API, etc).

- Walk through an example using the `gatsby-source-filesystem` plugin in [tutorial part five](/tutorial/part-five/#source-plugins)
- Search available source plugins in the [Gatsby library](/plugins/?=source)
- Understand source plugins by building one in the [Pixabay source plugin tutorial](/docs/pixabay-source-plugin-tutorial/)

## Transforming data

Transforming data in Gatsby is also plugin-driven; Transformer plugins take data fetched using source plugins, and process it into something more usable (e.g. JSON into JavaScript objects, markdown to HTML, and more).

- Walk through an example using the `gatsby-transformer-remark` plugin to transform markdown files [tutorial part six](/tutorial/part-six/#transformer-plugins)
- Search available transformer plugins in the [Gatsby library](/plugins/?=transformer)
