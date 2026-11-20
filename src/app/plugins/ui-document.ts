/**
 * The HTML loaded into a plugin's UI iframe. The iframe is sandboxed without
 * `allow-same-origin`, so the UI runs on an opaque origin with no access to
 * the editor, its storage, or the desktop bridge. When the manifest declares
 * `networkAccess.allowedDomains`, a Content-Security-Policy limits where the
 * UI may connect and load resources from, as Figma does.
 */

const ALWAYS_ALLOWED = ["'unsafe-inline'", "'unsafe-eval'", 'data:', 'blob:']

function cspSource(domain: string): string | null {
  const trimmed = domain.trim()
  if (!trimmed || trimmed === 'none') return null
  // CSP sources cannot contain quotes, semicolons, commas, or whitespace.
  if (/["';,\s]/.test(trimmed)) return null
  return trimmed
}

export function pluginContentSecurityPolicy(allowedDomains: string[]): string | null {
  if (allowedDomains.includes('*')) return null
  const sources = allowedDomains.map(cspSource).filter((source) => source !== null)
  const network = sources.length > 0 ? sources.join(' ') : "'none'"
  const resources = [...ALWAYS_ALLOWED, ...sources].join(' ')
  return [
    `default-src ${resources}`,
    `connect-src ${network}`,
    `img-src ${resources}`,
    `font-src ${resources}`,
    `style-src ${resources}`,
    `script-src ${resources}`,
    `frame-src 'none'`
  ].join('; ')
}

function escapeAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

export function pluginUIDocument(html: string, allowedDomains?: string[]): string {
  const policy = allowedDomains ? pluginContentSecurityPolicy(allowedDomains) : null
  if (!policy) return html
  const meta = `<meta http-equiv="Content-Security-Policy" content="${escapeAttribute(policy)}">`
  // The policy must come before any script or resource it governs.
  const head = /<head[^>]*>/i.exec(html)
  if (head) return html.replace(head[0], `${head[0]}${meta}`)
  return `${meta}${html}`
}
