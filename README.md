# Mobius

A desktop productivity app for deep work and time awareness. Mobius combines task management, a focus timer with a growing pixel-art garden, an activity tracker, statistics, and a calendar — all in one place, running locally on your machine with no account or internet connection required.

> **Active development** — new features and fixes are released regularly. Check the [Releases](https://github.com/mobius-group-project/mobius/releases) page for updates.

---

## Download (pre-built)

If you just want to run the app without building from source, grab the latest installer from the Releases page.

| Platform | Status | Download |
|---|---|---|
| macOS (Apple Silicon) | Available | [Mobius_0.1.0_aarch64.dmg](https://github.com/mobius-group-project/mobius/releases/download/v0.1.0/Mobius_0.1.0_aarch64.dmg) |
| Windows | Coming soon | — |
| Linux | Coming soon | — |

### macOS installation

1. Download the `.dmg` file
2. Open it and drag **Mobius.app** into your **Applications** folder
3. **First launch only:** macOS will block the app because it is not signed by Apple. Right-click **Mobius.app** → **Open** → click **Open** in the dialog that appears. You only need to do this once.

Alternatively: **System Settings → Privacy & Security** → scroll down → click **Open Anyway** next to the Mobius entry.

---

## Build from source

### Branch structure

| Branch | Purpose |
|---|---|
| `main` | Stable, production-ready code. Always buildable. |
| `dev` | Active development branch. May contain work in progress. |
| `windows-app` | Windows-specific experiment branch. |

**Always clone and build from `main`.**

### Prerequisites

Install the following before proceeding:

- [Node.js](https://nodejs.org) v18 or later
- [Rust](https://rustup.rs) (stable toolchain)
- On **macOS**: Xcode Command Line Tools — run `xcode-select --install`
- On **Windows**: [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with the "Desktop development with C++" workload, plus [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (already included in Windows 11)
- On **Linux**: `webkit2gtk`, `libssl-dev`, and a few other system packages — see the [Tauri Linux prerequisites guide](https://tauri.app/start/prerequisites/#linux)

### Clone and run

```bash
# 1. Clone the repository
git clone https://github.com/mobius-group-project/mobius.git
cd mobius

# 2. Install JavaScript dependencies
npm install

# 3. Start the app in development mode (hot-reload enabled)
npm run tauri dev
```

The first run will compile the Rust backend — this takes a few minutes. Subsequent runs are much faster.

### Build a release binary

```bash
npm run tauri build
```

Output is placed in `src-tauri/target/release/bundle/`:
- **macOS:** `macos/Mobius.app` and `dmg/Mobius_x.x.x_aarch64.dmg`
- **Windows:** `msi/Mobius_x.x.x_x64_en-US.msi` and `nsis/Mobius_x.x.x_x64-setup.exe`

> You can only build for the platform you are running on. Building a macOS binary requires a Mac; building a Windows binary requires Windows.

---

## Tech stack

| Layer | Technology |
|---|---|
| UI | React 19 + TypeScript |
| Desktop shell | Tauri 2 (Rust) |
| Database | SQLite via `tauri-plugin-sql` |
| Build tool | Vite |

---

## Features

- **Tasks** — create, prioritise, reorder by drag-and-drop, track time spent, add comments
- **Focus timer** — Pomodoro-style countdown with a pixel-art plant that grows as you work
- **Garden** — all plants grown during focus sessions collected in one draggable canvas
- **Activity tracker** — stopwatch with named sessions, full daily history
- **Statistics** — bar chart and donut chart with adjustable date range
- **Calendar** — day / week / month / year views, recurring events, reminders, colour labels
- **Notes** — rich-text notepad with bold, italic, lists, and checkboxes
- **Dashboard** — all panels at a glance on one screen

---

## Contributing

1. Fork the repository
2. Branch off `dev` (not `main`)
3. Open a pull request back into `dev`

Please keep commits focused and the PR description clear about what changed and why.
