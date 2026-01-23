import { VertexAI } from '@google-cloud/vertexai';
import NodeCache from 'node-cache';

class VertexAIService {
  constructor() {
    this.vertex = new VertexAI({
      project: process.env.GCP_PROJECT_ID,
      location: 'us-central1'
    });

    // Use Gemini Pro (widely available model)
    this.model = this.vertex.getGenerativeModel({
      model: 'gemini-pro',
      generationConfig: {
        maxOutputTokens: 2048,  // Limit tokens to control costs
        temperature: 0.7,
        topP: 0.95,
      },
    });

    // In-memory cache to reduce API calls
    this.cache = new NodeCache({ 
      stdTTL: 3600,  // 1 hour cache
      checkperiod: 600 
    });

    this.lastApiCall = 0;
  }

  async generateProjectAnalysis(prompt, userInputs) {
    // Create cache key
    const cacheKey = `project_${this.hashString(prompt + JSON.stringify(userInputs))}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache hit - saving API call');
      return { result: cached, fromCache: true };
    }

    // Optimized prompt to get more with fewer tokens
    const optimizedPrompt = this.buildOptimizedPrompt(prompt, userInputs);

    try {
      // Apply rate limiting
      const result = await this.withRateLimit(async () => {
        const response = await this.model.generateContent(optimizedPrompt);
        return response.response.text();
      });
      
      // Cache the response
      this.cache.set(cacheKey, result);
      
      return { result, fromCache: false };
    } catch (error) {
      console.error('Vertex AI Error:', error);
      
      // In development, fall back to mock data if model not available
      if (process.env.NODE_ENV === 'development' && error.message?.includes('404')) {
        console.warn('⚠️  Model not available - using MOCK data for development');
        return this.generateMockAnalysis(prompt, userInputs);
      }
      
      throw new Error('AI generation failed. Please try again.');
    }
  }

  async generateWebsitePreview(prompt, userInputs) {
    // Create cache key for HTML
    const cacheKey = `website_${this.hashString(prompt + JSON.stringify(userInputs))}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('✅ Website cache hit - saving API call');
      return { htmlCode: cached, fromCache: true };
    }

    // Build HTML generation prompt
    const htmlPrompt = this.buildWebsitePrompt(prompt, userInputs);

    try {
      // Apply rate limiting
      const result = await this.withRateLimit(async () => {
        const response = await this.model.generateContent(htmlPrompt);
        return response.response.text();
      });
      
      // Clean up the HTML (remove markdown code blocks if present)
      let cleanHtml = result.trim();
      if (cleanHtml.startsWith('```html')) {
        cleanHtml = cleanHtml.replace(/```html\n?/g, '').replace(/```\n?$/g, '');
      } else if (cleanHtml.startsWith('```')) {
        cleanHtml = cleanHtml.replace(/```\n?/g, '');
      }
      
      // Cache the response
      this.cache.set(cacheKey, cleanHtml);
      
      return { htmlCode: cleanHtml, fromCache: false };
    } catch (error) {
      console.error('Vertex AI Website Generation Error:', error);
      
      // In development, fall back to mock HTML if model not available
      if (process.env.NODE_ENV === 'development' && error.message?.includes('404')) {
        console.warn('⚠️  Model not available - using MOCK HTML for development');
        return this.generateMockWebsite(prompt, userInputs);
      }
      
      throw new Error('Website preview generation failed. Please try again.');
    }
  }

  generateMockWebsite(prompt, userInputs) {
    console.log('🎭 Generating MOCK React component');
    
    const projectType = userInputs.projectType || 'Website';
    const title = prompt.substring(0, 50) || 'Your Project';
    
    const mockReactComponent = `import React, { useState } from 'react';

const GeneratedComponent = () => {
  const [isHovered, setIsHovered] = useState(null);

  const features = [
    {
      icon: '🚀',
      title: 'Modern Design',
      description: 'Clean, contemporary interface that engages your users and drives conversions.'
    },
    {
      icon: '📱',
      title: 'Fully Responsive',
      description: 'Perfect experience on all devices - desktop, tablet, and mobile.'
    },
    {
      icon: '⚡',
      title: 'Fast Performance',
      description: 'Optimized for speed with lightning-fast load times.'
    },
    {
      icon: '🔒',
      title: 'Secure',
      description: 'Built with security best practices to protect your data.'
    },
    {
      icon: '💼',
      title: 'Professional',
      description: 'Enterprise-grade solution that scales with your business.'
    },
    {
      icon: '🎨',
      title: 'Customizable',
      description: 'Easily adapt to match your brand and requirements.'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            ${title}
          </h1>
          <p className="text-lg md:text-xl mb-8 opacity-90">
            ${projectType} - ${prompt.substring(0, 100)}
          </p>
          <button className="bg-white text-purple-600 px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-lg">
            Get Started
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-5xl font-bold text-center text-gray-800 mb-12">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={\`bg-white p-6 rounded-lg shadow-md transition-all duration-300 \${
                  isHovered === index ? 'transform -translate-y-2 shadow-xl' : ''
                }\`}
                onMouseEnter={() => setIsHovered(index)}
                onMouseLeave={() => setIsHovered(null)}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-purple-600 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8 px-4 text-center">
        <p className="text-gray-300">
          &copy; 2024 ${title}. Built with Chapadevs.
        </p>
      </footer>
    </div>
  );
};

export default GeneratedComponent;`;

    this.cache.set(`website_${this.hashString(prompt + JSON.stringify(userInputs))}`, mockReactComponent);
    
    return {
      htmlCode: mockReactComponent,
      fromCache: false,
      isMock: true
    };
  }

  generateMockAnalysis(prompt, userInputs) {
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
        frontend: ["React 18", "TypeScript", "Tailwind CSS", "Redux Toolkit", "React Router"],
        backend: ["Node.js", "Express.js", "JWT Authentication", "RESTful API"],
        database: ["MongoDB", "Redis (caching)"],
        deployment: ["AWS", "Docker", "Nginx"],
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
    this.cache.set(`project_${this.hashString(prompt + JSON.stringify(userInputs))}`, result);
    
    return {
      result,
      fromCache: false,
      isMock: true
    };
  }

  buildOptimizedPrompt(prompt, userInputs) {
    // Concise prompt to minimize tokens
    return `You are an expert web development agency project analyst. Generate a comprehensive project specification in JSON format.

CLIENT REQUEST: ${prompt}
BUDGET: ${userInputs.budget || 'Not specified'}
TIMELINE: ${userInputs.timeline || 'Not specified'}
PROJECT TYPE: ${userInputs.projectType || 'General web project'}
TECH PREFERENCES: ${userInputs.techStack || 'Modern web technologies'}

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
    "frontend": ["Technology 1", "Technology 2"],
    "backend": ["Technology 1", "Technology 2"],
    "database": ["Database choice"],
    "deployment": ["Hosting solution"],
    "other": ["Additional tools/services"]
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

  buildWebsitePrompt(prompt, userInputs) {
    const projectType = userInputs.projectType || 'Website';
    
    return `You are an expert React developer. Generate a production-ready React component.

PROJECT: ${projectType}
DESCRIPTION: ${prompt}
BUDGET: ${userInputs.budget || 'Not specified'}

REQUIREMENTS:
- Modern React 18 functional component with hooks
- Use inline Tailwind CSS classes for styling
- Fully functional with real interactions (buttons, forms, etc.)
- Include realistic sample data (not Lorem Ipsum)
- Responsive design - mobile-first approach
- Include proper state management with useState if needed
- Add event handlers for interactivity
- Clean, well-commented code
- Export default the main component

COMPONENT STRUCTURE:
1. Import React and useState (if needed)
2. Define functional component with clear name
3. Include state for interactive elements
4. Add event handler functions
5. Return JSX with Tailwind CSS classes
6. Export default component

STYLING GUIDELINES:
- Use Tailwind utility classes (bg-blue-500, text-white, px-4, py-2, etc.)
- Modern color palette (blues, purples, grays)
- Proper spacing and padding
- Hover effects and transitions
- Shadow effects for depth
- Responsive classes (sm:, md:, lg:)

IMPORTANT:
- Return ONLY the React component code
- No markdown code blocks (no \`\`\`jsx)
- No explanations before or after
- Start with: import React, { useState } from 'react';
- End with: export default ComponentName;
- Make it copy-paste ready

Generate the component now:`;
  }

  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  // Rate limiting to control costs
  async withRateLimit(fn) {
    const now = Date.now();
    const minInterval = 2000; // 2 seconds between calls

    if (now - this.lastApiCall < minInterval) {
      await new Promise(resolve => 
        setTimeout(resolve, minInterval - (now - this.lastApiCall))
      );
    }

    this.lastApiCall = Date.now();
    return fn();
  }

  // Get cache statistics
  getCacheStats() {
    return {
      keys: this.cache.keys().length,
      hits: this.cache.getStats().hits,
      misses: this.cache.getStats().misses
    };
  }
}

export default new VertexAIService();

