import React from "react"
import styled from "@emotion/styled"
import { OutboundLink } from "gatsby-plugin-google-analytics"

import { colors, space, dimensions } from "../utils/presets"
import { rhythm, options } from "../utils/typography"

const horizontalPadding = rhythm(space[6])
const backgroundColor = colors.gatsby

const BannerContainer = styled(`div`)`
  background-color: ${backgroundColor};
  height: ${dimensions.bannerHeight};
  position: fixed;
  width: 100%;
  z-index: 3;
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
`

const InnerContainer = styled(`div`)`
  align-items: center;
  display: flex;
  height: ${dimensions.bannerHeight};
  overflow-x: auto;
  mask-image: ${`linear-gradient(to right, transparent, ${backgroundColor} ${horizontalPadding}, ${backgroundColor} 96%, transparent)`};
`

const Content = styled(`div`)`
  color: ${colors.ui.bright};
  font-family: ${options.headerFontFamily.join(`,`)};
  padding-left: ${horizontalPadding};
  padding-right: ${horizontalPadding};
  -webkit-font-smoothing: antialiased;
  white-space: nowrap;

  a {
    color: ${colors.white};
    border-bottom: 1px solid ${colors.white};
  }

  a:hover {
    color: ${colors.white};
    border-bottom-color: ${colors.white}a0;
  }
`

const Banner = () => (
  <BannerContainer className="banner">
    <InnerContainer>
      <Content>
        <OutboundLink href="https://www.gatsbyjs.com/gatsby-for-agencies/">
          Register now
        </OutboundLink>
        {`: “Gatsby for Agencies and Teams: Better, Faster, Smarter”.`}
      </Content>
    </InnerContainer>
  </BannerContainer>
)

export default Banner
