import { useState, useEffect } from 'react'
import { generateAIPreview, getVertexAIStatus, regenerateAIPreview } from '../../../services/api'
import { TECH_STACK_BY_CATEGORY } from '../../../utils/techStack'
import JSZip from 'jszip'
import { Button, Alert, Select, Textarea } from '../../ui-components'
import './AIPreviewGenerator.css'

const AIPreviewGenerator = () => {
  const [formData, setFormData] = useState({
    prompt: '',
    budget: '',
    timeline: '',
    projectType: '',
    techStack: [],
    modelId: 'gemini-2.0-flash',
  })
  const [loading, setLoading] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [result, setResult] = useState(null)
  const [websitePreview, setWebsitePreview] = useState(null)
  const [websiteIsMock, setWebsiteIsMock] = useState(false)
  const [previewId, setPreviewId] = useState(null)
  const [vertexAIReady, setVertexAIReady] = useState(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('analysis')
  const [copySuccess, setCopySuccess] = useState(false)
  const [sandpackError, setSandpackError] = useState(false)

  useEffect(() => {
    getVertexAIStatus()
      .then((s) => setVertexAIReady(s.initialized === true))
      .catch(() => setVertexAIReady(false))
  }, [])

  // Monitor for Sandpack network errors in production
  useEffect(() => {
    if (!websitePreview) return;

    const errorHandler = (event) => {
      // Check for Sandpack/CodeSandbox network errors
      if (event.message?.includes('col.csbops.io') || 
          event.message?.includes('sandpack') ||
          event.message?.includes('ERR_CONNECTION_TIMED_OUT')) {
        console.warn('Sandpack network error detected, showing fallback');
        setSandpackError(true);
      }
    };

    // Listen for unhandled errors
    window.addEventListener('error', errorHandler);
    
    // Set timeout to detect if Sandpack hasn't loaded after 10 seconds
    const timeout = setTimeout(() => {
      // Check if Sandpack iframe/content hasn't loaded
      const sandpackContainer = document.querySelector('.sandpack-container iframe');
      if (sandpackContainer && !sandpackContainer.contentDocument) {
        console.warn('Sandpack timeout - showing fallback');
        setSandpackError(true);
      }
    }, 10000);

    return () => {
      window.removeEventListener('error', errorHandler);
      clearTimeout(timeout);
    };
  }, [websitePreview]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleTechToggle = (value) => {
    setFormData((prev) => ({
      ...prev,
      techStack: prev.techStack.includes(value)
        ? prev.techStack.filter((t) => t !== value)
        : [...prev.techStack, value],
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.prompt.trim()) {
      setError('Please describe your project')
      return
    }

    setLoading(true)
    setError('')
    setResult(null)
    setWebsitePreview(null)
    setWebsiteIsMock(false)

    try {
      const payload = {
        ...formData,
        techStack: Array.isArray(formData.techStack)
          ? formData.techStack.join(', ')
          : String(formData.techStack || ''),
      }
      // GENERATES THE AI PREVIEW: analysis + code in one call
      const response = await generateAIPreview(payload)
      
      // Parse the JSON result if it's a string
      let parsedResult
      if (typeof response.result === 'string') {
        try {
          parsedResult = JSON.parse(response.result)
        } catch {
          // If it's not JSON, keep as is
          parsedResult = { raw: response.result }
        }
      } else {
        parsedResult = response.result
      }

      setResult({
        ...parsedResult,
        fromCache: response.fromCache,
        tokenUsage: response.tokenUsage,
        usage: response.usage ?? null,
      })

      // Set website preview if available
      if (response.websitePreview && response.websitePreview.htmlCode) {
        setWebsitePreview(response.websitePreview.htmlCode)
        setWebsiteIsMock(response.websitePreview.isMock === true || response.websiteIsMock === true)
      }

      // Store preview ID for regenerate
      if (response.id) {
        setPreviewId(response.id)
      }
    } catch (err) {
      setError(err.message || 'Failed to generate AI preview. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = async () => {
    if (!websitePreview) return
    
    try {
      await navigator.clipboard.writeText(websitePreview)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownloadCode = async () => {
    if (!websitePreview) return
    
    try {
      const zip = new JSZip()
      
      // Add files to zip
      zip.file('App.js', websitePreview)
      zip.file('package.json', JSON.stringify({
        name: 'generated-react-component',
        version: '1.0.0',
        private: true,
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0',
          'react-scripts': '5.0.1'
        },
        scripts: {
          'start': 'react-scripts start',
          'build': 'react-scripts build'
        }
      }, null, 2))
      
      zip.file('README.md', `# Generated React Component

This component was generated by Chapadevs AI.

## Installation

\`\`\`bash
npm install
\`\`\`

## Run

\`\`\`bash
npm start
\`\`\`
`)
      
      // Generate and download
      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'react-component.zip'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download:', err)
      setError('Failed to download code. Please try again.')
    }
  }

  const handleRegenerate = async () => {
    if (!previewId || !websitePreview) return

    setRegenerating(true)
    setError('')

    try {
      const response = await regenerateAIPreview(previewId, {
        modifications: 'Change color scheme and adjust spacing for a fresh look',
        modelId: formData.modelId
      })

      if (response.websitePreview && response.websitePreview.htmlCode) {
        setWebsitePreview(response.websitePreview.htmlCode)
        setWebsiteIsMock(false)
      }
    } catch (err) {
      setError(err.message || 'Failed to regenerate preview. Please try again.')
    } finally {
      setRegenerating(false)
    }
  }

  const renderResult = () => {
    if (!result) return null

    // If it's a raw text result
    if (result.raw) {
      return (
        <div className="ai-result-section">
          <div className="result-header">
            <h3>AI Analysis</h3>
            {result.fromCache && <span className="cache-badge">From Cache</span>}
          </div>
          <div className="result-content">
            <pre>{result.raw}</pre>
          </div>
        </div>
      )
    }

    // Structured JSON result
    return (
      <div className="ai-results">
        <div className="result-header">
          <h3>AI Project Analysis</h3>
          <div className="result-badges">
            {result.fromCache && <span className="cache-badge">⚡ From Cache</span>}
            {result.tokenUsage != null && (
              <span className="token-badge">
                {result.usage?.analysis || result.usage?.website ? '' : '~'}
                {result.tokenUsage.toLocaleString()} tokens
              </span>
            )}
          </div>
        </div>

        {result.title && (
          <div className="result-section title-section">
            <h2>{result.title}</h2>
          </div>
        )}

        {result.overview && (
          <div className="result-section">
            <h4>📋 Project Overview</h4>
            <p>{result.overview}</p>
          </div>
        )}

        {result.features && result.features.length > 0 && (
          <div className="result-section">
            <h4>✨ Key Features</h4>
            <ul className="features-list">
              {result.features.map((feature, index) => (
                <li key={index}>{feature}</li>
              ))}
            </ul>
          </div>
        )}

        {result.techStack && (
          <div className="result-section">
            <h4>🛠️ Technology Stack</h4>
            <div className="tech-stack-grid">
              {result.techStack.frontend && (
                <div className="tech-category">
                  <h5>Frontend</h5>
                  <ul>
                    {result.techStack.frontend.map((tech, index) => (
                      <li key={index}>{tech}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.techStack.backend && (
                <div className="tech-category">
                  <h5>Backend</h5>
                  <ul>
                    {result.techStack.backend.map((tech, index) => (
                      <li key={index}>{tech}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.techStack.database && (
                <div className="tech-category">
                  <h5>Database</h5>
                  <ul>
                    {result.techStack.database.map((tech, index) => (
                      <li key={index}>{tech}</li>
                    ))}
                  </ul>
                </div>
              )}
              {result.techStack.deployment && (
                <div className="tech-category">
                  <h5>Deployment</h5>
                  <ul>
                    {result.techStack.deployment.map((tech, index) => (
                      <li key={index}>{tech}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {result.timeline && (
          <div className="result-section">
            <h4>📅 Project Timeline ({result.timeline.totalWeeks} weeks)</h4>
            <div className="timeline-phases">
              {result.timeline.phases && result.timeline.phases.map((phase, index) => (
                <div key={index} className="timeline-phase">
                  <div className="phase-header">
                    <strong>{phase.phase}</strong>
                    <span className="phase-duration">{phase.weeks} weeks</span>
                  </div>
                  {phase.deliverables && (
                    <ul className="deliverables">
                      {phase.deliverables.map((deliverable, idx) => (
                        <li key={idx}>{deliverable}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {result.budgetBreakdown && (
          <div className="result-section">
            <h4>💰 Budget Breakdown</h4>
            <p className="budget-total">Total: {result.budgetBreakdown.total}</p>
            <div className="budget-items">
              {result.budgetBreakdown.breakdown && result.budgetBreakdown.breakdown.map((item, index) => (
                <div key={index} className="budget-item">
                  <div className="budget-item-header">
                    <span className="budget-category">{item.category}</span>
                    <span className="budget-percentage">{item.percentage}%</span>
                  </div>
                  <p className="budget-description">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.risks && result.risks.length > 0 && (
          <div className="result-section">
            <h4>⚠️ Risk Assessment</h4>
            <ul className="risks-list">
              {result.risks.map((risk, index) => (
                <li key={index}>{risk}</li>
              ))}
            </ul>
          </div>
        )}

        {result.recommendations && result.recommendations.length > 0 && (
          <div className="result-section">
            <h4>💡 Recommendations</h4>
            <ul className="recommendations-list">
              {result.recommendations.map((rec, index) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="ai-preview-generator">
      <div className="generator-header">
        <h3>AI Project Preview Generator</h3>
        <p className="generator-subtitle">
          Get instant project analysis powered by AI (5 generations per hour)
        </p>
      </div>

      {vertexAIReady === false && (
        <div className="ai-preview-warning" role="alert">
          <strong>AI previews are placeholders.</strong> Vertex AI is not configured or unavailable.
          You will always get the same template — no real AI generation. Configure GCP (Vertex AI, <code>GCP_PROJECT_ID</code>, IAM) to enable real AI website generation.
        </div>
      )}

      <form onSubmit={handleSubmit} className="generator-form">
        <Textarea
          id="prompt"
          name="prompt"
          label="Project Description"
          value={formData.prompt}
          onChange={handleChange}
          placeholder="Describe your project idea... (e.g., 'I need an e-commerce website for selling handmade crafts with payment integration')"
          rows="4"
          required
          wrapperClassName="form-group"
        />

        <div className="form-row">
          <Select
            id="projectType"
            name="projectType"
            label="Project Type"
            value={formData.projectType}
            onChange={handleChange}
            wrapperClassName="form-group"
          >
            <option value="">Select type...</option>
            <option value="New Website Design & Development">New Website</option>
            <option value="Website Redesign/Refresh">Website Redesign</option>
            <option value="E-commerce Store">E-commerce</option>
            <option value="Landing Page">Landing Page</option>
            <option value="Web Application">Web Application</option>
            <option value="Mobile App">Mobile App</option>
            <option value="Other">Other</option>
          </Select>

          <Select
            id="budget"
            name="budget"
            label="Budget"
            value={formData.budget}
            onChange={handleChange}
            wrapperClassName="form-group"
          >
            <option value="">Select budget...</option>
            <option value="Under $5,000">Under $5,000</option>
            <option value="$5,000 - $10,000">$5,000 - $10,000</option>
            <option value="$10,000 - $25,000">$10,000 - $25,000</option>
            <option value="$25,000 - $50,000">$25,000 - $50,000</option>
            <option value="$50,000+">$50,000+</option>
          </Select>
        </div>

        <div className="form-row">
          <Select
            id="timeline"
            name="timeline"
            label="Timeline"
            value={formData.timeline}
            onChange={handleChange}
            wrapperClassName="form-group"
          >
            <option value="">Select timeline...</option>
            <option value="1-2 weeks">1-2 weeks</option>
            <option value="2-4 weeks">2-4 weeks</option>
            <option value="1-2 months">1-2 months</option>
            <option value="2-3 months">2-3 months</option>
            <option value="3-6 months">3-6 months</option>
            <option value="6+ months">6+ months</option>
          </Select>

          <div className="form-group">
            <label htmlFor="modelId">AI Model</label>
            <Select
              id="modelId"
              name="modelId"
              value={formData.modelId}
              onChange={handleChange}
            >
              <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fast & Economical) - Recommended</option>
              <option value="gemini-2.5-pro">Gemini 2.5 Pro (Premium Quality)</option>
            </Select>
            <p className="form-hint">Flash: Faster, lower cost. Pro: Higher quality, higher cost.</p>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Tech Stack</label>
            <p className="form-hint">Select stacks for AI analysis</p>
            <div className="tech-stack-categories">
              {Object.entries(TECH_STACK_BY_CATEGORY).map(([category, options]) => (
                <div key={category} className="tech-stack-category" role="group" aria-label={`${category} technologies`}>
                  <span className="tech-stack-category-label">{category.charAt(0).toUpperCase() + category.slice(1)}</span>
                  <div className="tech-stack-options">
                    {options.map((opt) => (
                      <label key={opt.value} className="tech-stack-option">
                        <input
                          type="checkbox"
                          value={opt.value}
                          checked={formData.techStack.includes(opt.value)}
                          onChange={() => handleTechToggle(opt.value)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {error && <Alert variant="error">{error}</Alert>}

        <Button type="submit" variant="primary" className="generate-button" disabled={loading}>
          {loading ? (
            <>
              <span className="spinner"></span>
              Generating Analysis...
            </>
          ) : (
            'Generate Project Preview'
          )}
        </Button>
      </form>

      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Analyzing your project requirements with AI...</p>
          <p className="loading-subtext">This may take 30-60 seconds</p>
        </div>
      )}

      {(result || websitePreview) && (
        <div className="results-container">
          <div className="results-tabs">
            <Button 
              variant="ghost"
              className={`tab-button ${activeTab === 'analysis' ? 'active' : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              📋 Project Analysis
            </Button>
            {websitePreview && (
              <Button 
                variant="ghost"
                className={`tab-button ${activeTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                🌐 Website Preview
              </Button>
            )}
          </div>

          {activeTab === 'analysis' && renderResult()}
          
          {activeTab === 'preview' && websitePreview && (
            <div className="website-preview-section">
              {websiteIsMock && (
                <div className="ai-preview-warning ai-preview-warning-inline" role="alert">
                  This is a <strong>placeholder template</strong>, not AI‑generated. Vertex AI is unavailable — configure GCP to get real, unique previews.
                </div>
              )}
              <div className="preview-header">
                <h3>React Component Preview</h3>
                <p className="preview-note">Live editable React component. Edit the code and see changes instantly!</p>
              </div>
              
              <div className="preview-actions">
                <Button 
                  variant="secondary"
                  onClick={handleCopyCode}
                  className="action-button copy-button"
                >
                  {copySuccess ? '✓ Copied!' : '📋 Copy Code'}
                </Button>
                <Button 
                  variant="secondary"
                  onClick={handleDownloadCode}
                  className="action-button download-button"
                >
                  💾 Download ZIP
                </Button>
                <Button 
                  variant="secondary"
                  onClick={handleRegenerate}
                  className="action-button regenerate-button"
                  disabled={regenerating || !previewId}
                >
                  {regenerating ? '🔄 Regenerating...' : '🎨 Regenerate Style'}
                </Button>
              </div>

              <div className="sandpack-container">
                <iframe
                  title="Component Preview"
                  style={{
                    width: '100%',
                    height: '600px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: 'white'
                  }}
                  sandbox="allow-scripts allow-same-origin"
                  srcDoc={(() => {
                    // Normalize the code
                    let code = websitePreview;
                    
                    // Unescape if the code is stored as a JSON string (double-escaped)
                    try {
                      // Try to parse as JSON string first (handles double-escaped strings)
                      if (code.startsWith('"') && code.endsWith('"')) {
                        code = JSON.parse(code)
                      }
                    } catch (e) {
                      // Not a JSON string, continue with original code
                    }
                    
                    // Replace escaped newlines with actual newlines
                    code = code.replace(/\\n/g, '\n')
                    code = code.replace(/\\t/g, '\t')
                    code = code.replace(/\\r/g, '\r')
                    code = code.replace(/\\"/g, '"')
                    code = code.replace(/\\\\/g, '\\')
                    
                    code = code.replace(/```jsx?\n?/g, '').replace(/```\n?/g, '');
                    code = code.replace(/function\s+App\s*\(\)\s*=>/g, 'function App()');
                    code = code.replace(/const GeneratedComponent\s*=\s*\(\)\s*=>/g, 'function App()');
                    code = code.replace(/const GeneratedComponent\s*=/g, 'function App');
                    code = code.replace(/export default GeneratedComponent;?/g, 'export default App;');
                    code = code.replace(/export default function GeneratedComponent\(\)/g, 'export default function App()');
                    code = code.replace(/function GeneratedComponent\(\)/g, 'function App()');
                    code = code.replace(/GeneratedComponent/g, 'App');
                    if (!code.includes('export default App')) {
                      code = code.replace(/export default \w+;?/g, 'export default App;');
                    }
                    
                    // Remove import statements (we'll use CDN React)
                    code = code.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '');
                    code = code.replace(/^import\s+.*?;?\s*$/gm, '');
                    
                    // Remove export default but keep all component definitions
                    // Find where export default App is and remove just that line
                    code = code.replace(/export\s+default\s+App;?\s*$/gm, '');
                    
                    // Ensure we have all the code including helper components
                    // The code should now contain all component definitions and the App component
                    let componentCode = code.trim();
                    
                    // Create HTML with React from CDN and Babel standalone for JSX
                    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Component Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    const { useState } = React;
    
    ${componentCode}
    
    // Ensure App is available
    if (typeof App === 'undefined') {
      console.error('App component is not defined. Check your code.');
      console.error('Available components:', Object.keys(window).filter(k => typeof window[k] === 'function'));
    }
    const AppComponent = App;
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(React.createElement(AppComponent));
  </script>
</body>
</html>`;
                  })()}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default AIPreviewGenerator

