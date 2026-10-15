import {createApartment} from './apartment.js';
const q=new URLSearchParams(location.search), en=q.get('lang')==='en', capture=q.has('render');
if(capture)document.body.classList.add('render');
if(en){document.documentElement.lang='en';document.querySelector('#hint').textContent='Drag to look · 1–4 to change rooms';document.querySelector('#full').setAttribute('aria-label','Fullscreen');document.querySelector('canvas').setAttribute('aria-label','3D apartment. Drag or use left and right arrows to look. Keys 1 to 4 change rooms.');}
try {
 const canvas=document.querySelector('canvas');const app=createApartment(canvas,{high:capture});window.amynScene=app;
 let index=0,visible=true;
 const draw=()=>{if(visible&&!document.hidden)app.render();};
 const select=i=>{index=i;app.setStation(i);document.querySelector('#room').textContent=en?app.stations[i].en:app.stations[i].name;document.querySelector('#count').textContent=`0${i+1} / 04`;document.querySelectorAll('#rooms button').forEach((b,n)=>b.setAttribute('aria-pressed',String(i===n)));const pts=[[46,55],[28,22],[80,50],[55,86]];const dot=document.querySelector('#dot');dot.style.left=pts[i][0]+'%';dot.style.top=pts[i][1]+'%';draw();};
 app.stations.forEach((s,i)=>{const b=document.createElement('button');b.textContent=`0${i+1} ${en?s.en:s.name}`;b.onclick=()=>select(i);document.querySelector('#rooms').append(b);});
 let last=null;
 canvas.addEventListener('pointerdown',e=>{last={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!last)return;app.rotate(e.clientX-last.x,e.clientY-last.y);last={x:e.clientX,y:e.clientY};draw();});
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>last=null);
 canvas.addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','1','2','3','4','Home'].includes(e.key)){e.preventDefault();if(/[1-4]/.test(e.key))select(Number(e.key)-1);else if(e.key==='Home')select(index);else{app.rotate(e.key==='ArrowLeft'?-35:e.key==='ArrowRight'?35:0,e.key==='ArrowUp'?-20:e.key==='ArrowDown'?20:0);draw();}}});
 const light=document.querySelector('#light');const lightLabel=()=>light.textContent=en?(app.night?'Daylight':'Evening light'):(app.night?'Lumière du jour':'Ambiance du soir');lightLabel();light.onclick=()=>{app.lighting(!app.night);light.setAttribute('aria-pressed',String(app.night));lightLabel();draw();};
 document.querySelector('#full').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{document.querySelector('#hint').textContent=en?'Fullscreen unavailable in this browser.':'Plein écran indisponible dans ce navigateur.';}};
 const resize=()=>app.resize(innerWidth,innerHeight);addEventListener('resize',resize);document.addEventListener('visibilitychange',draw);
 const observer=new IntersectionObserver(es=>{visible=es[0].isIntersecting;draw();});observer.observe(canvas);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();document.body.classList.remove('ready');document.querySelector('#error').textContent=en?'3D interrupted. Reload the tour or watch the film.':'3D interrompue. Rechargez la visite ou regardez le film.';});
 addEventListener('pagehide',()=>{observer.disconnect();app.dispose();},{once:true});
 select(0);resize();document.body.classList.add('ready');
}catch(e){console.error(e);document.querySelector('#error').textContent=en?'3D is unavailable on this device. Watch the film or view the images on the AMYN 3D page.':'La 3D est indisponible sur cet appareil. Retrouvez le film et les images sur la page AMYN 3D.';}
