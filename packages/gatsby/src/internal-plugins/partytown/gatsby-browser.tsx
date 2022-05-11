import React, { useState } from "react"
import type { GatsbyBrowser } from "gatsby"
import { Partytown } from "@builder.io/partytown/react"
import { PartytownContext } from "gatsby-script"
import type { PartytownProps } from "@builder.io/partytown/react"

// const collectedScripts: Record<string, Array<PartytownProps>> = {}

function PartytownAppWrapper({ pathname, children }) {
  const [collectedScripts, setCollectedScripts] = useState({
    forwards: new Set(),
    pathname,
    haveAnyScripts: false,
    partytownReady: false,
  })
  return (
    <>
      <PartytownContext.Provider
        value={{
          partytownReady: collectedScripts.partytownReady,
          collectScript: (newScript: PartytownProps): void => {
            setTimeout(() => {
              if (collectedScripts.pathname !== pathname) {
                setCollectedScripts({
                  forwards: new Set(
                    newScript?.forward ? [newScript.forward] : []
                  ),
                  pathname,
                  haveAnyScripts: true,
                  partytownReady: true,
                })
              } else {
                if (
                  newScript?.forward &&
                  !collectedScripts.forwards.has(newScript.forward)
                ) {
                  setCollectedScripts({
                    forwards: new Set([
                      ...collectedScripts.forwards,
                      newScript.forward,
                    ]),
                    pathname,
                    haveAnyScripts: true,
                    partytownReady: true,
                  })
                }
              }
            }, 0)
          },
        }}
      >
        {children}
      </PartytownContext.Provider>
      {pathname === collectedScripts.pathname &&
        collectedScripts.haveAnyScripts && (
          <Partytown key="partytown" forward={collectedScripts.forwards} />
        )}
    </>
  )
}

export const wrapRootElement: GatsbyBrowser[`wrapRootElement`] = ({
  element,
  pathname,
}) => {
  return (
    <PartytownAppWrapper pathname={pathname}>{element}</PartytownAppWrapper>
  )
}
