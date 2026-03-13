// Entry point for issue-tracker feature plugin
// Loaded by nano-agent-team core after npm run build in plugin/
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load compiled TypeScript plugin
const pluginPath = path.join(__dirname, 'plugin', 'dist', 'index.js');
const { default: plugin } = await import(pluginPath);

export default plugin;
