import React from "react"
import ArrowForwardIcon from "react-icons/lib/md/arrow-forward"

import { rhythm } from "../utils/typography"
import {
  colors,
  space,
  breakpoints,
  scale,
  lineHeights,
  letterSpacings,
  fonts,
} from "../utils/presets"
import Button from "./button"

const MastheadContent = () => (
  <div
    className="masthead-content"
    css={{
      margin: `0 ${space[8]}`,
      paddingBottom: space[9],
      paddingTop: space[9],
      textAlign: `center`,
      [breakpoints.md]: {
        paddingBottom: rhythm(3),
        paddingTop: rhythm(3),
      },
    }}
  >
    <h1
      css={{
        color: colors.gatsby,
        fontSize: `calc(12px + 2vh + 3.5vw)`,
        letterSpacing: letterSpacings.tight,
        lineHeight: lineHeights.solid,
        margin: `0 auto ${space[7]}`,
        maxWidth: `15em`,
        WebkitFontSmoothing: `antialiased`,
      }}
    >
      Fast in every way that matters
    </h1>
    <p
      css={{
        color: colors.gray.copy,
        fontFamily: fonts.header,
        fontSize: scale[4],
        maxWidth: rhythm(30),
        margin: `0 auto ${space[7]}`,
        WebkitFontSmoothing: `antialiased`,
        [breakpoints.sm]: {
          fontSize: scale[5],
        },
        [breakpoints.lg]: {
          fontSize: scale[6],
        },
      }}
    >
      Gatsby is a free and open source framework based on React that helps
      developers build blazing fast <strong>websites</strong> and
      {` `}
      <strong>apps</strong>
    </p>
    <Button
      large
      to="/docs/"
      tracking="MasterHead -> Get Started"
      icon={<ArrowForwardIcon />}
    >
      Get Started
    </Button>
  </div>
)

const Masthead = () => <MastheadContent />

export default Masthead
