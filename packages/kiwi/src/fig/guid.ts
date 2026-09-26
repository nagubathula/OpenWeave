import type { GUID } from './types'

export function guidToString(guid: GUID): string {
  return `${guid.sessionID}:${guid.localID}`
}

export function stringToGuid(str: string): GUID {
  const match = str.match(/^(?:VariableID:|VariableCollectionId:)?(\d+):(\d+)$/)
  if (match) {
    return { sessionID: Number.parseInt(match[1], 10), localID: Number.parseInt(match[2], 10) }
  }
  const [session, local] = str.split(':')
  const s = Number.parseInt(session, 10)
  const l = Number.parseInt(local, 10)
  return { sessionID: Number.isFinite(s) ? s : 0, localID: Number.isFinite(l) ? l : 0 }
}
