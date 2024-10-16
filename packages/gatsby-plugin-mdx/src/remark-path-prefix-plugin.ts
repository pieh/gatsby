import type { Node } from "unist-util-visit"
import { cachedImport } from "./cache-helpers"

// ensure only one `/` in new url
const withPathPrefix = (url: string, pathPrefix: string): string =>
  (pathPrefix + url).replace(/\/\//, `/`)

// Ensure relative links include `pathPrefix`
export const remarkPathPlugin = ({ pathPrefix }: { pathPrefix: string }) =>
  async function transformer(markdownAST: Node): Promise<Node> {
    if (!pathPrefix) {
      return markdownAST
    }
    const { visit } = await cachedImport<typeof import("unist-util-visit")>(
      `unist-util-visit`
    )

    visit(markdownAST, [`link`, `definition`], node => {
      if (
        node.url &&
        typeof node.url === `string` &&
        node.url.startsWith(`/`) &&
        !node.url.startsWith(`//`)
      ) {
        node.url = withPathPrefix(node.url, pathPrefix)
      }
    })
    return markdownAST
  }
