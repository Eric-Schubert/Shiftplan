#!/usr/bin/env node

/**
 * README Generator Script
 * 
 * Automatically updates sections of README.md:
 * - Directory structure
 * - API documentation (from files)
 * - Components list
 * 
 * Usage: node scripts/generate-readme.js
 * Or:    npm run docs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { updateReadme as updateGeneratedReadme } from './readme-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  readme: path.join(ROOT, 'README.md'),
  
  // Directories to include in structure
  includeDirs: [
    'components',
    'layouts', 
    'pages',
    'server',
    'stores',
    'types',
    'scripts',
  ],
  
  // Files/folders to ignore
  ignoreDirs: ['node_modules', '.git', '.nuxt', '.output', 'dist', '.github', 'db', 'tests'],
  ignoreFiles: ['.DS_Store', 'Thumbs.db'],
  
  // Markers in README between which content is generated
  markers: {
    structure: {
      start: '<!-- AUTO-GENERATED-STRUCTURE-START -->',
      end: '<!-- AUTO-GENERATED-STRUCTURE-END -->',
    },
    api: {
      start: '<!-- AUTO-GENERATED-API-START -->',
      end: '<!-- AUTO-GENERATED-API-END -->',
    },
    components: {
      start: '<!-- AUTO-GENERATED-COMPONENTS-START -->',
      end: '<!-- AUTO-GENERATED-COMPONENTS-END -->',
    },
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function scanDirectory(dirPath, prefix = '', isLast = true) {
  const lines = [];
  const fullPath = path.join(ROOT, dirPath);
  
  if (!fs.existsSync(fullPath)) return lines;
  
  const items = fs.readdirSync(fullPath, { withFileTypes: true })
    .filter(item => {
      if (CONFIG.ignoreDirs.includes(item.name)) return false;
      if (CONFIG.ignoreFiles.includes(item.name)) return false;
      if (item.name.startsWith('.')) return false;
      return true;
    })
    .sort((a, b) => {
      // Folders first, then files
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });
  
  items.forEach((item, index) => {
    const isLastItem = index === items.length - 1;
    const connector = isLastItem ? '└── ' : '├── ';
    const newPrefix = prefix + (isLastItem ? '    ' : '│   ');
    
    if (item.isDirectory()) {
      lines.push(`${prefix}${connector}${item.name}/`);
      const subLines = scanDirectory(path.join(dirPath, item.name), newPrefix, isLastItem);
      lines.push(...subLines);
    } else {
      lines.push(`${prefix}${connector}${item.name}`);
    }
  });
  
  return lines;
}

function generateStructure() {
  const lines = ['```', 'schichtplaner/'];
  
  // Collect all items: configured dirs + root files
  const allItems = [];
  
  // Add configured directories
  for (const dir of CONFIG.includeDirs) {
    if (fs.existsSync(path.join(ROOT, dir))) {
      allItems.push({ name: dir, isDir: true });
    }
  }
  
  // Add root-level config files
  const rootFiles = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(f => f.isFile() && !f.name.startsWith('.'))
    .filter(f => ['.ts', '.js', '.json', '.md'].some(ext => f.name.endsWith(ext)))
    .filter(f => !['package-lock.json'].includes(f.name))
    .map(f => ({ name: f.name, isDir: false }));
  
  allItems.push(...rootFiles);
  
  // Sort: directories first, then files
  allItems.sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });
  
  // Generate tree
  allItems.forEach((item, index) => {
    const isLast = index === allItems.length - 1;
    const connector = isLast ? '└── ' : '├── ';
    
    if (item.isDir) {
      lines.push(`${connector}${item.name}/`);
      const subLines = scanDirectory(item.name, isLast ? '    ' : '│   ', isLast);
      lines.push(...subLines);
    } else {
      lines.push(`${connector}${item.name}`);
    }
  });
  
  lines.push('```');
  return lines.join('\n');
}

function generateApiDocs() {
  const apiDir = path.join(ROOT, 'server/api');
  if (!fs.existsSync(apiDir)) return '*No API endpoints found.*';
  
  const endpoints = [];
  
  function scanApiDir(dir, prefix = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      
      if (item.isDirectory()) {
        scanApiDir(fullPath, `${prefix}/${item.name}`);
      } else if (item.name.endsWith('.ts')) {
        // Extract HTTP method from filename
        const methodMatch = item.name.match(/\.(get|post|patch|put|delete)\.ts$/);
        const method = methodMatch ? methodMatch[1].toUpperCase() : 'GET';
        
        // Build route name
        let routeName = item.name
          .replace(/\.(get|post|patch|put|delete)\.ts$/, '')
          .replace(/\.ts$/, '');
        
        // Handle index files and dynamic routes
        if (routeName === 'index') routeName = '';
        if (routeName.startsWith('[') && routeName.endsWith(']')) {
          routeName = `:${routeName.slice(1, -1)}`;
        }
        
        const route = `${prefix}${routeName ? '/' + routeName : ''}`.replace(/\/+/g, '/') || '/';
        
        // Try to extract description from file (first JSDoc comment)
        const content = fs.readFileSync(fullPath, 'utf-8');
        const descMatch = content.match(/\/\*\*\s*\n?\s*\*?\s*([^*\n]+)/);
        let description = descMatch ? descMatch[1].trim() : '';
        
        // Clean up description
        if (description.startsWith('*')) description = '';
        
        endpoints.push({ method, route: `/api${route}`, description });
      }
    }
  }
  
  scanApiDir(apiDir);
  
  if (endpoints.length === 0) return '*No API endpoints found.*';
  
  // Group by prefix
  const grouped = {};
  for (const ep of endpoints) {
    const parts = ep.route.split('/').filter(Boolean);
    const group = parts[1] || 'root';
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(ep);
  }
  
  const lines = [];
  const groupOrder = ['staff', 'shift', 'shiftplan', 'rotation', 'auth'];
  const sortedGroups = Object.keys(grouped).sort((a, b) => {
    const aIdx = groupOrder.indexOf(a);
    const bIdx = groupOrder.indexOf(b);
    if (aIdx === -1 && bIdx === -1) return a.localeCompare(b);
    if (aIdx === -1) return 1;
    if (bIdx === -1) return -1;
    return aIdx - bIdx;
  });
  
  for (const group of sortedGroups) {
    const eps = grouped[group];
    const groupName = group.charAt(0).toUpperCase() + group.slice(1);
    lines.push(`### ${groupName} API\n`);
    lines.push('| Method | Endpoint | Description |');
    lines.push('|--------|----------|-------------|');
    
    // Sort endpoints
    const sortedEps = eps.sort((a, b) => {
      const methodOrder = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'];
      const aMethod = methodOrder.indexOf(a.method);
      const bMethod = methodOrder.indexOf(b.method);
      if (a.route !== b.route) return a.route.localeCompare(b.route);
      return aMethod - bMethod;
    });
    
    for (const ep of sortedEps) {
      lines.push(`| \`${ep.method}\` | \`${ep.route}\` | ${ep.description} |`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

function generateComponentsList() {
  const compDir = path.join(ROOT, 'components');
  if (!fs.existsSync(compDir)) return '*No components found.*';
  
  const components = fs.readdirSync(compDir)
    .filter(f => f.endsWith('.vue'))
    .sort()
    .map(f => {
      const content = fs.readFileSync(path.join(compDir, f), 'utf-8');
      
      // Try to extract description from JSDoc or first comment
      let description = '';
      const jsdocMatch = content.match(/\/\*\*\s*\n?\s*\*?\s*([^*\n]+)/);
      if (jsdocMatch) {
        description = jsdocMatch[1].trim();
        if (description.startsWith('*')) description = '';
      }
      
      return { name: f.replace('.vue', ''), file: f, description };
    });
  
  if (components.length === 0) return '*No components found.*';
  
  const lines = ['| Component | File | Description |', '|-----------|------|-------------|'];
  for (const comp of components) {
    lines.push(`| \`${comp.name}\` | ${comp.file} | ${comp.description} |`);
  }
  
  return lines.join('\n');
}

function updateReadme() {
  if (!fs.existsSync(CONFIG.readme)) {
    console.error('❌ README.md not found!');
    process.exit(1);
  }
  
  let content = fs.readFileSync(CONFIG.readme, 'utf-8');
  let updated = false;
  
  // Update structure
  if (content.includes(CONFIG.markers.structure.start) && content.includes(CONFIG.markers.structure.end)) {
    const structure = generateStructure();
    const regex = new RegExp(
      `${escapeRegex(CONFIG.markers.structure.start)}[\\s\\S]*?${escapeRegex(CONFIG.markers.structure.end)}`,
      'g'
    );
    content = content.replace(
      regex,
      `${CONFIG.markers.structure.start}\n${structure}\n${CONFIG.markers.structure.end}`
    );
    updated = true;
    console.log('✓ Directory structure updated');
  }
  
  // Update API docs
  if (content.includes(CONFIG.markers.api.start) && content.includes(CONFIG.markers.api.end)) {
    const apiDocs = generateApiDocs();
    const regex = new RegExp(
      `${escapeRegex(CONFIG.markers.api.start)}[\\s\\S]*?${escapeRegex(CONFIG.markers.api.end)}`,
      'g'
    );
    content = content.replace(
      regex,
      `${CONFIG.markers.api.start}\n${apiDocs}\n${CONFIG.markers.api.end}`
    );
    updated = true;
    console.log('✓ API documentation updated');
  }
  
  // Update components
  if (content.includes(CONFIG.markers.components.start) && content.includes(CONFIG.markers.components.end)) {
    const components = generateComponentsList();
    const regex = new RegExp(
      `${escapeRegex(CONFIG.markers.components.start)}[\\s\\S]*?${escapeRegex(CONFIG.markers.components.end)}`,
      'g'
    );
    content = content.replace(
      regex,
      `${CONFIG.markers.components.start}\n${components}\n${CONFIG.markers.components.end}`
    );
    updated = true;
    console.log('✓ Components list updated');
  }
  
  if (updated) {
    fs.writeFileSync(CONFIG.readme, content);
    console.log('\n📝 README.md successfully updated!');
  } else {
    console.log('⚠️  No markers found in README.md.');
  }
}

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ============================================
// MAIN
// ============================================

console.log('🔄 Generating README content...\n');
updateGeneratedReadme();
