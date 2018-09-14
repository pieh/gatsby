const searchForRule = (rules, test) => {
  rules.forEach(rule => {
    if (test(rule)) {
      return rule
    } else if (rule.oneOf) {
      const foundRule = searchForRule(rule.oneOf, test)
      if (foundRule) {
        return foundRule
      }
    }
  })
  return null
}

exports.onCreateWebpackConfig = ({
  stage,
  getConfig,
  rules,
  loaders,
  actions,
}) => {
  const config = getConfig()

  const searchingFor = rules.cssModules()

  searchForRule(config.module.rules, rule => {})

  // const b = 4
  actions.setWebpackConfig({
    module: {
      rules: [
        {
          oneOf: [rules.cssModules({ camelCase: true }), rules.css()],
        },
      ],
    },
  })

  const config2 = getConfig()

  const b = 4
}
