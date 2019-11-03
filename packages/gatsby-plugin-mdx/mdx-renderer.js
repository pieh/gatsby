const React = require(`react`)
const { useMDXComponents, mdx } = require(`@mdx-js/react`)
const { useMDXScope } = require(`./context`)
const { getModule } = require(`gatsby`)

module.exports = function MDXRenderer({
  scope,
  components,
  children,
  ...props
}) {
  const mdxComponents = useMDXComponents(components)
  const mdxScope = useMDXScope(scope)

  // Memoize the compiled component
  const End = React.useMemo(() => {
    if (!children) {
      return null
    }

    const { body, modulesMapping } = children

    const fullScope = {
      // React is here just in case the user doesn't pass them in
      // in a manual usage of the renderer
      React,
      mdx,
      ...mdxScope,
      ...Object.keys(modulesMapping).reduce((acc, localIdentifier) => {
        const moduleId = modulesMapping[localIdentifier]
        acc[localIdentifier] = getModule(moduleId)
        return acc
      }, {}),
    }

    const keys = Object.keys(fullScope)
    const values = keys.map(key => fullScope[key])
    const fn = new Function(`_fn`, ...keys, `${body}`)

    return fn({}, ...values)
  }, [children, scope])

  return React.createElement(End, { components: mdxComponents, ...props })
}
