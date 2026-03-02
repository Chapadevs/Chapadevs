import {
  getTemplate,
  extractColorScheme,
  extractStyle,
  buildPageStructurePrompt,
  buildSharedComponentsPrompt,
  buildUIRulesPrompt,
  buildCodeRulesPrompt,
  buildFontRulesPrompt,
} from './templateStructureHelper.js';

/**
 * Prompt building functions for Vertex AI
 */

export function buildOptimizedPrompt(prompt, userInputs) {
  const techPref = userInputs.techStack?.trim() || 'React or Angular, Node.js, Express, MongoDB or PostgreSQL — JavaScript/TypeScript only'
  // Concise prompt to minimize tokens
  return `You are an expert web development agency project analyst. Generate a comprehensive project specification in JSON format.

CRITICAL: Our team ONLY works with the JavaScript ecosystem. You MUST suggest ONLY these technologies:
- Frontend: React, Angular, Next.js, TypeScript, Tailwind CSS
- Backend: Node.js, Express
- Database: MongoDB, PostgreSQL
- NO Python, Java, C#, PHP, Ruby, or other non-JS languages.

CLIENT REQUEST: ${prompt}
BUDGET: ${userInputs.budget || 'Not specified'}
TIMELINE: ${userInputs.timeline || 'Not specified'}
PROJECT TYPE: ${userInputs.projectType || 'General web project'}
TECH PREFERENCES (from user, must stay within JS ecosystem): ${techPref}

Provide a detailed analysis in the following JSON structure (respond ONLY with valid JSON, no markdown):

{
  "title": "Project title based on the description",
  "overview": "2-3 sentence executive summary",
  "features": [
    "Feature 1 with brief description",
    "Feature 2 with brief description",
    "At least 5-8 key features"
  ],
  "techStack": {
    "frontend": ["React or Angular", "TypeScript", "Tailwind CSS"],
    "backend": ["Node.js", "Express"],
    "database": ["MongoDB or PostgreSQL"],
    "deployment": ["Vercel or Docker"],
    "other": ["Git", "Jest", "ESLint"]
  },
  "timeline": {
    "totalWeeks": 8,
    "phases": [
      {"phase": "Planning & Design", "weeks": 2, "deliverables": ["Wireframes", "Design mockups"]},
      {"phase": "Development", "weeks": 4, "deliverables": ["Core features", "Integration"]},
      {"phase": "Testing & Launch", "weeks": 2, "deliverables": ["QA", "Deployment"]}
    ]
  },
  "budgetBreakdown": {
    "total": "Estimated total based on input",
    "breakdown": [
      {"category": "Design", "percentage": 25, "description": "UI/UX design work"},
      {"category": "Development", "percentage": 50, "description": "Core development"},
      {"category": "Testing & QA", "percentage": 15, "description": "Quality assurance"},
      {"category": "Deployment & Training", "percentage": 10, "description": "Launch and handoff"}
    ]
  },
  "risks": [
    "Risk 1 with mitigation strategy",
    "Risk 2 with mitigation strategy",
    "At least 3-4 potential risks"
  ],
  "recommendations": [
    "Recommendation 1 for project success",
    "Recommendation 2 for project success",
    "At least 3 actionable recommendations"
  ]
}

Generate the response now:`;
}

/** Project type enum values for schema validation */
const PROJECT_TYPE_ENUM = [
  'New Website Design & Development',
  'Website Redesign/Refresh',
  'E-commerce Store',
  'Management Panel / ERP / CRM',
  'Landing Page',
  'Web Application',
  'Maintenance/Updates to Existing Site',
  'Other',
]

/** Allowed technology values (must match frontend techStack.js) */
const ALLOWED_TECHNOLOGIES = [
  'React', 'Angular', 'Node.js', 'Express', 'MongoDB', 'PostgreSQL',
  'TypeScript', 'Next.js', 'Tailwind CSS',
]

/**
 * Build prompt for AI-generated project requirements from user's natural-language input.
 * Output maps to Project schema for CreateProject form pre-fill.
 */
export function buildProjectRequirementsPrompt(prompt) {
  return `You are an expert web development agency project analyst. A client has described their project in their own words. Generate a complete project specification in JSON format that maps to our project creation form.

CRITICAL: Our team ONLY works with the JavaScript ecosystem. You MUST suggest ONLY these technologies: ${ALLOWED_TECHNOLOGIES.join(', ')}. NO Python, Java, C#, PHP, Ruby, or other non-JS languages.

CLIENT REQUEST: "${prompt}"

Respond ONLY with valid JSON (no markdown, no code fences). Use this exact structure:

{
  "title": "Short, professional project title",
  "description": "2-4 sentence project description based on the client request",
  "projectType": "EXACTLY one of: ${PROJECT_TYPE_ENUM.join(' | ')}",
  "budget": "Numeric string e.g. 5000 or range e.g. $5,000 - $10,000",
  "timeline": "Number of weeks as string, e.g. 8",
  "goals": ["Goal 1", "Goal 2", "Goal 3"],
  "features": ["Feature 1", "Feature 2", "Feature 3", "Feature 4", "Feature 5"],
  "designStyles": ["Modern", "Minimalist", "Corporate", etc. - 2-4 styles],
  "techStack": {
    "frontend": ["React", "TypeScript", "Tailwind CSS"],
    "backend": ["Node.js", "Express"],
    "database": ["MongoDB"] or ["PostgreSQL"]
  },
  "hasBranding": "Yes" or "No" or "Partial",
  "brandingDetails": "Description if hasBranding is Yes or Partial, else null",
  "contentStatus": "Ready" or "Need creation" or "Partial" or null,
  "referenceWebsites": "Comma-separated URLs or descriptions, or null",
  "specialRequirements": "Combined risks and key requirements as text, or null",
  "additionalComments": "Any extra context for the development team, or null",
  "analysisExtras": {
    "businessName": "Short 2-3 word brand name if applicable",
    "logoIconConcept": "Abstract logo concept e.g. abstract gear, pie slice",
    "overview": "1-2 sentence executive summary"
  }
}

Rules:
- projectType MUST match one of the enum values exactly.
- techStack values MUST be from: ${ALLOWED_TECHNOLOGIES.join(', ')}.
- Infer projectType, budget, timeline from the client request when not explicit.
- Keep goals, features, designStyles specific to the domain described.
- analysisExtras is for future AI preview use; always include it.

Generate the response now:`;
}

export function buildWebsitePrompt(prompt, userInputs) {
  const projectType = userInputs.projectType || 'Website';
  const lowerPrompt = prompt.toLowerCase();

  // Color scheme: literal keywords first, then contextual (e.g. grapes→purple)
  let colorScheme = extractColorScheme(prompt);
  if (lowerPrompt.includes('colorful')) {
    colorScheme = 'pink-500, orange-500, yellow-400, cyan-400';
  }

  // Extract style
  const styleKeywords = ['modern', 'minimal', 'clean', 'bold', 'elegant', 'fun', 'professional', 'creative', 'playful', 'vibrant'];
  let style = 'modern';
  for (const keyword of styleKeywords) {
    if (lowerPrompt.includes(keyword)) {
      style = keyword;
      break;
    }
  }
  
  // Determine business type (only business and ecommerce)
  const businessType = lowerPrompt.includes('ecommerce') || lowerPrompt.includes('store') || lowerPrompt.includes('selling') || lowerPrompt.includes('shop')
    ? 'e-commerce'
    : 'business';

  // Create main content suggestions based on business type
  const mainContentSuggestions = businessType === 'e-commerce'
    ? 'Product showcase grid (6-12 items with image, name, price) - use __IMAGE_1__, __IMAGE_2__, __IMAGE_3__ only (repeat as needed) for img src'
    : 'Services offered (4-6 cards with icon, title, description)';
  
  return `You are an expert React developer. Generate a HIGH-QUALITY, PERSONALIZED, PRODUCTION-READY React component.

MANDATORY: Generate ONLY React/JavaScript code. No Angular templates, no Vue, no other frameworks. Use React 18 functional components.

BRAND NAME: Invent a SHORT, professional business name (2–3 words max). Use ONLY the core name — NO adjectives, suffixes, or additions like "Artisans", "lovers", "community", "Co.", "Inc.", etc. Good: "Terra Stone", "Sweet Crust", "Blue Pie". Bad: "TerraStone Artisans", "Sweet Crust Bakery". Use that name in hero, header, footer.

PROJECT DETAILS:
- Type: ${projectType}
- Full Description: "${prompt}"
- Business Type: ${businessType}
- Color Scheme: ${colorScheme} (use Tailwind classes like bg-${colorScheme.split(',')[0].trim()}, text-${colorScheme.split(',')[0].trim()})
- Style: ${style}
- Budget: ${userInputs.budget || 'Not specified'}

CRITICAL REQUIREMENTS:
1. Use the professional brand name you invent in the hero title, header, footer (not prompt fragments)
2. Create a MULTI-PAGE website with: HomePage, AboutPage, ServicesPage/ProductsPage, ContactPage
3. Use useState for currentPage ('home', 'about', 'services', 'contact') and switch pages via onClick - do NOT use href with # or anchor links
4. Use the color scheme: ${colorScheme} - apply these colors throughout (gradients, buttons, accents)
5. Style should be ${style} - if playful/fun, use rounded corners, animations, bright colors. If professional, use clean lines, muted tones.
6. Generate REAL, SPECIFIC content - NO placeholders, NO "Lorem Ipsum", NO truncated text
7. NAV LINKS: Use button or onClick with e.preventDefault() and e.stopPropagation() - NEVER use href="#..." for navigation (prevents parent app navigation in iframe)
8. Make it visually stunning with proper spacing, shadows, hover effects
9. TYPOGRAPHY: ${buildFontRulesPrompt(style)}

IMAGES (CRITICAL):
- Use __IMAGE_1__ (hero), __IMAGE_2__, __IMAGE_3__ for content. Header logo MUST use <img src="__LOGO__" alt="Logo" className="w-12 h-12 object-contain transition-transform duration-200 hover:scale-110" /> — __LOGO__ is a separate image slot, never use __IMAGE_1__ for the logo. Logo must have hover:scale-110 for interactive feedback.
- Do NOT use picsum.photos, placehold.co, or any other image URLs.

TECHNICAL REQUIREMENTS:
- String quoting: Use double quotes for text that may contain apostrophes (e.g. "Artisans Quarterly", "We're open") — never nest single quotes in single-quoted strings.
- React 18 functional component with useState hooks
- Use Tailwind CSS classes ONLY (Tailwind CDN will be loaded separately)
- All Tailwind classes must be valid (use bg-gradient-to-r, from-COLOR, to-COLOR for gradients)
- Fully responsive with sm:, md:, lg: breakpoints
- Interactive hover effects and transitions
- Proper semantic HTML structure
- Clean, well-formatted code

MULTI-PAGE STRUCTURE:
- Header (shared): Logo = <img src="__LOGO__" alt="Logo" className="w-12 h-12 object-contain transition-transform duration-200 hover:scale-110" /> left of brand name. Nav buttons - use onClick with setCurrentPage, NOT href
- HomePage: Hero + featured content (testimonials or highlights)
- AboutPage: Company story, stats, mission
- ServicesPage/ProductsPage: ${mainContentSuggestions}
- ContactPage: Contact form or contact info
- Footer (shared): Copyright, quick links (also use onClick, NOT href)

NAV LINKS CRITICAL: Use button elements with onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage('home'); }} - NEVER use <a href="#..."> or anchor links. This prevents navigation escaping to the parent app.

0. Header/Navbar (fixed or sticky):
   - Logo: <img src="__LOGO__" alt="Logo" className="w-12 h-12 object-contain transition-transform duration-200 hover:scale-110" /> + brand name, button with onClick to setCurrentPage('home')
   - Nav: buttons for Home, About, Services/Products, Contact - each calls setCurrentPage
   - Optional CTA button for Contact
   - Responsive: hamburger menu on mobile (sm/md breakpoints)

1. HomePage (currentPage === 'home'):
   - Hero: Title with the brand name you invent, subtitle, CTA button
   - Use gradient background: ${colorScheme}
   - Featured content (testimonials or highlights)

2. AboutPage (currentPage === 'about'):
   - Company story, mission, stats
   - Real, specific content (not Lorem Ipsum)

3. ServicesPage/ProductsPage (currentPage === 'services'):
   - Business: 4-6 service cards with icon, title, description - hover effects
   - E-commerce: 6-12 product cards with image, name, price - grid layout

4. ContactPage (currentPage === 'contact'):
   - Contact form or contact info

5. Footer (shared):
   - Copyright: use the brand name you invent
   - Quick links: buttons with onClick setCurrentPage (NOT href)

COLOR IMPLEMENTATION:
- Use Tailwind color classes: bg-${colorScheme.split(',')[0].trim().split('-')[0]}-${colorScheme.split(',')[0].trim().split('-')[1] || '600'}
- For gradients: bg-gradient-to-r from-COLOR to-COLOR
- If colorful requested: Use multiple colors (pink, orange, yellow, cyan)
- Ensure good contrast for readability

CODE FORMAT:
- Start with: import { useState } from 'react'; (or import React, { useState } from 'react';)
- Component MUST be: function App() { ... } OR const App = () => { ... }
- DO NOT mix function keyword with arrow syntax (WRONG: function App() =>, CORRECT: function App() {)
- NEVER output bare App() { or ComponentName() { — always use function or const
- End with: export default App;
- NO markdown code blocks (no \`\`\`jsx or \`\`\`)
- NO comments explaining the code
- Return ONLY the complete React component code
- All text must be complete sentences, not truncated
- Use proper Tailwind classes (verify they exist)
- Code will run in Sandpack React template

CRITICAL FOR SANDPACK:
- Component MUST be named: App
- Use CORRECT syntax: function App() { ... } OR const App = () => { ... }
- DO NOT use: function App() => (this is INVALID syntax)
- Export MUST be: export default App;
- Sandpack React template expects: /src/App.js with export default App
- Use standard React 18 functional component syntax
- All imports must be valid React 18 imports

SYNTAX EXAMPLES:
✅ CORRECT: function App() { return <div>...</div>; }
✅ CORRECT: const App = () => { return <div>...</div>; }
❌ WRONG: function App() => { return <div>...</div>; }

Generate the complete component NOW:`;
}

function getFileStructureForTemplate(template) {
  const isEcommerce = template.type === 'ecommerce';
  const isManagement = template.type === 'management';
  if (isManagement) {
    return `FILE STRUCTURE (preferred): Output a "files" object with path keys and file content strings. MANDATORY paths (you MUST include ALL of these): /App.js (shell: imports from ./pages and ./components, useState currentPage, Sidebar, page switch), /components/Sidebar.js, /components/Header.js, /pages/LoginPage.js, /pages/RegisterPage.js, /pages/DashboardPage.js, /pages/ProductsPage.js, /pages/UsersPage.js. Optional: /components/Footer.js. Management panel: extremely simple, beautiful UI; table/card layouts; good spacing; frontend-only, 0 backend. Include Login and Register pages. In each string use \\n for newlines and \\" for quotes. App.js must import and render pages; use button onClick for nav, never href.`;
  }
  const basePaths = `/App.js (shell: imports from ./pages and ./components, useState currentPage, Header, Footer, page switch), /components/Header.js, /components/Footer.js, /pages/HomePage.js, /pages/AboutPage.js, /pages/${isEcommerce ? 'ProductsPage' : 'ServicesPage'}.js, /pages/ContactPage.js`;
  const authPaths = isEcommerce ? ', /pages/LoginPage.js, /pages/RegisterPage.js' : '';
  return `FILE STRUCTURE (preferred): Output a "files" object with path keys and file content strings. MANDATORY paths (you MUST include ALL of these): ${basePaths}${authPaths}. ContactPage.js is REQUIRED — never omit it. Optional: /components/ui/Button.js, /components/ui/Card.js. In each string use \\n for newlines and \\" for quotes. App.js must import and render pages; use button onClick for nav, never href.`;
}

export function buildCombinedPrompt(prompt, userInputs) {
  const template = getTemplate(userInputs.projectType, prompt, userInputs.previewTemplate);
  const techPref = userInputs.techStack?.trim() || 'React, Node.js, MongoDB — JavaScript/TypeScript only';
  const isEcommerce = template.type === 'ecommerce';
  const isManagement = template.type === 'management';

  // Instruct AI to generate a short brand name (2–3 words, no additions like Artisans/lovers/Co.)
  const businessNamePlaceholder = 'the short core brand name you generate in analysis.businessName (2–3 words only, no suffixes)';

  // Extract color and style from prompt using template structure data
  const colorScheme = extractColorScheme(prompt);
  const style = extractStyle(prompt);

  // Build prompt sections from template structure (use placeholder so AI generates name)
  const pageStructure = buildPageStructurePrompt(template, businessNamePlaceholder, colorScheme);
  const sharedComponents = buildSharedComponentsPrompt(template, businessNamePlaceholder);
  const uiRules = buildUIRulesPrompt(template);
  const codeRules = buildCodeRulesPrompt();

  const adaptLine = isManagement
    ? 'Adapt: management → simple ERP/CRM panel with Login, Register, Dashboard, Products, Users; extremely simple and beautiful; frontend-only.'
    : `Adapt: ecommerce → product cards; business → service cards.`;

  const managementGuidance = isManagement
    ? `\n\nMANAGEMENT PANEL — MINIMAL STRUCTURE (MANDATORY):
- App.js layout: <div className="flex min-h-screen bg-gray-100">{auth?<auth form/>:(<><Sidebar /><div className="flex-1 flex flex-col"><Header /><main className="flex-1 p-6 overflow-auto">{page}</main></div></>)}</div>
- DashboardPage: return <div className="space-y-6"><h2>Dashboard</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">{stats.map(...)}</div></div>. Exactly 4 stat cards. No extra sections.
- ProductsPage: return <div className="space-y-4"><h2>Title</h2><div className="bg-white overflow-x-auto"><table>...</table></div></div>
- UsersPage: same pattern as ProductsPage
- Sidebar: fixed left w-64 bg-gray-900. Header: flex. main: flex-1 overflow-auto. NEVER omit these wrappers.

CONTEXTUAL MOCK DATA: Stats, table rows must reflect project domain. No "Product A" or "User 1".`
    : '';

  return `Generate a complete project analysis and React component in JSON format.

CORE RULES:
- Images: __IMAGE_1__ (hero), __IMAGE_2__/__IMAGE_3__ (content), __LOGO__ (header only). Never __IMAGE_1__ for logo.
- Syntax: function Name() { } or const Name = () => { }. Never bare Name() {.
- Icons: inline SVG or emoji only. No Heroicons, Lucide, etc.

ANALYSIS (required for code + images): businessName (SHORT core name only — 2–3 words, NO additions like "Artisans", "lovers", "community", "Co." e.g. "Terra Stone", "Sweet Crust"), logoIconConcept (abstract phrase for header logo, e.g. "abstract pie slice"). Use businessName in Hero, Header, Footer, About. Header logo: <img src="__LOGO__" /> only.

REQUIREMENTS: Project: "${prompt}" | Type: ${template.type} | Budget: ${userInputs.budget || 'Not specified'} | Timeline: ${userInputs.timeline || 'Not specified'} | Tech: ${techPref}. ${adaptLine} Keep page list and section list from template.${managementGuidance}

${pageStructure}

${sharedComponents}

${uiRules}

STYLING:
- Colors: ${colorScheme} (use Tailwind classes: bg-{color}, text-{color}, from-{color}, to-{color})
- Style: ${style}
- Gradients: bg-gradient-to-r from-{primaryColor} to-{secondaryColor}
- ${buildFontRulesPrompt(style)}

${getFileStructureForTemplate(template)}

OUTPUT FORMAT: JSON only, no markdown. Use \\n, \\", \\\\ in strings. Prefer "files" object; fallback: single "code" string.

{
  "analysis": {
    "title": "Project title",
    "businessName": "Short core name (2–3 words, no Artisans/lovers/community/Co.)",
    "logoIconConcept": "Abstract logo concept (e.g. abstract pie slice, simple gear)",
    "overview": "2-3 sentence summary",
    "features": ["Feature 1", "Feature 2", "Feature 3"],
    "techStack": {"frontend": ["React", "Tailwind CSS"], "backend": ["Node.js"], "database": ["MongoDB"]},
    "timeline": {
      "totalWeeks": 8,
      "phases": [
        {"phase": "Planning", "weeks": 2, "deliverables": ["Requirements doc", "Wireframes"], "subSteps": [{"title": "Gather requirements", "order": 1}, {"title": "Create wireframes", "order": 2}]},
        {"phase": "Development", "weeks": 4, "deliverables": ["Core features", "Integration"], "subSteps": [{"title": "Implement HomePage", "order": 1}, {"title": "Build ProductsPage", "order": 2}]},
        {"phase": "Testing & Launch", "weeks": 2, "deliverables": ["QA", "Deployment"], "subSteps": [{"title": "Run QA", "order": 1}, {"title": "Deploy to production", "order": 2}]}
      ]
    },
    "budgetBreakdown": {"total": "Estimated total", "breakdown": [{"category": "Design", "percentage": 25}, {"category": "Development", "percentage": 55}, {"category": "Deployment", "percentage": 20}]},
    "risks": ["Risk 1 with mitigation", "Risk 2 with mitigation"],
    "recommendations": ["Recommendation 1", "Recommendation 2"]
  },
  "files": {
    "/App.js": "import { useState } from 'react';\\nimport Header from './components/Header';\\n...\\nexport default App;",
    "/components/Header.js": "...",
    "/components/Footer.js": "...",
    "/components/Sidebar.js": "...",
    "/pages/HomePage.js": "...",
    "/pages/AboutPage.js": "...",
    "/pages/ProductsPage.js": "...",
    "/pages/ContactPage.js": "...",
    "/pages/LoginPage.js": "...",
    "/pages/RegisterPage.js": "...",
    "/pages/DashboardPage.js": "...",
    "/pages/UsersPage.js": "..."
  }
}

CODE REQUIREMENTS: App.js shell when using files — import Header, Footer or Sidebar, pages; useState('home' or 'login'); {currentPage === 'home' && <HomePage />} etc.; nav via <button onClick> only, never href. Tailwind only. Real content, no Lorem. Double quotes for apostrophe-containing strings.

${codeRules}

CODE PATTERN:
function App() {
  const [currentPage, setCurrentPage] = useState(${isManagement ? "'login'" : "'home'"});
  const [menuOpen, setMenuOpen] = useState(false);
  const handleNav = (e, p) => { e.preventDefault(); setCurrentPage(p); setMenuOpen(false); };
  const HomePage = () => { const features = [...]; return <>{features.map((f,i)=><div key={i}>...</div>)}</>; };
  return (
    <div className="min-h-screen">
      <header><button onClick={(e)=>handleNav(e,'home')}><img src="__LOGO__" alt="Logo" className="w-12 h-12 object-contain transition-transform duration-200 hover:scale-110" />Brand</button>
      <nav><button onClick={(e)=>handleNav(e,'home')}>Home</button>...</nav></header>
      {currentPage==='home'&&<HomePage/>}{currentPage==='about'&&<AboutPage/>}...
      <footer>...</footer>
    </div>
  );
}
export default App;

${isManagement ? `MANAGEMENT LAYOUT (fixed): const isAuth = currentPage==='login'||currentPage==='register'; return <div className="flex min-h-screen bg-gray-100">{isAuth?(currentPage==='login'?<LoginPage onNavigate={handleNav}/>:<RegisterPage onNavigate={handleNav}/>):(<><Sidebar onNavigate={handleNav} currentPage={currentPage}/><div className="flex-1 flex flex-col"><Header title={pageTitles[currentPage]}/><main className="flex-1 p-6 overflow-auto">{currentPage==='dashboard'&&<DashboardPage/>}{currentPage==='products'&&<ProductsPage/>}{currentPage==='users'&&<UsersPage/>}</main></div></>)}</div>;

EXPORTS: export default DashboardPage; export default UsersPage; etc. Never export App from page files. handleNav=(e,p)=>{e?.preventDefault?.();setCurrentPage(p);}. Login onSubmit: onNavigate(e,'dashboard').` : ''}

Generate now:`;
}
