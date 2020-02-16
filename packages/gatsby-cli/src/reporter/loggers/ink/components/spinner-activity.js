import React from "../react-instance-used-by-ink"
import { Box } from "ink"
import Spinner from "./spinner"

export default function Activity({ text, statusText }) {
  let label = text
  if (statusText) {
    label += ` — ${statusText}`
  }

  return (
    <Box>
      <Spinner type="dots" /> {label}
    </Box>
  )
}
