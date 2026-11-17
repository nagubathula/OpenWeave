# Getting Started

## Try Online

OpenWeave runs in the browser — no installation required. Open [app.openweave.dev](https://app.openweave.dev) to start designing.

If you want to build on top of it instead of only using the default app, see the [Programmable](/programmable/) section and the [React SDK](/programmable/sdk/).

## Download Desktop App

Pre-built binaries for macOS, Windows, and Linux are available on the [releases page](https://github.com/openweave/openweave/releases/latest).

| Platform | Download |
|----------|----------|
| macOS (Apple Silicon) | `.dmg` (aarch64) |
| macOS (Intel) | `.dmg` (x64) |
| Windows (x64) | `.msi` / `.exe` |
| Windows (ARM) | `.msi` / `.exe` |
| Linux (x64) | `.AppImage` / `.deb` |


## macOS via Homebrew

```sh
brew install openweave/tap/openweave
```

This installs the latest signed release for macOS (Apple Silicon and Intel). The tap is auto-updated on each release.

## Building from Source

### Prerequisites

- [Bun](https://bun.sh/) (package manager and runtime)

## Installation

```sh
git clone https://github.com/openweave/openweave.git
cd openweave
bun install
```

## Development Server

```sh
bun run dev
```

Opens the editor at `http://localhost:1420`.

## Available Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Dev server with HMR |
| `bun run build` | Production build |
| `bun run check` | Lint (oxlint) + typecheck (tsgo) |
| `bun run test` | E2E visual regression (Playwright) |
| `bun run test:update` | Regenerate screenshot baselines |
| `bun run test:unit` | Unit tests (bun:test) |
| `bun run docs:dev` | Documentation dev server |
| `bun run docs:build` | Build documentation site |

## Desktop App (Electron)

The desktop app is an Electron shell around the same editor. No extra toolchain is needed beyond Bun.

```sh
bun run desktop:dev       # Electron against the Next dev server, with hot reload
bun run desktop:preview   # Electron against the current dist/ static export
```

### Build for Distribution

```sh
bun run desktop:build                      # Installers for the current platform
bun run desktop:build --mac --win --linux  # Cross-target where the host supports it
```

Installers are written to `desktop-electron/release/`. Builds are unsigned unless signing certificates are configured (see `CSC_LINK` in the electron-builder docs); macOS auto-update requires a signed build.
