// Configuration Metro : dépôt multi-paquets (mobile + packages/shared).
const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Metro doit surveiller le paquet partagé, situé hors du dossier mobile.
config.watchFolders = [path.resolve(workspaceRoot, 'packages/shared')];

// Les dépendances du mobile sont installées localement ; la recherche
// hiérarchique reste active pour les modules imbriqués (expo-modules-core…).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

config.resolver.extraNodeModules = {
  '@devisia/shared': path.resolve(workspaceRoot, 'packages/shared/src'),
};

module.exports = config;
