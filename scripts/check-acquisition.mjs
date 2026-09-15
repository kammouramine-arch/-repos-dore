import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve('docs/acquisition');
const errors = [];
function inspect(dir) {
  for (const entry of fs.readdirSync(dir, {withFileTypes:true})) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) { inspect(file); continue; }
    const text = fs.readFileSync(file,'utf8');
    // Heuristics deliberately report filenames only, never matching values.
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----|\b(?:sk_live_|sk_test_|AIza)[A-Za-z0-9_-]{16,}|postgres(?:ql)?:\/\/[^\s/]+:[^\s@]+@/.test(text)) errors.push(`Possible credential in ${path.relative(root,file)}`);
    if (file.endsWith('.md')) for (const [,link] of text.matchAll(/\]\(([^)]+)\)/g)) {
      if (!/^(https?:|mailto:|#)/.test(link) && !fs.existsSync(path.resolve(path.dirname(file),link.split('#')[0]))) errors.push(`Broken link in ${path.relative(root,file)}`);
    }
  }
}
inspect(root);
console.log(JSON.stringify({checked:'acquisition documents only',findings:errors}));
if (errors.length) process.exitCode=1;
