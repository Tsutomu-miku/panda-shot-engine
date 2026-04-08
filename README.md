# Panda Shot Engine

**DSL-driven animation editor for panda-head / shrimp-style animations.**

Panda Shot Engine is a desktop application built with Electron and React that provides a visual editor for creating short-form animations using a custom DSL (Domain-Specific Language). It is designed for rapid production of meme-style animated clips featuring panda heads, shrimp heads, and similar character archetypes.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                       Electron Main Process                  │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │  Window Mgmt  │  │  IPC Bridge  │  │  File I/O (fs)     │ │
│  └──────────────┘  └──────┬───────┘  └────────────────────┘ │
│                           │ contextBridge                    │
├───────────────────────────┼──────────────────────────────────┤
│                    Renderer Process (React + Vite)            │
│                           │                                  │
│  ┌────────┐  ┌────────────┴──────────────┐  ┌────────────┐  │
│  │ Asset  │  │       Canvas Preview       │  │    DSL     │  │
│  │ Panel  │  │      (center, flex)        │  │   Editor   │  │
│  │(240px) │  ├───────────────────────────┤  │  (320px)   │  │
│  │        │  │     Timeline (200px)       │  ├────────────┤  │
│  │ 角色   │  │  tracks / keyframes /      │  │ Properties │  │
│  │ 道具   │  │  playhead                  │  │   Panel    │  │
│  │ 场景   │  └───────────────────────────┘  └────────────┘  │
│  └────────┘                                                  │
└──────────────────────────────────────────────────────────────┘
```

### Directory Structure

```
panda-shot-engine/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts           # App entry, BrowserWindow setup
│   │   └── preload.ts        # contextBridge IPC API
│   └── renderer/             # React renderer process
│       ├── index.html        # HTML entry
│       ├── main.tsx          # React root
│       ├── App.tsx           # Main 4-panel layout
│       └── styles/
│           └── global.css    # Dark theme styles
├── dist/                     # Compiled output (git-ignored)
│   ├── main/                 # Compiled main process JS
│   └── renderer/             # Vite-built renderer
├── package.json
├── tsconfig.json             # Base TypeScript config
├── tsconfig.main.json        # Main process TS config
├── tsconfig.renderer.json    # Renderer process TS config
├── vite.config.ts            # Vite bundler config
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** >= 18
- **npm** >= 9

### Install Dependencies

```bash
npm install
```

### Development Mode

Starts the Vite dev server and TypeScript watcher concurrently:

```bash
npm run dev
```

Then, in a separate terminal, launch the Electron app:

```bash
npm start
```

### Production Build

```bash
npm run build
npm start
```

---

## Tech Stack

| Layer          | Technology                         |
|----------------|------------------------------------|
| Desktop Shell  | Electron 28                        |
| UI Framework   | React 18                           |
| Language       | TypeScript 5.3 (strict mode)       |
| Bundler        | Vite 5                             |
| Styling        | CSS (custom dark theme, CSS Grid)  |
| IPC            | Electron contextBridge + ipcMain   |
| Persistence    | electron-store                     |

---

## DSL Reference

Panda Shot Engine uses a custom DSL to declaratively describe animations. Below are some examples.

### Basic Scene

```
@scene "开场" {
  background: "#1a1a30"
  duration: 5s
}
```

### Character with Keyframes

```
@character "熊猫头" {
  position: center
  scale: 1.0

  @keyframe 0s {
    expression: "default"
    opacity: 0
  }

  @keyframe 0.5s {
    expression: "default"
    opacity: 1
  }

  @keyframe 2s {
    expression: "happy"
    move: [100, 0]
  }
}
```

### Props and Attachments

```
@prop "对话气泡" {
  attach: "熊猫头"
  offset: [0, -120]

  @keyframe 1s { text: "你好!" }
  @keyframe 3s { text: "再见~" }
}
```

### Multi-scene Sequence

```
@sequence {
  @scene "场暯1" { duration: 3s }
  @scene "场暯2" { duration: 4s; transition: "fade" }
  @scene "场暯3" { duration: 2s; transition: "slide-left" }
}
```

### Expression Library

```
@expressions "熊猫头" {
  default:  "assets/panda/default.png"
  happy:    "assets/panda/happy.png"
  sad:      "assets/panda/sad.png"
  angry:    "assets/panda/angry.png"
  shocked:  "assets/panda/shocked.png"
}
```

---

## License

MIT
