import { chromium } from '/tmp/claude-0/-home-user--repos-dore/b91f4671-9421-56f2-ae02-1bfac1204721/scratchpad/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const noms = JSON.parse(fs.readFileSync('liste.json','utf8'));
const b = await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p = await b.newPage({viewport:{width:1600,height:1600},deviceScaleFactor:1});
const errs=[];
p.on('pageerror',e=>errs.push(e.message));
for (const n of noms) {
  await p.goto('file://'+process.cwd()+'/'+n+'.html', {waitUntil:'networkidle'});
  await p.evaluate(()=>document.fonts.ready);
  await p.waitForTimeout(160);
  // contrôle de débordement
  const ov = await p.evaluate(()=>({h:document.body.scrollHeight,w:document.body.scrollWidth}));
  await p.screenshot({path:n+'.png'});
  const ko = ov.h>1602 || ov.w>1602;
  console.log(`${ko?'⚠️':'✓'} ${n.padEnd(24)} ${ov.w}×${ov.h}`);
}
await b.close();
console.log(errs.length?('ERREURS: '+errs.join(' | ')):'aucune erreur JS');
