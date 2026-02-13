/**
 * Template Structure — Single source of truth for AI preview generation.
 *
 * EDITING GUIDE:
 * - To add a new section to a page: add an object to that page's `sections` array.
 * - To remove a section: delete or comment out the object.
 * - To reorder: move the object up or down in the array.
 * - To add a new color: add it to COLOR_MAP.
 * - To add a new style keyword: add it to STYLE_KEYWORDS.
 * - To add a new ecommerce keyword: add it to ECOMMERCE_KEYWORDS.
 *
 * Each section object:
 *   { id: string, instruction: string }
 *   - id: short unique name (for reference only, not shown to AI)
 *   - instruction: the exact text injected into the AI prompt describing what to generate
 */

// ---------------------------------------------------------------------------
// ECOMMERCE DETECTION — keywords that trigger ecommerce template
// ---------------------------------------------------------------------------
export const ECOMMERCE_KEYWORDS = ['ecommerce', 'store', 'shop', 'selling'];

// ---------------------------------------------------------------------------
// COLOR MAP — keyword → Tailwind color class
// ---------------------------------------------------------------------------
export const COLOR_MAP = {
  blue: 'blue-600',
  red: 'red-600',
  green: 'green-600',
  purple: 'purple-600',
  pink: 'pink-500',
  yellow: 'yellow-500',
  orange: 'orange-500',
  cyan: 'cyan-500',
  teal: 'teal-600',
  indigo: 'indigo-600',
  violet: 'violet-600',
  rose: 'rose-500',
  amber: 'amber-500',
  emerald: 'emerald-600',
  sky: 'sky-500',
  fuchsia: 'fuchsia-500',
};

export const DEFAULT_COLOR_SCHEME = 'purple-600, indigo-600';

// ---------------------------------------------------------------------------
// STYLE KEYWORDS — first match wins
// ---------------------------------------------------------------------------
export const STYLE_KEYWORDS = [
  'modern',
  'minimal',
  'clean',
  'bold',
  'elegant',
  'fun',
  'professional',
  'creative',
  'playful',
  'vibrant',
];

export const DEFAULT_STYLE = 'modern';

// ---------------------------------------------------------------------------
// SHARED COMPONENTS — present on every page
// ---------------------------------------------------------------------------
export const SHARED_COMPONENTS = {
  header:
    'Header/Navbar (sticky top-0 z-50 bg-white shadow): Logo button (navigates to home on click), nav buttons for each page, optional CTA button. Hamburger menu on mobile with useState toggle. All nav uses onClick with setCurrentPage, NEVER href.',
  footer:
    'Footer (bg-gray-900 text-white py-12): Business name, copyright year, quick nav links (onClick, not href), social media icon links, brief contact info.',
};

// ---------------------------------------------------------------------------
// UI RICHNESS RULES — global rules injected into every prompt
// ---------------------------------------------------------------------------
export const UI_RULES = [
  'Each page MUST have ALL the numbered sections listed above - do NOT skip any',
  'Alternate section backgrounds: white, gray-50, gradient, colored — no two adjacent sections should look the same',
  'Use varied layouts per section: card grids, two-column text+image, full-width banners, centered content blocks',
  'Visual polish: box-shadow (shadow-lg), rounded corners (rounded-xl), hover transitions (transition-all duration-300 hover:shadow-xl hover:-translate-y-1)',
  'Generous vertical spacing between sections (py-16 or py-20)',
  'Responsive: sm:, md:, lg: breakpoints on all grids and text sizes',
  'Real specific content everywhere — NO "Lorem ipsum", NO placeholder text, NO "..." truncation',
];

// ---------------------------------------------------------------------------
// COMPACT CODE RULES — keeps AI output within token limit
// ---------------------------------------------------------------------------
export const CODE_RULES = [
  'Define data arrays at the top of each page component and use .map() to render cards/items',
  "Example: const features = [{icon:'...', title:'...', desc:'...'}, ...]; then features.map((f,i) => <div key={i}>...</div>)",
  'Same for services, products, testimonials, team members, FAQ items, stats, etc.',
  'This avoids repeating similar JSX blocks and dramatically reduces code size',
  'Reuse a single card layout via .map() instead of writing each card separately',
];

// ---------------------------------------------------------------------------
// PAGE DEFINITIONS — BUSINESS TEMPLATE
// ---------------------------------------------------------------------------
export const BUSINESS_PAGES = {
  home: {
    stateValue: 'home',
    sections: [
      {
        id: 'hero',
        instruction:
          'Full-width gradient banner with business name "{businessName}", tagline about the business, and primary CTA button ("Get Started" or "Learn More"). Min height py-24.',
      },
      {
        id: 'features',
        instruction:
          'Section title "Why Choose Us" or similar. 3-6 feature/benefit cards in a responsive grid (md:grid-cols-3). Each card has an emoji or SVG icon, bold title, and short description. Hover lift/shadow effect.',
      },
      {
        id: 'stats',
        instruction:
          '3-4 large stat counters in a centered row (e.g., "500+ Projects", "98% Satisfaction", "10+ Years", "50+ Clients"). bg-gray-50 or subtle colored background.',
      },
      {
        id: 'testimonials',
        instruction:
          'Section title "What Our Clients Say". 3 testimonial cards with avatar (picsum.photos/50/50), client name, role/company, star rating (unicode stars), and quote text. Grid layout.',
      },
      {
        id: 'cta',
        instruction:
          'Full-width gradient section with compelling headline, subtitle, and action button. py-16 minimum.',
      },
    ],
  },
  about: {
    stateValue: 'about',
    sections: [
      {
        id: 'pageHeader',
        instruction:
          'Gradient banner with title "About {businessName}" and subtitle about the company.',
      },
      {
        id: 'companyStory',
        instruction:
          'Two-column layout (md:grid-cols-2) with text on left (real paragraphs about history, mission, values) and image on right (picsum.photos).',
      },
      {
        id: 'team',
        instruction:
          '3-4 team member cards in a grid. Each has avatar image (picsum.photos/200/200), name, role. Rounded-full avatar, hover shadow.',
      },
      {
        id: 'statsMilestones',
        instruction:
          'Variant stats section or timeline of company milestones. bg-gray-50.',
      },
      {
        id: 'gallery',
        instruction:
          '4-6 images in a grid (picsum.photos) showing work/office/projects. Hover overlay with subtle text or zoom effect.',
      },
    ],
  },
  services: {
    stateValue: 'services',
    sections: [
      {
        id: 'pageHeader',
        instruction:
          'Gradient or colored banner with "Our Services" title and subtitle.',
      },
      {
        id: 'servicesGrid',
        instruction:
          '4-6 service cards with emoji/SVG icon, service title, description, and "Learn More" button. Responsive grid (md:grid-cols-2 lg:grid-cols-3). Hover shadow and scale.',
      },
      {
        id: 'process',
        instruction:
          '"How We Work" section with 3-4 numbered steps in a horizontal flow (flex row on desktop, stacked on mobile). Each step has number circle, title, description.',
      },
      {
        id: 'faq',
        instruction:
          '4-6 expandable accordion questions with useState toggle. Click to expand/collapse answers. Alternating bg.',
      },
    ],
  },
  contact: {
    stateValue: 'contact',
    sections: [
      {
        id: 'pageHeader',
        instruction:
          'Gradient banner with "Contact Us" title and subtitle.',
      },
      {
        id: 'contactInfoCards',
        instruction:
          '3 cards side by side (Email, Phone, Location) with emoji icons and contact details. bg-gray-50 section.',
      },
      {
        id: 'contactForm',
        instruction:
          'Styled form with Name, Email, Subject inputs and Message textarea. Submit button with hover effect. Focus ring styling on inputs.',
      },
      {
        id: 'newsletter',
        instruction:
          'Small email signup strip with "Stay Updated" text, email input, and subscribe button. Colored background.',
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// PAGE DEFINITIONS — ECOMMERCE TEMPLATE
// ---------------------------------------------------------------------------
export const ECOMMERCE_PAGES = {
  home: {
    stateValue: 'home',
    sections: [
      {
        id: 'hero',
        instruction:
          'Full-width gradient banner with store name "{businessName}", tagline about the store, and "Shop Now" CTA button. Min height py-24.',
      },
      {
        id: 'promoBar',
        instruction:
          'Thin announcement strip below hero (free shipping, discount code, or seasonal sale). Contrasting bg color.',
      },
      {
        id: 'featuredProducts',
        instruction:
          'Section title "Trending Now" or "Best Sellers". 3-4 product cards in a grid with badge ("Best Seller"/"New"), image (picsum.photos), product name, price, and "Add to Cart" button. Hover shadow/scale.',
      },
      {
        id: 'categories',
        instruction:
          'Section with 4-6 category cards. Each has a background image (picsum.photos) with dark overlay and category name in white. Rounded corners, hover zoom effect.',
      },
      {
        id: 'testimonials',
        instruction:
          '3 customer review cards with avatar (picsum.photos/50/50), name, star rating (unicode stars), and quote text. Grid or flex layout on bg-gray-50.',
      },
      {
        id: 'newsletter',
        instruction:
          'Full-width section with email input, subscribe button, and short persuasive text. Gradient or colored background.',
      },
    ],
  },
  about: {
    stateValue: 'about',
    sections: [
      {
        id: 'pageHeader',
        instruction:
          'Gradient banner with title "About {businessName}" and subtitle.',
      },
      {
        id: 'companyStory',
        instruction:
          'Two-column layout (md:grid-cols-2) with text on left (history, mission, values in real paragraphs) and image on right (picsum.photos).',
      },
      {
        id: 'stats',
        instruction:
          '3-4 large stat counters in a row (e.g., "1000+ Products", "50k+ Happy Customers", "99% Satisfaction", "24/7 Support"). bg-gray-50 section.',
      },
      {
        id: 'team',
        instruction:
          '3-4 team member cards in a grid. Each has avatar image (picsum.photos/200/200), name, role. Rounded-full avatar, hover shadow.',
      },
      {
        id: 'cta',
        instruction:
          'Full-width gradient section with "Start Shopping Today" headline and button.',
      },
    ],
  },
  products: {
    stateValue: 'products',
    sections: [
      {
        id: 'pageHeader',
        instruction:
          'Gradient or colored banner with "Our Products" title.',
      },
      {
        id: 'filterBar',
        instruction:
          'Horizontal row of category filter buttons or tabs above the grid. Simple pill-style buttons.',
      },
      {
        id: 'productGrid',
        instruction:
          '6-12 product cards in responsive grid (grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4). Each card: image (picsum.photos), product name, short description, price, "Add to Cart" button. Hover shadow and scale transition.',
      },
      {
        id: 'cta',
        instruction:
          '"Can\'t find what you need? Contact us" section with button to contact page.',
      },
    ],
  },
  contact: {
    stateValue: 'contact',
    sections: [
      {
        id: 'pageHeader',
        instruction:
          'Gradient banner with "Get In Touch" title and subtitle.',
      },
      {
        id: 'contactInfoCards',
        instruction:
          '3 cards side by side (Email, Phone, Address) with emoji icons and details. bg-gray-50.',
      },
      {
        id: 'contactForm',
        instruction:
          'Full form with Name, Email, Subject, Message textarea, and styled Submit button. Proper input styling with focus rings.',
      },
      {
        id: 'faq',
        instruction:
          '4-6 expandable accordion questions with useState toggle. Click to expand/collapse answers.',
      },
    ],
  },
};

// ---------------------------------------------------------------------------
// TEMPLATE REGISTRY — maps type → pages + nav list
// ---------------------------------------------------------------------------
export const TEMPLATES = {
  business: {
    type: 'business',
    pages: BUSINESS_PAGES,
    navPages: ['home', 'about', 'services', 'contact'],
  },
  ecommerce: {
    type: 'ecommerce',
    pages: ECOMMERCE_PAGES,
    navPages: ['home', 'about', 'products', 'contact'],
  },
};
