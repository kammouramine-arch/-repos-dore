import { readFile, writeFile } from 'node:fs/promises';

// Expo 57 foreground options do not expose automotive activity or auto-pause.
// Apply this narrow, reproducible patch only to BestForNavigation managers.
const packageUrl = new URL('../node_modules/expo-location/package.json', import.meta.url);
const packageInfo = JSON.parse(await readFile(packageUrl, 'utf8'));
if (packageInfo.version !== '57.0.21') throw Error('Review the foreground navigation patch before upgrading expo-location.');
const file = new URL('../node_modules/expo-location/ios/Providers/BaseLocationProvider.swift', import.meta.url);
const source = await readFile(file, 'utf8');
const marker = '// Avyro foreground automotive positioning';
if (!source.includes(marker)) {
  const anchor = '    manager.desiredAccuracy = options.accuracy.toCLLocationAccuracy()';
  if (!source.includes(anchor)) throw Error('The foreground location source changed; review the navigation patch.');
  const patch = `${anchor}\n    ${marker}\n    if manager.desiredAccuracy == kCLLocationAccuracyBestForNavigation {\n      manager.activityType = .automotiveNavigation\n      manager.pausesLocationUpdatesAutomatically = false\n    }`;
  await writeFile(file, source.replace(anchor, patch));
}
