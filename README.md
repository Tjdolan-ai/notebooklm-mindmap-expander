# NotebookLM Mind Map Auto‑Expander

Chrome/Edge Manifest V3 extension that makes every branch of a Google Notebook LM Mind Map expand automatically—no more endless clicking.

## Features
 
* 🚀 **Auto-Expand:** Automatically expands all mind map nodes on load.
* 🎯 **Selective Depth Expansion:** Choose to expand only 1, 2, or 3 levels deep, or all at once.
* 📦 **Export to Outline:** Export the entire mind map to a clean, indented text outline with a single click.
* 🔍 **Live Search:** Instantly find and highlight nodes as you type.
* 🎨 **Theme Toggle:** Switch between light and dark themes for the toolbar and export modal.
* ⌨️ **Hotkeys**: Ctrl + Shift + E expand, Ctrl + Shift + C collapse  
* 🛡 **Non‑destructive**—doesn’t override NotebookLM shortcuts  
* 🔄 **Graceful Fallback:** A 1-second fallback timer ensures the toolbar injects even on slow-loading pages.

## Installation (dev)

1. Clone or download this repo.  
2. In Chrome/Edge visit **chrome://extensions** → *Load unpacked* → select the project folder.  
3. Open `notebooklm.google.com`, open any Mind Map, and use the new toolbar! 🎉

## Build from TypeScript

```bash
pnpm install
pnpm run build            # emits expander.bundle.js
```

> The shipped `expander.bundle.js` is already compiled, so loading unpacked works out‑of‑the‑box.

## Project Structure

```text
manifest.json
src/
  background.ts         # Handles hotkeys and welcome page
  expander.ts           # Content script to inject toolbar and features
  options.ts            # Logic for the extension's options page
  welcome.html          # Simple welcome page on first install
  options.html          # Extension options page
```

## Hotkeys

| Action    | Shortcut           |
|-----------|--------------------|
| Expand    | Ctrl + Shift + E   |
| Collapse  | Ctrl + Shift + C   |

## Troubleshooting

* **Map inside Drive overlay?** Observer might not detect; reload tab.  
* **Google changed DOM:** Fallback walker should still succeed; open devtools → Console to inspect button selectors.  

MIT © 2025 Visionary42
