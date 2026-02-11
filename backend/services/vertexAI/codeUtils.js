/**
 * Code utility functions for Vertex AI service
 */

export function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
}

export function fixBrokenImageSrc(html) {
  const allowlist = ['picsum.photos', 'placehold.co', 'placeholder.com'];
  const isAllowed = (src) => allowlist.some((h) => (src || '').trim().toLowerCase().includes(h));
  return html.replace(/<img([^>]*)\ssrc=["']([^"']*)["']([^>]*)>/gi, (match, before, src, after) => {
    if (isAllowed(src)) return match;
    const altMatch = /alt=["']([^"']*)["']/i.exec(match);
    const alt = altMatch ? encodeURIComponent(altMatch[1].slice(0, 30)) : 'Preview';
    return `<img${before} src="https://placehold.co/400x300?text=${alt}"${after}>`;
  });
}

export function normalizeComponentCode(code) {
  let cleanCode = code;
  // Remove markdown code blocks
  if (cleanCode.startsWith('```jsx')) {
    cleanCode = cleanCode.replace(/```jsx\n?/g, '').replace(/```\n?$/g, '');
  } else if (cleanCode.startsWith('```html')) {
    cleanCode = cleanCode.replace(/```html\n?/g, '').replace(/```\n?$/g, '');
  } else if (cleanCode.startsWith('```')) {
    cleanCode = cleanCode.replace(/```\n?/g, '');
  }
  
  // Normalize component name to App
  cleanCode = cleanCode.replace(/function\s+App\s*\(\)\s*=>/g, 'function App()');
  cleanCode = cleanCode.replace(/const GeneratedComponent\s*=\s*\(\)\s*=>/g, 'function App()');
  cleanCode = cleanCode.replace(/const GeneratedComponent\s*=/g, 'function App');
  cleanCode = cleanCode.replace(/export default GeneratedComponent;?/g, 'export default App;');
  cleanCode = cleanCode.replace(/function GeneratedComponent\(\)/g, 'function App()');
  cleanCode = cleanCode.replace(/GeneratedComponent/g, 'App');
  
  // Ensure export default App exists
  if (!cleanCode.includes('export default App')) {
    cleanCode = cleanCode.replace(/export default \w+;?/g, 'export default App;');
    if (!cleanCode.includes('export default')) {
      cleanCode += '\n\nexport default App;';
    }
  }
  
  return cleanCode;
}
