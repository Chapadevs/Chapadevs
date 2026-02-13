/**
 * Template Structure Helper — reads data from templateStructure.js
 * and converts it into prompt-ready text for the AI.
 *
 * promptBuilders.js imports these functions instead of hardcoding page descriptions.
 */

import {
  ECOMMERCE_KEYWORDS,
  COLOR_MAP,
  DEFAULT_COLOR_SCHEME,
  STYLE_KEYWORDS,
  DEFAULT_STYLE,
  SHARED_COMPONENTS,
  UI_RULES,
  CODE_RULES,
  TEMPLATES,
} from './templateStructure.js';

// ---------------------------------------------------------------------------
// getTemplateType — determines business vs ecommerce from niche string
// ---------------------------------------------------------------------------
export function getTemplateType(niche) {
  const lower = (niche || '').toLowerCase();
  const isEcommerce = ECOMMERCE_KEYWORDS.some((kw) => lower.includes(kw));
  return isEcommerce ? 'ecommerce' : 'business';
}

// ---------------------------------------------------------------------------
// getTemplate — returns the full template object for a given niche
// ---------------------------------------------------------------------------
export function getTemplate(niche) {
  return TEMPLATES[getTemplateType(niche)];
}

// ---------------------------------------------------------------------------
// extractColorScheme — finds color keywords in prompt, returns Tailwind pair
// ---------------------------------------------------------------------------
export function extractColorScheme(prompt) {
  const lower = (prompt || '').toLowerCase();
  for (const color of Object.keys(COLOR_MAP)) {
    if (lower.includes(color)) {
      const primary = COLOR_MAP[color];
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
// buildSharedComponentsPrompt — header + footer description
// ---------------------------------------------------------------------------
export function buildSharedComponentsPrompt(template, businessName) {
  const navList = template.navPages.join(', ');
  return `Shared Components (present on ALL pages):
- ${SHARED_COMPONENTS.header.replace(/for each page/, `for each page (${navList})`)}
- ${SHARED_COMPONENTS.footer.replace('Business name', `Business name "${businessName}"`)}`;
}

// ---------------------------------------------------------------------------
// buildUIRulesPrompt — UI richness requirements
// ---------------------------------------------------------------------------
export function buildUIRulesPrompt() {
  return `UI RICHNESS REQUIREMENTS:\n${UI_RULES.map((r) => `- ${r}`).join('\n')}`;
}

// ---------------------------------------------------------------------------
// buildCodeRulesPrompt — compact code pattern instructions
// ---------------------------------------------------------------------------
export function buildCodeRulesPrompt() {
  return `COMPACT CODE PATTERN (CRITICAL — keeps output within token limit):\n${CODE_RULES.map((r) => `- ${r}`).join('\n')}`;
}
