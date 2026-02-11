import { getTemplateStructure } from './templateHelpers.js';

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

export function buildWebsitePrompt(prompt, userInputs) {
  const projectType = userInputs.projectType || 'Website';
  
  // Better extraction of color preferences
  const colorKeywords = ['colorful', 'color', 'blue', 'red', 'green', 'purple', 'pink', 'yellow', 'orange', 'cyan', 'teal', 'indigo', 'violet', 'rose', 'amber', 'emerald', 'sky', 'fuchsia'];
  const foundColors = [];
  const lowerPrompt = prompt.toLowerCase();
  
  for (const color of colorKeywords) {
    if (lowerPrompt.includes(color)) {
      foundColors.push(color);
    }
  }
  
  // Determine color scheme
  let colorScheme = 'purple-600, indigo-600';
  if (foundColors.includes('colorful')) {
    colorScheme = 'pink-500, orange-500, yellow-400, cyan-400';
  } else if (foundColors.length > 0) {
    const primaryColor = foundColors[0];
    const colorMap = {
      'blue': 'blue-600',
      'red': 'red-600',
      'green': 'green-600',
      'purple': 'purple-600',
      'pink': 'pink-500',
      'yellow': 'yellow-500',
      'orange': 'orange-500',
      'cyan': 'cyan-500',
      'teal': 'teal-600',
      'indigo': 'indigo-600',
      'violet': 'violet-600',
      'rose': 'rose-500',
      'amber': 'amber-500',
      'emerald': 'emerald-600',
      'sky': 'sky-500',
      'fuchsia': 'fuchsia-500'
    };
    const tailwindColor = colorMap[primaryColor] || 'purple-600';
    colorScheme = `${tailwindColor}, ${tailwindColor.replace('-600', '-500').replace('-500', '-400')}`;
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
  
  // Extract business name/product (better extraction)
  let businessName = prompt;
  // Remove common phrases
  businessName = businessName.replace(/i need (an|a) /gi, '');
  businessName = businessName.replace(/for (selling|creating|building|making) /gi, '');
  businessName = businessName.replace(/website|web app|application|store|ecommerce|e-commerce/gi, '');
  // Take first meaningful phrase (up to 5 words)
  const words = businessName.trim().split(/\s+/).slice(0, 5);
  businessName = words.join(' ').trim();
  if (businessName.length > 50) {
    businessName = businessName.substring(0, 50);
  }
  if (!businessName || businessName.length < 3) {
    businessName = 'Your Business';
  }
  
  // Determine business type (only business and ecommerce)
  const businessType = lowerPrompt.includes('ecommerce') || lowerPrompt.includes('store') || lowerPrompt.includes('selling') || lowerPrompt.includes('shop')
    ? 'e-commerce'
    : 'business';

  // Create main content suggestions based on business type
  const mainContentSuggestions = businessType === 'e-commerce'
    ? 'Product showcase grid (6-12 items with image, name, price) - use https://picsum.photos or https://placehold.co for images'
    : 'Services offered (4-6 cards with icon, title, description)';
  
  return `You are an expert React developer. Generate a HIGH-QUALITY, PERSONALIZED, PRODUCTION-READY React component.

MANDATORY: Generate ONLY React/JavaScript code. No Angular templates, no Vue, no other frameworks. Use React 18 functional components.
PROJECT DETAILS:
- Type: ${projectType}
- Full Description: "${prompt}"
- Business Name/Product: "${businessName}"
- Business Type: ${businessType}
- Color Scheme: ${colorScheme} (use Tailwind classes like bg-${colorScheme.split(',')[0].trim()}, text-${colorScheme.split(',')[0].trim()})
- Style: ${style}
- Budget: ${userInputs.budget || 'Not specified'}

CRITICAL REQUIREMENTS:
1. USE THE EXACT BUSINESS NAME "${businessName}" in the hero title, not truncated or generic text
2. Create a MULTI-PAGE website with: HomePage, AboutPage, ServicesPage/ProductsPage, ContactPage
3. Use useState for currentPage ('home', 'about', 'services', 'contact') and switch pages via onClick - do NOT use href with # or anchor links
4. Use the color scheme: ${colorScheme} - apply these colors throughout (gradients, buttons, accents)
5. Style should be ${style} - if playful/fun, use rounded corners, animations, bright colors. If professional, use clean lines, muted tones.
6. Generate REAL, SPECIFIC content - NO placeholders, NO "Lorem Ipsum", NO truncated text
7. NAV LINKS: Use button or onClick with e.preventDefault() and e.stopPropagation() - NEVER use href="#..." for navigation (prevents parent app navigation in iframe)
8. Make it visually stunning with proper spacing, shadows, hover effects

IMAGES (CRITICAL):
- For product/category cards or any <img>, use ONLY these URLs. No other domains or fake paths.
- Option A: https://picsum.photos/400/300?random=SEED — use a numeric SEED per item (e.g. 1, 2, 3 or hash of category name).
- Option B: https://placehold.co/400x300?text=TEXT — URL-encode the category/card title (e.g. "Gothic+Dresses").
- Never use placeholder filenames, /placeholder, or other image URLs. Invalid src will be replaced automatically.

TECHNICAL REQUIREMENTS:
- React 18 functional component with useState hooks
- Use Tailwind CSS classes ONLY (Tailwind CDN will be loaded separately)
- All Tailwind classes must be valid (use bg-gradient-to-r, from-COLOR, to-COLOR for gradients)
- Fully responsive with sm:, md:, lg: breakpoints
- Interactive hover effects and transitions
- Proper semantic HTML structure
- Clean, well-formatted code

MULTI-PAGE STRUCTURE:
- Header (shared): Logo, nav buttons for Home, About, Services/Products, Contact - use onClick with setCurrentPage, NOT href
- HomePage: Hero + featured content (testimonials or highlights)
- AboutPage: Company story, stats, mission
- ServicesPage/ProductsPage: ${mainContentSuggestions}
- ContactPage: Contact form or contact info
- Footer (shared): Copyright, quick links (also use onClick, NOT href)

NAV LINKS CRITICAL: Use button elements with onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage('home'); }} - NEVER use <a href="#..."> or anchor links. This prevents navigation escaping to the parent app.

0. Header/Navbar (fixed or sticky):
   - Logo: button with onClick to setCurrentPage('home')
   - Nav: buttons for Home, About, Services/Products, Contact - each calls setCurrentPage
   - Optional CTA button for Contact
   - Responsive: hamburger menu on mobile (sm/md breakpoints)

1. HomePage (currentPage === 'home'):
   - Hero: Title "${businessName}", subtitle, CTA button
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
   - Copyright: "${businessName}"
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

export function buildCombinedPrompt(prompt, userInputs) {
  const template = getTemplateStructure(userInputs.projectType || prompt);
  const techPref = userInputs.techStack?.trim() || 'React, Node.js, MongoDB — JavaScript/TypeScript only';
  
  // Extract business details
  const lowerPrompt = prompt.toLowerCase();
  let businessName = prompt
    .replace(/i need (an?|the) /gi, '')
    .replace(/i want (an?|the) /gi, '')
    .replace(/^(build|create|make|design) (me )?(an?|a|the) /gi, '')
    .replace(/\b(website|web app|application|store|ecommerce|portfolio|blog)\b/gi, '')
    .trim();
  const words = businessName.split(/\s+/).filter(w => w.length > 1).slice(0, 5);
  businessName = words.join(' ').trim() || 'Your Business';
  if (businessName.length > 50) businessName = businessName.substring(0, 47) + '...';
  
  // Extract color preferences
  const colorKeywords = ['blue', 'red', 'green', 'purple', 'pink', 'yellow', 'orange', 'cyan', 'teal', 'indigo', 'violet', 'rose', 'amber'];
  let colorScheme = 'purple-600, indigo-600';
  for (const color of colorKeywords) {
    if (lowerPrompt.includes(color)) {
      const colorMap = {
        'blue': 'blue-600', 'red': 'red-600', 'green': 'green-600', 'purple': 'purple-600',
        'pink': 'pink-500', 'yellow': 'yellow-500', 'orange': 'orange-500', 'cyan': 'cyan-500',
        'teal': 'teal-600', 'indigo': 'indigo-600', 'violet': 'violet-600', 'rose': 'rose-500', 'amber': 'amber-500'
      };
      colorScheme = `${colorMap[color] || 'purple-600'}, ${(colorMap[color] || 'purple-600').replace('-600', '-500').replace('-500', '-400')}`;
      break;
    }
  }
  
  // Extract style
  const styleKeywords = ['modern', 'minimal', 'clean', 'bold', 'elegant', 'fun', 'professional', 'creative'];
  let style = 'modern';
  for (const keyword of styleKeywords) {
    if (lowerPrompt.includes(keyword)) {
      style = keyword;
      break;
    }
  }
  
  // Build sections description
  const sectionsDesc = template.sections.map(s => 
    `- ${s.type}: ${s.description}${s.count ? ` (${s.count} items)` : ''}`
  ).join('\n');
  
  return `Generate a complete project analysis and React component in JSON format.

REQUIREMENTS:
- Project: "${prompt}"
- Business: "${businessName}"
- Type: ${template.type}
- Budget: ${userInputs.budget || 'Not specified'}
- Timeline: ${userInputs.timeline || 'Not specified'}
- Tech: ${techPref} (JS ecosystem only: React, Node.js, MongoDB/PostgreSQL)

TEMPLATE STRUCTURE (${template.type}):
${sectionsDesc}
Pages: ${template.pages ? template.pages.join(', ') : 'home, about, services, contact'}

MULTI-PAGE REQUIREMENT: Use useState('home') for currentPage. Define HomePage, AboutPage, ServicesPage/ProductsPage, ContactPage components. Render {currentPage === 'home' && <HomePage />} etc. Nav links MUST use button with onClick that calls setCurrentPage - NEVER use href="#..." or anchor links. Use e.preventDefault() and e.stopPropagation() on all nav clicks to prevent parent app navigation in iframe.

STYLING:
- Colors: ${colorScheme} (use Tailwind classes)
- Style: ${style}

OUTPUT FORMAT (JSON only, no markdown):
CRITICAL: Return ONLY valid JSON. Escape all special characters in strings:
- Use \\n for newlines in strings
- Use \\" for quotes in strings  
- Use \\\\ for backslashes
- NO unescaped control characters
- NO markdown code blocks around JSON

{
  "analysis": {
    "title": "Project title",
    "overview": "2-3 sentence summary",
    "features": ["Feature 1", "Feature 2", "..."],
    "techStack": {
      "frontend": ["React", "TypeScript", "Tailwind CSS"],
      "backend": ["Node.js", "Express"],
      "database": ["MongoDB"]
    },
    "timeline": {
      "totalWeeks": 8,
      "phases": [
        {"phase": "Planning", "weeks": 2, "deliverables": ["..."]},
        {"phase": "Development", "weeks": 4, "deliverables": ["..."]},
        {"phase": "Testing & Launch", "weeks": 2, "deliverables": ["..."]}
      ]
    },
    "budgetBreakdown": {
      "total": "Estimated total",
      "breakdown": [
        {"category": "Design", "percentage": 25, "description": "..."},
        {"category": "Development", "percentage": 50, "description": "..."},
        {"category": "Testing", "percentage": 15, "description": "..."},
        {"category": "Deployment", "percentage": 10, "description": "..."}
      ]
    },
    "risks": ["Risk 1 with mitigation", "..."],
    "recommendations": ["Recommendation 1", "..."]
  },
  "code": "import { useState } from 'react';\\n\\nfunction App() {\\n  return (\\n    <div>...</div>\\n  );\\n}\\n\\nexport default App;"
}

CRITICAL CODE REQUIREMENTS:
- Component MUST be named: App
- Use function App() { ... } OR const App = () => { ... }
- Export: export default App;
- MULTI-PAGE: useState('home') for currentPage. HomePage, AboutPage, ServicesPage, ContactPage as inner components. Render {currentPage === 'home' && <HomePage />} etc.
- NAV LINKS: Use <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCurrentPage('home'); }}> - NEVER <a href="#..."> or anchor links
- ALL helper components (icons, sub-components) MUST be defined BEFORE or inside App
- Tailwind CSS classes only
- Responsive (sm:, md:, lg: breakpoints)
- Images: Use https://picsum.photos/400/300?random=SEED or https://placehold.co/400x300?text=TEXT
- NO placeholders, NO Lorem Ipsum
- NO markdown code blocks in code field

CODE STRUCTURE EXAMPLE:
function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const handleNav = (e, page) => { e.preventDefault(); e.stopPropagation(); setCurrentPage(page); };
  const HomePage = () => <div>...</div>;
  const AboutPage = () => <div>...</div>;
  return (
    <div>
      <header><button onClick={(e) => handleNav(e, 'home')}>Home</button>...</header>
      {currentPage === 'home' && <HomePage />}
      {currentPage === 'about' && <AboutPage />}
    </div>
  );
}
export default App;

Generate now:`;
}
