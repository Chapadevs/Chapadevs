export const parsePreviewResult = (previewResult) => {
  if (!previewResult) return null
  try {
    return JSON.parse(previewResult)
  } catch {
    return { raw: previewResult }
  }
}

export const buildPreviewIframeSrcDoc = (websiteCode) => {
  if (!websiteCode) return ''
  let code = websiteCode
  
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
  
  code = code.replace(/```jsx?\n?/g, '').replace(/```\n?/g, '')
  code = code.replace(/function\s+App\s*\(\)\s*=>/g, 'function App()')
  code = code.replace(/const GeneratedComponent\s*=\s*\(\)\s*=>/g, 'function App()')
  code = code.replace(/const GeneratedComponent\s*=/g, 'function App')
  code = code.replace(/export default GeneratedComponent;?/g, 'export default App;')
  code = code.replace(/export default function GeneratedComponent\(\)/g, 'export default function App()')
  code = code.replace(/function GeneratedComponent\(\)/g, 'function App()')
  code = code.replace(/GeneratedComponent/g, 'App')
  if (!code.includes('export default App')) {
    code = code.replace(/export default \w+;?/g, 'export default App;')
  }
  
  // Remove import statements (we'll use CDN React)
  code = code.replace(/^import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
  code = code.replace(/^import\s+.*?;?\s*$/gm, '')
  
  // Remove export default but keep all component definitions
  // Find where export default App is and remove just that line
  code = code.replace(/export\s+default\s+App;?\s*$/gm, '')
  
  // Ensure we have all the code including helper components
  // The code should now contain all component definitions and the App component
  let componentCode = code.trim()
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <style>body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;}</style>
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
</html>`
}
