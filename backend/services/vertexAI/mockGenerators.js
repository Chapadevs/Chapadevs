import { hashString } from './codeUtils.js';

/**
 * Mock data generators for when Vertex AI is unavailable
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
  const words = stripped.split(/\s+/).filter(w => w.length > 1).slice(0, 4);
  if (words.length >= 1 && stripped.length >= 3) {
    displayName = words.join(' ');
    if (displayName.length > 40) displayName = displayName.substring(0, 37) + '...';
  }

  const subtitle = 'A professional landing page tailored to your needs. Get started today.';

  // Theme variation: dark vs light, and accent color from keywords
  const isDark = lowerPrompt.includes('dark');
  const colorKeywords = ['blue', 'red', 'green', 'purple', 'amber', 'teal', 'rose', 'indigo'];
  let accent = 'purple';
  for (const c of colorKeywords) {
    if (lowerPrompt.includes(c)) { accent = c; break; }
  }
  const tailwindAccent = accent === 'purple' ? 'purple' : accent;

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

  const mockReactComponent = `import React, { useState } from 'react';

const GeneratedComponent = () => {
  const [isHovered, setIsHovered] = useState(null);

  const features = [
    { icon: '🚀', title: 'Modern Design', description: 'Clean, contemporary interface that engages your users and drives conversions.' },
    { icon: '📱', title: 'Fully Responsive', description: 'Perfect experience on all devices — desktop, tablet, and mobile.' },
    { icon: '⚡', title: 'Fast Performance', description: 'Optimized for speed with lightning-fast load times.' },
    { icon: '🔒', title: 'Secure', description: 'Built with security best practices to protect your data.' },
    { icon: '💼', title: 'Professional', description: 'Enterprise-grade solution that scales with your business.' },
    { icon: '🎨', title: 'Customizable', description: 'Easily adapt to match your brand and requirements.' }
  ];

  return (
    <div className="min-h-screen ${sectionBg}">
      <section className="${heroBg} ${heroText} py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block px-4 py-1 rounded-full bg-white/10 text-sm mb-6">Placeholder preview — AI unavailable</div>
          <h1 className="text-4xl md:text-6xl font-bold mb-4">${displayName.replace(/'/g, "\\'")}</h1>
          <p className="text-lg md:text-xl mb-8 opacity-90">${subtitle.replace(/'/g, "\\'")}</p>
          <button className="${btnClass} px-8 py-3 rounded-full font-semibold transform hover:scale-105 transition-all duration-200 shadow-lg">Get Started</button>
        </div>
      </section>
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className={"text-3xl md:text-5xl font-bold text-center mb-12 " + "${sectionTitle}"}>Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div key={index} className={"${cardBg} p-6 rounded-lg shadow-md transition-all duration-300 " + (isHovered === index ? 'transform -translate-y-2 shadow-xl' : '')} onMouseEnter={() => setIsHovered(index)} onMouseLeave={() => setIsHovered(null)}>
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className={"text-xl font-semibold mb-2 " + "${cardTitle}"}>{feature.title}</h3>
                <p className="${cardDesc}">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <footer className="${footerBg} text-white py-8 px-4 text-center">
        <p className="text-gray-300">&copy; 2024 ${displayName.replace(/'/g, "\\'")}. Built with Chapadevs.</p>
      </footer>
    </div>
  );
};

export default GeneratedComponent;`;

  return {
    htmlCode: mockReactComponent,
    fromCache: false,
    isMock: true,
    usage: null
  };
}

export function generateMockAnalysis(prompt, userInputs, cache) {
  console.log('🎭 Generating MOCK AI response');
  
  const mockResponse = {
    title: `${userInputs.projectType || 'Web'} Project Analysis`,
    overview: `This comprehensive ${userInputs.projectType || 'web'} project addresses your requirements: "${prompt.substring(0, 100)}..." Our analysis suggests a modern, scalable solution with focus on user experience and business goals.`,
    features: [
      "Responsive design optimized for all devices and screen sizes",
      "User authentication and role-based authorization system",
      "Admin dashboard with comprehensive management tools",
      "Real-time notifications and live updates",
      "Advanced search functionality with filtering options",
      "Data analytics and reporting capabilities",
      "API integration with third-party services",
      "SEO optimization and performance tuning",
      "Secure payment processing integration",
      "Multi-language support and localization"
    ],
    techStack: {
      frontend: ["React 18", "TypeScript", "Tailwind CSS", "React Router"],
      backend: ["Node.js", "Express.js", "JWT Authentication", "RESTful API"],
      database: ["MongoDB"],
      deployment: ["Vercel", "Docker", "Nginx"],
      other: ["Git", "GitHub Actions", "Jest", "ESLint", "Prettier"]
    },
    timeline: {
      totalWeeks: parseInt(userInputs.timeline) || 10,
      phases: [
        {
          phase: "Planning & Design",
          weeks: 2,
          deliverables: [
            "Requirements documentation",
            "User flow diagrams",
            "Wireframes and mockups",
            "Technical architecture design",
            "Database schema design"
          ]
        },
        {
          phase: "Development Sprint 1",
          weeks: 3,
          deliverables: [
            "Core feature development",
            "API implementation",
            "Database setup",
            "Authentication system"
          ]
        },
        {
          phase: "Development Sprint 2",
          weeks: 3,
          deliverables: [
            "Advanced features",
            "Third-party integrations",
            "Admin dashboard",
            "Payment processing"
          ]
        },
        {
          phase: "Testing & Launch",
          weeks: 2,
          deliverables: [
            "Unit and integration testing",
            "User acceptance testing",
            "Performance optimization",
            "Production deployment",
            "Documentation and training"
          ]
        }
      ]
    },
    budgetBreakdown: {
      total: userInputs.budget || "$15,000 - $25,000",
      breakdown: [
        {
          category: "Planning & Design",
          percentage: 20,
          description: "Requirements analysis, UI/UX design, wireframes, and system architecture"
        },
        {
          category: "Frontend Development",
          percentage: 30,
          description: "User interface implementation, responsive design, and client-side logic"
        },
        {
          category: "Backend Development",
          percentage: 30,
          description: "API development, database design, authentication, and business logic"
        },
        {
          category: "Testing & QA",
          percentage: 12,
          description: "Comprehensive testing, bug fixes, and quality assurance"
        },
        {
          category: "Deployment & Support",
          percentage: 8,
          description: "Production deployment, documentation, training, and initial support"
        }
      ]
    },
    risks: [
      "Scope creep - Mitigated through clear requirements documentation and change request process with defined timelines and costs",
      "Third-party API dependencies - Mitigated by implementing fallback mechanisms, thorough testing, and choosing reliable service providers",
      "Timeline delays due to unforeseen complexities - Mitigated through agile methodology with regular check-ins and buffer time in estimates",
      "Performance issues at scale - Mitigated through load testing, optimization during development, and scalable architecture design",
      "Security vulnerabilities - Mitigated by following security best practices, regular security audits, and using proven security libraries",
      "Browser compatibility issues - Mitigated through cross-browser testing and using modern, well-supported technologies"
    ],
    recommendations: [
      "Start with MVP approach to validate core features and gather user feedback before full-scale development",
      "Implement CI/CD pipeline early for faster iterations, automated testing, and reliable deployments",
      "Plan for regular security audits and updates to protect user data and maintain system integrity",
      "Build with modular architecture to facilitate easier future enhancements and maintenance",
      "Prioritize mobile-first design approach for better user experience across all devices",
      "Set up comprehensive monitoring and analytics from day one to track performance and user behavior",
      "Create detailed documentation for both users and developers to ensure smooth handoff and maintenance",
      "Consider scalability from the start to accommodate future growth without major refactoring"
    ]
  };

  const result = JSON.stringify(mockResponse, null, 2);
  if (cache) {
    cache.set(`project_${hashString(prompt + JSON.stringify(userInputs))}`, result);
  }
  
  return {
    result,
    fromCache: false,
    isMock: true,
    usage: null
  };
}

export function generateMockCombined(prompt, userInputs, cache) {
  console.log('🎭 Generating MOCK combined response');
  
  const analysis = generateMockAnalysis(prompt, userInputs, cache);
  const website = generateMockWebsite(prompt, userInputs);
  
  return {
    result: {
      analysis: JSON.parse(analysis.result),
      code: website.htmlCode
    },
    fromCache: false,
    isMock: true,
    usage: null
  };
}
