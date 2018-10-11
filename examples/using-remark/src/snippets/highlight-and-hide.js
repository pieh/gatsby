// hideline-range{1-2,9-11,16}
// highlight-range{6-8}
import React from "react"
import ReactDOM from "react-dom"
ReactDOM.render(
  <div>
    <ul>
      <li>Not hidden and highlighted</li>
      <li>Not hidden and highlighted</li>
      <li>Not hidden and highlighted</li>
      <li>Hidden</li>
      <li>Hidden</li>
      <li>Hidden</li>
    </ul>
  </div>,
  // highlight-next-line
  document.getElementById(`root`)
)
