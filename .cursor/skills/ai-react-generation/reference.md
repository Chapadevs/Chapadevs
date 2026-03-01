# Reference: Prompt Structures & ui-components Mapping

## Template Structure (templateStructure.js)

- **ECOMMERCE_KEYWORDS**: `ecommerce`, `store`, `shop`, `selling`, `sales` → use ecommerce template.
- **MANAGEMENT_KEYWORDS**: `management`, `panel`, `erp`, `crm`, `admin`, `dashboard`, `backend` → use management panel template.
- **Template resolution** (via `resolveTemplateType`): (1) If `previewTemplate` is set and not `'auto'`, use it directly. (2) When `previewTemplate` is `'auto'`, **prompt takes priority** over projectType — if prompt has ecommerce or management keywords, use that. (3) Else use projectType enum mapping. (4) Fallback to prompt keyword detection. E.g. "I need an ecommerce" overrides projectType "Management Panel".
- **MANAGEMENT_UI_RULES**: Minimal, fixed structure for management panels (flex layout, 4 stat cards, single table per page) to prevent broken layouts.
- **AUTH_FORM_SECTIONS**: shared Login/Register form instructions (used by ecommerce and management templates).
- **COLOR_MAP**: keyword → Tailwind class (e.g. blue → blue-600). **DEFAULT_COLOR_SCHEME**: `purple-600, indigo-600`.
- **STYLE_KEYWORDS**: modern, minimal, clean, bold, elegant, fun, professional, creative, playful, vibrant. **DEFAULT_STYLE**: modern.
- **SHARED_COMPONENTS**: header (sticky nav, logo + nav buttons + hamburger, onClick only), footer (business name, copyright, quick links, social).
- **UI_RULES**: all sections required, alternate section backgrounds, varied layouts, shadow/rounded/hover, py-16/py-20, responsive breakpoints, no Lorem ipsum.
- **CODE_RULES**: data arrays + `.map()` for cards/items; reuse one card layout via `.map()` to reduce tokens.

**Business pages**: home, about, services, contact. **Ecommerce pages**: home, about, products, contact. Each page has `stateValue` and `sections[]` with `id` and `instruction` (placeholders: `{businessName}`, `{colorScheme}`).

## Prompt Builder Functions (promptBuilders.js)

- **buildOptimizedPrompt**: project spec JSON (analysis only); tech constraint JS ecosystem.
- **buildWebsitePrompt**: single full React component (multi-page, Tailwind, Sandpack); business name, color, style from user input.
- **buildCombinedPrompt**: uses `getTemplate(projectType, prompt, previewTemplate)`, `extractColorScheme()`, `extractStyle()`, then `buildPageStructurePrompt`, `buildSharedComponentsPrompt`, `buildUIRulesPrompt`, `buildCodeRulesPrompt`; output is JSON with `analysis` + `code` (legacy) or `analysis` + `files` (preferred).

## Build structure (multi-file)

- **Parser**: Accepts both `code` (string) and `files` (object). If `files` is present, it is normalized and used; otherwise `code` is used. Frontend uses `metadata.websitePreviewFiles` when present; otherwise `metadata.websitePreviewCode` for a single `/App.js`.
- **Required paths (business/ecommerce)**: `/App.js`, `/components/Header.js`, `/components/Footer.js`, `/pages/HomePage.js`, `/pages/AboutPage.js`, `/pages/ServicesPage.js` or `/pages/ProductsPage.js`, `/pages/ContactPage.js`. Ecommerce also: `/pages/LoginPage.js`, `/pages/RegisterPage.js`.
- **Required paths (management)**: `/App.js`, `/components/Sidebar.js`, `/components/Header.js`, `/pages/LoginPage.js`, `/pages/RegisterPage.js`, `/pages/DashboardPage.js`, `/pages/ProductsPage.js`, `/pages/UsersPage.js`.
- **Contextual mock data (management)**: Products and users table rows must be domain-specific from the project prompt (e.g. T-shirts → "Cropped T-shirt", M, $39.99, Black; advocacy/employees → "John Smith", "Federal Laws Specialist", "Execution Dept"). Never generic "Product A" or "User 1".
- **Optional paths**: `/components/ui/Button.js`, `/components/ui/Card.js` (or similar reusable UI). App.js is the shell (imports pages and layout components; holds currentPage state; nav via button onClick).

## Generation params & logging

- **metadata.generationParams**: Each completed preview stores `templateType`, `templateSource` (`previewTemplate` | `projectType` | `prompt`), `promptPreview`, `userInputs`, `modelId` for traceability.
- **Console logging**: Backend logs `[AI Preview] Generation params` (prompt preview, userInputs, templateType, templateSource) at start; Vertex service logs `templateType`, `promptLength`, `modelId` before each API call. Set `DEBUG_PREVIEW_GENERATION=true` to log full prompt (truncated to 3000 chars).

## ui-components → Generation Mapping

Use this to inject or mirror app components in prompts so generated code can align with the main app.

| ui-component | Path | Suggested prompt usage / alignment |
|--------------|------|-------------------------------------|
| Button | `ui-components/Button/Button.jsx` | Variants: primary, secondary, ghost, danger. Sizes: xs, sm, md, lg, hero. Prompt: "Primary CTA use solid bg; secondary use border. Use rounded-none, uppercase, font-button." |
| Card | `ui-components/Card` | Variants: default, elevated, accent, ghost, outline. Prompt: "Use card layout with shadow, no rounded (rounded-none); optional green bottom border for accent." |
| Badge | `ui-components/Badge/Badge.jsx` | Status: holding, open, ready, development, completed. Prompt: "Status badges: small pill, semantic colors; mirror Badge status styles." |
| PageTitle | `ui-components/PageTitle/PageTitle.jsx` | H1, green left border, Code Bold, uppercase. Prompt: "Page titles: left border accent, heading font, uppercase." |
| SectionTitle | `ui-components/SectionTitle/SectionTitle.jsx` | Section headings. Prompt: "Section titles: consistent with SectionTitle style." |
| Container | `ui-components/Container/Container.jsx` | Layout wrapper. Prompt: "Wrap main content in max-width container (max-w-6xl or Container)." |
| Alert | `ui-components/Alert/Alert.jsx` | error, success, info, warning. Prompt: "Alerts: use semantic colors (red/green/blue/amber), no rounded." |
| Input | `ui-components/Input/Input.jsx` | Form inputs. Prompt: "Inputs: sharp corners (rounded-none), border, focus ring." |
| Select | `ui-components/Select/Select.jsx` | Dropdowns. Prompt: "Selects: same as Input styling." |
| Tag | `ui-components/Tag/Tag.jsx` | Tags/chips. Prompt: "Tags: small pill, primary variant for highlights." |

**Design system (design-pattern.mdc)**: Sharp look (rounded-none), font-heading / font-button / font-body, primary #059669, surface white, border #e5e7eb. When generating code that may be merged into the app, prefer these tokens and no new one-off CSS.

## Implementing New ui-components Into Generation

1. Add the component to `frontend/src/components/ui-components` and export from `index.js`.
2. In `templateStructure.js`: if the component affects shared layout, extend **SHARED_COMPONENTS** or a section **instruction** to mention it (e.g. "Use a Container for main content").
3. In **UI_RULES** or **CODE_RULES**: add one short line if the component implies a global rule (e.g. "Use Button-like CTAs: primary for main action, secondary for secondary").
4. In `promptBuilders.js`: if a builder emits inline HTML/JSX that should mirror the component, add a single sentence referencing the component name and key props (e.g. "CTA buttons: same visual as Button variant primary, size lg").
5. Run a quick generation test (combined or website prompt) and confirm the output is consistent with the design system and does not introduce new one-off styles.
