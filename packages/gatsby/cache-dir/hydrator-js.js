import React from "react"

function interopDefault(mod) {
  return (mod && mod.default) || mod
}

export default class Hydrator extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      Component: null,
    }
  }

  shouldComponentUpdate(_, nextState) {
    const scu = !!nextState.Component

    console.log({ scu })
    return scu
  }

  componentDidMount() {
    setTimeout(() => {
      this.props.load().then(mod => {
        const Component = interopDefault(mod)
        console.log(`setting component`)
        this.setState({
          Component,
        })

        // ReactDOM.hydrate(<Child {...props} />, this.root)
        // console.log(`hydrated`)
      })
    }, 5000)
    // new IntersectionObserver(async ([entry], obs) => {
    //   if (!entry.isIntersecting) return
    //   obs.unobserve(this.root)

    //   const { load, ...props } = this.props

    //   load().then(mod => {
    //     const Child = interopDefault(mod)
    //     ReactDOM.hydrate(<Child {...props} />, this.root)
    //   })
    // }).observe(this.root)
  }

  render() {
    const { Component } = this.state
    const { load, ...props } = this.props

    return Component ? (
      <section>
        <Component {...props} />
      </section>
    ) : (
      <section
        ref={c => (this.root = c)}
        dangerouslySetInnerHTML={{ __html: `` }}
        suppressHydrationWarning
      />
    )
  }
}
