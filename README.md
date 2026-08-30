# PrepOS

A local-first study companion for Windows: a timed PDF reader, streaks, a
study heatmap, per-page notes and camera practice — all built on top of a
plain folder you already own. Nothing is uploaded anywhere; there's no
account and no server.

**[Download the latest installer](https://github.com/prajwal-priyadarshan/PrepOS/releases/latest)**
&middot; [website source](website/)

![PrepOS workspace](website/assets/screenshot-workspace.png)

## What it does

- **Your own vault.** Point PrepOS at a folder — local or synced through
  OneDrive — and that's the whole vault. Every file it manages is a plain
  file you can see in Explorer.
- **A timer that knows you're reading.** Open a PDF and the clock starts on
  its own; it pauses when the window is hidden or you've gone idle, so the
  logged time is active reading time, not "window left open."
- **Streaks with a weekly freeze.** A qualifying day extends the streak; one
  freeze a week bridges a bad day without lying about it. A GitHub-style
  heatmap shows a year of showing up at a glance.
- **One workspace per prep.** An exam, an interview, a certification —
  anything you're working toward gets its own folder, its own stats, and
  optionally a deadline countdown.
- **Notes pinned to the page.** Press `n` anywhere in the reader to drop a
  note against the exact page you're on.
- **Camera practice**, streamed straight to disk inside that prep's own
  folder — an intro, a speaking-section answer, a daily run-through.
- **Zoom, fullscreen, and scroll-to-turn-the-page** in the reader, tuned to
  stay usable even on a 1000+ page scanned PDF.
- **Light, Dark and Black themes**, following the system by default.

## Installing

Download the Windows installer from the
[latest release](https://github.com/prajwal-priyadarshan/PrepOS/releases/latest)
and run it. That's it — no account, no setup wizard. The first launch asks
for a folder to use as your vault and remembers it after that.

## Building from source

PrepOS is a [Tauri](https://tauri.app) app: a React/TypeScript front end over
a small Rust shell.

**Prerequisites:** Node.js 20+, the
[Rust toolchain](https://www.rust-lang.org/tools/install), and Tauri's
[Windows prerequisites](https://tauri.app/start/prerequisites/) (the MSVC
Build Tools and the WebView2 runtime — WebView2 ships with Windows 11 by
default).

```sh
git clone https://github.com/prajwal-priyadarshan/PrepOS.git
cd PrepOS
npm install

npm run dev          # run the app in development (Vite + Tauri, hot-reloading)
npm run tauri build  # produce a Windows installer
```

The built installer(s) land in `src-tauri/target/release/bundle/` — an NSIS
`.exe` and an MSI, ready to run.

Other useful scripts:

```sh
npm test      # run the test suite (vitest)
npm run lint  # check formatting and lint rules (biome)
```

## Project structure

```
src/                  React app
  features/           one folder per feature area (reader, vault, preps,
                       stats, recorder, notes, settings)
  store/               zustand stores
  lib/                 pure logic - session clocks, streaks, the study-day
                       boundary, stats - independently unit tested
  vault/               the one seam between the app and the filesystem;
                       everything outside it is Tauri-agnostic
src-tauri/             the Rust shell (window, filesystem plugin config, bundling)
tests/                 vitest unit tests for src/lib and the vault seam
website/               the static marketing site published from /website
```

## License

Not yet decided — treat this as all-rights-reserved until a license file is
added.
