import * as T from './vendor/three.module.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';

// Original geometry, metres, Y up. One apartment shared by film and tour.
export function createApartment(canvas, { high = false } = {}) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: high });
  renderer.setPixelRatio(high ? 1 : Math.min(devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  const scene = new T.Scene();
  scene.background = new T.Color('#c1c5bc');
  scene.fog = new T.Fog('#c1c5bc', 35, 105);
  const camera = new T.PerspectiveCamera(56, 1, 0.06, 120);
  const textures = [];
  function texture(kind) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const ctx = c.getContext('2d'); let seed = 19;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    ctx.fillStyle = kind === 'wood' ? '#dac5a3' : kind === 'stone' ? '#c8bca7' : '#c8beb0'; ctx.fillRect(0,0,256,256);
    for (let i=0;i<4200;i++) {
      const v = Math.floor(rand()*40+65);
      ctx.strokeStyle = `rgba(${v},${v-12},${v-23},${kind === 'wood' ? .13 : .08})`;
      const x=rand()*256, y=rand()*256;
      ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+(kind === 'wood' ? rand()*100 : rand()*5),y+rand()*3);ctx.stroke();
    }
    if(kind === 'stone') for(let i=0;i<7;i++) { ctx.strokeStyle='rgba(89,75,55,.12)';ctx.beginPath();ctx.moveTo(rand()*256,0);ctx.bezierCurveTo(rand()*256,80,rand()*256,180,rand()*256,256);ctx.stroke(); }
    const tx=new T.CanvasTexture(c); tx.colorSpace=T.SRGBColorSpace; tx.wrapS=tx.wrapT=T.RepeatWrapping; textures.push(tx); return tx;
  }
  const woodTx=texture('wood'), stoneTx=texture('stone'), fabricTx=texture('fabric');
  const mat = (color, roughness=.85, extra={}) => new T.MeshStandardMaterial({ color, roughness, ...extra });
  const plaster=mat('#e1d5bf'), stone=mat('#ded1b9',.72,{map:stoneTx}), oak=mat('#cfb68e',.7,{map:woodTx}), darkOak=mat('#a48764',.7,{map:woodTx});
  const linen=mat('#f1e6d4',.96,{map:fabricTx}), olive=mat('#74735a',.95,{map:fabricTx}), bronze=mat('#755132',.32,{metalness:.7}), black=mat('#292922'), clay=mat('#ab694c'), white=mat('#eae4d5');
  const boxGeo = new T.BoxGeometry(1,1,1);
  const softGeo = new RoundedBoxGeometry(1,1,1,3,.13);
  function box(x,y,z,w,h,d,m,rot=0) { const mesh=new T.Mesh(m===linen||m===olive?softGeo:boxGeo,m);mesh.position.set(x,y,z);mesh.scale.set(w,h,d);mesh.rotation.y=rot;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh; }
  function round(x,y,z,r,h,m,top=r) { const mesh=new T.Mesh(new T.CylinderGeometry(top,r,h,32),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh; }
  function ellipsoid(x,y,z,rx,ry,rz,m) { const mesh=new T.Mesh(new T.SphereGeometry(1,20,12),m);mesh.position.set(x,y,z);mesh.scale.set(rx,ry,rz);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh; }
  function plant(x,z,size=1) {
    round(x,.28*size,z,.28*size,.56*size,stone,.36*size);
    round(x,1.05*size,z,.025*size,1.5*size,darkOak);
    for(let i=0;i<16;i++){const a=i*2.4;const leaf=ellipsoid(x+Math.cos(a)*.32*size,(.9+i*.055)*size,z+Math.sin(a)*.3*size,.32*size,.07*size,.14*size,olive);leaf.rotation.set(.3,a,.35);}
  }
  // 12 x 8 m interior. Open terrace to the south (z=-4 ... -7).
  box(0,-.16,0,12,.3,8,stone);
  for(let i=0;i<32;i++) box(-5.8+i*.37,.006,0,.355,.025,7.9,i%4===0?darkOak:oak);
  box(0,1.6,4,12,3.2,.18,plaster);box(-6,1.6,0,.18,3.2,8,plaster);box(6,1.6,0,.18,3.2,8,plaster);
  box(0,3.25,0,12,.18,8,plaster);
  // Bronze glazing frames; central opening connects the terrace.
  [-6,-3.9,-1.8,1.8,3.9,6].forEach(x=>box(x,1.6,-4,.055,3.2,.08,bronze));
  box(0,3.08,-4,12,.12,.12,bronze);box(0,.08,-4,12,.08,.12,bronze);
  const glass=new T.MeshPhysicalMaterial({color:'#d5e0d5',transparent:true,opacity:.07,roughness:.1,metalness:.1,depthWrite:false});
  [-4.95,-2.85,2.85,4.95].forEach(x=>box(x,1.6,-4,2.04,3.05,.015,glass));
  // Bedroom partition, with a real 1.6 m doorway at z=-2.2.
  box(2,1.6,1.3,.16,3.2,5.4,plaster);box(2,1.6,-3.6,.16,3.2,.8,plaster);box(2,2.9,-2.2,.16,.6,1.6,plaster);
  box(2.01,1.2,1.3,.18,2.4,5.35,darkOak);
  // Limestone fireplace and sculptural abstract artwork on the west wall.
  box(-5.8,.55,.5,.3,1.1,2.8,stone);box(-5.62,.55,.5,.02,.45,1.4,black);
  box(-5.82,2,.3,.08,1.45,2.15,bronze);box(-5.76,2,.3,.07,1.35,2.05,white);
  for(let i=0;i<4;i++){const art=ellipsoid(-5.7,1.7+i*.18,-.1+i*.27,.03,.4,.3,i%2?clay:olive);art.rotation.x=i*.4;}
  // Living room, linen modular sofa and individual cushions.
  box(-2.3,.045,-.5,4.7,.05,3.3,mat('#b0a18c',1,{map:fabricTx}));
  box(-3.1,.3,1.1,3.4,.42,1.05,linen);box(-3.1,.8,1.52,3.55,.8,.3,linen);
  [-4.3,-3.15,-2].forEach(x=>{box(x,.56,1.02,1.07,.2,.85,linen);const p=box(x,.96,1.27,.65,.5,.18,x===-3.15?olive:linen);p.rotation.x=-.17;});
  box(-4.85,.7,1.08,.25,.65,1.1,linen);box(-1.35,.7,1.08,.25,.65,1.1,linen);
  box(-3.45,.35,-1.75,1.1,.5,1.05,olive,.2);box(-3.45,.7,-2.15,1.1,.6,.22,olive,.2);
  round(-1.95,.4,-.6,.72,.15,stone);round(-1.95,.2,-.6,.37,.35,darkOak);
  round(-.98,.27,-1,.4,.1,darkOak);round(-.98,.12,-1,.12,.23,bronze);
  box(-1.9,.5,-.65,.44,.045,.3,black,.15);round(-2.2,.58,-.4,.08,.22,clay,.05);
  // Kitchen / dining occupy the rear, with an unobstructed passage east.
  box(-2, .46,3.55,5.9,.92,.7,darkOak);box(-2,.94,3.55,6,.08,.78,stone);
  for(let i=0;i<8;i++)box(-4.6+i*.72,.5,3.17,.68,.75,.03,oak);
  box(-2,1.42,3.88,6,.8,.04,stone);box(-2,2.35,3.62,6,.85,.6,oak);
  box(-4.2,.99,3.45,.8,.025,.4,black);round(-1.1,1.1,3.5,.15,.22,clay,.09);
  box(-.3,.7,3.92,.025,.45,.2,bronze);
  round(.1,.73,1,.85,.1,stone);round(.1,.36,1,.28,.7,darkOak);
  for(let i=0;i<4;i++){const a=i*Math.PI/2;const x=.1+Math.cos(a)*1.1,z=1+Math.sin(a)*1.1;round(x,.43,z,.31,.12,olive);box(x,.2,z,.045,.4,.045,darkOak);const back=box(x+Math.cos(a)*.22,.75,z+Math.sin(a)*.22,.55,.55,.09,oak,-a+Math.PI/2);back.rotation.y=-a+Math.PI/2;}
  round(.1,.86,1,.16,.15,white,.09);
  // Three bronze pendants with diffused luminous disks.
  const glow=mat('#fff0c4',.7,{emissive:'#ffc879',emissiveIntensity:.8});
  [-3,-1,.3].forEach((x,i)=>{round(x,2.9,2.1,.009,.65,bronze);round(x,2.55-i*.12,2.1,.29,.08,bronze);round(x,2.5-i*.12,2.1,.25,.025,glow);});
  // Bedroom: fluted oak headboard, bed, bedside sconces, stone bench.
  box(4.1,.25,1.2,2.5,.4,2.5,darkOak);box(4.1,.51,1.1,2.4,.23,2.5,linen);
  box(4.1,1.05,2.6,3.65,1.6,.15,oak);
  for(let i=0;i<36;i++)box(2.4+i*.1,1.05,2.49,.035,1.55,.05,darkOak);
  box(4.1,.69,.6,2.43,.11,1.55,linen);box(4.1,.76,-.05,2.45,.05,.55,olive);
  [3.48,4.72].forEach(x=>box(x,.76,1.92,1,.17,.6,white));
  [2.62,5.55].forEach(x=>{round(x,.43,2,.26,.5,stone);round(x,1.55,2.37,.11,.22,glow);});
  box(4.15,.28,-1.2,1.7,.28,.43,stone);plant(5.4,-2.9,.9);
  // Linen curtains: repeated folds, not a flat plane.
  [-5.65,5.65].forEach(x=>{for(let i=0;i<9;i++)round(x+(i-4)*.075,1.62,-3.82,.055,3.05,linen);});
  // Terrace: limestone pavers, built-in seating, olives and open balustrade.
  box(0,-.12,-5.5,12,.22,3,stone);
  for(let x=-6;x<6;x+=1)for(let z=-7;z<-4;z++)box(x+.5,.008,z+.5,.98,.018,.98,stone);
  box(0,1,-7,12,.055,.055,bronze);
  for(let x=-5.8;x<6;x+=.6)box(x,.52,-7,.025,1,.025,bronze);
  box(-4,.35,-5.8,2.4,.5,.8,stone);box(-4,.65,-6.13,2.4,.6,.15,stone);box(-4,.65,-5.8,2.2,.14,.65,linen);
  round(-2.1,.4,-5.7,.4,.08,darkOak);round(-2.1,.2,-5.7,.06,.4,bronze);plant(-5.3,-5.3,1.35);plant(5,-5.8,1.5);plant(-5.2,2.7,1.1);
  // Original stylised skyline, distant enough to read as atmosphere.
  const skyline=mat('#89968d');
  for(let i=0;i<22;i++){const h=1.5+Math.sin(i*7.7)**2*5;box(-30+i*3,-2+h/2,-26-(i%3)*3,2.4,h,3,skyline);}
  box(0,-2.5,-35,140,.15,100,mat('#9eaaa0'));
  scene.add(new T.HemisphereLight('#e3efff','#8f7253',2.3));
  const sun=new T.DirectionalLight('#ffe0ae',4.2);sun.position.set(-4,7,-7);sun.castShadow=true;
  sun.shadow.mapSize.set(high?2048:1024,high?2048:1024);sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=9;sun.shadow.camera.bottom=-9;sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun);
  const fill=new T.PointLight('#ffd6a0',12,14,2);fill.position.set(-1,2.7,2);scene.add(fill);
  const bedroomLight=new T.PointLight('#ffe2bb',9,8,2);bedroomLight.position.set(4,2.7,0);scene.add(bedroomLight);
  const stations=[
    {name:'Salon',en:'Living room',position:[.95,1.65,-2.7],target:[-2.6,1,1.1]},
    {name:'Cuisine & table',en:'Kitchen & dining',position:[1.1,1.7,-.5],target:[-1,1.45,3.5]},
    {name:'Suite',en:'Bedroom',position:[2.8,1.65,-2.8],target:[4.3,.8,1.1]},
    {name:'Terrasse',en:'Terrace',position:[2.8,1.65,-5.3],target:[-3.5,1,-5.65]},
  ];
  const v=a=>new T.Vector3(...a);
  let station=0,yaw=0,pitch=0,night=false;
  function setStation(index){station=Math.max(0,Math.min(3,index));camera.position.copy(v(stations[station].position));yaw=pitch=0;look();}
  function look(){const target=v(stations[station].target);const dir=target.sub(camera.position);dir.applyAxisAngle(new T.Vector3(0,1,0),yaw);dir.y+=pitch;camera.lookAt(camera.position.clone().add(dir));}
  function rotate(dx,dy){yaw-=dx*.004;pitch=T.MathUtils.clamp(pitch+dy*.012,-2.5,2.5);look();}
  function lighting(value){night=value;sun.intensity=night?.35:4.2;renderer.toneMappingExposure=night?.85:1.15;scene.background.set(night?'#34434b':'#c1c5bc');scene.fog.color.copy(scene.background);}
  // Four continuous camera moves with editorial cuts; no travel through walls.
  const shots=[
    [[.9,1.65,-2.85],[-.3,1.55,-2.5],[-2.7,1,1]],
    [[1.1,1.7,-.5],[.95,1.6,-.1],[-1,1.45,3.5]],
    [[2.75,1.65,-2.7],[3.3,1.55,-2.3],[4.15,.8,1.1]],
    [[2.8,1.7,-5.25],[1.6,1.65,-5.1],[-3.5,1,-5.65]],
  ];
  function film(time){const t=Math.min(Math.max(time,0),23.999);const n=Math.floor(t/6);const u=(t%6)/6;const s=shots[n];camera.position.lerpVectors(v(s[0]),v(s[1]),u*u*(3-2*u));camera.lookAt(v(s[2]));camera.fov=54;camera.updateProjectionMatrix();render();}
  function resize(w,h){renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();render();}
  function render(){renderer.render(scene,camera);}
  function dispose(){scene.traverse(o=>{if(o.geometry && o.geometry!==boxGeo)o.geometry.dispose();});boxGeo.dispose();softGeo.dispose();new Set([plaster,stone,oak,darkOak,linen,olive,bronze,black,clay,white,glass,glow,skyline,...scene.children.filter(o=>o.material).map(o=>o.material)]).forEach(m=>m.dispose());textures.forEach(t=>t.dispose());renderer.dispose();renderer.forceContextLoss();}
  setStation(0);
  return {scene,camera,renderer,stations,setStation,rotate,lighting,film,resize,render,dispose,get night(){return night;}};
}
