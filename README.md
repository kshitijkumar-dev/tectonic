# Tectonic

A standalone building-energy intelligence prototype with an interactive 3D digital twin and a simulated command center.

## Run locally

The project has no build step or package dependencies. From this folder, start a static HTTP server:

```powershell
py -m http.server 8000
```

Then open <http://localhost:8000>. If the Python launcher is unavailable, use `python -m http.server 8000` instead. Keep the server terminal open while using the app; press Ctrl+C to stop it.

## Project structure

```text
tectonic/
├── index.html              # App page and interface markup
├── assets/
│   ├── css/styles.css      # App and digital-twin styles
│   └── js/
│       ├── app.js          # Command center and simulation
│       └── digital-twin.js # Three.js scene and interactions
├── lib/                    # Bundled Three.js libraries
└── README.md
```

`lib/three.min.js` and `lib/OrbitControls.js` are bundled Three.js r128 files (MIT). The interface uses Google Fonts when a network connection is available and falls back to system fonts otherwise.

## Demo flow

Landing (3D digital twin) → **Enter Command Center** (animated transition) → **3D view** in the sidebar (return to the landing).

All building and dashboard data is simulated. The 3D digital twin uses demo data separate from the command center.
