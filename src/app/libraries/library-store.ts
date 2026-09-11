import type { SceneNode } from '@openweave/scene-graph'

export interface SerializedLibraryNode {
  node: SceneNode
  children: SerializedLibraryNode[]
}

export interface SharedLibraryComponent {
  id: string
  name: string
  key: string
  description?: string
  pageName?: string
  serialized: SerializedLibraryNode
}

export interface SharedLibrary {
  id: string
  name: string
  version: string
  description?: string
  updatedAt: string
  enabled: boolean
  components: SharedLibraryComponent[]
}

const STORAGE_KEY = 'openweave_shared_libraries_v1'

const listeners = new Set<() => void>()

const EMPTY_LIBRARIES: SharedLibrary[] = []
let cachedRaw: string | null = null
let cachedLibraries: SharedLibrary[] = EMPTY_LIBRARIES
let memoryLibraries: SharedLibrary[] = EMPTY_LIBRARIES

function notify() {
  for (const listener of listeners) {
    listener()
  }
}

export function subscribeSharedLibraries(listener: () => void): () => void {
  listeners.add(listener)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cachedRaw = null
      cachedLibraries = EMPTY_LIBRARIES
      listener()
    }
  }
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('storage', onStorage)
  }
  return () => {
    listeners.delete(listener)
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('storage', onStorage)
    }
  }
}

export function listSharedLibraries(): SharedLibrary[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        if (cachedRaw !== null || cachedLibraries !== EMPTY_LIBRARIES) {
          cachedRaw = null
          cachedLibraries = EMPTY_LIBRARIES
        }
        return EMPTY_LIBRARIES
      }
      if (raw === cachedRaw) {
        return cachedLibraries
      }
      const parsed = JSON.parse(raw)
      cachedRaw = raw
      cachedLibraries = Array.isArray(parsed) ? (parsed as SharedLibrary[]) : EMPTY_LIBRARIES
      return cachedLibraries
    } catch {
      cachedRaw = null
      cachedLibraries = EMPTY_LIBRARIES
      return EMPTY_LIBRARIES
    }
  }
  return memoryLibraries
}

export function getSharedLibrariesServerSnapshot(): SharedLibrary[] {
  return EMPTY_LIBRARIES
}

export function getSharedLibrary(id: string): SharedLibrary | null {
  const all = listSharedLibraries()
  return all.find((lib) => lib.id === id) ?? null
}

export function saveSharedLibrary(library: SharedLibrary): void {
  const all = listSharedLibraries()
  const index = all.findIndex((lib) => lib.id === library.id)
  const updated = [...all]
  if (index !== -1) {
    updated[index] = library
  } else {
    updated.push(library)
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = JSON.stringify(updated)
    cachedRaw = raw
    cachedLibraries = updated
    window.localStorage.setItem(STORAGE_KEY, raw)
  } else {
    memoryLibraries = updated
  }
  notify()
}

export function deleteSharedLibrary(id: string): void {
  const all = listSharedLibraries()
  const filtered = all.filter((lib) => lib.id !== id)
  if (typeof window !== 'undefined' && window.localStorage) {
    const raw = JSON.stringify(filtered)
    cachedRaw = raw
    cachedLibraries = filtered
    window.localStorage.setItem(STORAGE_KEY, raw)
  } else {
    memoryLibraries = filtered
  }
  notify()
}

export function toggleSharedLibrary(id: string, enabled: boolean): void {
  const library = getSharedLibrary(id)
  if (!library) return
  saveSharedLibrary({ ...library, enabled, updatedAt: new Date().toISOString() })
}

export function exportLibraryJson(id: string): string | null {
  const library = getSharedLibrary(id)
  if (!library) return null
  return JSON.stringify(library, null, 2)
}

export function importLibraryJson(jsonString: string): SharedLibrary | null {
  try {
    const parsed = JSON.parse(jsonString) as Partial<SharedLibrary>
    if (!parsed || typeof parsed.name !== 'string' || !Array.isArray(parsed.components)) {
      return null
    }
    const library: SharedLibrary = {
      id: parsed.id ?? `lib_${crypto.randomUUID()}`,
      name: parsed.name,
      version: parsed.version ?? '1.0.0',
      description: parsed.description ?? '',
      updatedAt: new Date().toISOString(),
      enabled: true,
      components: parsed.components as SharedLibraryComponent[]
    }
    saveSharedLibrary(library)
    return library
  } catch {
    return null
  }
}

function serializeNodeSubtree(
  getNode: (id: string) => SceneNode | undefined,
  rootId: string
): SerializedLibraryNode | null {
  const root = getNode(rootId)
  if (!root) return null
  const children: SerializedLibraryNode[] = []
  for (const childId of root.childIds) {
    const childTree = serializeNodeSubtree(getNode, childId)
    if (childTree) children.push(childTree)
  }
  return {
    node: structuredClone(root),
    children
  }
}

export function publishComponentsToLibrary(
  getNode: (id: string) => SceneNode | undefined,
  componentIds: string[],
  meta: { name: string; version: string; description?: string }
): SharedLibrary {
  const components: SharedLibraryComponent[] = []

  for (const id of componentIds) {
    const node = getNode(id)
    if (!node || (node.type !== 'COMPONENT' && node.type !== 'COMPONENT_SET')) continue
    const serialized = serializeNodeSubtree(getNode, id)
    if (!serialized) continue
    components.push({
      id: node.id,
      name: node.name,
      key: node.componentKey ?? node.id,
      description: node.symbolDescription || undefined,
      serialized
    })
  }

  const library: SharedLibrary = {
    id: `lib_${crypto.randomUUID()}`,
    name: meta.name.trim() || 'Untitled Library',
    version: meta.version.trim() || '1.0.0',
    description: meta.description?.trim() || '',
    updatedAt: new Date().toISOString(),
    enabled: true,
    components
  }

  saveSharedLibrary(library)
  return library
}

function restoreNodeSubtree(
  tree: SerializedLibraryNode,
  getNode: (id: string) => SceneNode | undefined,
  setNode: (node: SceneNode) => void,
  libraryId: string,
  parentId: string | null
): string {
  const idMap = new Map<string, string>()

  function allocateIds(sub: SerializedLibraryNode) {
    const newId = `ext_${crypto.randomUUID()}`
    idMap.set(sub.node.id, newId)
    for (const child of sub.children) {
      allocateIds(child)
    }
  }
  allocateIds(tree)

  function instantiate(sub: SerializedLibraryNode, currentParentId: string | null): SceneNode {
    const newId = idMap.get(sub.node.id) ?? `ext_${crypto.randomUUID()}`
    const newChildIds = sub.children.map(
      (c) => idMap.get(c.node.id) ?? `ext_${crypto.randomUUID()}`
    )

    const clonedNode: SceneNode = {
      ...structuredClone(sub.node),
      id: newId,
      parentId: currentParentId,
      childIds: newChildIds,
      sourceLibraryKey: libraryId
    }

    setNode(clonedNode)

    for (const childTree of sub.children) {
      instantiate(childTree, newId)
    }

    return clonedNode
  }

  const root = instantiate(tree, parentId)
  if (parentId) {
    const parent = getNode(parentId)
    if (parent && !parent.childIds.includes(root.id)) {
      parent.childIds = [...parent.childIds, root.id]
    }
  }
  return root.id
}

/**
 * Ensures a shared library component exists in the current document graph.
 * If already imported (matched by sourceLibraryKey and componentKey), returns existing node id.
 * Otherwise, restores the component subtree into the document.
 */
export function ensureLibraryComponentInDocument(
  graph: {
    getAllNodes: () => Iterable<SceneNode> | SceneNode[]
    getNode: (id: string) => SceneNode | undefined
    setNode: (node: SceneNode) => void
    currentPageId: string
  },
  libraryId: string,
  libComp: SharedLibraryComponent
): string {
  const allNodes = Array.from(graph.getAllNodes())
  const existing = allNodes.find(
    (n) =>
      (n.type === 'COMPONENT' || n.type === 'COMPONENT_SET') &&
      n.sourceLibraryKey === libraryId &&
      (n.componentKey === libComp.key || n.name === libComp.name)
  )
  if (existing) return existing.id

  return restoreNodeSubtree(
    libComp.serialized,
    graph.getNode,
    graph.setNode,
    libraryId,
    graph.currentPageId
  )
}
