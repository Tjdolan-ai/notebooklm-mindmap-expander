# AGENTS.md - NotebookLM Extension Development Protocol
# 🚨 CRITICAL: This project uses pnpm, NOT npm

## ⚠️ WRONG COMMANDS (Never use these):
```bash
npm install [package]    # ❌ Creates package-lock.json conflicts
npm run build           # ❌ Wrong package manager
npm audit              # ❌ Different dependency resolution
> **Mission**: Build Chrome extensions with excellence, integrity, and user-first design principles.

## 🎯 **Core Development Philosophy**

### **Values Lock (Non-negotiable)**
- **Excellence**: Enterprise-grade code quality, comprehensive testing
- **Integrity**: Honest documentation, transparent limitations
- **Service**: User needs above convenience, accessibility first
- **Stewardship**: Secure data handling, ethical AI usage

### **Technical Standards**
- **TypeScript First**: Strict typing, JSDoc documentation
- **Defensive Coding**: Multi-selector fallbacks, error boundaries
- **Performance Conscious**: Test with 50+ items, optimize for scale
- **Security Hardened**: Input sanitization, CSP compliance

## ⚙️ **Project Toolchain Standards**

### **CRITICAL: Respect Existing Toolchain**
```bash
# ✅ ALWAYS USE (this project uses pnpm)
pnpm install [package]
pnpm run build
pnpm run dev
pnpm test

# ❌ NEVER USE (will break dependency management)
npm install [package]  # Creates conflicting lock files
yarn add [package]     # Wrong package manager
```

### **Build & Development Commands**
```bash
# Standard workflow
pnpm install                    # Install dependencies
pnpm run rebuild               # Clean build
pnpm run dev                   # Watch mode
pnpm test                      # Run test suite
pnpm run lint                  # Code quality check
```

## 🏗️ **Chrome Extension Architecture Patterns**

### **Manifest V3 Structure**
```json
{
  "manifest_version": 3,
  "permissions": ["storage", "activeTab"],
  "host_permissions": ["https://notebooklm.google.com/*"],
  "background": { "service_worker": "dist/background.js" },
  "content_scripts": [
    {
      "matches": ["https://notebooklm.google.com/*"],
      "js": ["dist/content.js"],
      "run_at": "document_idle"
    }
  ]
}
```

### **File Organization Standards**
```
src/
├── background.ts          # Service worker, messaging hub
├── content.ts            # DOM manipulation, UI injection
├── popup.ts              # Extension popup logic
├── options.ts            # Settings management
├── utils/
│   ├── dom-helpers.ts    # Defensive DOM utilities
│   ├── storage.ts        # Chrome storage wrappers
│   └── messaging.ts      # Runtime message patterns
└── types/
    └── index.ts          # Shared TypeScript definitions
```

## 🛡️ **Defensive Programming Patterns**

### **Multi-Selector Fallback Strategy**
```typescript
// Always use multiple selector strategies
const ELEMENT_SELECTORS = [
  '[data-testid="primary-target"]',    // Preferred
  '.fallback-class',                   // Secondary
  '[aria-label*="target"]',           // Accessibility
  'div[class*="target"]:has(button)'   // Last resort
];

function findElement(): Element | null {
  for (const selector of ELEMENT_SELECTORS) {
    const element = document.querySelector(selector);
    if (element) return element;
  }
  console.warn('Element not found with any selector');
  return null;
}
```

### **SafeClicker Pattern Implementation**
```typescript
class SafeClicker {
  static async clickWithVerification(element: Element): Promise<boolean> {
    // Pre-click validation
    if (!element || !element.isConnected) return false;
    
    // Perform click
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    
    // Post-click verification (wait for state change)
    return await this.verifyAction(element);
  }
  
  private static async verifyAction(element: Element): Promise<boolean> {
    const timeout = 2000;
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      // Check for expected state changes
      if (element.getAttribute('aria-expanded') === 'true') return true;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    return false;
  }
}
```

## 📊 **Message Passing Architecture**

### **Background Script Hub Pattern**
```typescript
// background.ts - Central message router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  switch (message.action) {
    case 'EXPORT_NOTES':
      return handleExport(message.data, sendResponse);
    case 'UPDATE_SETTINGS':
      return handleSettings(message.data, sendResponse);
    default:
      console.warn('Unknown message action:', message.action);
  }
  return true; // Keep message channel open
});
```

### **Content Script Communication**
```typescript
// content.ts - Send messages to background
async function exportNotes(notes: Note[]): Promise<void> {
  const response = await chrome.runtime.sendMessage({
    action: 'EXPORT_NOTES',
    data: { notes, format: 'pdf' }
  });
  
  if (!response.success) {
    throw new Error(response.error);
  }
}
```

## 🔧 **DOM Interaction Best Practices**

### **Mutation Observer Pattern**
```typescript
// Watch for dynamic content changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          processNewElement(node as Element);
        }
      });
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
```

### **UI Injection Strategy**
```typescript
// Inject extension UI into target page
function injectToolbar(): boolean {
  const containers = [
    '.mind-map-toolbar',
    '[data-testid="toolbar"]',
    '.notebook-header'
  ];
  
  for (const selector of containers) {
    const container = document.querySelector(selector);
    if (container && !container.querySelector('.extension-toolbar')) {
      container.appendChild(createToolbar());
      return true;
    }
  }
  return false;
}
```

## 📚 **Storage Management Patterns**

### **Settings Storage Wrapper**
```typescript
// utils/storage.ts
export interface ExtensionSettings {
  autoExpand: boolean;
  defaultDepth: number;
  theme: 'light' | 'dark' | 'auto';
  exportFormat: 'pdf' | 'markdown';
}

export class SettingsManager {
  static async get(): Promise<ExtensionSettings> {
    const defaults: ExtensionSettings = {
      autoExpand: false,
      defaultDepth: 0,
      theme: 'auto',
      exportFormat: 'pdf'
    };
    
    const stored = await chrome.storage.sync.get(defaults);
    return { ...defaults, ...stored };
  }
  
  static async set(settings: Partial<ExtensionSettings>): Promise<void> {
    await chrome.storage.sync.set(settings);
  }
}
```

## 🧪 **Testing & Quality Assurance**

### **Manual Testing Checklist**
```bash
# Before every commit, verify:
□ Extension loads without console errors
□ Core functionality works in fresh browser instance
□ Settings persist across browser restarts
□ Works with empty/minimal NotebookLM content
□ Handles network failures gracefully
□ No memory leaks during extended use
```

### **Performance Testing Requirements**
```typescript
// Always test with realistic data volumes
const PERFORMANCE_TESTS = {
  'Small notebook': '5-10 notes',
  'Medium notebook': '25-50 notes', 
  'Large notebook': '100+ notes',
  'Complex formatting': 'Rich text, images, tables'
};
```

## 🚀 **Development Workflow**

### **Feature Implementation Process**
1. **Research Phase**: Understand user need, technical constraints
2. **Architecture Design**: Plan file structure, message flows
3. **Defensive Implementation**: Code with fallbacks, error handling
4. **Testing Phase**: Manual validation, edge case testing
5. **Documentation**: Update README, inline comments
6. **Review Request**: Submit with clear description of changes

### **Git Workflow Standards**
```bash
# Branch naming convention
feature/export-system
fix/dom-selector-fallback
chore/dependency-update

# Commit message format
feat: add PDF export with formatting preservation
fix: handle missing note content gracefully
docs: update installation instructions
test: add batch export performance validation
```

## 🔒 **Security Requirements**

### **Input Sanitization**
```typescript
// Always sanitize user content before processing
function sanitizeHTML(input: string): string {
  return input
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .trim();
}
```

### **CSP Compliance**
```typescript
// Never use eval, inline scripts, or unsafe-eval
// Use proper Content Security Policy headers
// Externalize all scripts and styles
```

## 📖 **Documentation Standards**

### **Function Documentation**
```typescript
/**
 * Exports notebook content to specified format with progress tracking
 * @param notes - Array of note objects to export
 * @param format - Target export format ('pdf' | 'markdown')
 * @param options - Export configuration options
 * @returns Promise resolving to export success status
 * @throws {Error} When export format is unsupported or notes are invalid
 */
async function exportNotes(
  notes: Note[], 
  format: ExportFormat, 
  options: ExportOptions
): Promise<ExportResult> {
  // Implementation...
}
```

### **README Update Requirements**
- Feature descriptions with screenshots
- Installation instructions
- Usage examples
- Troubleshooting section
- Contributing guidelines

## 🎯 **Success Metrics & Goals**

### **Code Quality Indicators**
- Zero console errors in production
- TypeScript strict mode compliance
- 100% function documentation coverage
- Defensive error handling in all user interactions

### **User Experience Standards**
- <2 second response time for all operations
- Clear progress indicators for long operations
- Graceful degradation when features unavailable
- Accessibility compliance (keyboard navigation, screen readers)

## 🆘 **When You Need Help**

### **Escalation Triggers**
- Build fails after dependency changes
- Chrome extension APIs behave unexpectedly
- NotebookLM DOM structure changes significantly
- Performance degrades below acceptable thresholds

### **Information to Provide**
- Exact error messages and stack traces
- Steps to reproduce the issue
- Browser version and extension version
- Console output and network logs

---

> *"Whatever you do, work at it with all your heart, as working for the Lord"* - Colossians 3:23

**Remember**: Excellence in code reflects excellence in character. Build with integrity, test with diligence, and serve users with humility.
