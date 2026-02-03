/**
 * Response parsing utilities for Vertex AI combined responses
 */
import { fixBrokenImageSrc } from './utils.js';

/**
 * Parse combined response JSON with robust error handling
 */
export function parseCombinedResponse(text) {
  // Remove markdown code blocks
  let cleanText = text.trim();
  
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
      // Last attempt: manually extract and reconstruct the code field
      try {
        const codeFieldStart = cleanText.indexOf('"code"');
        if (codeFieldStart === -1) throw retryError;
        
        // Find opening quote of code value
        const quoteStart = cleanText.indexOf('"', codeFieldStart + 6);
        if (quoteStart === -1) throw retryError;
        const valueStart = quoteStart + 1;
        
        // Find the end of JSON object
        const lastBrace = cleanText.lastIndexOf('}');
        if (lastBrace <= valueStart) throw retryError;
        
        // Extract code value - look for closing quote, but if unterminated, use everything up to last brace
        let codeValue = '';
        let valueEnd = -1;
        
        // Try to find a properly closed string first
        for (let i = valueStart; i < lastBrace; i++) {
          if (cleanText[i] === '"' && cleanText[i-1] !== '\\') {
            // Check if this is followed by comma/brace (end of field)
            const next = cleanText.substring(i+1).match(/^\s*[,}]/);
            if (next) {
              valueEnd = i;
              codeValue = cleanText.substring(valueStart, i);
              break;
            }
          }
        }
        
        // If no proper end found, extract to last brace and find where it should end
        if (valueEnd === -1) {
          const beforeBrace = cleanText.substring(0, lastBrace);
          // Look for pattern that indicates end of code field (quote followed by comma/brace)
          const endPattern = /"\s*[,}]/;
          const endMatch = beforeBrace.substring(valueStart).match(endPattern);
          if (endMatch) {
            valueEnd = valueStart + endMatch.index;
            codeValue = cleanText.substring(valueStart, valueEnd);
          } else {
            // Extract everything and trim trailing quote if present
            codeValue = beforeBrace.substring(valueStart);
            codeValue = codeValue.replace(/^[\s\n]*/, '').replace(/[\s\n]*$/, '');
            if (codeValue.endsWith('"')) codeValue = codeValue.slice(0, -1);
            valueEnd = lastBrace;
          }
        }
        
        // Escape the code value properly
        codeValue = codeValue
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\n/g, '\\n')
          .replace(/\r/g, '\\r')
          .replace(/\t/g, '\\t');
        
        // Reconstruct JSON
        const beforeCode = cleanText.substring(0, valueStart);
        let afterCode = '';
        if (valueEnd < lastBrace) {
          // Find what comes after the code field
          const afterMatch = cleanText.substring(valueEnd).match(/^"\s*([,}])/);
          if (afterMatch) {
            afterCode = '"' + afterMatch[1] + cleanText.substring(valueEnd + afterMatch[0].length);
          } else {
            afterCode = '"}';
          }
        } else {
          // Code field goes to the end, close it properly
          afterCode = '"}';
        }
        
        const fixedCodeJson = beforeCode + codeValue + afterCode;
        parsed = JSON.parse(fixedCodeJson);
        console.log('✅ Fixed JSON by manually extracting and escaping code field');
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
    parsed.code = fixBrokenImageSrc(code);
  }
  
  return parsed;
}

/**
 * Normalize component name in code
 */
export function normalizeComponentName(code) {
  let cleanCode = code;
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
  return cleanCode;
}
