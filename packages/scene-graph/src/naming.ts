import type { SceneGraph } from './'

const TRAILING_NUMBER = /^(.*?) (\d+)$/

/**
 * Figma-style duplicate name: strip any trailing number to get the base name,
 * then go one past the highest number carried by same-named siblings
 * ("Frame" -> "Frame 2", "Frame 7" -> "Frame 8").
 */
export function duplicateNodeName(graph: SceneGraph, name: string, parentId: string): string {
  const base = TRAILING_NUMBER.exec(name)?.[1] ?? name
  let highest = 1
  for (const sibling of graph.getChildren(parentId)) {
    const match = TRAILING_NUMBER.exec(sibling.name)
    if (match?.[1] === base) highest = Math.max(highest, Number(match[2]))
  }
  return `${base} ${highest + 1}`
}
