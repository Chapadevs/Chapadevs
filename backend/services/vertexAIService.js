import { VertexAI } from '@google-cloud/vertexai';
import NodeCache from 'node-cache';

class VertexAIService {
  constructor() {
    // Initialize cache first (always works)
    this.cache = new NodeCache({ 
      stdTTL: 3600,  // 1 hour cache
      checkperiod: 600 
    });

    this.lastApiCall = 0;
    this.vertex = null;
    this.model = null;
    this.initialized = false;
    
    // Try to initialize Vertex AI, but don't crash if it fails
    // This allows the server to start even if Vertex AI auth fails
    // Note: initializeVertexAI is now async, but we call it without await
    // to avoid blocking server startup. It will initialize in the background.
    this.initializeVertexAI().catch(err => {
      // Already handled in initializeVertexAI, just catch to prevent unhandled rejection
      console.error('Vertex AI initialization promise rejected:', err.message);
    });
  }
  
  async initializeVertexAI() {
    try {
      if (!process.env.GCP_PROJECT_ID) {
        console.warn('⚠️ GCP_PROJECT_ID not set. Vertex AI features disabled.');
        return;
      }
      
      const modelId = process.env.VERTEX_AI_MODEL || 'gemini-2.0-flash';
      console.log(`🔧 Initializing Vertex AI for project: ${process.env.GCP_PROJECT_ID}`);
      console.log(`   Location: us-central1`);
      console.log(`   Model: ${modelId}`);
      
      // In Cloud Run, authentication happens automatically via the service account
      // No need to set credentials explicitly - Cloud Run provides them
      this.vertex = new VertexAI({
        project: process.env.GCP_PROJECT_ID,
        location: 'us-central1'
      });

      console.log('   ✅ VertexAI instance created');

      // Use Gemini 2.0 Flash (gemini-1.5-flash discontinued; 2.0 is current default)
      this.model = this.vertex.getGenerativeModel({
        model: modelId,
        generationConfig: {
          maxOutputTokens: 8192,
          temperature: 0.8,
          topP: 0.95,
        },
      });
      
      console.log('   ✅ Model instance created');
      
      // Test the connection with a minimal API call (with timeout to avoid hanging)
      const TEST_TIMEOUT_MS = 25_000;
      console.log(`   Testing API connection... (timeout ${TEST_TIMEOUT_MS / 1000}s)`);
      try {
        const testPromise = this.model.generateContent('Say "test"');
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Test API call timed out after ${TEST_TIMEOUT_MS / 1000}s`)), TEST_TIMEOUT_MS)
        );
        const testResponse = await Promise.race([testPromise, timeoutPromise]);
        const testText = testResponse.response.text();
        console.log(`   ✅ Test API call successful: "${testText.trim()}"`);
      } catch (testError) {
        console.error('   ❌ Test API call failed:', testError.message);
        if (testError.message?.includes('timed out')) {
          console.error('   💡 Vertex API may be slow or unreachable from Cloud Run. Check VPC/egress if using custom network.');
        }
        throw testError; // Re-throw to trigger the catch block below
      }
      
      this.initialized = true;
      console.log(`✅✅✅ Vertex AI initialized successfully with ${modelId} ✅✅✅`);
      console.log('   Model ready for code generation');
    } catch (error) {
      console.error('\n❌❌❌ VERTEX AI INITIALIZATION FAILED ❌❌❌');
      console.error('   Error message:', error.message);
      console.error('   Error code:', error.code);
      console.error('   Error name:', error.name);
      if (error.details) {
        console.error('   Error details:', JSON.stringify(error.details, null, 2));
      }
      console.error('   Full error:', error);
      
      if (error.message?.includes('authentication') || 
          error.message?.includes('permission') || 
          error.message?.includes('Permission denied') ||
          error.code === 403) {
        console.error('\n   🔑 AUTHENTICATION/PERMISSION ERROR DETECTED');
        console.error('   Solutions:');
        console.error('   1. In Cloud Run: Ensure service account has "Vertex AI User" role');
        console.error('      Run: gcloud projects add-iam-policy-binding chapadevs-468722 \\');
        console.error('           --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \\');
        console.error('           --role="roles/aiplatform.user"');
        console.error('   2. Check service account in Cloud Run service settings');
        console.error('   3. Verify GCP_PROJECT_ID is correct:', process.env.GCP_PROJECT_ID);
      }
      
      if (error.message?.includes('not found') || 
          error.message?.includes('404') || 
          error.code === 404) {
        console.error('\n   🔍 API NOT ENABLED OR MODEL NOT FOUND');
        console.error('   Solutions:');
        console.error('   1. Enable Vertex AI API:');
        console.error('      gcloud services enable aiplatform.googleapis.com --project=chapadevs-468722');
        console.error('   2. Try VERTEX_AI_MODEL=gemini-2.0-flash or gemini-1.5-flash-002');
        console.error('   3. Visit: https://console.cloud.google.com/vertex-ai?project=chapadevs-468722');
      }
      
      if (error.message?.includes('quota') || 
          error.message?.includes('limit') || 
          error.code === 429) {
        console.error('\n   📊 QUOTA/LIMIT ERROR');
        console.error('   Solution: Check Vertex AI quotas in GCP Console');
      }
      
      console.error('\n   ⚠️ AI features will be disabled. Server will still start.');
      console.error('   ⚠️ Using mock data for AI previews until authentication is fixed.');
      console.error('   ⚠️ NO BILLING CHARGES - NO API CALLS WILL BE MADE\n');
      this.initialized = false;
      // Don't throw - let server start anyway
    }
  }

  async generateProjectAnalysis(prompt, userInputs) {
    if (!this.initialized || !this.model) {
      console.warn('⚠️ Vertex AI not initialized, using mock data');
      return this.generateMockAnalysis(prompt, userInputs);
    }
    
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
      console.error('Vertex AI Error:', error.message);
      
      // Fall back to mock data if API call fails
      console.warn('⚠️  API call failed - using MOCK data');
      return this.generateMockAnalysis(prompt, userInputs);
    }
  }

  async generateWebsitePreview(prompt, userInputs) {
    if (!this.initialized || !this.model) {
      console.error('❌❌❌ VERTEX AI NOT INITIALIZED - USING MOCK DATA ❌❌❌');
      console.error('   This means NO real AI generation is happening!');
      console.error('   Check Cloud Run logs for initialization errors.');
      console.error('   No billing charges because no API calls are made.');
      return this.generateMockWebsite(prompt, userInputs);
    }
    
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
      console.error('❌❌❌ VERTEX AI API CALL FAILED ❌❌❌');
      console.error('   Error:', error.message);
      console.error('   Error code:', error.code);
      console.error('   Full error:', JSON.stringify(error, null, 2));
      console.error('   ⚠️  FALLING BACK TO MOCK DATA - NO REAL AI GENERATION');
      console.error('   ⚠️  NO BILLING CHARGES - NO API CALLS MADE');
      
      // Log specific error types
      if (error.message?.includes('authentication') || error.message?.includes('permission')) {
        console.error('   🔑 AUTHENTICATION ERROR:');
        console.error('      - Check service account has "Vertex AI User" role');
        console.error('      - Verify GCP_PROJECT_ID is correct');
        console.error('      - Check Cloud Run service account permissions');
      }
      if (error.message?.includes('quota') || error.message?.includes('limit')) {
        console.error('   📊 QUOTA ERROR: Check Vertex AI API quotas in GCP');
      }
      if (error.message?.includes('not found') || error.message?.includes('404')) {
        console.error('   🔍 MODEL NOT FOUND: Try VERTEX_AI_MODEL=gemini-2.0-flash (or another model ID)');
      }
      
      return this.generateMockWebsite(prompt, userInputs);
    }
  }

  generateMockWebsite(prompt, userInputs) {
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

    // Do NOT cache mock — each request gets a fresh mock; avoids serving stale "same" template
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
    
    // Determine business type
    const businessType = lowerPrompt.includes('ecommerce') || lowerPrompt.includes('store') || lowerPrompt.includes('selling') || lowerPrompt.includes('shop')
      ? 'e-commerce' 
      : lowerPrompt.includes('portfolio')
      ? 'portfolio'
      : lowerPrompt.includes('blog')
      ? 'blog'
      : 'business';
    
    // Create feature suggestions based on business type
    let featureSuggestions = '';
    if (businessType === 'e-commerce') {
      featureSuggestions = 'Features should include: Product Catalog, Shopping Cart, Secure Checkout, Customer Reviews, Order Tracking, Payment Options';
    } else if (businessType === 'portfolio') {
      featureSuggestions = 'Features should include: Project Showcase, Skills Display, Contact Form, Resume/CV Section, Testimonials';
    } else {
      featureSuggestions = 'Features should include: Services Offered, About Section, Contact Information, Testimonials, Call-to-Action';
    }
    
    return `You are an expert React developer. Generate a HIGH-QUALITY, PERSONALIZED, PRODUCTION-READY React component.

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
2. Create a COMPLETE, PROFESSIONAL landing page with at least 4 sections
3. Use the color scheme: ${colorScheme} - apply these colors throughout (gradients, buttons, accents)
4. Style should be ${style} - if playful/fun, use rounded corners, animations, bright colors. If professional, use clean lines, muted tones.
5. Generate REAL, SPECIFIC content - NO placeholders, NO "Lorem Ipsum", NO truncated text
6. For e-commerce: Include product categories, shopping features, pricing sections
7. Make it visually stunning with proper spacing, shadows, hover effects

TECHNICAL REQUIREMENTS:
- React 18 functional component with useState hooks
- Use Tailwind CSS classes ONLY (Tailwind CDN will be loaded separately)
- All Tailwind classes must be valid (use bg-gradient-to-r, from-COLOR, to-COLOR for gradients)
- Fully responsive with sm:, md:, lg: breakpoints
- Interactive hover effects and transitions
- Proper semantic HTML structure
- Clean, well-formatted code

COMPONENT MUST INCLUDE:
1. Hero Section:
   - Title: Use "${businessName}" or a complete, professional business name extracted from description
   - Subtitle: Complete sentence describing the business (not truncated)
   - CTA Button with hover effects
   - Use gradient background with colors: ${colorScheme}

2. Features Section (4-6 features):
   ${featureSuggestions}
   - Each feature card with icon, title, description
   - Hover effects with transform and shadow
   - Grid layout (responsive: 1 col mobile, 2 tablet, 3 desktop)

3. Additional Section (choose based on business type):
   - E-commerce: Product showcase or categories
   - Portfolio: Project gallery or skills
   - Business: Services or testimonials

4. Footer:
   - Copyright with business name: "${businessName}"
   - Links or contact info

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

  checkVertexAIStatus() {
    return {
      initialized: this.initialized,
      ...this.getCacheStats()
    };
  }
}

export default new VertexAIService();

