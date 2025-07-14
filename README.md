NotebookLM Mind Map Auto‑Expander
“Whatever you do, work at it with all your heart, as working for the Lord…” —Colossians 3:23

A Chrome/Edge Manifest V3 extension that breathes life into Google NotebookLM’s Mind Map. Every branch expands automatically—no more endless clicking. Built to honor both the dignity of creators and the stewardship of technology.

✨ Features
🚀 Auto-Expand: Automatically expands all mind map nodes on load.
🎯 Selective Depth Expansion: Choose to expand just 1, 2, or 3 levels deep, or all at once.
📦 Export to Outline: Export the entire mind map to a clean, indented text outline with a single click.
🔍 Live Search: Instantly find and highlight nodes as you type.
🎨 Theme Toggle: Switch between light and dark themes for the toolbar and export modal.
⌨️ Hotkeys: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>E</kbd> expand, <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>C</kbd> collapse
🛡 Non‑destructive: Doesn’t override NotebookLM shortcuts.
🔄 Graceful Fallback: A 1-second fallback timer ensures the toolbar injects even on slow-loading pages.
🛠 Installation (Dev)
Clone or download this repo.
In Chrome/Edge, visit chrome://extensions → Load unpacked → select the project folder.
Open notebooklm.google.com, open any Mind Map, and use the new toolbar! 🎉
🏗 Build from TypeScript
bash
pnpm install
pnpm run build           # emits dist/expander.js, dist/background.js, dist/options.js
The shipped JS bundles are already compiled, so loading unpacked works out-of-the-box.

📂 Project Structure
Code
manifest.json
src/
  background.ts       # Handles hotkeys and welcome page
  expander.ts         # Content script to inject toolbar and features
  options.ts          # Logic for the extension's options page
options.html, options.css, options.js
welcome.html, welcome.css, welcome.js
⌨️ Hotkeys
Action	Shortcut
Expand	Ctrl + Shift + E
Collapse	Ctrl + Shift + C
🛡 Security & Vulnerability Note
esbuild CORS Advisory
This project’s dev dependencies (via vite/vitest) currently require esbuild ≤0.21.5, which has a CORS vulnerability in its dev server.
Who is affected? Only developers running a local dev server and visiting untrusted sites at the same time.
Mitigation:

Don’t browse untrusted websites while running pnpm run dev or similar.
The risk does not affect production or published extensions.
When vite/vitest support esbuild ≥0.25.0, update dependencies promptly.
“The prudent see danger and take refuge…” —Proverbs 22:3

🩺 Troubleshooting
Map inside Drive overlay? The observer might not detect it; reload the tab.
Google changed the DOM? The fallback walker should still succeed; open devtools → Console to inspect button selectors.
📜 License
MIT © 2025 Visionary42

For questions, improvements, or faith-infused software wisdom, open an issue or PR!


