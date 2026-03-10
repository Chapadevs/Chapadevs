---
name: ai-react-generation
description: Builds and maintains optimized prompts and structures for AI React website and application generation via Vertex AI. Ensures generated code aligns with the project's ui-components and design system. Use when changing Vertex AI services, prompt builders, template structure, or reused components; or when integrating new UI components into the generation pipeline.
---

# AI React Generation (Vertex AI + UI-Components Integration)

## When to Apply

Apply these skill rules whenever:

- Changing any **Vertex AI service code** (`backend/services/vertexAI/`)
- Editing shared or reused code-generation **templates** (including prompt logic)
- Updating prompt builder logic, template structure, or integrating new/existing **ui-components**
- Modifying anything impacting generated React code, previews, or AI-powered builder flows

---

## Sandpack Integration & Build Format

**AI-generated website previews are rendered using [Sandpack](https://sandpack.dev/). Preferred output is the modular structure for flexibility (e.g. future Cycles/phases).**

### Multi-file format (preferred)

- Output a `files` object in the JSON response with these paths (and optional UI components):
  - **Required**: `/App.js` (shell: imports from `./pages` and `./components`, `currentPage` state, Header/Footer, page switch), `/components/Header.js`, `/components/Footer.js`, `/pages/HomePage.js`, `/pages/AboutPage.js`, `/pages/ServicesPage.js` or `/pages/ProductsPage.js`, `/pages/ContactPage.js`
  - **Optional**: `/components/ui/Button.js`, `/components/ui/Card.js` (reusable UI used by pages)
- Sandpack builds from `websitePreviewFiles` when present; entry is `index.js` → `App.js`.
- App.js must import from `./pages/*` and `./components/Header`, `./components/Footer`; nav via `button` + `onClick` only (no `href`).

### Single-file format (legacy)

- A single `code` string is still supported: one `/App.js` with the full React component (`export default App`). Stored as `websitePreviewCode`; Sandpack uses it when `websitePreviewFiles` is not present.

### Fixed Sandpack files (always added by frontend)

- `/index.js`: React 18 with `createRoot`, imports `App` from `./App`, renders `<App />`
- `/index.css`: `@tailwind base;` / `components` / `utilities`
- `/tailwind.config.js`: content and theme skeleton for Tailwind
- `/public/index.html`: root div + Tailwind CDN script

---

## 🏗️ Rules for Vertex AI Generation + UI-Component Reuse

### 1. **Check for UI-Components Reuse**

- **List available UI components:**  
  See `frontend/src/components/ui-components/index.js` for all barrel-exports, e.g. Button, Input, Select, Badge, PageTitle, SectionTitle, Container, Alert, Tag, NotificationBell, SecondaryButton, NavDropdown, StatusDropdown, Textarea, Sidebar, Avatar, Card.
- **Check usage patterns:**  
  Inspect the props, variants, and classes for such components under `frontend/src/components/ui-components/<Name>/`.
- **Design system match:**  
  All generated React code (even if not directly importing ui-components) must visually match the design system in `.cursor/rules/design-pattern.mdc`:  
    - **Sharp look** (`rounded-none`)  
    - **Typography:** Use `font-heading` for headings, `font-body` for body, etc.  
    - **Palette:** Use Tailwind classes matching the standard palette; for primary color, use `bg-primary`, `text-primary`, etc.

### 2. **Integration Guidance: What to Instruct the Model**

- **For Sandpack preview:**  
  Generated code is pure React + Tailwind CSS.  
  - _In prompts, reference:_
    - "use Tailwind classes matching Button/Badge, e.g. `bg-primary`, `rounded-none`, `font-heading`"
    - "no custom or unapproved styles, follow unified system rules"
  - Code should only use functional React and valid Tailwind utility classes.
- **For code meant to be migrated:**  
  Prefer using existing component names and props used in the app—so code can be swapped for the real components later with minimal effort.  
  - _e.g. If generating `<Button>`s, structure as `<Button variant="primary">` etc._

### 3. **Prompt/Template Maintenance**

| Purpose                               | Location                                                |
|----------------------------------------|---------------------------------------------------------|
| Prompt builders (optimized prompts)    | `backend/services/vertexAI/promptBuilders.js`           |
| Page & section/template structures     | `backend/services/vertexAI/templateStructure.js`        |
| Helpers (page/code → prompt)           | `backend/services/vertexAI/templateStructureHelper.js`  |
| Core Vertex AI logic                   | `backend/services/vertexAI/index.js`                    |

- Always keep prompt and template updates in the correct file, never duplicated.
- Keep prompts as compact as possible (data lists + `.map()`).
- Use `extractColorScheme` and `extractStyle` for consistency.
- Output is JSON: `{ analysis, code }` or `{ analysis, files }`. Prefer `files` (object of path → content) for the modular build; `code` (single App string) is legacy. App uses hooks (e.g. `useState` for multi-page) and **never** anchor navigation—only `button`+`onClick`.

---

## ✅ Checklist When Changing Generation Code

- [ ] Template & prompt changes reflected in builder files
- [ ] Checked all relevant UI-components for possible reuse or visual similarity
- [ ] Generated UI matches **design-pattern** in `.cursor/rules/design-pattern.mdc`
- [ ] Avoid one-off or nonstandard styles in outputs

---

## 📚 Further References

- See [reference.md](reference.md) for full details on prompt and component mapping.
- For Sandpack card render, see `AIPreviewCard.jsx` (including all code blocks for Sandpack files build).

