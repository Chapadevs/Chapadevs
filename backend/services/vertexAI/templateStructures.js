/**
 * Template structure definitions for different project types
 * Base structure shared by all templates - sections are editable for future customization
 */

/**
 * Base sections required for a full website.
 * All sections are marked editable for future customization support.
 */
export const BASE_SECTIONS = [
  {
    type: 'header',
    required: true,
    editable: true,
    description: 'Navbar with logo, nav links (Home, About, Services/Products, Contact), optional CTA. Responsive with hamburger menu on mobile.',
  },
  {
    type: 'hero',
    required: true,
    editable: true,
    description: 'Main value proposition / CTA banner with title, subtitle, and primary button.',
  },
  {
    type: 'about',
    required: true,
    editable: true,
    description: 'About the business or store - company story, mission, or value proposition.',
  },
  {
    type: 'mainContent',
    required: true,
    editable: true,
    description: 'Primary content - varies by template (services for business, products for ecommerce).',
  },
  {
    type: 'footer',
    required: true,
    editable: true,
    description: 'Links, contact info, copyright. Consistent across all templates.',
  },
];

/**
 * Pages for multi-page structure - each nav link shows a distinct page
 */
export const PAGES = {
  business: ['home', 'about', 'services', 'contact'],
  ecommerce: ['home', 'about', 'products', 'contact'],
};

/**
 * Main content section variations by template type
 */
const MAIN_CONTENT_BY_TYPE = {
  business: {
    type: 'mainContent',
    required: true,
    editable: true,
    count: '4-6',
    description: 'Services offered (4-6 cards with icon, title, description). Renders on Services page.',
  },
  ecommerce: {
    type: 'mainContent',
    required: true,
    editable: true,
    count: '6-12',
    description: 'Product showcase grid (6-12 items with image, name, price). Renders on Products page.',
  },
};

/**
 * Get template structure based on niche/project type.
 * Only business and ecommerce templates - default to business when no ecommerce keywords match.
 * Includes pages array for multi-page structure.
 */
export function getTemplateStructure(niche) {
  const lowerNiche = (niche || '').toLowerCase();
  const isEcommerce =
    lowerNiche.includes('ecommerce') ||
    lowerNiche.includes('store') ||
    lowerNiche.includes('shop') ||
    lowerNiche.includes('selling');

  const templateType = isEcommerce ? 'ecommerce' : 'business';
  const mainContent = MAIN_CONTENT_BY_TYPE[templateType];
  const pages = PAGES[templateType];

  // Build sections: header, hero, about, mainContent (varies), footer
  const sections = [
    BASE_SECTIONS[0], // header
    BASE_SECTIONS[1], // hero
    BASE_SECTIONS[2], // about
    mainContent,
    BASE_SECTIONS[4], // footer
  ];

  return {
    type: templateType,
    sections,
    pages,
  };
}
