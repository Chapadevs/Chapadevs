/**
 * Template Structure Helper — reads data from templateStructure.js
 * and converts it into prompt-ready text for the AI.
 *
 * promptBuilders.js imports these functions instead of hardcoding page descriptions.
 */

import {
  ECOMMERCE_KEYWORDS,
  MANAGEMENT_KEYWORDS,
  COLOR_MAP,
  CONTEXT_TO_COLOR,
  DEFAULT_COLOR_SCHEME,
  STYLE_KEYWORDS,
  DEFAULT_STYLE,
  STYLE_TO_FONTS,
  SHARED_COMPONENTS,
  SHARED_COMPONENTS_MANAGEMENT,
  UI_RULES,
  MANAGEMENT_UI_RULES,
  CODE_RULES,
  TEMPLATES,
} from './templateStructure.js';

// Project.projectType enum values that map directly to templates
const PROJECT_TYPE_TO_TEMPLATE = {
  'E-commerce Store': 'ecommerce',
  'Management Panel / ERP / CRM': 'management',
};

// ---------------------------------------------------------------------------
// getTemplateType — determines business vs ecommerce vs management from niche string
// When both management and ecommerce keywords present, prefer ecommerce if sales/shop/store
// (user intent: selling). E.g. "management and sales" → ecommerce.
// ---------------------------------------------------------------------------
export function getTemplateType(niche) {
  const lower = (niche || '').toLowerCase();
  const hasManagement = MANAGEMENT_KEYWORDS.some((kw) => lower.includes(kw));
  const hasEcommerce = ECOMMERCE_KEYWORDS.some((kw) => lower.includes(kw));

  if (hasManagement && hasEcommerce) {
    const sellingIntent = ['sales', 'shop', 'store', 'selling'].some((kw) => lower.includes(kw));
    if (sellingIntent) return 'ecommerce';
  }
  if (hasManagement) return 'management';
  if (hasEcommerce) return 'ecommerce';
  return 'business';
}

// ---------------------------------------------------------------------------
// resolveTemplateType — full resolution with previewTemplate override and projectType mapping
// When previewTemplate is 'auto': prompt takes priority over projectType when prompt has explicit
// intent (e.g. "I need an ecommerce" overrides projectType "Management Panel").
// @param {string} projectType - Project.projectType enum value (e.g. "E-commerce Store")
// @param {string} prompt - User prompt text
// @param {string} [previewTemplate] - Explicit override: 'ecommerce' | 'management' | 'business' | 'auto'
// @returns {{ type: string, source: 'previewTemplate' | 'projectType' | 'prompt' }}
// ---------------------------------------------------------------------------
export function resolveTemplateType(projectType, prompt, previewTemplate) {
  if (previewTemplate && previewTemplate !== 'auto') {
    const valid = ['ecommerce', 'management', 'business'];
    if (valid.includes(previewTemplate)) {
      return { type: previewTemplate, source: 'previewTemplate' };
    }
  }
  // When auto: prompt takes priority if it has explicit template intent (user's current request)
  const promptType = getTemplateType(prompt || '');
  if (promptType !== 'business') {
    return { type: promptType, source: 'prompt' };
  }
  if (projectType && PROJECT_TYPE_TO_TEMPLATE[projectType]) {
    return { type: PROJECT_TYPE_TO_TEMPLATE[projectType], source: 'projectType' };
  }
  const niche = projectType || prompt;
  return { type: getTemplateType(niche), source: 'prompt' };
}

// ---------------------------------------------------------------------------
// getTemplate — returns the full template object
// @param {string} projectType - Project.projectType enum (e.g. "E-commerce Store")
// @param {string} prompt - User prompt text
// @param {string} [previewTemplate] - Explicit override: 'ecommerce' | 'management' | 'business' | 'auto'
// ---------------------------------------------------------------------------
export function getTemplate(projectType, prompt, previewTemplate) {
  const { type } = resolveTemplateType(projectType, prompt, previewTemplate);
  return TEMPLATES[type];
}

// ---------------------------------------------------------------------------
// extractColorScheme — finds color from prompt (literal first, then contextual)
// E.g. "website for grapes" → purple; "I want a blue store" → blue
// ---------------------------------------------------------------------------
export function extractColorScheme(prompt) {
  const lower = (prompt || '').toLowerCase();

  // 1. Literal color keywords — user explicitly asked for a color
  for (const color of Object.keys(COLOR_MAP)) {
    if (lower.includes(color)) {
      const primary = COLOR_MAP[color];
      const secondary = primary.replace('-600', '-500').replace('-500', '-400');
      return `${primary}, ${secondary}`;
    }
  }

  // 2. Contextual — infer from subject/theme (e.g. grapes→purple, lemon→yellow)
  // Check longer keys first so "blueberry" wins over "berry"
  const contextKeys = Object.keys(CONTEXT_TO_COLOR).sort((a, b) => b.length - a.length);
  for (const keyword of contextKeys) {
    if (lower.includes(keyword)) {
      const colorKey = CONTEXT_TO_COLOR[keyword];
      const primary = COLOR_MAP[colorKey] || COLOR_MAP.purple;
      const secondary = primary.replace('-600', '-500').replace('-500', '-400');
      return `${primary}, ${secondary}`;
    }
  }

  return DEFAULT_COLOR_SCHEME;
}

// ---------------------------------------------------------------------------
// extractStyle — finds style keyword in prompt
// ---------------------------------------------------------------------------
export function extractStyle(prompt) {
  const lower = (prompt || '').toLowerCase();
  for (const keyword of STYLE_KEYWORDS) {
    if (lower.includes(keyword)) return keyword;
  }
  return DEFAULT_STYLE;
}

// ---------------------------------------------------------------------------
// getFontsForStyle — returns { heading, body, button } for a given style
// ---------------------------------------------------------------------------
export function getFontsForStyle(style) {
  const fonts = STYLE_TO_FONTS[style] || STYLE_TO_FONTS[DEFAULT_STYLE];
  return { heading: fonts.heading, body: fonts.body, button: fonts.button };
}

// ---------------------------------------------------------------------------
// buildFontRulesPrompt — typography instructions for AI prompts
// ---------------------------------------------------------------------------
export function buildFontRulesPrompt(style) {
  const { heading, body, button } = getFontsForStyle(style);
  return `TYPOGRAPHY (apply via style={{ fontFamily: '...' }} or className):
- Headings (h1-h6, hero, section titles): font-family: "${heading}", sans-serif
- Body (p, spans): font-family: "${body}", sans-serif
- Buttons, nav, CTAs: font-family: "${button}", sans-serif`;
}

// ---------------------------------------------------------------------------
// buildPageStructurePrompt — converts page definitions into prompt text
//   Replaces {businessName} and {colorScheme} placeholders in instructions
// ---------------------------------------------------------------------------
export function buildPageStructurePrompt(template, businessName, colorScheme) {
  const lines = [
    'PAGE STRUCTURE (each page is an inner component, switched via currentPage useState):',
  ];

  for (const [pageName, pageDef] of Object.entries(template.pages)) {
    const displayName = pageName.charAt(0).toUpperCase() + pageName.slice(1);
    lines.push('');
    lines.push(
      `${displayName}Page (currentPage === '${pageDef.stateValue}'):`
    );

    pageDef.sections.forEach((section, index) => {
      const instruction = section.instruction
        .replace(/\{businessName\}/g, businessName)
        .replace(/\{colorScheme\}/g, colorScheme);
      lines.push(`  ${index + 1}. ${section.id.charAt(0).toUpperCase() + section.id.slice(1)}: ${instruction}`);
    });
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// buildSharedComponentsPrompt — header + footer (or sidebar for management)
// ---------------------------------------------------------------------------
export function buildSharedComponentsPrompt(template, businessName) {
  const navList = template.navPages.join(', ');
  if (template.type === 'management') {
    return `Shared Components (management panel layout):
- ${SHARED_COMPONENTS_MANAGEMENT.sidebar} Main nav: Dashboard, Products, Users. Login/Register via header when not on auth pages.
- ${SHARED_COMPONENTS_MANAGEMENT.header}`;
  }
  return `Shared Components (present on ALL pages):
- ${SHARED_COMPONENTS.header.replace(/for each page/, `for each page (${navList})`)}
- ${SHARED_COMPONENTS.footer.replace('Business name', `Business name "${businessName}"`)}`;
}

// ---------------------------------------------------------------------------
// buildUIRulesPrompt — UI richness requirements (management uses minimal rules)
// ---------------------------------------------------------------------------
export function buildUIRulesPrompt(template) {
  const rules = template?.type === 'management' ? MANAGEMENT_UI_RULES : UI_RULES;
  return `UI REQUIREMENTS:\n${rules.map((r) => `- ${r}`).join('\n')}`;
}

// ---------------------------------------------------------------------------
// buildCodeRulesPrompt — compact code pattern instructions
// ---------------------------------------------------------------------------
export function buildCodeRulesPrompt() {
  return `COMPACT CODE PATTERN (CRITICAL — keeps output within token limit):\n${CODE_RULES.map((r) => `- ${r}`).join('\n')}`;
}
