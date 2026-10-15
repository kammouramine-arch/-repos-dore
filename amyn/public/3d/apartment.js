import * as T from './vendor/three.module.js';
import {RoundedBoxGeometry} from './vendor/RoundedBoxGeometry.js';
import {EffectComposer} from './vendor/addons/postprocessing/EffectComposer.js';
import {RenderPass} from './vendor/addons/postprocessing/RenderPass.js';
import {GTAOPass} from './vendor/addons/postprocessing/GTAOPass.js';
import {OutputPass} from './vendor/addons/postprocessing/OutputPass.js';
import {RoomEnvironment} from './vendor/addons/environments/RoomEnvironment.js';

// Atelier Lumière II — original, fictional interior, all dimensions in metres.
// Original geometry, seeded fabrics and locally hosted CC0 wood/stone maps. See ASSET-LICENSES.txt.
export async function createApartment(canvas, {high=false}={}) {
 const renderer=new T.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:high});
 renderer.setPixelRatio(high?1:Math.min(devicePixelRatio,1.25));
 renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 const scene=new T.Scene();scene.background=new T.Color('#c7d2d4');scene.fog=new T.Fog('#c7d2d4',24,95);
 const camera=new T.PerspectiveCamera(51,1,.08,160);
 const envRoom=new RoomEnvironment(),pmrem=new T.PMREMGenerator(renderer),env=pmrem.fromScene(envRoom,.06);
 scene.environment=env.texture;scene.environmentIntensity=.32;envRoom.dispose();pmrem.dispose();
 let seed=73;const rand=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 const textures=[],materials=new Set(),geometries=new Set();
 function map(kind){
  const c=document.createElement('canvas');c.width=c.height=512;const ctx=c.getContext('2d');
  const im=ctx.createImageData(512,512);
  for(let y=0;y<512;y++)for(let x=0;x<512;x++){
   const n=rand();let v;
   if(kind==='wood')v=195+2*Math.sin(x*1.6+Math.sin(y*.005)*2)+2*Math.sin(x*.53+Math.sin(y*.017))+5*(n-.5);
   else if(kind==='stone')v=225+2*Math.sin(y*.8+Math.sin(x*.018)*2)+2*Math.sin(y*.31)+8*(n-.5);
   else if(kind==='cloth')v=215+12*(n-.5)+7*(x%3===0?-1:1)+5*(y%3===0?-1:1);
   else v=230+10*(n-.5);
   const i=(y*512+x)*4;im.data[i]=v;im.data[i+1]=v;im.data[i+2]=v;im.data[i+3]=255;
  }ctx.putImageData(im,0,0);
  if(kind==='stone'){for(let i=0;i<950;i++){ctx.fillStyle=`rgba(70,55,35,${rand()*.10})`;ctx.fillRect(rand()*512,rand()*512,rand()*6+.5,rand()*1.7+.3);}}
  const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(t);return t;
 }
 const loader=new T.TextureLoader();
 async function localMap(name,color=false){const t=await loader.loadAsync(new URL('./textures/'+name,import.meta.url).href);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());if(color)t.colorSpace=T.SRGBColorSpace;textures.push(t);return t;}
 const [woodMap,woodNormal,woodRough]=await Promise.all([localMap('wood-Diffuse.webp',true),localMap('wood-nor_gl.webp'),localMap('wood-rough.webp')]);
 const stoneMap=map('stone'),clothMap=map('cloth'),plasterMap=map('plaster');clothMap.repeat.set(5,5);
 const material=(color,roughness=.8,extra={})=>{const m=new T.MeshStandardMaterial({color,roughness,...extra});materials.add(m);return m;};
 const plaster=material('#e4dfd4',.98,{bumpMap:plasterMap,bumpScale:.001});
 const stone=material('#d7c8af',.62,{map:stoneMap,bumpMap:stoneMap,bumpScale:.001});
 const walnut=material('#94765c',.75,{map:woodMap,normalMap:woodNormal,normalScale:new T.Vector2(.18,.18),roughnessMap:woodRough});
 const oak=material('#f4dfbc',.85,{map:woodMap,normalMap:woodNormal,normalScale:new T.Vector2(.18,.18),roughnessMap:woodRough});

 const linen=material('#eee7dc',.97,{map:clothMap,bumpMap:clothMap,bumpScale:.001});
 const taupe=material('#a99b86',.99,{map:clothMap,bumpMap:clothMap,bumpScale:.001});
 const chocolate=material('#5c4c3f',.9,{map:clothMap,bumpMap:clothMap,bumpScale:.001});
 const brass=material('#8d7956',.3,{metalness:.85});const charcoal=material('#272a27',.6);const ceramic=material('#e8e0cd',.32);const paper=material('#e3ded2');
 const glow=material('#fff1d3',.5,{emissive:'#ffdc9e',emissiveIntensity:2});
 const mesh=(g,m,x,y,z)=>{geometries.add(g);const o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=o.receiveShadow=true;scene.add(o);return o;};
 const cube=new T.BoxGeometry(1,1,1);geometries.add(cube);
 function box(x,y,z,w,h,d,m,r=0){const o=mesh(cube,m,x,y,z);o.scale.set(w,h,d);o.rotation.y=r;return o;}
 function soft(x,y,z,w,h,d,m,radius=.08,rot=0){const o=mesh(new RoundedBoxGeometry(w,h,d,4,Math.min(radius,w/2,h/2,d/2)),m,x,y,z);o.rotation.y=rot;return o;}
 function cyl(x,y,z,r,h,m,top=r){return mesh(new T.CylinderGeometry(top,r,h,48),m,x,y,z);}
 function orb(x,y,z,a,b,c,m){const o=mesh(new T.SphereGeometry(1,24,16),m,x,y,z);o.scale.set(a,b,c);return o;}
 function line(points,r,m){return mesh(new T.TubeGeometry(new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p))),32,r,8,false),m,0,0,0);}
 function vase(x,y,z,s=1,m=ceramic){const p=[[0,0],[.10,0],[.14,.04],[.18,.19],[.14,.32],[.065,.39],[.065,.45]].map(([a,b])=>new T.Vector2(a*s,b*s));return mesh(new T.LatheGeometry(p,48),m,x,y,z);}
 function book(x,y,z,w=.35,d=.24,rot=0){box(x,y,z,w,.035,d,paper,rot);box(x,y+.023,z,w+.012,.008,d+.012,walnut,rot);box(x,y-.023,z,w+.012,.008,d+.012,walnut,rot);}
 // Architecture: shadow gaps, deep reveals, uninterrupted sight lines.
 box(0,-.15,0,12,.3,8,stone);box(0,3.27,0,12,.18,8,plaster);
 box(0,1.6,4,12,3.2,.18,plaster);box(-6,1.6,0,.18,3.2,8,plaster);box(6,1.6,0,.18,3.2,8,plaster);
 for(let x=-5.85;x<6;x+=.30)for(let j=0;j<4;j++){
  const z=-3+j*2;const m=oak.clone();m.color.offsetHSL(0,0,(rand()-.5)*.07);materials.add(m);box(x,.005,z,.294,.025,1.994,m);
 }
 box(0,.055,3.89,11.8,.07,.025,charcoal);box(-5.89,.055,0,.025,.07,7.8,charcoal);
 box(0,3.13,3.85,11.8,.025,.12,glow);box(-5.85,3.13,0,.12,.025,7.7,glow);
 // Full-height walnut partition and spacious suite portal.
 box(2,1.6,1.3,.16,3.2,5.4,walnut);box(2,1.6,-3.6,.16,3.2,.8,walnut);box(2,3,-2.2,.16,.4,1.6,walnut);
 for(let z=-1.3;z<4;z+=.6)box(1.907,1.6,z,.012,3.1,.012,charcoal);
 // Slender bronze glazing; generous open terrace doorway.
 [-6,-3.9,-1.8,1.8,3.9,6].forEach(x=>box(x,1.6,-4,.045,3.2,.07,brass));box(0,3.15,-4,12,.055,.09,brass);box(0,.035,-4,12,.035,.09,brass);
 const glass=material('#dce6e5',.13,{transparent:true,opacity:.035,metalness:.2,depthWrite:false});[-4.95,-2.85,2.85,4.95].forEach(x=>{const g=box(x,1.6,-4,2.04,3.08,.008,glass);g.castShadow=false;});
 // Travertine hearth and a plaster relief, instead of a flat cartoon painting.
 box(-5.82,.24,.45,.3,.38,3.4,stone);box(-5.85,1.65,.45,.22,2.6,3.4,stone);
 box(-5.72,.55,.45,.02,.40,2.5,charcoal);box(-5.64,.30,.45,.36,.055,3.6,stone);
 for(let i=0;i<7;i++)box(-5.68,.48,-.5+i*.3,.12,.07,.22,walnut,.1*i);
 const art=material('#d3c7b2',.97,{bumpMap:plasterMap,bumpScale:.014});
 box(-5.69,2.12,.45,.035,1.15,2.35,art);
 for(let i=0;i<5;i++){const arc=mesh(new T.TorusGeometry(.40+i*.075,.018,8,70,Math.PI*1.45),plaster,-5.66,2.0,.2);arc.rotation.set(0,Math.PI/2,.3);}
 // Low, tailored sectional: curved corners, separate upholstery and piping.
 soft(-3.2,.21,1.1,3.45,.28,1.18,chocolate,.12);
 soft(-3.2,.44,1.05,3.55,.34,1.2,linen,.14);
 soft(-3.2,.78,1.55,3.55,.65,.31,linen,.15);
 [-4.37,-3.2,-2.03].forEach(x=>{
  soft(x,.615,.97,1.13,.20,.97,linen,.09);
  const pillow=soft(x,.93,1.31,.70,.49,.19,taupe,.09);pillow.rotation.x=-.20;pillow.rotation.z=(rand()-.5)*.15;
  // A fine stitched welt around the seat perimeter.
  line([[x-.45,.65,.49],[x+.45,.65,.49]],.002,linen);
 });
 soft(-4.93,.68,1.1,.26,.58,1.18,linen,.12);soft(-1.47,.68,1.1,.26,.58,1.18,linen,.12);
 // Woven rug with bound edge.
 soft(-2.6,.027,-.55,4.65,.035,3.25,taupe,.017);box(-2.6,.048,-.55,4.50,.008,3.10,linen);
 // Nesting monolithic tables, art books and hand-thrown ceramics.
 cyl(-2.25,.22,-.55,.46,.42,stone);cyl(-2.25,.45,-.55,.83,.075,stone);
 cyl(-1.22,.18,-1.2,.26,.32,walnut);cyl(-1.22,.35,-1.2,.46,.045,walnut);
 book(-2.12,.52,-.65,.43,.29,.18);book(-2.09,.58,-.63,.36,.26,-.05);vase(-2.65,.49,-.33,.6);
 const bowl=mesh(new T.SphereGeometry(.18,40,16,0,Math.PI*2,0,Math.PI/2),brass,-1.22,.43,-1.2);bowl.rotation.x=Math.PI;
 // Sculpted lounge chair with an enveloping back and cylindrical legs.
 soft(-3.65,.44,-2.15,1.05,.24,.95,taupe,.12,-.2);
 const chairPoints=[];for(let i=0;i<=24;i++){const a=Math.PI*.05+i/24*Math.PI*.9;chairPoints.push([-3.65+Math.cos(a)*.43,.76,-2.15-Math.sin(a)*.40]);}line(chairPoints,.12,taupe);orb(-3.22,.76,-2.21,.12,.12,.12,taupe);orb(-4.08,.76,-2.21,.12,.12,.12,taupe);
 for(const dx of [-.36,.36])for(const dz of [-.3,.3])cyl(-3.65+dx,.18,-2.15+dz,.025,.34,walnut);
 // Kitchen: framed walnut fronts, stone backsplash, integrated appliances.
 box(-2.3,.45,3.52,5.7,.9,.76,walnut);box(-2.3,.93,3.5,5.82,.08,.87,stone);
 for(let i=0;i<7;i++){const x=-4.76+i*.78;box(x,.48,3.125,.765,.80,.035,walnut);box(x,.84,3.10,.36,.012,.016,brass);}
 box(-2.3,1.46,3.885,5.85,.95,.04,stone);
 box(-2.3,2.40,3.63,5.85,.78,.55,walnut);
 for(let i=0;i<8;i++)box(-5.12+i*.78,2.4,3.345,.012,.75,.014,charcoal);
 box(-2.3,1.995,3.40,5.7,.016,.045,glow);
 box(-4.25,.98,3.4,.78,.018,.43,charcoal);for(let i=0;i<4;i++){const ring=mesh(new T.TorusGeometry(.10,.002,6,32),brass,-4.45+(i%2)*.37,.993,3.29+Math.floor(i/2)*.22);ring.rotation.x=Math.PI/2;}
 box(-1.15,.982,3.43,.62,.018,.40,charcoal);line([[-.8,.98,3.69],[-.8,1.30,3.69],[-.8,1.37,3.5],[-.8,1.25,3.43]],.018,brass);
 vase(-2.4,.98,3.65,.6);book(-3.2,1.01,3.5,.34,.22,.1);
 // Oval dining table and genuinely curved upholstered dining chairs.
 const table=cyl(.2,.76,1.15,.86,.07,stone);table.scale.z=1.28;cyl(.2,.37,1.15,.28,.72,walnut);
 for(let i=0;i<4;i++){
  const a=i*Math.PI/2,x=.2+Math.cos(a)*1.10,z=1.15+Math.sin(a)*1.32;
  const seat=cyl(x,.46,z,.31,.11,chocolate);seat.scale.z=.94;
  const back=mesh(new T.CylinderGeometry(.34,.34,.40,32,1,true,Math.PI*.12,Math.PI*.76),chocolate,x,.70,z);back.rotation.y=-a-Math.PI/2;back.material.side=T.DoubleSide;
  for(let dx of [-.2,.2])for(let dz of [-.19,.19])cyl(x+dx,.23,z+dz,.016,.43,walnut);
 }
 vase(.2,.81,1.15,.55);line([[.2,1.0,1.15],[.22,1.25,1.13],[.36,1.5,1.1]],.005,walnut);
 // Layered alabaster pendant and illuminated rim.
 cyl(.2,2.87,1.15,.008,.65,brass);const shade=orb(.2,2.48,1.15,.54,.12,.43,ceramic);shade.castShadow=false;cyl(.2,2.39,1.15,.34,.012,glow);
 // Suite: full-width upholstered headboard and draped bedding geometry.
 box(4.08,1.45,2.96,3.65,2.9,.18,walnut);
 for(let i=0;i<47;i++){const slat=box(2.3+i*.077,1.45,2.83,.032,2.85,.06,walnut);slat.castShadow=false;}
 soft(4.1,.96,2.53,2.72,1.10,.22,taupe,.11);soft(4.1,.25,1.13,2.47,.40,2.65,walnut,.08);soft(4.1,.50,1.13,2.43,.22,2.60,linen,.10);
 const duvetGeo=new T.PlaneGeometry(2.52,2.28,64,64);const pos=duvetGeo.attributes.position;
 for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getY(i);const edge=Math.max(0,(Math.abs(x)-1.08)/.18);pos.setZ(i,.018*Math.sin(z*19+x*5)+.01*Math.sin(x*25+z*7)-edge*.19);}
 duvetGeo.computeVertexNormals();const duvet=mesh(duvetGeo,linen,4.1,.67,.85);duvet.rotation.x=-Math.PI/2;
 [3.49,4.72].forEach(x=>{const p=soft(x,.78,2.01,1.06,.22,.64,linen,.10);p.rotation.x=.13;const q=soft(x,.90,2.32,.96,.4,.19,taupe,.08);q.rotation.x=-.18;});
 // Folded textured throw with small irregular folds.
 const throwGeo=new T.PlaneGeometry(2.68,.70,80,24),tp=throwGeo.attributes.position;for(let i=0;i<tp.count;i++){const x=tp.getX(i),z=tp.getY(i);tp.setZ(i,.016*Math.sin(x*26+z*4)+.008*Math.cos(z*15+x*10)-Math.pow(Math.max(0,Math.abs(x)-1.10),.8)*1.1);}throwGeo.computeVertexNormals();const throwMesh=mesh(throwGeo,chocolate,4.1,.72,-.04);throwMesh.rotation.x=-Math.PI/2;throwMesh.material.side=T.DoubleSide;
 [2.58,5.60].forEach(x=>{cyl(x,.40,2.18,.29,.55,stone);cyl(x,1.98,2.2,.006,1.9,brass);orb(x,1.03,2.2,.10,.14,.10,glow);});
 book(2.58,.71,2.18,.28,.20,.2);
 soft(4.1,.39,-1.3,1.85,.21,.47,taupe,.10);[-.65,.65].forEach(dx=>box(4.1+dx,.18,-1.3,.09,.30,.35,walnut));
 soft(4.1,.025,.5,3.5,.03,4.2,taupe,.014);
 // Continuous folded curtains; a thin woven surface, not a row of cylinders.
 function curtain(cx,width){const g=new T.PlaneGeometry(width,3.05,96,12),p=g.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i);p.setZ(i,Math.sin(x*35)*.065);p.setY(i,p.getY(i)+.012*Math.cos(x*35));}g.computeVertexNormals();const m=linen.clone();m.side=T.DoubleSide;materials.add(m);mesh(g,m,cx,1.60,-3.87);}
 curtain(-5.55,.8);curtain(5.55,.8);
 // Olive trees: branched trunks, individual thin lanceolate leaves.
 const leafM=material('#69705a',.85,{side:T.DoubleSide});
 const leafGeo=new T.SphereGeometry(1,8,4),leaves=[];function plant(x,z,s=1){cyl(x,.25*s,z,.28*s,.50*s,stone,.34*s);line([[x,.3*s,z],[x+.05*s,1.2*s,z],[x-.04*s,2.1*s,z]],.026*s,walnut);
  for(let b=0;b<9;b++){const a=b*2.4,y=(.85+b*.12)*s,dx=Math.cos(a)*.43*s,dz=Math.sin(a)*.43*s;line([[x,y,z],[x+dx*.6,y+.28*s,z+dz*.6],[x+dx,y+.44*s,z+dz]],.009*s,walnut);
   for(let j=0;j<42;j++){const k=j/42,lx=x+dx*k+(rand()-.5)*.38*s,lz=z+dz*k+(rand()-.5)*.38*s;const l=mesh(leafGeo,leafM,lx,y+k*.44*s+(rand()-.5)*.18*s,lz);l.scale.set(.075*s,.004*s,.024*s);l.rotation.set(rand(),a+j,rand());l.updateMatrix();leaves.push(l.matrix.clone());scene.remove(l);}
  }
 }
 plant(-5.3,-2.7,1);plant(5.4,-2.7,.95);
 // Terrace: large limestone slabs, airy railing, cushions, sculptural table.
 box(0,-.13,-5.5,12,.24,3,stone);for(let x=-5.5;x<6;x++)for(let z=-6.5;z<-4;z++)box(x,.002,z,.994,.025,.994,stone);
 box(0,1,-7,12,.035,.035,brass);for(let x=-5.8;x<6;x+=.6)box(x,.5,-7,.017,1,.017,brass);
 soft(-3.8,.25,-5.95,2.8,.4,.92,stone,.04);soft(-3.8,.70,-6.32,2.8,.65,.15,stone,.04);
 [-4.7,-3.8,-2.9].forEach(x=>{soft(x,.51,-5.96,.86,.15,.76,linen,.06);const p=soft(x,.76,-6.19,.62,.44,.17,taupe,.06);p.rotation.x=-.12;});
 cyl(-1.65,.24,-5.78,.28,.45,stone);cyl(-1.65,.49,-5.78,.49,.06,stone);vase(-1.65,.53,-5.78,.5);plant(-5.3,-5.4,1.3);plant(5.1,-5.9,1.25);
 const foliage=new T.InstancedMesh(leafGeo,leafM,leaves.length);leaves.forEach((m,i)=>foliage.setMatrixAt(i,m));foliage.castShadow=foliage.receiveShadow=true;scene.add(foliage);
 // Soft, original coastal landscape. No floating city blocks or stock backdrop.
 const water=material('#9caeaa',.30,{metalness:.15});box(0,-2.7,-50,200,.1,130,water);
 const land=material('#b4b5a6',1);for(let i=0;i<10;i++){const hill=orb(-50+i*13,-3,-55-i%3*9,15,3+rand()*5,9,land);hill.castShadow=false;}
 const hemi=new T.HemisphereLight('#edf2f6','#aa9b86',.65);scene.add(hemi);
 const sun=new T.DirectionalLight('#fff0d8',3.3);sun.position.set(-7,5,-9);sun.castShadow=true;sun.shadow.mapSize.set(high?4096:2048,high?4096:2048);Object.assign(sun.shadow.camera,{left:-11,right:11,top:10,bottom:-10,near:.5,far:35});sun.shadow.normalBias=.04;sun.shadow.bias=-.0003;scene.add(sun);
 // Broad window light simulates bounced daylight; small practicals stay warm.
 const bounce=new T.DirectionalLight('#e7edf5',.8);bounce.position.set(1,2,-5);scene.add(bounce);
 const practicals=[];for(const [x,z,power] of [[-3,2.7,5],[.2,1.15,4],[4,1.8,4]]){const l=new T.PointLight('#ffd6a1',power,8,2);l.position.set(x,2.7,z);scene.add(l);practicals.push(l);}
 const composer=new EffectComposer(renderer);composer.addPass(new RenderPass(scene,camera));
 const ao=new GTAOPass(scene,camera,512,512);ao.blendIntensity=.85;ao.updateGtaoMaterial({radius:.35,distanceExponent:1.5,thickness:.7,scale:1,samples:high?32:16});ao.updatePdMaterial({samples:high?32:16,radius:16});composer.addPass(ao);composer.addPass(new OutputPass());
 const stations=[
  {name:'Salon',en:'Living room',position:[.8,1.55,-2.9],target:[-3.1,1.05,.8]},
  {name:'Cuisine & table',en:'Kitchen & dining',position:[.9,1.6,-1.15],target:[-1.5,1.4,3.2]},
  {name:'Suite',en:'Bedroom',position:[2.85,1.5,-2.85],target:[4.2,1.0,1.45]},
  {name:'Terrasse',en:'Terrace',position:[2.1,1.5,-4.95],target:[-3.6,1,-5.9]}
 ];
 const v=a=>new T.Vector3(...a);let station=0,yaw=0,pitch=0,night=false;
 function look(){const d=v(stations[station].target).sub(camera.position);d.applyAxisAngle(new T.Vector3(0,1,0),yaw);d.y+=pitch;camera.lookAt(camera.position.clone().add(d));}
 function setStation(n){station=T.MathUtils.clamp(n,0,3);camera.fov=51;camera.updateProjectionMatrix();camera.position.copy(v(stations[station].position));yaw=pitch=0;look();}
 function rotate(dx,dy){yaw-=dx*.004;pitch=T.MathUtils.clamp(pitch+dy*.01,-2.5,2.5);look();}
 function lighting(value){night=value;sun.intensity=night?.18:3.3;hemi.intensity=night?.25:.65;bounce.intensity=night?.2:.8;scene.environmentIntensity=night?.15:.32;practicals.forEach(l=>l.intensity=night?12:4);renderer.toneMappingExposure=night?1.15:1.05;scene.background.set(night?'#495563':'#c7d2d4');scene.fog.color.copy(scene.background);}
 const shots=[
  [[.75,1.48,-2.85],[-.05,1.45,-2.65],[-3.1,1.02,.65]],
  [[.9,1.55,-1.2],[.65,1.5,-.65],[-1.65,1.42,3.15]],
  [[2.85,1.58,-3.5],[3.3,1.53,-3.25],[4.15,1.02,1.0]],
  [[2.1,1.5,-4.95],[1.1,1.47,-5.05],[-3.6,1,-5.9]]
 ];
 function film(time){const t=T.MathUtils.clamp(time,0,23.999),n=Math.floor(t/6),u=(t%6)/6,s=shots[n];camera.position.lerpVectors(v(s[0]),v(s[1]),u*u*(3-2*u));camera.lookAt(v(s[2]));camera.fov=49;camera.updateProjectionMatrix();render();}
 function resize(w,h){renderer.setSize(w,h,false);composer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();render();}
 function render(){composer.render();}
 function dispose(){geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());env.dispose();composer.passes.forEach(p=>p.dispose());composer.dispose();renderer.dispose();renderer.forceContextLoss();}
 setStation(0);return {scene,camera,renderer,stations,setStation,rotate,lighting,film,resize,render,dispose,get night(){return night;}};
}
