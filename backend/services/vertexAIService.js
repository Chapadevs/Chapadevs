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
    this.modelInstances = new Map(); // Cache model instances by modelId
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
      
      // Check for local development credentials
      const serviceAccountPath = process.env.GMAIL_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
      if (serviceAccountPath && process.env.NODE_ENV === 'development') {
        console.log(`   Using service account: ${serviceAccountPath}`);
        // Set GOOGLE_APPLICATION_CREDENTIALS if not already set
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && serviceAccountPath) {
          process.env.GOOGLE_APPLICATION_CREDENTIALS = serviceAccountPath;
        }
      }
      
      // In Cloud Run, authentication happens automatically via the service account
      // For local dev, GOOGLE_APPLICATION_CREDENTIALS should point to service account JSON
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
      
      // Mark ready immediately. No blocking test — cold start would timeout and force mock forever.
      // Real API calls are attempted per-request; generateProjectAnalysis/generateWebsitePreview
      // already catch errors and fall back to mock.
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
          error.message?.includes('Unable to authenticate') ||
          error.code === 403) {
        console.error('\n   🔑 AUTHENTICATION/PERMISSION ERROR DETECTED');
        console.error('   Solutions for LOCAL DEVELOPMENT:');
        console.error('   1. Set GOOGLE_APPLICATION_CREDENTIALS environment variable:');
        console.error('      export GOOGLE_APPLICATION_CREDENTIALS="./chapadevs-468722-e8777b042699.json"');
        console.error('      (or use the same file as GMAIL_SERVICE_ACCOUNT_PATH)');
        console.error('   2. Or authenticate with gcloud:');
        console.error('      gcloud auth application-default login');
        console.error('   3. Ensure the service account has "Vertex AI User" role:');
        console.error('      gcloud projects add-iam-policy-binding chapadevs-468722 \\');
        console.error('           --member="serviceAccount:SERVICE_ACCOUNT_EMAIL" \\');
        console.error('           --role="roles/aiplatform.user"');
        console.error('   Solutions for CLOUD RUN:');
        console.error('   1. Ensure service account has "Vertex AI User" role');
        console.error('   2. Check service account in Cloud Run service settings');
        console.error('   3. Verify GCP_PROJECT_ID is correct:', process.env.GCP_PROJECT_ID);
      }
      
      if (error.message?.includes('not found') || 
          error.message?.includes('404') || 
          error.message?.includes('was not found') ||
          error.code === 404) {
        console.error('\n   🔍 API NOT ENABLED OR MODEL NOT FOUND');
        console.error('   Solutions:');
        console.error('   1. Enable Vertex AI API:');
        console.error('      gcloud services enable aiplatform.googleapis.com --project=chapadevs-468722');
        console.error('   2. Enable Generative AI API:');
        console.error('      gcloud services enable generativelanguage.googleapis.com --project=chapadevs-468722');
        console.error('   3. Check available models in your region:');
        console.error('      Visit: https://console.cloud.google.com/vertex-ai/model-garden?project=chapadevs-468722');
        console.error('   4. Try these model IDs:');
        console.error('      - gemini-2.0-flash-exp (experimental, usually available)');
        console.error('      - gemini-1.5-pro-002 (stable version)');
        console.error('      - gemini-1.5-flash-002 (faster alternative)');
        console.error('   5. Note: Some models may not be available in all regions');
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

  extractUsage(response) {
    const um = response?.response?.usageMetadata || response?.usageMetadata;
    if (!um) return null;
    const promptTokenCount = um.promptTokenCount ?? um.prompt_token_count ?? 0;
    const candidatesTokenCount = um.candidatesTokenCount ?? um.candidates_token_count ?? 0;
    const totalTokenCount = um.totalTokenCount ?? um.total_token_count ?? (promptTokenCount + candidatesTokenCount);
    return { promptTokenCount, candidatesTokenCount, totalTokenCount };
  }

  extractText(response) {
    if (typeof response?.text === 'function') return response.text();
    if (typeof response?.text === 'string') return response.text;
    if (response?.response && typeof response.response.text === 'function') return response.response.text();
    if (typeof response?.response?.text === 'string') return response.response.text;
    if (response?.response?.candidates?.[0]?.content?.parts?.[0]?.text) {
      return response.response.candidates[0].content.parts[0].text;
    }
    throw new Error('Unable to extract text from Vertex AI response.');
  }

  async generateProjectAnalysis(prompt, userInputs) {
    if (!this.initialized || !this.model) {
      console.warn('⚠️ Vertex AI not initialized, using mock data');
      return this.generateMockAnalysis(prompt, userInputs);
    }
    
    const cacheKey = `project_${this.hashString(prompt + JSON.stringify(userInputs))}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('✅ Cache hit - saving API call');
      return { result: cached, fromCache: true, usage: null };
    }

    const optimizedPrompt = this.buildOptimizedPrompt(prompt, userInputs);

    try {
      const { result, usage } = await this.withRateLimit(async () => {
        const response = await this.model.generateContent(optimizedPrompt);
        const text = this.extractText(response);
        const usage = this.extractUsage(response);
        return { result: text, usage };
      });
      
      this.cache.set(cacheKey, result);
      return { result, fromCache: false, usage };
    } catch (error) {
      console.error('Vertex AI Error:', error.message);
      if (error.response) console.error('Response structure:', JSON.stringify(error.response, null, 2));
      console.warn('⚠️  API call failed - using MOCK data');
      return this.generateMockAnalysis(prompt, userInputs);
    }
  }

  fixBrokenImageSrc(html) {
    const allowlist = ['picsum.photos', 'placehold.co', 'placeholder.com'];
    const isAllowed = (src) => allowlist.some((h) => (src || '').trim().toLowerCase().includes(h));
    return html.replace(/<img([^>]*)\ssrc=["']([^"']*)["']([^>]*)>/gi, (match, before, src, after) => {
      if (isAllowed(src)) return match;
      const altMatch = /alt=["']([^"']*)["']/i.exec(match);
      const alt = altMatch ? encodeURIComponent(altMatch[1].slice(0, 30)) : 'Preview';
      return `<img${before} src="https://placehold.co/400x300?text=${alt}"${after}>`;
    });
  }

  async generateWebsitePreview(prompt, userInputs) {
    if (!this.initialized || !this.model) {
      console.error('❌❌❌ VERTEX AI NOT INITIALIZED - USING MOCK DATA ❌❌❌');
      return this.generateMockWebsite(prompt, userInputs);
    }
    
    const cacheKey = `website_${this.hashString(prompt + JSON.stringify(userInputs))}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('✅ Website cache hit - saving API call');
      return { htmlCode: cached, fromCache: true, usage: null };
    }

    const htmlPrompt = this.buildWebsitePrompt(prompt, userInputs);

    try {
      const { result, usage } = await this.withRateLimit(async () => {
        const response = await this.model.generateContent(htmlPrompt);
        const text = this.extractText(response);
        const usage = this.extractUsage(response);
        return { result: text, usage };
      });
      
      let cleanHtml = result.trim();
      if (cleanHtml.startsWith('```html')) {
        cleanHtml = cleanHtml.replace(/```html\n?/g, '').replace(/```\n?$/g, '');
      } else if (cleanHtml.startsWith('```')) {
        cleanHtml = cleanHtml.replace(/```\n?/g, '');
      }
      cleanHtml = this.fixBrokenImageSrc(cleanHtml);
      
      this.cache.set(cacheKey, cleanHtml);
      return { htmlCode: cleanHtml, fromCache: false, usage };
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

    return {
      htmlCode: mockReactComponent,
      fromCache: false,
      isMock: true,
      usage: null
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
    this.cache.set(`project_${this.hashString(prompt + JSON.stringify(userInputs))}`, result);
    
    return {
      result,
      fromCache: false,
      isMock: true,
      usage: null
    };
  }

  buildOptimizedPrompt(prompt, userInputs) {
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
2. Create a COMPLETE, PROFESSIONAL landing page with at least 4 sections
3. Use the color scheme: ${colorScheme} - apply these colors throughout (gradients, buttons, accents)
4. Style should be ${style} - if playful/fun, use rounded corners, animations, bright colors. If professional, use clean lines, muted tones.
5. Generate REAL, SPECIFIC content - NO placeholders, NO "Lorem Ipsum", NO truncated text
6. For e-commerce: Include product categories, shopping features, pricing sections
7. Make it visually stunning with proper spacing, shadows, hover effects

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

  // Normalize model ID to correct Vertex AI format
  normalizeModelId(modelId) {
    // Map user-friendly names to actual Vertex AI model IDs
    // Note: Model availability varies by region and project
    const modelMap = {
      'gemini-2.0-flash': 'gemini-2.0-flash-exp', // Experimental version (usually available)
      'gemini-2.5-pro': 'gemini-2.5-pro', // Gemini 2.5 Pro (available in Model Garden)
      'gemini-1.5-pro': 'gemini-2.5-pro', // Map old 1.5-pro to 2.5-pro for backward compatibility
      'gemini-1.5-flash': 'gemini-1.5-flash-002',
    };
    
    // Return mapped version if exists, otherwise return as-is
    return modelMap[modelId] || modelId;
  }
  
  // Get available model IDs to try (with fallbacks)
  getModelIdVariants(modelId) {
    const variants = {
      'gemini-2.5-pro': [
        'gemini-2.5-pro',      // Base name (try first)
        'gemini-2.5-pro-exp',  // Experimental version if available
        'gemini-2.5-pro-001',  // Version 001 if available
      ],
      'gemini-1.5-pro': [
        'gemini-2.5-pro',      // Map to 2.5 Pro (newer version)
        'gemini-1.5-pro',      // Base name (fallback)
        'gemini-1.5-pro-001',  // Version 001
      ],
      'gemini-2.0-flash': [
        'gemini-2.0-flash-exp', // Experimental
        'gemini-2.0-flash',     // Base name
      ],
    };
    
    return variants[modelId] || [modelId];
  }

  // Get or create model instance for a specific modelId with automatic fallback
  async getModel(modelId = 'gemini-2.0-flash') {
    if (!this.initialized || !this.vertex) {
      return null;
    }

    // Get variants to try (with fallbacks)
    const variants = this.getModelIdVariants(modelId);
    const normalizedBase = this.normalizeModelId(modelId);
    
    // Add normalized base to front of variants if not already there
    if (!variants.includes(normalizedBase)) {
      variants.unshift(normalizedBase);
    }
    
    // Try each variant until one works
    let lastError = null;
    for (const variantId of variants) {
      // Return cached model instance if available
      if (this.modelInstances.has(variantId)) {
        console.log(`✅ Using cached model: ${variantId} (requested: ${modelId})`);
        return this.modelInstances.get(variantId);
      }

      // Try to create model instance
      try {
        const model = this.vertex.getGenerativeModel({
          model: variantId,
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.8,
            topP: 0.95,
          },
        });
        
        // Test if model is accessible (this doesn't make an API call, just creates the instance)
        this.modelInstances.set(variantId, model);
        console.log(`✅ Model instance created and cached: ${variantId} (requested: ${modelId})`);
        return model;
      } catch (error) {
        lastError = error;
        // If this variant fails with 404, try the next one
        if (error.message?.includes('404') || error.message?.includes('not found')) {
          console.warn(`⚠️ Model ${variantId} not available (404), trying next variant...`);
          continue;
        }
        // For other errors, log and continue to next variant
        console.warn(`⚠️ Error with model ${variantId}:`, error.message);
        continue;
      }
    }
    
    // If all variants failed, log detailed error
    console.error(`❌ All model variants failed for ${modelId}`);
    if (lastError) {
      console.error('Last error:', lastError.message);
      
        // Provide specific guidance for Pro model
        if (modelId === 'gemini-2.5-pro' || modelId === 'gemini-1.5-pro' || modelId.includes('pro')) {
          console.error('\n📋 TO ENABLE GEMINI 2.5 PRO:');
          console.error('   1. Visit: https://console.cloud.google.com/vertex-ai/model-garden?project=' + process.env.GCP_PROJECT_ID);
          console.error('   2. Search for "Gemini 2.5 Pro" and click "Enable"');
          console.error('   3. Or run: gcloud services enable aiplatform.googleapis.com --project=' + process.env.GCP_PROJECT_ID);
          console.error('   4. Some Pro models may require billing account or specific region');
          console.error('   5. Check available models: gcloud ai models list --region=us-central1 --project=' + process.env.GCP_PROJECT_ID);
        }
    }
    
    // Don't automatically fallback - let the user know Pro isn't available
    // The API call handler will provide better error messages
    return null;
  }

  // Get template structure based on niche/project type
  getTemplateStructure(niche) {
    const lowerNiche = (niche || '').toLowerCase();
    
    // E-commerce template
    if (lowerNiche.includes('ecommerce') || lowerNiche.includes('store') || lowerNiche.includes('shop') || lowerNiche.includes('selling')) {
      return {
        type: 'ecommerce',
        sections: [
          { type: 'hero', required: true, description: 'Hero section with main CTA' },
          { type: 'products', required: true, count: '6-12', description: 'Product showcase grid' },
          { type: 'features', required: true, count: '4-6', description: 'Key features/benefits' },
          { type: 'testimonials', required: false, count: '3-5', description: 'Customer testimonials' },
          { type: 'footer', required: true, description: 'Footer with links and contact' }
        ]
      };
    }
    
    // Advocacy template
    if (lowerNiche.includes('advocacy') || lowerNiche.includes('nonprofit') || lowerNiche.includes('charity') || lowerNiche.includes('cause')) {
      return {
        type: 'advocacy',
        sections: [
          { type: 'hero', required: true, description: 'Hero with mission statement' },
          { type: 'mission', required: true, description: 'Mission and values section' },
          { type: 'services', required: true, count: '4-6', description: 'Services or programs offered' },
          { type: 'impact', required: false, description: 'Impact metrics and stories' },
          { type: 'footer', required: true, description: 'Footer with contact and social links' }
        ]
      };
    }
    
    // Portfolio template
    if (lowerNiche.includes('portfolio') || lowerNiche.includes('personal') || lowerNiche.includes('freelance')) {
      return {
        type: 'portfolio',
        sections: [
          { type: 'hero', required: true, description: 'Hero with name and tagline' },
          { type: 'projects', required: true, count: '6-9', description: 'Project showcase gallery' },
          { type: 'skills', required: true, description: 'Skills and expertise section' },
          { type: 'contact', required: true, description: 'Contact form or information' },
          { type: 'footer', required: true, description: 'Footer with social links' }
        ]
      };
    }
    
    // Blog template
    if (lowerNiche.includes('blog') || lowerNiche.includes('news') || lowerNiche.includes('article')) {
      return {
        type: 'blog',
        sections: [
          { type: 'hero', required: true, description: 'Hero with featured post' },
          { type: 'featured', required: true, count: '3-6', description: 'Featured posts grid' },
          { type: 'categories', required: false, description: 'Category navigation' },
          { type: 'newsletter', required: false, description: 'Newsletter signup' },
          { type: 'footer', required: true, description: 'Footer with links' }
        ]
      };
    }
    
    // Default business template
    return {
      type: 'business',
      sections: [
        { type: 'hero', required: true, description: 'Hero section with main value proposition' },
        { type: 'services', required: true, count: '4-6', description: 'Services offered' },
        { type: 'about', required: true, description: 'About the business' },
        { type: 'testimonials', required: false, count: '3-5', description: 'Client testimonials' },
        { type: 'footer', required: true, description: 'Footer with contact and links' }
      ]
    };
  }

  // Build optimized combined prompt (analysis + code in one)
  buildCombinedPrompt(prompt, userInputs) {
    const template = this.getTemplateStructure(userInputs.projectType || prompt);
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

STYLING:
- Colors: ${colorScheme} (use Tailwind classes)
- Style: ${style}
- Single page only (no navigation to other pages, but can have links)

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
- ALL helper components (icons, sub-components) MUST be defined BEFORE the App component
- Helper components must use: const ComponentName = () => { ... } syntax
- ALL components must be in the same scope (no separate files)
- Tailwind CSS classes only
- Responsive (sm:, md:, lg: breakpoints)
- Images: Use https://picsum.photos/400/300?random=SEED or https://placehold.co/400x300?text=TEXT
- NO placeholders, NO Lorem Ipsum
- NO markdown code blocks in code field
- Single page with all sections
- If using icon components, define them BEFORE using them in arrays/objects

CODE STRUCTURE EXAMPLE:
const Icon1 = () => <svg>...</svg>;
const Icon2 = () => <svg>...</svg>;
function App() {
  const features = [
    { icon: <Icon1 />, title: '...' },
    { icon: <Icon2 />, title: '...' }
  ];
  return <div>...</div>;
}
export default App;

Generate now:`;
  }

  // Generate combined preview (analysis + code in one call)
  async generateCombinedPreview(prompt, userInputs, modelId = 'gemini-2.0-flash') {
    if (!this.initialized || !this.vertex) {
      console.warn('⚠️ Vertex AI not initialized, using mock data');
      return this.generateMockCombined(prompt, userInputs);
    }

    const cacheKey = `combined_${modelId}_${this.hashString(prompt + JSON.stringify(userInputs))}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      console.log('✅ Combined cache hit - saving API call');
      return { result: cached, fromCache: true, usage: null };
    }

    const model = await this.getModel(modelId);
    if (!model) {
      console.warn('⚠️ Model not available, using mock data');
      return this.generateMockCombined(prompt, userInputs);
    }

    const combinedPrompt = this.buildCombinedPrompt(prompt, userInputs);

    try {
      const { result, usage } = await this.withRateLimit(async () => {
        let response;
        try {
          response = await model.generateContent(combinedPrompt);
        } catch (apiError) {
          // If model returns 404, try other variants of the same model type
          if ((apiError.message?.includes('404') || apiError.message?.includes('not found')) && 
              modelId !== 'gemini-2.0-flash') {
            console.warn(`⚠️ Model ${modelId} returned 404, trying other variants...`);
            
            // Try other variants of the requested model
            const variants = this.getModelIdVariants(modelId);
            const currentVariant = variants.find(v => this.modelInstances.has(v));
            
            // Try next variants
            for (const variantId of variants) {
              if (variantId === currentVariant) continue; // Skip the one that failed
              
              try {
                // Determine which model type to request based on variant
                let modelTypeToRequest = modelId;
                if (variantId.includes('2.5-pro')) {
                  modelTypeToRequest = 'gemini-2.5-pro';
                } else if (variantId.includes('1.5-pro')) {
                  modelTypeToRequest = 'gemini-1.5-pro';
                } else if (variantId.includes('pro')) {
                  modelTypeToRequest = 'gemini-2.5-pro'; // Default to 2.5 Pro
                }
                
                const variantModel = await this.getModel(modelTypeToRequest);
                if (variantModel && variantModel !== model) {
                  console.log(`🔄 Trying variant: ${variantId}`);
                  response = await variantModel.generateContent(combinedPrompt);
                  console.log(`✅ Variant ${variantId} worked!`);
                  break;
                }
              } catch (variantError) {
                console.warn(`⚠️ Variant ${variantId} also failed:`, variantError.message);
                continue;
              }
            }
            
            // If all variants failed, throw a helpful error with instructions
            if (!response) {
              const errorMsg = `Gemini 2.5 Pro is not available in your project (${process.env.GCP_PROJECT_ID}). 

To enable it:
1. Visit Model Garden: https://console.cloud.google.com/vertex-ai/model-garden?project=${process.env.GCP_PROJECT_ID}
2. Search for "Gemini 2.5 Pro" and click "Enable"
3. Or enable Vertex AI API: gcloud services enable aiplatform.googleapis.com --project=${process.env.GCP_PROJECT_ID}
4. Check if Pro models are available in your region (us-central1)

Note: Pro models may require billing account or specific project tier.`;
              throw new Error(errorMsg);
            }
          } else {
            throw apiError;
          }
        }
        
        const text = this.extractText(response);
        const usage = this.extractUsage(response);
        
        // Parse JSON response with robust error handling
        let cleanText = text.trim();
        
        // Remove markdown code blocks
        if (cleanText.startsWith('```json')) {
          cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
        } else if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/```\n?/g, '');
        }
        
        // Try to extract JSON object if embedded in text
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          cleanText = jsonMatch[0];
        }
        
        // Remove control characters that break JSON (keep \n, \r, \t for formatting)
        // But we need to be careful - these should be escaped in strings
        cleanText = cleanText.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        let parsed;
        try {
          parsed = JSON.parse(cleanText);
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError.message);
          const errorPos = parseError.message.match(/position (\d+)/)?.[1];
          if (errorPos) {
            const pos = parseInt(errorPos);
            console.error('Error around position:', cleanText.substring(Math.max(0, pos - 50), pos + 50));
          }
          
          // Try to fix common JSON issues - escape control characters in string values
          try {
            // More sophisticated fix: properly escape strings
            // This regex finds string values and escapes control characters in them
            let fixedText = cleanText.replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, (match, content) => {
              if (!content) return match;
              // Escape control characters in string content
              const escaped = content
                .replace(/\\/g, '\\\\')  // Escape backslashes first
                .replace(/"/g, '\\"')    // Escape quotes
                .replace(/\n/g, '\\n')    // Escape newlines
                .replace(/\r/g, '\\r')   // Escape carriage returns
                .replace(/\t/g, '\\t');  // Escape tabs
              return `"${escaped}"`;
            });
            
            parsed = JSON.parse(fixedText);
            console.log('✅ Fixed JSON parsing issues (escaped control characters in strings)');
          } catch (retryError) {
            // Last attempt: try to manually reconstruct the code field
            try {
              // Find the code field and properly escape it
              const codeFieldMatch = cleanText.match(/"code"\s*:\s*"([\s\S]*?)"(?=\s*[,}])/);
              if (codeFieldMatch) {
                let codeValue = codeFieldMatch[1];
                // Properly escape the code string value
                codeValue = codeValue
                  .replace(/\\/g, '\\\\')  // Escape backslashes
                  .replace(/"/g, '\\"')    // Escape quotes
                  .replace(/\n/g, '\\n')    // Escape newlines
                  .replace(/\r/g, '\\r')   // Escape carriage returns
                  .replace(/\t/g, '\\t');  // Escape tabs
                
                // Replace the code field in the JSON
                const fixedCodeJson = cleanText.replace(
                  /"code"\s*:\s*"[\s\S]*?"(?=\s*[,}])/,
                  `"code": "${codeValue}"`
                );
                parsed = JSON.parse(fixedCodeJson);
                console.log('✅ Fixed JSON by properly escaping code field');
              } else {
                throw retryError;
              }
            } catch (finalError) {
              console.error('All JSON parsing attempts failed');
              console.error('Response length:', cleanText.length);
              console.error('First 1000 chars:', cleanText.substring(0, 1000));
              throw new Error('AI returned invalid JSON format that could not be fixed');
            }
          }
        }
        
        // Clean and validate code
        if (parsed.code) {
          let code = parsed.code;
          code = code.replace(/```jsx?\n?/g, '').replace(/```\n?/g, '');
          code = code.replace(/function\s+App\s*\(\)\s*=>/g, 'function App()');
          code = code.replace(/const GeneratedComponent\s*=\s*\(\)\s*=>/g, 'function App()');
          code = code.replace(/const GeneratedComponent\s*=/g, 'function App');
          code = code.replace(/export default GeneratedComponent;?/g, 'export default App;');
          code = code.replace(/function GeneratedComponent\(\)/g, 'function App()');
          code = code.replace(/GeneratedComponent/g, 'App');
          if (!code.includes('export default App')) {
            code = code.replace(/export default \w+;?/g, 'export default App;');
            if (!code.includes('export default')) {
              code += '\n\nexport default App;';
            }
          }
          parsed.code = this.fixBrokenImageSrc(code);
        }
        
        return { result: parsed, usage };
      });
      
      this.cache.set(cacheKey, result);
      return { result, fromCache: false, usage };
    } catch (error) {
      console.error('Vertex AI Error:', error.message);
      console.warn('⚠️  API call failed - using MOCK data');
      return this.generateMockCombined(prompt, userInputs);
    }
  }

  // Regenerate with cached context (styling only)
  async regenerateWithContext(cachedCode, modifications, modelId = 'gemini-2.0-flash') {
    if (!this.initialized || !this.vertex) {
      console.warn('⚠️ Vertex AI not initialized');
      return { htmlCode: cachedCode, fromCache: false, usage: null };
    }

    const model = await this.getModel(modelId);
    if (!model) {
      console.warn('⚠️ Model not available');
      return { htmlCode: cachedCode, fromCache: false, usage: null };
    }

    const regeneratePrompt = `Given this existing React component code, modify ONLY the styling (colors, spacing, layout). Keep all content, structure, and functionality identical.

EXISTING CODE:
\`\`\`jsx
${cachedCode}
\`\`\`

MODIFICATIONS REQUESTED:
${modifications || 'Change color scheme, adjust spacing and layout for a fresh look'}

REQUIREMENTS:
- Keep component name: App
- Keep all content and text identical
- Keep all functionality identical
- Only modify: colors, spacing, padding, margins, layout (grid/flex), shadows, borders
- Use Tailwind CSS classes
- Return ONLY the complete React component code
- NO markdown code blocks
- Component MUST be: function App() { ... } OR const App = () => { ... }
- Export: export default App;

Generate the modified component:`;

    try {
      const { result, usage } = await this.withRateLimit(async () => {
        const response = await model.generateContent(regeneratePrompt);
        const text = this.extractText(response);
        const usage = this.extractUsage(response);
        
        let cleanCode = text.trim();
        if (cleanCode.startsWith('```jsx')) {
          cleanCode = cleanCode.replace(/```jsx\n?/g, '').replace(/```\n?$/g, '');
        } else if (cleanCode.startsWith('```')) {
          cleanCode = cleanCode.replace(/```\n?/g, '');
        }
        
        // Normalize component name
        cleanCode = cleanCode.replace(/function\s+App\s*\(\)\s*=>/g, 'function App()');
        cleanCode = cleanCode.replace(/const GeneratedComponent\s*=\s*\(\)\s*=>/g, 'function App()');
        cleanCode = cleanCode.replace(/const GeneratedComponent\s*=/g, 'function App');
        cleanCode = cleanCode.replace(/export default GeneratedComponent;?/g, 'export default App;');
        cleanCode = cleanCode.replace(/function GeneratedComponent\(\)/g, 'function App()');
        cleanCode = cleanCode.replace(/GeneratedComponent/g, 'App');
        if (!cleanCode.includes('export default App')) {
          cleanCode = cleanCode.replace(/export default \w+;?/g, 'export default App;');
          if (!cleanCode.includes('export default')) {
            cleanCode += '\n\nexport default App;';
          }
        }
        
        cleanCode = this.fixBrokenImageSrc(cleanCode);
        return { result: cleanCode, usage };
      });
      
      return { htmlCode: result, fromCache: false, usage };
    } catch (error) {
      console.error('Regenerate Error:', error.message);
      return { htmlCode: cachedCode, fromCache: false, usage: null };
    }
  }

  // Mock combined response
  generateMockCombined(prompt, userInputs) {
    console.log('🎭 Generating MOCK combined response');
    
    const analysis = this.generateMockAnalysis(prompt, userInputs);
    const website = this.generateMockWebsite(prompt, userInputs);
    
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
}

export default new VertexAIService();

