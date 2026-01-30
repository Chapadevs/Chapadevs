import { copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const distPath = join(__dirname, '..', 'dist');

try {
  copyFileSync(join(distPath, 'index.html'), join(distPath, '404.html'));
  console.log('✓ Successfully created 404.html for GitHub Pages SPA routing');
} catch (error) {
  console.error('✗ Error creating 404.html:', error.message);
  process.exit(1);
}
