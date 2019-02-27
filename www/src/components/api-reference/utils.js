import React from "react"

import { rhythm } from "../../utils/typography"

export const Header = ({ children, level }) => {
  const Tag = `h${Math.min(3 + level * 2, 6)}`

  return (
    <Tag
      css={{
        margin: 0,
        ...(level > 0
          ? {
              marginTop: rhythm(0.35),
            }
          : {
              position: `sticky`,

              top: 125,
              background: `white`,
              marginTop: `calc(-1.05rem + 1px)`,
              paddingTop: `calc(1.05rem - 1px)`,
              marginBottom: `calc(-1.05rem + 1px)`,
              paddingBottom: `calc(1.05rem - 1px)`,
              marginLeft: `-1.575rem`,
              marginRight: `-1.575rem`,
              paddingLeft: `1.575rem`,
              paddingRight: `1.575rem`,
              zIndex: 1,
            }),
      }}
    >
      {children}
    </Tag>
  )
}

export const SubHeader = ({ children, level }) => {
  const Tag = `h${Math.min(4 + level * 2, 6)}`
  return (
    <Tag
      css={`
        margin: 0;
        margin-top: ${rhythm(0.35)};
      `}
    >
      {children}
    </Tag>
  )
}
