import React from "react"

// export const getHeader = level => `h${Math.min(3 + level * 2, 6)}`
// export const getSubHeader = level => `h${Math.min(4 + level * 2, 6)}`

export const Header = ({ children, level }) => {
  const Tag = `h${Math.min(3 + level * 2, 5)}`
  const styles = {}
  if (level > 0) {
    styles.margin = `0.5em 0 0`
  }

  return <Tag css={styles}>{children}</Tag>
}

export const SubHeader = ({ children, level }) => {
  const Tag = `h${Math.min(4 + level * 2, 5)}`
  return (
    <Tag
      css={`
        margin: 0.5em 0 0;
      `}
    >
      {children}
    </Tag>
  )
}
