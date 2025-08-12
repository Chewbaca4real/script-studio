# Script Studio — Base Starter

Minimal polished starter for a desktop screenplay editor (Electron + React + Vite).

## Features
- Minimal clean UI
- Auto-formatting heuristics for screenplay (scene headings, character, dialogue)
- Menu: New, Open, Save, Export PDF, Export FDX
- PDF export (Electron printToPDF)
- FDX export (basic Final Draft XML)
- GitHub Actions workflow to build installers

## Run (dev)
1. Install Node.js (LTS) from https://nodejs.org
2. Unzip this project and open a terminal in the project folder
3. `npm install`
4. In one terminal: `npm run dev`
5. In another terminal: `npm start`

## Build installers via GitHub Actions
Push this repo to GitHub and enable Actions (workflow included).
