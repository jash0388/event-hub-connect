# DataNauts HUB - Desktop App

A desktop wrapper for [datanauts.in](https://datanauts.in) built with Electron.

## Setup

```bash
cd desktop-app
npm install
```

## Run Locally (Test)

```bash
npm start
```

## Build Windows .exe

### On a Windows machine:
```bash
npm run build:win
```

This creates a Windows installer in `dist/` folder.

### On Mac (cross-compile):
You need Wine installed first:
```bash
brew install --cask wine-stable
npm run build:win
```

### Using GitHub Actions (Recommended):
Create `.github/workflows/build-desktop.yml` in your repo to auto-build on push.

## Build macOS .dmg

```bash
npm run build:mac
```

## Output

After building, find the installer in `desktop-app/dist/`:
- **Windows**: `DataNauts HUB Setup x.x.x.exe`
- **macOS**: `DataNauts HUB-x.x.x.dmg`
