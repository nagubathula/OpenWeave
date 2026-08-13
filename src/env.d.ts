// Build-time globals injected by the desktop (Tauri) build. In the web build
// they are undefined; consumers guard with `typeof` checks (see
// src/app/automation/mcp/spawn.ts).
declare const __OPENWEAVE_APP_VERSION__: string
declare const __OPENWEAVE_LOCAL_AUTOMATION_TOKEN__: string | null
