import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'docs/acquisition/evidence');
fs.mkdirSync(out, { recursive: true });
const dependencies = [];
for (const base of ['', 'mobile']) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, base, 'package-lock.json'), 'utf8'));
  for (const [location, item] of Object.entries(lock.packages ?? {})) {
    if (!location.includes('node_modules/') || item.link) continue;
    let installed = {};
    try { installed = JSON.parse(fs.readFileSync(path.join(root, base, location, 'package.json'), 'utf8')); } catch {}
    dependencies.push({ workspace: base || 'web', package: installed.name ?? location.split('node_modules/').at(-1), version: item.version ?? 'UNKNOWN', license: installed.license ?? item.license ?? 'UNKNOWN', developmentOnly: Boolean(item.dev), location });
  }
}
const env = new Map();
const files = [];
function scan(dir) {
  for (const entry of fs.readdirSync(path.join(root, dir), {withFileTypes:true})) {
    if (['node_modules','.git','.next','.expo','output','archive'].includes(entry.name) || entry.name.startsWith('.env')) continue;
    const rel = path.join(dir, entry.name);
    if (entry.isDirectory()) scan(rel);
    else if (/\.(tsx?|mjs|json)$/.test(entry.name) && !entry.name.includes('lock')) {
      files.push(rel.replaceAll('\\','/'));
      const content = fs.readFileSync(path.join(root, rel),'utf8');
      for (const match of content.matchAll(/(?:process\.env\.|\b)([A-Z][A-Z0-9_]{2,})(?=\s*:\s*z\.|(?<=process\.env\.[A-Z0-9_]+))/g)) {
        const name = match[1];
        const refs = env.get(name) ?? new Set(); refs.add(rel.replaceAll('\\','/')); env.set(name, refs);
      }
      // Direct process.env accesses outside the central schema.
      for (const match of content.matchAll(/process\.env\.([A-Z][A-Z0-9_]+)/g)) {
        const refs = env.get(match[1]) ?? new Set(); refs.add(rel.replaceAll('\\','/')); env.set(match[1],refs);
      }
    }
  }
}
for (const dir of ['src','mobile/app','mobile/src','packages','scripts','prisma']) scan(dir);
fs.writeFileSync(path.join(out,'dependencies.json'),JSON.stringify(dependencies,null,2)+'\n');
fs.writeFileSync(path.join(out,'environment-names.json'),JSON.stringify([...env].sort(([a],[b])=>a.localeCompare(b)).map(([name,refs])=>({name,sourceFiles:[...refs]})),null,2)+'\n');
fs.writeFileSync(path.join(out,'source-files.json'),JSON.stringify(files.sort(),null,2)+'\n');
const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
const assets = tracked.filter(file => /\.(png|jpe?g|svg|webp|gif|ico|woff2?|ttf|otf|mp3|mp4|mov)$/i.test(file)).map(file => ({
  path: file,
  sha256: createHash('sha256').update(fs.readFileSync(path.join(root, file))).digest('hex'),
  bytes: fs.statSync(path.join(root, file)).size,
  proposedInclusion: file.startsWith('archive/') ? 'EXCLUDED_UNLESS_OWNER_CONFIRMS' : 'SUBJECT_TO_PROVENANCE_PROOF',
  creatorAndLicense: 'UNVERIFIED',
}));
fs.writeFileSync(path.join(out, 'visual-assets.json'), JSON.stringify(assets, null, 2)+'\n');
const authors = new Map();
for (const name of execFileSync('git', ['log', '--all', '--format=%an'], { cwd: root, encoding: 'utf8' }).trim().split('\n').filter(Boolean)) authors.set(name, (authors.get(name) ?? 0) + 1);
fs.writeFileSync(path.join(out, 'contributor-records.json'), JSON.stringify({ caveat: 'Git authorship records are not assignments, employment clearance or proof of ownership. Email addresses intentionally excluded.', authors: [...authors].map(([name, commits]) => ({ name, commits, assignmentEvidence: 'OWNER_TO_SUPPLY' })) }, null, 2)+'\n');
console.log(JSON.stringify({packages:dependencies.length,unknownLicenses:dependencies.filter(d=>d.license==='UNKNOWN').length,environmentNames:env.size,sourceFiles:files.length}));
