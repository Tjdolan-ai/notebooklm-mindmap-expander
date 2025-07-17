# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome/Edge Manifest V3 extension that automatically expands NotebookLM mind maps. The extension provides auto-expansion, selective depth expansion, export functionality, live search, and keyboard shortcuts.

## Development Commands

### Build & Development
- `npm run build` - Clean build (runs `npm run clean && npm run build:ts`)
- `npm run dev` - Development mode with watch (runs `npm run clean && npm run build -- --watch`)
- `npm run clean` - Remove dist directory using rimraf

### Quality & Testing
- `npm run test` - Run tests with vitest
- `npm run test:ui` - Run tests with vitest UI
- `npm run lint` - Lint TypeScript files in src/
- `npm run lint:fix` - Auto-fix linting issues
- `npm run type-check` - Run TypeScript type checking without emitting files

### Release
- `npm run release` - Create semantic release

## Architecture

### Core Components

**Content Script (`src/expander.ts`)**
- Main logic for mind map expansion and UI injection
- Handles DOM manipulation and NotebookLM-specific selectors
- Manages toolbar injection with 1-second fallback timer
- Implements hotkey handling and settings management

**Background Script (`src/background.ts`)**
- Handles extension lifecycle (welcome page on install)
- Forwards keyboard commands to content script
- Manages storage permissions and settings

**SafeClicker (`src/safeClicker.ts`)**
- Robust DOM element detection with fallback strategies
- Handles Google's frequent DOM changes
- Uses specific selectors: `text.expand-symbol`, `[aria-label="Expand"]`, `[aria-expanded="false"]`
- Implements click verification using `text.collapse-symbol`

**Element Detection (`src/elementDetector.ts`)**
- Detects mind map presence and structure
- Handles dynamic content loading

### Build System

- **TypeScript**: Configured for ES2020 with strict settings
- **esbuild**: Bundles TypeScript to IIFE format for browser compatibility
- **Target**: Chrome extensions (Manifest V3)
- **Output**: Files bundled to `dist/` directory

### Extension Structure

- **Manifest V3**: Uses service worker background script
- **Permissions**: `storage`, `activeTab`, host permissions for notebooklm.google.com
- **Content Script**: Runs at `document_idle` on NotebookLM pages
- **Keyboard Shortcuts**: Alt+Shift+E (expand), Alt+Shift+C (collapse), Alt+Shift+O (export)

### Testing

- **Framework**: Vitest with jsdom environment
- **Test Files**: Located in `test/` directory
- **Coverage**: Tests for core functionality including expansion, export, and element detection

## Key Technical Details

### DOM Targeting Strategy
The extension uses a multi-selector fallback approach to handle NotebookLM's changing DOM:
1. Primary: `text.expand-symbol` (SVG glyph)
2. Fallback: `[aria-label="Expand"]`
3. Final: `[aria-expanded="false"]`

### Settings Management
- Uses Chrome storage API for persistence
- Settings: `autoExpand`, `hotkeysEnabled`, `isDarkTheme`
- Graceful fallback to defaults on storage errors

### Error Handling
- Comprehensive error handling for Chrome APIs
- Retry mechanisms for DOM operations
- Fallback timers for slow-loading pages

## Development Notes

### Security Considerations
- esbuild dependency has CORS vulnerability (≤0.21.5) - only affects local dev server
- Extension itself is secure for production use
- No sensitive data handling in codebase

### Extension Loading
- Load unpacked extension from project root
- Pre-compiled JS bundles included in dist/
- No build step required for basic development

### NotebookLM Integration
- Targets `https://notebooklm.google.com/*`
- Handles mind map detection and expansion
- Non-destructive - doesn't override NotebookLM shortcuts