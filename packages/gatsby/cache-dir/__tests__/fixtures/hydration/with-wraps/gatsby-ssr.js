import React from "react"

export const wrapRootElement = ({ element }) => {
  return <>
    <div>wrapRootElement before</div>
    {element}
    <div>wrapRootElement after</div>
  </>
}

export const wrapPageElement = ({ element }) => {
  return <>
    <div>wrapPageElement before</div>
    {element}
    <div>wrapPageElement after</div>
  </>
}