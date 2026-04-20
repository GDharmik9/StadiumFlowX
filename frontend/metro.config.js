// frontend/metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// 1. Resolve paths
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../'); // The actual Monorepo root

// 2. Wrap default config
const config = getDefaultConfig(projectRoot);

// 3. Force Metro to watch the entire workspace root (where the hoisted node_modules is)
config.watchFolders = [workspaceRoot];

// 4. Force Metro to resolve paths by searching from project root first, then workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 5. Allow Metro to perform its native hierarchical resolution to fix expo plugins
config.resolver.disableHierarchicalLookup = false;

module.exports = config;
