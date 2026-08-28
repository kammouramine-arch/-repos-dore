import { chromium } from '/tmp/claude-0/-home-user--repos-dore/b91f4671-9421-56f2-ae02-1bfac1204721/scratchpad/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium-1194/chrome-linux/chrome'});
const p=await b.newPage({viewport:{width:1600,height:1600}});
for (const n of JSON.parse(fs.readFileSync('liste.json','utf8'))) {
  await p.goto('file://'+process.cwd()+'/'+n+'.html',{waitUntil:'networkidle'});
  await p.evaluate(()=>document.fonts.ready); await p.waitForTimeout(120);
  const r=await p.evaluate(()=>{
    const pied=document.querySelector('.pied').getBoundingClientRect();
    const corps=document.querySelector('.corps').getBoundingClientRect();
    return {chev: corps.bottom > pied.top + 2, corpsBas:Math.round(corps.bottom), piedHaut:Math.round(pied.top), lignesPied: pied.height>40};
  });
  console.log(`${r.chev?'⚠️ CHEVAUCHE':'✓          '} ${n.padEnd(24)} corps↓${r.corpsBas} pied↑${r.piedHaut}${r.lignesPied?'  (pied sur 2 lignes)':''}`);
}
await b.close();
