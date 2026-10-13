import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Hashes from upstream's versioned Swift manifests. Never run downloaded code.
const root = fileURLToPath(new URL('../modules/avyro-wake/ios/vendor/', import.meta.url));
const artifacts = [
  ['SherpaOnnxC.xcframework', 'https://github.com/k2-fsa/sherpa-onnx/releases/download/xcframework/sherpa-onnx-v1.13.8-ios-static.xcframework.zip', '6b8e769cb153343270fdccbe92e3b3db0d1c421d67fa0989ab01fdf5b2fcf2de'],
  ['onnxruntime.xcframework', 'https://github.com/csukuangfj/onnxruntime-libs/releases/download/v1.28.2/onnxruntime-ios-static-xcframework-1.28.2.xcframework.zip', '2c2299acbb461d26d4bac4bc85985d40e7c7177ed6072703ae0846d88b0b4599'],
];
if (process.platform !== 'darwin') process.exit(0);
await mkdir(root, { recursive: true });
for (const [name, url, expected] of artifacts) {
  if (existsSync(path.join(root, name))) continue;
  const archive = path.join(root, `${name}.zip`);
  if (!existsSync(archive)) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Native dependency download failed: ${response.status}`);
    await writeFile(archive, Buffer.from(await response.arrayBuffer()));
  }
  const actual = createHash('sha256').update(await readFile(archive)).digest('hex');
  if (actual !== expected) throw new Error(`Integrity check failed for ${name}`);
  execFileSync('unzip', ['-oq', archive, '-d', root]);
  if (name === 'SherpaOnnxC.xcframework') {
    await rename(path.join(root, 'sherpa-onnx.xcframework'), path.join(root, name));
  }
  if (!existsSync(path.join(root, name))) throw new Error(`Missing extracted framework: ${name}`);
}
