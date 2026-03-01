import { hashString } from './responseParser.js';
import { extractColorScheme, getTemplateType } from './templateStructureHelper.js';

/**
 * Mock data generators for when Vertex AI is unavailable
 * Multi-page structure with state-based routing - no anchor links to prevent parent navigation
 */

export function generateMockWebsite(prompt, userInputs) {
  console.log('🎭🎭🎭 GENERATING MOCK DATA - NOT REAL AI 🎭🎭🎭');
  console.log('   This is a placeholder. Vertex AI is not working.');

  const projectType = userInputs.projectType || 'Website';
  const lowerPrompt = (prompt || '').toLowerCase();

  // NEVER use raw prompt as title/subtitle — use a friendly display name or generic text
  let displayName = 'Your Project';
  const stripped = prompt
    .replace(/i need (an?|the) /gi, '')
    .replace(/i want (an?|the) /gi, '')
    .replace(/^(build|create|make|design) (me )?(an?|a|the) /gi, '')
    .replace(/\b(website|web app|site|landing page|store|ecommerce|portfolio|blog)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const words = stripped.split(/\s+/).filter((w) => w.length > 1).slice(0, 4);
  if (words.length >= 1 && stripped.length >= 3) {
    displayName = words.join(' ');
    if (displayName.length > 40) displayName = displayName.substring(0, 37) + '...';
  }

  const subtitle = 'A professional landing page tailored to your needs. Get started today.';

  // Business vs ecommerce - vary main content
  const isEcommerce =
    lowerPrompt.includes('ecommerce') ||
    lowerPrompt.includes('store') ||
    lowerPrompt.includes('shop') ||
    lowerPrompt.includes('selling');

  // Theme variation: dark vs light, and accent color (literal + contextual, e.g. grapes→purple)
  const isDark = lowerPrompt.includes('dark');
  const colorScheme = extractColorScheme(prompt);
  const primaryColor = colorScheme.split(',')[0].trim(); // e.g. 'purple-600'
  const tailwindAccent = primaryColor.split('-')[0] || 'purple';

  const heroBg = isDark
    ? 'bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900'
    : `bg-gradient-to-r from-${tailwindAccent}-600 to-indigo-600`;
  const heroText = isDark ? 'text-white' : 'text-white';
  const sectionBg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const sectionTitle = isDark ? 'text-gray-100' : 'text-gray-800';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const cardTitle = isDark ? `text-${tailwindAccent}-400` : `text-${tailwindAccent}-600`;
  const cardDesc = isDark ? 'text-gray-400' : 'text-gray-600';
  const footerBg = isDark ? 'bg-black' : 'bg-gray-800';
  const btnClass = isDark
    ? 'bg-white text-gray-900 hover:bg-gray-200'
    : `bg-white text-${tailwindAccent}-600 hover:bg-gray-100`;

  const headerBg = isDark ? 'bg-gray-900' : 'bg-white';
  const headerLogoClass = isDark ? 'text-white' : 'text-gray-800';
  const navLinkClass = isDark ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900';
  const hoverBorderAccent = `hover:border-${tailwindAccent}-500`;
  const ctaBannerBg = isDark ? 'bg-gray-800' : 'bg-white';
  const contactInputClass = isDark ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300';

  const servicesPageLabel = isEcommerce ? 'Products' : 'Services';

  const mockReactComponent = `import React, { useState } from 'react';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [isHovered, setIsHovered] = useState(null);

  const handleNav = (e, page) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentPage(page);
  };

  const features = [
    { icon: '🚀', title: 'Modern Design', description: 'Clean, contemporary interface that engages your users.' },
    { icon: '📱', title: 'Fully Responsive', description: 'Perfect experience on all devices.' },
    { icon: '⚡', title: 'Fast Performance', description: 'Optimized for speed.' },
    { icon: '🔒', title: 'Secure', description: 'Built with security best practices.' },
    { icon: '💼', title: 'Professional', description: 'Enterprise-grade solution.' },
    { icon: '🎨', title: 'Customizable', description: 'Easily adapt to your requirements.' }
  ];

  const products = [
    { id: 1, name: 'Premium Widget', price: 29.99, salePrice: 24.99, onSale: true, seed: 1 },
    { id: 2, name: 'Classic Product', price: 49.99, onSale: false, seed: 2 },
    { id: 3, name: 'Deluxe Bundle', price: 79.99, salePrice: 64.99, onSale: true, seed: 3 },
    { id: 4, name: 'Starter Kit', price: 19.99, onSale: false, seed: 4 },
    { id: 5, name: 'Pro Edition', price: 99.99, onSale: false, seed: 5 },
    { id: 6, name: 'Essential Pack', price: 39.99, onSale: false, seed: 6 },
  ];

  const stats = [
    { value: '5+', label: 'Years Experience' },
    { value: '100+', label: 'Happy Clients' },
    { value: '24/7', label: 'Support' },
  ];

  const testimonials = [
    { quote: 'Outstanding quality and service. Highly recommend!', name: 'Sarah Johnson', role: 'CEO, Tech Co' },
    { quote: 'Professional, reliable, delivered beyond expectations.', name: 'Michael Chen', role: 'Founder, StartupX' },
    { quote: 'The best decision we made for our business.', name: 'Emma Williams', role: 'Marketing Director' },
  ];

  const HomePage = () => (
    <>
      <section className="${heroBg} ${heroText} py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1 rounded-full bg-white/10 text-sm mb-6">Placeholder preview — AI unavailable</div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">${displayName.replace(/'/g, "\\'")}</h1>
          <p className="text-lg md:text-xl mb-8 opacity-90">${subtitle.replace(/'/g, "\\'")}</p>
          <button onClick={(e) => handleNav(e, 'contact')} className="${btnClass} px-8 py-3 rounded-full font-semibold transform hover:scale-105 transition-all duration-200 shadow-lg">Get Started</button>
        </div>
      </section>
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className={"text-3xl md:text-5xl font-bold text-center mb-12 " + "${sectionTitle}"}>What Our Clients Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className={"${cardBg} p-6 rounded-lg shadow-md"}>
                <p className={"text-lg mb-4 italic " + "${cardDesc}"}>"{t.quote}"</p>
                <div className={"font-semibold " + "${cardTitle}"}>{t.name}</div>
                <div className={"text-sm " + "${cardDesc}"}>{t.role}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );

  const AboutPage = () => (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className={"text-3xl font-bold mb-6 text-center " + "${sectionTitle}"}>About Us</h2>
        <p className={"text-lg text-center max-w-3xl mx-auto mb-12 " + "${cardDesc}"}>We are a professional team dedicated to delivering quality ${isEcommerce ? 'products' : 'services'} tailored to your needs. Our commitment to excellence drives everything we do.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          {stats.map((s, i) => (
            <div key={i} className={"${cardBg} p-6 rounded-lg shadow-md text-center"}>
              <div className={"text-3xl font-bold " + "${cardTitle}"}>{s.value}</div>
              <div className={"text-sm " + "${cardDesc}"}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const ServicesOrProductsPage = () => (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <h2 className={"text-3xl md:text-5xl font-bold text-center mb-12 " + "${sectionTitle}"}>Our ${servicesPageLabel}</h2>
        ${isEcommerce
    ? `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((p) => (
              <div key={p.id} className={"${cardBg} p-4 rounded-lg shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl border-l-4 border-transparent ${hoverBorderAccent}"}>
                <div className="relative">
                  <img src={"https://picsum.photos/400/300?random=" + p.seed} alt={p.name} className="w-full h-48 object-cover rounded-lg mb-4" />
                  {p.onSale && <span className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded">Sale</span>}
                </div>
                <h3 className={"text-xl font-semibold mb-2 " + "${cardTitle}"}>{p.name}</h3>
                <p className="${cardDesc} mb-2">Quality product for your needs.</p>
                <div className="flex items-center justify-between mt-3">
                  <span className={"font-bold " + "${cardTitle}"}>{p.onSale ? "$" + p.salePrice + " " : ""}<span className={p.onSale ? "line-through text-gray-400 text-sm" : ""}>{p.onSale ? "$" + p.price : "$" + p.price}</span></span>
                  <button className={"${btnClass} px-3 py-1.5 rounded-full text-sm font-semibold"}>Add to Cart</button>
                </div>
              </div>
            ))}
          </div>`
    : `<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className={"${cardBg} p-6 rounded-lg shadow-md transition-all duration-300 border-l-4 border-transparent ${hoverBorderAccent} " + (isHovered === index ? 'transform -translate-y-2 shadow-xl' : '')} onMouseEnter={() => setIsHovered(index)} onMouseLeave={() => setIsHovered(null)}>
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className={"text-xl font-semibold mb-2 " + "${cardTitle}"}>{feature.title}</h3>
                <p className="${cardDesc}">{feature.description}</p>
              </div>
            ))}
          </div>`
}
      </div>
    </section>
  );

  const ContactPage = () => (
    <section className="py-16 px-4">
      <div className="max-w-2xl mx-auto">
        <h2 className={"text-3xl font-bold mb-8 text-center " + "${sectionTitle}"}>Contact Us</h2>
        <div className={"${cardBg} p-8 rounded-lg shadow-md"}>
          <p className={"mb-6 " + "${cardDesc}"}>Get in touch for a free consultation.</p>
          <p className={"font-semibold " + "${cardTitle}"}>Email: info@example.com</p>
          <p className={"font-semibold mt-2 " + "${cardTitle}"}>Phone: +1 (555) 123-4567</p>
          <div className="mt-6">
            <input type="email" placeholder="Your email" className={"w-full px-4 py-2 rounded border " + "${contactInputClass}"} />
            <textarea placeholder="Your message" rows={4} className={"w-full mt-3 px-4 py-2 rounded border " + "${contactInputClass}"} />
            <button className={"${btnClass} mt-3 px-6 py-2 rounded-full font-semibold"}>Send Message</button>
          </div>
        </div>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen ${sectionBg}">
      <header className={"sticky top-0 z-50 " + "${headerBg}" + " shadow-md"}>
        <nav className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <button onClick={(e) => handleNav(e, 'home')} className={"flex items-center gap-2 text-xl font-bold text-left bg-transparent border-none cursor-pointer " + "${headerLogoClass}"}><img src="__LOGO__" alt="Logo" className="w-12 h-12 object-contain transition-transform duration-200 hover:scale-110" />${displayName.replace(/'/g, "\\'")}</button>
          <div className="flex items-center gap-6">
            <button onClick={(e) => handleNav(e, 'home')} className={"bg-transparent border-none cursor-pointer " + "${navLinkClass}"}>Home</button>
            <button onClick={(e) => handleNav(e, 'about')} className={"bg-transparent border-none cursor-pointer " + "${navLinkClass}"}>About</button>
            <button onClick={(e) => handleNav(e, 'services')} className={"bg-transparent border-none cursor-pointer " + "${navLinkClass}"}>${servicesPageLabel}</button>
            <button onClick={(e) => handleNav(e, 'contact')} className={"bg-transparent border-none cursor-pointer " + "${navLinkClass}"}>Contact</button>
            <button onClick={(e) => handleNav(e, 'contact')} className={"${btnClass} px-4 py-2 rounded-full text-sm font-semibold"}>Get Quote</button>
          </div>
        </nav>
      </header>
      <main>
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'about' && <AboutPage />}
        {currentPage === 'services' && <ServicesOrProductsPage />}
        {currentPage === 'contact' && <ContactPage />}
      </main>
      <footer className={"${footerBg} text-white py-12 px-4 mt-auto"}>
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="font-bold text-lg mb-3">${displayName.replace(/'/g, "\\'")}</h3>
            <p className="text-gray-300 text-sm">Quality ${isEcommerce ? 'products' : 'services'} for your business.</p>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-3">Quick Links</h3>
            <div className="flex flex-col gap-2 text-gray-300 text-sm">
              <button onClick={(e) => handleNav(e, 'home')} className="text-left bg-transparent border-none cursor-pointer hover:text-white">Home</button>
              <button onClick={(e) => handleNav(e, 'about')} className="text-left bg-transparent border-none cursor-pointer hover:text-white">About</button>
              <button onClick={(e) => handleNav(e, 'services')} className="text-left bg-transparent border-none cursor-pointer hover:text-white">${servicesPageLabel}</button>
              <button onClick={(e) => handleNav(e, 'contact')} className="text-left bg-transparent border-none cursor-pointer hover:text-white">Contact</button>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-3">Contact</h3>
            <p className="text-gray-300 text-sm">info@example.com</p>
            <p className="text-gray-300 text-sm">+1 (555) 123-4567</p>
          </div>
        </div>
        <div className="border-t border-gray-600 pt-8 text-center text-gray-400 text-sm">
          <p>&copy; 2024 ${displayName.replace(/'/g, "\\'")}. Built with Chapadevs.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;`;

  return {
    htmlCode: mockReactComponent,
    fromCache: false,
    isMock: true,
    usage: null,
  };
}

export function generateMockAnalysis(prompt, userInputs, cache) {
  console.log('🎭 Generating MOCK AI response');

  const words = prompt.replace(/\b(website|web|app|for|the|an?)\b/gi, '').trim().split(/\s+/).filter((w) => w.length > 1).slice(0, 3);
  const mockBusinessName = words.length ? words.map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ') : 'Your Business';

  const mockResponse = {
    title: `${userInputs.projectType || 'Web'} Project Analysis`,
    businessName: mockBusinessName,
    logoIconConcept: 'abstract geometric mark',
    overview: `This comprehensive ${userInputs.projectType || 'web'} project addresses your requirements: "${prompt.substring(0, 100)}..." Our analysis suggests a modern, scalable solution with focus on user experience and business goals.`,
    features: [
      'Responsive design optimized for all devices and screen sizes',
      'User authentication and role-based authorization system',
      'Admin dashboard with comprehensive management tools',
      'Real-time notifications and live updates',
      'Advanced search functionality with filtering options',
      'Data analytics and reporting capabilities',
      'API integration with third-party services',
      'SEO optimization and performance tuning',
      'Secure payment processing integration',
      'Multi-language support and localization',
    ],
    techStack: {
      frontend: ['React 18', 'TypeScript', 'Tailwind CSS', 'React Router'],
      backend: ['Node.js', 'Express.js', 'JWT Authentication', 'RESTful API'],
      database: ['MongoDB'],
      deployment: ['Vercel', 'Docker', 'Nginx'],
      other: ['Git', 'GitHub Actions', 'Jest', 'ESLint', 'Prettier'],
    },
    timeline: {
      totalWeeks: parseInt(userInputs.timeline) || 10,
      phases: [
        {
          phase: 'Planning & Design',
          weeks: 2,
          deliverables: [
            'Requirements documentation',
            'User flow diagrams',
            'Wireframes and mockups',
            'Technical architecture design',
            'Database schema design',
          ],
        },
        {
          phase: 'Development Sprint 1',
          weeks: 3,
          deliverables: [
            'Core feature development',
            'API implementation',
            'Database setup',
            'Authentication system',
          ],
        },
        {
          phase: 'Development Sprint 2',
          weeks: 3,
          deliverables: [
            'Advanced features',
            'Third-party integrations',
            'Admin dashboard',
            'Payment processing',
          ],
        },
        {
          phase: 'Testing & Launch',
          weeks: 2,
          deliverables: [
            'Unit and integration testing',
            'User acceptance testing',
            'Performance optimization',
            'Production deployment',
            'Documentation and training',
          ],
        },
      ],
    },
    budgetBreakdown: {
      total: userInputs.budget || '$15,000 - $25,000',
      breakdown: [
        {
          category: 'Planning & Design',
          percentage: 20,
          description: 'Requirements analysis, UI/UX design, wireframes, and system architecture',
        },
        {
          category: 'Frontend Development',
          percentage: 30,
          description: 'User interface implementation, responsive design, and client-side logic',
        },
        {
          category: 'Backend Development',
          percentage: 30,
          description: 'API development, database design, authentication, and business logic',
        },
        {
          category: 'Testing & QA',
          percentage: 12,
          description: 'Comprehensive testing, bug fixes, and quality assurance',
        },
        {
          category: 'Deployment & Support',
          percentage: 8,
          description: 'Production deployment, documentation, training, and initial support',
        },
      ],
    },
    risks: [
      'Scope creep - Mitigated through clear requirements documentation and change request process with defined timelines and costs',
      'Third-party API dependencies - Mitigated by implementing fallback mechanisms, thorough testing, and choosing reliable service providers',
      'Timeline delays due to unforeseen complexities - Mitigated through agile methodology with regular check-ins and buffer time in estimates',
      'Performance issues at scale - Mitigated through load testing, optimization during development, and scalable architecture design',
      'Security vulnerabilities - Mitigated by following security best practices, regular security audits, and using proven security libraries',
      'Browser compatibility issues - Mitigated through cross-browser testing and using modern, well-supported technologies',
    ],
    recommendations: [
      'Start with MVP approach to validate core features and gather user feedback before full-scale development',
      'Implement CI/CD pipeline early for faster iterations, automated testing, and reliable deployments',
      'Plan for regular security audits and updates to protect user data and maintain system integrity',
      'Build with modular architecture to facilitate easier future enhancements and maintenance',
      'Prioritize mobile-first design approach for better user experience across all devices',
      'Set up comprehensive monitoring and analytics from day one to track performance and user behavior',
      'Create detailed documentation for both users and developers to ensure smooth handoff and maintenance',
      'Consider scalability from the start to accommodate future growth without major refactoring',
    ],
  };

  const result = JSON.stringify(mockResponse, null, 2);
  if (cache) {
    cache.set(`project_${hashString(prompt + JSON.stringify(userInputs))}`, result);
  }

  return {
    result,
    fromCache: false,
    isMock: true,
    usage: null,
  };
}

/**
 * Infer contextual mock data from prompt for management panel fallback.
 * Returns { products, users, stats, productsPageTitle, usersPageTitle }
 */
function inferContextualMockData(prompt) {
  const lower = (prompt || '').toLowerCase();

  // Product-centric domains (inventory, items, T-shirts, etc.)
  if (/\b(t-shirt|tshirt|t shirt|clothing|apparel|fashion|garment)\b/.test(lower)) {
    return {
      productsPageTitle: 'Products',
      usersPageTitle: 'Team',
      products: [
        { name: 'Cropped T-shirt', size: 'M', price: '$39.99', color: 'Black', status: 'Active' },
        { name: 'Oversized Hoodie', size: 'L', price: '$59.99', color: 'Gray', status: 'Active' },
        { name: 'Classic Tee', size: 'S', price: '$24.99', color: 'White', status: 'Active' },
      ],
      users: [
        { name: 'Maria Lopez', email: 'maria@store.com', role: 'Store Manager', status: 'Active' },
        { name: 'James Chen', email: 'james@store.com', role: 'Inventory Lead', status: 'Active' },
      ],
      stats: [
        { label: 'Total SKUs', value: '128' },
        { label: 'Sizes in Stock', value: '24' },
        { label: 'Low Stock Alerts', value: '5' },
        { label: 'Revenue', value: '$12,450' },
      ],
    };
  }
  if (/\b(bakery|bread|pastry|cake)\b/.test(lower)) {
    return {
      productsPageTitle: 'Inventory',
      usersPageTitle: 'Staff',
      products: [
        { name: 'Sourdough Loaf', weight: '500g', price: '$6.99', category: 'Bread', status: 'Active' },
        { name: 'Croissant', weight: '80g', price: '$3.50', category: 'Pastry', status: 'Active' },
        { name: 'Chocolate Cake', weight: '1kg', price: '$24.99', category: 'Dessert', status: 'Active' },
      ],
      users: [
        { name: 'Ana Santos', email: 'ana@bakery.com', role: 'Head Baker', status: 'Active' },
        { name: 'Carlos Mendez', email: 'carlos@bakery.com', role: 'Cashier', status: 'Active' },
      ],
      stats: [
        { label: 'Total Items', value: '45' },
        { label: 'Daily Sales', value: '142' },
        { label: 'Baking Today', value: '28' },
        { label: 'Revenue', value: '$2,890' },
      ],
    };
  }
  if (/\b(employee|staff|advocacy|legal|law firm|lawyer)\b/.test(lower)) {
    return {
      productsPageTitle: 'Items',
      usersPageTitle: 'Employees',
      products: [
        { name: 'Case File #2024-001', type: 'Active', client: 'Smith Corp', status: 'Open' },
        { name: 'Contract Review', type: 'Pending', client: 'Johnson LLC', status: 'In Progress' },
      ],
      users: [
        { name: 'John Smith', email: 'j.smith@firm.com', role: 'Federal Laws Specialist', dept: 'Execution Dept', status: 'Active' },
        { name: 'Sarah Williams', email: 's.williams@firm.com', role: 'Corporate Counsel', dept: 'Legal Affairs', status: 'Active' },
        { name: 'Michael Brown', email: 'm.brown@firm.com', role: 'Paralegal', dept: 'Research', status: 'Active' },
      ],
      stats: [
        { label: 'Total Staff', value: '24' },
        { label: 'Active Today', value: '18' },
        { label: 'Open Cases', value: '12' },
        { label: 'Billable Hours', value: '340' },
      ],
    };
  }
  if (/\b(restaurant|food|menu)\b/.test(lower)) {
    return {
      productsPageTitle: 'Menu Items',
      usersPageTitle: 'Staff',
      products: [
        { name: 'Grilled Salmon', category: 'Main', price: '$24.99', status: 'Available' },
        { name: 'Caesar Salad', category: 'Starter', price: '$12.99', status: 'Available' },
      ],
      users: [
        { name: 'Chef Rodriguez', email: 'chef@restaurant.com', role: 'Head Chef', status: 'Active' },
        { name: 'Emma Foster', email: 'emma@restaurant.com', role: 'Server', status: 'Active' },
      ],
      stats: [
        { label: 'Menu Items', value: '32' },
        { label: 'Tables Today', value: '48' },
        { label: 'Orders Pending', value: '7' },
        { label: 'Revenue', value: '$4,200' },
      ],
    };
  }

  // Default generic
  return {
    productsPageTitle: 'Products',
    usersPageTitle: 'Users',
    products: [
      { name: 'Product A', price: '$29', status: 'Active' },
      { name: 'Product B', price: '$49', status: 'Active' },
      { name: 'Product C', price: '$39', status: 'Draft' },
    ],
    users: [
      { name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
      { name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'Active' },
    ],
    stats: [
      { label: 'Total Products', value: '128' },
      { label: 'Total Users', value: '1,240' },
      { label: 'Recent Orders', value: '24' },
      { label: 'Revenue', value: '$12,450' },
    ],
  };
}

function generateMockManagementFiles(prompt, userInputs) {
  const niche = userInputs.projectType || prompt;
  const lower = (niche || '').toLowerCase();
  const words = lower.replace(/\b(management|panel|erp|crm|admin|dashboard)\b/gi, '').trim().split(/\s+/).filter((w) => w.length > 1).slice(0, 2);
  const displayName = words.length ? words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : 'Panel';
  const ctx = inferContextualMockData(prompt);

  const appJs = `import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ProductsPage from './pages/ProductsPage';
import UsersPage from './pages/UsersPage';

function App() {
  const [currentPage, setCurrentPage] = useState('login');
  const handleNav = (e, p) => { e.preventDefault(); e.stopPropagation(); setCurrentPage(p); };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {['login', 'register'].includes(currentPage) ? (
        <div className="w-full flex items-center justify-center">
          {currentPage === 'login' && <LoginPage onNav={handleNav} />}
          {currentPage === 'register' && <RegisterPage onNav={handleNav} />}
        </div>
      ) : (
        <>
          <Sidebar onNav={handleNav} />
          <main className="flex-1 overflow-auto">
            {currentPage === 'dashboard' && <DashboardPage />}
            {currentPage === 'products' && <ProductsPage />}
            {currentPage === 'users' && <UsersPage />}
          </main>
        </>
      )}
    </div>
  );
}
export default App;`;

  const sidebarJs = `import React from 'react';

export default function Sidebar({ onNav }) {
  const handleClick = (e, p) => { e.preventDefault(); if (onNav) onNav(e, p); };
  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4 flex-shrink-0">
      <h2 className="text-xl font-bold mb-6">${displayName}</h2>
      <nav className="space-y-1">
        <button onClick={(e) => handleClick(e, 'dashboard')} className="block w-full text-left px-4 py-2 rounded hover:bg-gray-800">Dashboard</button>
        <button onClick={(e) => handleClick(e, 'products')} className="block w-full text-left px-4 py-2 rounded hover:bg-gray-800">Products</button>
        <button onClick={(e) => handleClick(e, 'users')} className="block w-full text-left px-4 py-2 rounded hover:bg-gray-800">Users</button>
        <button onClick={(e) => handleClick(e, 'login')} className="block w-full text-left px-4 py-2 rounded hover:bg-gray-800 mt-4 border-t border-gray-700 pt-4">Logout</button>
      </nav>
    </aside>
  );
}`;

  const loginPageJs = `import React, { useState } from 'react';

export default function LoginPage({ onNav }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); };
  const handleNav = (e, p) => { e.preventDefault(); if (onNav) onNav(e, p); };
  return (
    <div className="w-full max-w-md mx-auto p-8">
      <div className="bg-white shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-2">Sign In</h1>
        <p className="text-gray-600 mb-6">Welcome to ${displayName}</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border focus:ring-2 focus:ring-purple-500" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border focus:ring-2 focus:ring-purple-500" />
          <button type="submit" className="w-full py-2 bg-purple-600 text-white hover:bg-purple-700">Sign In</button>
        </form>
        <p className="mt-4 text-center text-sm">
          <button type="button" onClick={(e) => handleNav(e, 'register')} className="text-purple-600 hover:underline">Don't have an account? Register</button>
        </p>
      </div>
    </div>
  );
}`;

  const registerPageJs = `import React, { useState } from 'react';

export default function RegisterPage({ onNav }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const handleSubmit = (e) => { e.preventDefault(); };
  const handleNav = (e, p) => { e.preventDefault(); if (onNav) onNav(e, p); };
  return (
    <div className="w-full max-w-md mx-auto p-8">
      <div className="bg-white shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-2">Create Account</h1>
        <p className="text-gray-600 mb-6">Join ${displayName} today</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border focus:ring-2 focus:ring-purple-500" />
          <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border focus:ring-2 focus:ring-purple-500" />
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2 border focus:ring-2 focus:ring-purple-500" />
          <button type="submit" className="w-full py-2 bg-purple-600 text-white hover:bg-purple-700">Register</button>
        </form>
        <p className="mt-4 text-center text-sm">
          <button type="button" onClick={(e) => handleNav(e, 'login')} className="text-purple-600 hover:underline">Already have an account? Login</button>
        </p>
      </div>
    </div>
  );
}`;

  const statsJson = JSON.stringify(ctx.stats, null, 2);
  const productsJson = JSON.stringify(ctx.products, null, 2);
  const usersJson = JSON.stringify(ctx.users, null, 2);

  const productsColumns = ctx.products[0] ? Object.keys(ctx.products[0]) : ['name', 'price', 'status'];
  const usersColumns = ctx.users[0] ? Object.keys(ctx.users[0]) : ['name', 'email', 'role', 'status'];

  const dashboardPageJs = `import React from 'react';

export default function DashboardPage() {
  const stats = ${statsJson};
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Dashboard</h1>
      <div className="grid md:grid-cols-4 gap-6">
        {stats.map((s, i) => (
          <div key={i} className="bg-white p-6 shadow rounded-lg border">
            <p className="text-sm text-gray-600">{s.label}</p>
            <p className="text-2xl font-bold mt-1">{s.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}`;

  const productsPageJs = `import React from 'react';

export default function ProductsPage() {
  const products = ${productsJson};
  const columns = ${JSON.stringify(productsColumns)};
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">${ctx.productsPageTitle}</h1>
      <div className="bg-white shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-6 py-3 text-left text-sm font-semibold capitalize">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map((p, i) => (
              <tr key={i} className="border-t">
                {columns.map((c) => (
                  <td key={c} className="px-6 py-4">{p[c]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}`;

  const usersPageJs = `import React from 'react';

export default function UsersPage() {
  const users = ${usersJson};
  const columns = ${JSON.stringify(usersColumns)};
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">${ctx.usersPageTitle}</h1>
      <div className="bg-white shadow overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c) => (
                <th key={c} className="px-6 py-3 text-left text-sm font-semibold capitalize">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={i} className="border-t">
                {columns.map((c) => (
                  <td key={c} className="px-6 py-4">{u[c]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}`;

  return {
    '/App.js': appJs,
    '/components/Sidebar.js': sidebarJs,
    '/pages/LoginPage.js': loginPageJs,
    '/pages/RegisterPage.js': registerPageJs,
    '/pages/DashboardPage.js': dashboardPageJs,
    '/pages/ProductsPage.js': productsPageJs,
    '/pages/UsersPage.js': usersPageJs,
  };
}

export function generateMockCombined(prompt, userInputs, cache) {
  console.log('🎭 Generating MOCK combined response');

  const templateType = getTemplateType(userInputs.projectType || prompt);
  const analysis = generateMockAnalysis(prompt, userInputs, cache);

  if (templateType === 'management') {
    const files = generateMockManagementFiles(prompt, userInputs);
    return {
      result: {
        analysis: JSON.parse(analysis.result),
        files,
        code: files['/App.js'],
      },
      fromCache: false,
      isMock: true,
      usage: null,
    };
  }

  const website = generateMockWebsite(prompt, userInputs);
  return {
    result: {
      analysis: JSON.parse(analysis.result),
      code: website.htmlCode,
    },
    fromCache: false,
    isMock: true,
    usage: null,
  };
}
