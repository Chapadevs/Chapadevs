/**
 * Template Structure — Single source of truth for AI preview generation.
 *
 * EDITING GUIDE:
 * - To add a new section to a page: add an object to that page's `sections` array.
 * - To remove a section: delete or comment out the object.
 * - To reorder: move the object up or down in the array.
 * - To add a new color: add it to COLOR_MAP.
 * - To map a subject/theme to a color: add to CONTEXT_TO_COLOR (e.g. grapes→purple).
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
export const ECOMMERCE_KEYWORDS = ['ecommerce', 'store', 'shop', 'selling', 'sales'];

// ---------------------------------------------------------------------------
// MANAGEMENT DETECTION — keywords that trigger management panel template
// Check before ecommerce so "management panel" wins when both might match
// ---------------------------------------------------------------------------
export const MANAGEMENT_KEYWORDS = ['management', 'panel', 'erp', 'crm', 'admin', 'dashboard', 'backend'];

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
// CONTEXT TO COLOR — subject/theme keywords → color (inferred from prompt context)
// Used when no literal color keyword is present. Longer keys checked first.
// E.g. "website for grapes" → purple; "lemonade stand" → yellow
// ---------------------------------------------------------------------------
export const CONTEXT_TO_COLOR = {
  // Purple
  grapevine: 'purple', vineyard: 'purple', grapes: 'purple', grape: 'purple', wine: 'purple',
  lavender: 'purple', plum: 'purple', eggplant: 'purple', amethyst: 'purple', lilac: 'purple',
  orchid: 'purple', blackberry: 'purple',
  // Blue
  blueberry: 'blue', ocean: 'blue', sea: 'blue', water: 'blue', ice: 'blue',
  sapphire: 'blue', aqua: 'blue', marine: 'blue', navy: 'blue', lagoon: 'blue',
  // Green
  avocado: 'green', forest: 'green', grass: 'green', nature: 'green', leaf: 'green', leaves: 'green',
  lime: 'green', basil: 'green', olive: 'green', sage: 'green', cactus: 'green',
  emerald: 'green', jungle: 'green', bamboo: 'green', matcha: 'green',
  // Red
  strawberry: 'red', cherry: 'red', tomato: 'red', cranberry: 'red', raspberry: 'red',
  ruby: 'red', coral: 'red', pepper: 'red',
  // Yellow
  lemon: 'yellow', lemonade: 'yellow', banana: 'yellow', sunflower: 'yellow', honey: 'yellow',
  gold: 'yellow', maize: 'yellow', pineapple: 'yellow', mustard: 'yellow', daisy: 'yellow',
  butter: 'yellow', bees: 'yellow',
  // Orange
  carrot: 'orange', pumpkin: 'orange', tangerine: 'orange', sunset: 'orange',
  autumn: 'orange', apricot: 'orange', mango: 'orange', fire: 'orange',
  // Amber / Earth tones
  coffee: 'amber', chocolate: 'amber', wood: 'amber', earth: 'amber', hazelnut: 'amber',
  walnut: 'amber', caramel: 'amber', whiskey: 'amber', bronze: 'amber',
  // Pink (peach can go pink)
  cotton: 'pink', blossom: 'pink', sakura: 'pink', flamingo: 'pink', watermelon: 'pink',
  peach: 'pink', candy: 'pink', rose: 'pink',
  // Teal
  jade: 'teal', turquoise: 'teal', mint: 'teal', seafoam: 'teal', teal: 'teal',
  // Cyan
  cyan: 'cyan', aquamarine: 'cyan',
  // Indigo
  indigo: 'indigo', denim: 'indigo', ink: 'indigo',
  // Sky
  sky: 'sky', clouds: 'sky', air: 'sky',
  // Fuchsia
  fuchsia: 'fuchsia', magenta: 'fuchsia', hibiscus: 'fuchsia',
  // Rose (salmon/blush - distinct from flower rose)
  salmon: 'rose', blush: 'rose',
};

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
// STYLE TO FONTS — maps each style keyword to font hierarchy (heading, body, button)
// ---------------------------------------------------------------------------
export const STYLE_TO_FONTS = {
  modern: { heading: 'Oswald', body: 'Inter', button: 'Montserrat' },
  minimal: { heading: 'Playfair Display', body: 'Lato', button: 'Roboto' },
  clean: { heading: 'Inter', body: 'Open Sans', button: 'Lato' },
  bold: { heading: 'Anton', body: 'Roboto', button: 'Anton' },
  elegant: { heading: 'Playfair Display', body: 'Lato', button: 'Cinzel' },
  fun: { heading: 'Fredoka', body: 'Open Sans', button: 'Fredoka' },
  professional: { heading: 'Oswald', body: 'Inter', button: 'Montserrat' },
  creative: { heading: 'Passion One', body: 'Montserrat', button: 'Fredoka' },
  playful: { heading: 'Permanent Marker', body: 'Fredoka', button: 'Fredoka' },
  vibrant: { heading: 'Anton', body: 'Roboto', button: 'Passion One' },
};

// ---------------------------------------------------------------------------
// COMPONENT REGISTRY — single source for response parser fixes
// ---------------------------------------------------------------------------
/** Component names used in bare-name fix, export detection, and file extraction. */
export const KNOWN_COMPONENT_NAMES = [
  'Header',
  'Footer',
  'HomePage',
  'AboutPage',
  'ServicesPage',
  'ProductsPage',
  'ContactPage',
  'LoginPage',
  'RegisterPage',
  'DashboardPage',
  'ProductsManagementPage',
  'UsersManagementPage',
  'Sidebar',
  'ProductCard',
  'Card',
  'Button',
  'StatCard',
  'QuickActionButton',
  'App',
];

/** Known file paths in multi-file AI output (for extractFilesFromRawText). */
export const KNOWN_FILE_PATHS = [
  '/App.js',
  '/components/Header.js',
  '/components/Footer.js',
  '/components/Sidebar.js',
  '/pages/HomePage.js',
  '/pages/AboutPage.js',
  '/pages/ServicesPage.js',
  '/pages/ProductsPage.js',
  '/pages/ContactPage.js',
  '/pages/LoginPage.js',
  '/pages/RegisterPage.js',
  '/pages/DashboardPage.js',
  '/pages/UsersPage.js',
];

// ---------------------------------------------------------------------------
// SHARED COMPONENTS — present on every page
// ---------------------------------------------------------------------------
export const SHARED_COMPONENTS = {
  header:
    'Header (sticky, bg-white shadow): <img src="__LOGO__" alt="Logo" className="w-12 h-12 object-contain transition-transform duration-200 hover:scale-110" /> left of brand. Nav buttons per page, optional CTA. Hamburger on mobile (useState). onClick only, never href.',
  footer:
    'Footer (bg-gray-900 text-white py-12): Business name, copyright, quick links (onClick), social icons, contact info.',
};

// ---------------------------------------------------------------------------
// AUTH FORM COMPONENTS — shared Login/Register instructions (ecommerce, management)
// ---------------------------------------------------------------------------
export const AUTH_FORM_SECTIONS = {
  login:
    'Centered card, logo (__LOGO__), Email + Password inputs, Submit button. "Forgot password?" link (visual only). "Don\'t have an account? Register" with button onClick to setCurrentPage(\'register\'). Sharp corners (rounded-none), focus rings, Tailwind only.',
  register:
    'Centered card, logo (__LOGO__), Name + Email + Password (+ optional Confirm Password) inputs, Submit button. "Already have an account? Login" with button onClick to setCurrentPage(\'login\'). Sharp corners (rounded-none), focus rings, Tailwind only.',
};

// ---------------------------------------------------------------------------
// SHARED COMPONENTS — MANAGEMENT PANEL (minimal, fixed structure)
// ---------------------------------------------------------------------------
export const SHARED_COMPONENTS_MANAGEMENT = {
  sidebar:
    'Sidebar: fixed left, w-64, min-h-screen, bg-gray-900 text-white. Logo (__LOGO__) at top. Nav: Dashboard, Products, Users, Logout — each <button onClick> to setCurrentPage. Same structure every time.',
  header:
    'Header: bg-white shadow-sm, flex justify-between, px-4 py-3. Left: page title. Right: user name + avatar circle. Same structure every time.',
};

// ---------------------------------------------------------------------------
// MANAGEMENT UI RULES — minimal, normalized structure (prevents broken layouts)
// ---------------------------------------------------------------------------
export const MANAGEMENT_UI_RULES = [
  'FIXED LAYOUT: App layout = <div className="flex min-h-screen"><Sidebar /><div className="flex-1 flex flex-col"><Header /><main className="flex-1 p-6 overflow-auto">...</main></div></div>. NEVER change this structure.',
  'DashboardPage: ONE container div with grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4. Exactly 4 StatCard components. No quick actions section unless 2nd row with same grid.',
  'ProductsPage: ONE container div, then <div className="bg-white overflow-x-auto"><table className="w-full">. Header row + tbody with .map. No extra wrappers.',
  'UsersPage: Same as ProductsPage — one container, one table, overflow-x-auto.',
  'StatCard: div with p-4, bg-white, rounded-none, shadow. Label (text-sm text-gray-500) + value (text-2xl font-bold).',
  'rounded-none on all elements. No rounded-xl, rounded-lg.',
];

// ---------------------------------------------------------------------------
// UI RICHNESS RULES — global rules injected into every prompt
// ---------------------------------------------------------------------------
export const UI_RULES = [
  'Each page MUST have ALL sections listed above.',
  'Alternate section backgrounds: white, gray-50, gradient — no two adjacent same.',
  'Varied layouts: card grids, two-column, full-width banners, centered blocks.',
  'Visual polish: shadow-lg, rounded-xl, hover:shadow-xl hover:-translate-y-1.',
  'Hero: text-4xl/5xl font-bold; section titles: text-3xl font-semibold.',
  'Spacing: py-16 or py-20 between sections. Responsive: sm:, md:, lg:.',
  'Real content only — no Lorem ipsum, no truncation.',
];

// ---------------------------------------------------------------------------
// COMPACT CODE RULES — keeps AI output within token limit
// ---------------------------------------------------------------------------
export const CODE_RULES = [
  'Data arrays + .map(): const features = [...]; features.map((f,i)=><div key={i}>...</div>). Same for services, products, testimonials, stats, etc.',
  'Double quotes for strings with apostrophes. No single-quote nesting.',
];

// ---------------------------------------------------------------------------
// PAGE DEFINITIONS — BUSINESS TEMPLATE
// ---------------------------------------------------------------------------
export const BUSINESS_PAGES = {
  home: {
    stateValue: 'home',
    sections: [
      { id: 'hero', instruction: 'Hero: __IMAGE_1__ as banner (background or full-width img), dark overlay, "{businessName}", tagline, CTA. py-24.' },
      { id: 'features', instruction: '"Why Choose Us": 3-6 feature cards in md:grid-cols-3. Emoji/SVG icon, title, description. Hover shadow.' },
      { id: 'stats', instruction: '3-4 stat counters in a row (e.g. "500+ Projects", "98% Satisfaction"). bg-gray-50.' },
      { id: 'testimonials', instruction: '"What Our Clients Say": 3 cards with avatar (__IMAGE_2__/__IMAGE_3__), name, role, stars, quote. Grid.' },
      { id: 'cta', instruction: 'Gradient section: headline, subtitle, action button. py-16.' },
    ],
  },
  about: {
    stateValue: 'about',
    sections: [
      { id: 'pageHeader', instruction: 'Gradient banner: "About {businessName}", subtitle.' },
      { id: 'companyStory', instruction: 'Two-column md:grid-cols-2: text (history, mission) left, __IMAGE_2__ right.' },
      { id: 'team', instruction: '3-4 team cards: avatar (__IMAGE_2__/__IMAGE_3__), name, role. Rounded-full, hover shadow.' },
      { id: 'statsMilestones', instruction: 'Stats or milestones timeline. bg-gray-50.' },
      { id: 'gallery', instruction: '4-6 images grid (__IMAGE_1__/2/3). Hover overlay.' },
    ],
  },
  services: {
    stateValue: 'services',
    sections: [
      { id: 'pageHeader', instruction: 'Banner: "Our Services" title and subtitle.' },
      { id: 'servicesGrid', instruction: '4-6 service cards: emoji/SVG icon, title, description, "Learn More". md:grid-cols-2 lg:grid-cols-3.' },
      { id: 'process', instruction: '"How We Work": 3-4 numbered steps, flex row. Number circle, title, description.' },
      { id: 'faq', instruction: '4-6 accordion questions with useState toggle. Expand/collapse.' },
    ],
  },
  contact: {
    stateValue: 'contact',
    sections: [
      { id: 'pageHeader', instruction: 'Banner: "Contact Us" title and subtitle.' },
      { id: 'contactInfoCards', instruction: '3 cards: Email, Phone, Location. Emoji icons. bg-gray-50.' },
      { id: 'contactForm', instruction: 'Form: Name, Email, Subject, Message. Submit button. Focus rings.' },
      { id: 'newsletter', instruction: 'Email signup strip: "Stay Updated", input, subscribe button.' },
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
      { id: 'hero', instruction: 'Hero: __IMAGE_1__ banner, dark overlay, "{businessName}", tagline, "Shop Now". py-24.' },
      { id: 'promoBar', instruction: 'Announcement strip: free shipping, discount, or sale. Contrasting bg.' },
      { id: 'featuredProducts', instruction: '"Trending Now": 3-4 product cards with badge, image (__IMAGE_1__/2/3), name, price, "Add to Cart".' },
      { id: 'categories', instruction: '4-6 category cards: bg image (__IMAGE_1__/2/3), dark overlay, name in white. Hover zoom.' },
      { id: 'testimonials', instruction: '3 review cards: avatar (__IMAGE_2__/3), name, stars, quote. bg-gray-50.' },
      { id: 'newsletter', instruction: 'Email input, subscribe button, persuasive text. Gradient bg.' },
    ],
  },
  about: {
    stateValue: 'about',
    sections: [
      { id: 'pageHeader', instruction: 'Banner: "About {businessName}", subtitle.' },
      { id: 'companyStory', instruction: 'Two-column: text (history, mission) left, __IMAGE_2__ right.' },
      { id: 'stats', instruction: '3-4 stats ("1000+ Products", "50k+ Customers", etc.). bg-gray-50.' },
      { id: 'team', instruction: '3-4 team cards: avatar (__IMAGE_2__/3), name, role.' },
      { id: 'cta', instruction: 'Gradient: "Start Shopping Today" headline and button.' },
    ],
  },
  products: {
    stateValue: 'products',
    sections: [
      { id: 'pageHeader', instruction: 'Banner: "Our Products".' },
      { id: 'filterBar', instruction: 'Category filter buttons/tabs. Pill-style.' },
      { id: 'productGrid', instruction: '6-12 product cards: image (__IMAGE_1__/2/3), name, description, price, "Add to Cart". Grid responsive.' },
      { id: 'cta', instruction: '"Can\'t find what you need? Contact us" with button.' },
    ],
  },
  contact: {
    stateValue: 'contact',
    sections: [
      { id: 'pageHeader', instruction: 'Banner: "Get In Touch".' },
      { id: 'contactInfoCards', instruction: '3 cards: Email, Phone, Address. Emoji icons. bg-gray-50.' },
      { id: 'contactForm', instruction: 'Form: Name, Email, Subject, Message. Submit button. Focus rings.' },
      { id: 'faq', instruction: '4-6 accordion questions with useState toggle.' },
    ],
  },
  login: {
    stateValue: 'login',
    sections: [
      { id: 'authForm', instruction: `Login form: Centered card, logo (__LOGO__), Email + Password inputs (optional defaultValue for demo), Submit button. NO validation or credential logic — form onSubmit: e.preventDefault(); onNavigate(e, 'dashboard'). "Forgot password?" link (visual only). "Register" link: onClick={(e)=>onNavigate(e,'register')}. Sharp corners (rounded-none), Tailwind only.` },
    ],
  },
  register: {
    stateValue: 'register',
    sections: [
      { id: 'authForm', instruction: `Register form: Centered card, logo (__LOGO__), Name + Email + Password inputs, Submit button. NO validation — form onSubmit just calls onNavigate(e, 'login'). "Already have an account? Login" with button onClick to setCurrentPage('login'). Sharp corners (rounded-none), focus rings, Tailwind only.` },
    ],
  },
};

// ---------------------------------------------------------------------------
// PAGE DEFINITIONS — MANAGEMENT PANEL TEMPLATE (minimal, fixed structure)
// ---------------------------------------------------------------------------
export const MANAGEMENT_PAGES = {
  login: {
    stateValue: 'login',
    sections: [
      { id: 'authForm', instruction: `Centered card (max-w-md mx-auto), logo (__LOGO__), Email + Password inputs. form onSubmit: e.preventDefault(); onNavigate(e, 'dashboard'). "Register" link: onClick onNavigate(e, 'register'). rounded-none.` },
    ],
  },
  register: {
    stateValue: 'register',
    sections: [
      { id: 'authForm', instruction: `Centered card, logo (__LOGO__), Name + Email + Password. form onSubmit: e.preventDefault(); onNavigate(e, 'login'). "Login" link. rounded-none.` },
    ],
  },
  dashboard: {
    stateValue: 'dashboard',
    sections: [
      { id: 'statsOverview', instruction: 'EXACTLY 4 stat cards in grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4. Each: label (text-sm text-gray-500) + value (text-2xl font-bold). Labels/values CONTEXTUAL to domain. No other content.' },
    ],
  },
  products: {
    stateValue: 'products',
    sections: [
      { id: 'productTable', instruction: 'Title (h2) then ONE table: thead + tbody with .map. Columns contextual (e.g. Name, Type, Status). 4-6 mock rows, domain-specific data. Wrap table in bg-white overflow-x-auto.' },
    ],
  },
  users: {
    stateValue: 'users',
    sections: [
      { id: 'userTable', instruction: 'Title (h2) then ONE table: thead + tbody with .map. Columns: Name, Role/Dept, Status. 4-6 mock rows, domain-specific. Wrap in bg-white overflow-x-auto.' },
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
    navPages: ['home', 'about', 'products', 'contact', 'login', 'register'],
  },
  management: {
    type: 'management',
    pages: MANAGEMENT_PAGES,
    navPages: ['login', 'register', 'dashboard', 'products', 'users'],
  },
};
