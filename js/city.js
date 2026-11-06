 // Ciudad 3D nocturna — Three.js (portado del CityScene de Lovable)
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const BG='#0A0A0A', PURPLE='#6d4aff', WARM='#ffd8a0', COOL='#d6e4ff';
const STEP=2.4, BLOCK=STEP*4, RANGE=16, TILE_H=4;
const lim=RANGE*STEP;

function rng(seed){return ()=>{seed=(seed*16807)%2147483647;return (seed-1)/2147483646;};}
function canvas2d(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return [c,c.getContext('2d')];}
function toTex(c,srgb=true){const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;if(srgb)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;}

function makeFacade(kind,seed){
  const W=256,H=512,floors=12;
  const cols=kind==='glass'?8:kind==='office'?6:4;
  const [cc,c]=canvas2d(W,H);
  const [ec,e]=canvas2d(W,H);
  const r=rng(seed);
  const fh=H/floors,cw=W/cols;
  if(kind==='glass'){const g=c.createLinearGradient(0,0,W,H);g.addColorStop(0,'#2a3346');g.addColorStop(1,'#151b26');c.fillStyle=g;}
  else if(kind==='office')c.fillStyle='#3a3a3d';
  else c.fillStyle='#4a3f38';
  c.fillRect(0,0,W,H);
  e.fillStyle='#000';e.fillRect(0,0,W,H);
  for(let f=0;f<floors;f++){
    const floorLit=r()<0.025;
    for(let k=0;k<cols;k++){
      const pad=kind==='glass'?1.5:kind==='office'?4:7;
      const x=k*cw+pad,y=f*fh+(kind==='glass'?1.5:6);
      const w=cw-pad*2,h=fh-(kind==='glass'?3:14);
      c.fillStyle=kind==='glass'?`rgba(40,55,75,${0.5+r()*0.4})`:'#14171d';
      c.fillRect(x,y,w,h);
      const lit=floorLit||r()<(kind==='resi'?0.22:0.15);
      if(lit){
        const tone=r()<0.7?WARM:COOL;
        e.globalAlpha=0.35+r()*0.65;e.fillStyle=tone;e.fillRect(x,y,w,h);
        if(r()<0.4){e.globalAlpha=0.5;e.fillStyle='#000';e.fillRect(x,y,w,h*(0.2+r()*0.5));}
        e.globalAlpha=1;
      }
    }
    c.fillStyle=kind==='glass'?'#0a0d12':'rgba(0,0,0,0.35)';
    c.fillRect(0,f*fh,W,kind==='glass'?2:3);
  }
  for(let i=0;i<2500;i++){
    c.fillStyle=`rgba(${r()<0.5?'0,0,0':'255,255,255'},${r()*0.04})`;
    c.fillRect(r()*W,r()*H,2+r()*6,2+r()*6);
  }
  return {map:toTex(cc),emissive:toTex(ec)};
}

function makeRoof(){
  const [cc,c]=canvas2d(128,128);
  c.fillStyle='#1c1c1e';c.fillRect(0,0,128,128);
  const r=rng(3);
  for(let i=0;i<900;i++){c.fillStyle=`rgba(255,255,255,${r()*0.05})`;c.fillRect(r()*128,r()*128,3,3);}
  c.fillStyle='#2a2a2d';c.fillRect(30,30,30,22);c.fillRect(74,70,24,24);
  return toTex(cc);
}

function makeGround(){
  const S=512,px=S/BLOCK,road=(STEP/2)*px;
  const [cc,c]=canvas2d(S,S);
  c.fillStyle='#1a1a1c';c.fillRect(0,0,S,S);
  c.fillStyle='#0d0d0f';
  c.fillRect(0,0,S,road);c.fillRect(0,S-road,S,road);c.fillRect(0,0,road,S);c.fillRect(S-road,0,road,S);
  c.fillStyle='#2b2b2e';const sw=0.28*px;
  c.fillRect(road,road,S-road*2,sw);c.fillRect(road,S-road-sw,S-road*2,sw);c.fillRect(road,road,sw,S-road*2);c.fillRect(S-road-sw,road,sw,S-road*2);
  c.fillStyle='#8a8370';
  for(let i=road+6;i<S-road;i+=22){c.fillRect(i,0,11,2);c.fillRect(i,S-2,11,2);c.fillRect(0,i,2,11);c.fillRect(S-2,i,2,11);}
  c.fillStyle='#cfcfcf';
  for(let i=0;i<6;i++){const o=road+sw+2+i*7;c.fillRect(o,0,4,road*0.9);c.fillRect(0,o,road*0.9,4);}
  const r=rng(11);
  for(let i=0;i<4000;i++){c.fillStyle=`rgba(255,255,255,${r()*0.03})`;c.fillRect(r()*S,r()*S,2,2);}
  const t=toTex(cc);
  const n=(RANGE*2*STEP*2.5)/BLOCK;
  t.repeat.set(n,n);
  return {tex:t,size:n*BLOCK};
}

function genCity(){
  const r=rng(42);
  const parts=[];
  for(let i=-RANGE;i<=RANGE;i++){
    for(let j=-RANGE;j<=RANGE;j++){
      if(i%4===0||j%4===0)continue;
      const x=i*STEP,z=j*STEP;
      const dist=Math.hypot(x,z);
      if(r()<0.06+dist/140)continue;
      const core=Math.max(0,1-dist/22);
      let h=1+r()*3+core*core*(6+r()*22);
      if(dist<14&&r()>0.9)h+=10+r()*14;
      h=Math.max(1,Math.round(h/2)*2);
      const kind=h>=12?'glass':h>=5?(r()<0.6?'office':'glass'):(r()<0.7?'resi':'office');
      const w=r()<0.5?1.7:2.1;
      if(kind==='glass'&&h>=16){
        const base=Math.round((h*0.72)/2)*2;
        parts.push({x,y:0,z,w,h:base,kind});
        parts.push({x,y:base,z,w:w*0.72,h:Math.max(2,h-base),kind});
      } else parts.push({x,y:0,z,w,h,kind});
    }
  }
  const tops=parts.filter(p=>p.y+p.h>=18).map(p=>[p.x,p.y+p.h+0.15,p.z]);
  return {parts,tops};
}

function buildBuildings(scene,parts){
  const facades={glass:makeFacade('glass',5),office:makeFacade('office',9),resi:makeFacade('resi',13)};
  const roofMat=new THREE.MeshStandardMaterial({map:makeRoof(),roughness:0.9,metalness:0.1});
  const geo=new THREE.BoxGeometry(1,1,1).translate(0,0.5,0);
  const r=rng(77);
  const map=new Map();
  for(const p of parts){
    const key=`${p.kind}-${p.w.toFixed(2)}-${p.h}`;
    let b=map.get(key);
    if(!b){
      const f=facades[p.kind];
      const m=f.map.clone(),e=f.emissive.clone();
      const ox=r(),oy=Math.floor(r()*12)/12;
      for(const t of [m,e]){t.repeat.set(p.w,p.h/TILE_H);t.offset.set(ox,oy);t.needsUpdate=true;}
      const side=new THREE.MeshStandardMaterial({
        map:m,emissiveMap:e,emissive:new THREE.Color('#ffffff'),emissiveIntensity:1.0,
        roughness:p.kind==='glass'?0.12:p.kind==='office'?0.55:0.85,
        metalness:p.kind==='glass'?0.85:0.15,
        envMapIntensity:p.kind==='glass'?1.4:0.5
      });
      b={parts:[],mats:[side,side,roofMat,roofMat,side,side]};
      map.set(key,b);
    }
    b.parts.push(p);
  }
  const m4=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3();
  for(const b of map.values()){
    const mesh=new THREE.InstancedMesh(geo,b.mats,b.parts.length);
    b.parts.forEach((p,i)=>{
      s.set(p.w,p.h,p.w);
      m4.compose(new THREE.Vector3(p.x,p.y,p.z),q,s);
      mesh.setMatrixAt(i,m4);
    });
    mesh.instanceMatrix.needsUpdate=true;
    scene.add(mesh);
  }
}

function buildStreetLights(scene){
  const pts=[];
  for(let k=-RANGE;k<=RANGE;k+=4){
    const s=k*STEP;
    for(let t=-lim;t<=lim;t+=STEP){
      pts.push([s-1,t],[s+1,t+STEP/2],[t,s-1],[t+STEP/2,s+1]);
    }
  }
  const mesh=new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.05,6,6),
    new THREE.MeshBasicMaterial({color:'#ffb070',toneMapped:false}),
    pts.length
  );
  const m=new THREE.Matrix4();
  pts.forEach(([x,z],i)=>{m.makeTranslation(x,0.45,z);mesh.setMatrixAt(i,m);});
  mesh.instanceMatrix.needsUpdate=true;
  scene.add(mesh);
}

function buildTraffic(scene){
  const N=260;
  const r=rng(99);
  const cars=Array.from({length:N},()=>{
    const street=(Math.floor(r()*9)-4)*4*STEP;
    const dir=r()<0.5?1:-1;
    return {axis:r()<0.5?0:1,street,lane:dir*0.35,dir,t:(r()*2-1)*lim,v:1.2+r()*1.6};
  });
  const mesh=new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.16,0.05,0.32),
    new THREE.MeshBasicMaterial({toneMapped:false}),
    N
  );
  const col=new THREE.Color();
  cars.forEach((c,i)=>mesh.setColorAt(i,col.set(c.dir>0?'#fff3dc':'#ff2a1a')));
  mesh.instanceColor.needsUpdate=true;
  scene.add(mesh);
  const m=new THREE.Matrix4(),q=new THREE.Quaternion(),s=new THREE.Vector3(1,1,1),p=new THREE.Vector3(),yAxis=new THREE.Vector3(0,1,0);
  return (dt)=>{
    dt=Math.min(dt,0.05);
    cars.forEach((c,i)=>{
      c.t+=c.v*c.dir*dt;
      if(c.t>lim)c.t=-lim;
      if(c.t<-lim)c.t=lim;
      if(c.axis===0)p.set(c.street+c.lane,0.08,c.t);else p.set(c.t,0.08,c.street+c.lane);
      q.setFromAxisAngle(yAxis,c.axis===0?0:Math.PI/2);
      m.compose(p,q,s);
      mesh.setMatrixAt(i,m);
    });
    mesh.instanceMatrix.needsUpdate=true;
  };
}

function buildAviation(scene,tops){
  if(!tops.length)return ()=>{};
  const mesh=new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.09,8,8),
    new THREE.MeshBasicMaterial({toneMapped:false}),
    tops.length
  );
  const m=new THREE.Matrix4();
  tops.forEach(([x,y,z],i)=>{m.makeTranslation(x,y,z);mesh.setMatrixAt(i,m);});
  mesh.instanceMatrix.needsUpdate=true;
  scene.add(mesh);
  return (elapsed)=>{
    mesh.material.color.setRGB(Math.sin(elapsed*2.2)>0.4?3:0.15,0,0);
  };
}

function buildEnvironment(renderer,scene){
  const pmrem=new THREE.PMREMGenerator(renderer);
  const env=new THREE.Scene();
  const pf=(color,intensity,pos,scale,rot)=>{
    const mat=new THREE.MeshBasicMaterial({color});
    mat.color.multiplyScalar(intensity);
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),mat);
    mesh.position.set(...pos);mesh.scale.set(...scale);
    if(rot)mesh.rotation.set(...rot);
    env.add(mesh);
  };
  pf(PURPLE,1.2,[0,4,-40],[120,8,1]);
  pf(COOL,0.6,[0,30,0],[60,60,1],[Math.PI/2,0,0]);
  pf(WARM,0.8,[40,2,10],[80,3,1],[0,-Math.PI/2,0]);
  scene.environment=pmrem.fromScene(env,0.04).texture;
  env.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material)o.material.dispose();});
  pmrem.dispose();
}

function initCity(){
  const container=document.getElementById('city');
  const coarse=window.matchMedia('(pointer: coarse)').matches;
  const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,2));
  renderer.setSize(container.clientWidth,container.clientHeight);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  container.appendChild(renderer.domElement);

  const scene=new THREE.Scene();
  scene.background=new THREE.Color(BG);
  scene.fog=new THREE.Fog('#0c0b10',28,92);

  const camera=new THREE.PerspectiveCamera(40,container.clientWidth/container.clientHeight,0.1,200);
  camera.position.set(0,9,50);

  scene.add(new THREE.HemisphereLight('#2a3550','#0a0a0a',0.35));
  const dl=new THREE.DirectionalLight('#9fb2d6',0.5);dl.position.set(-30,40,-20);scene.add(dl);
  const pl=new THREE.PointLight(WARM,60,40,1.5);pl.position.set(0,3,0);scene.add(pl);

  buildEnvironment(renderer,scene);

  const {parts,tops}=genCity();
  buildBuildings(scene,parts);
  buildStreetLights(scene);
  const updateTraffic=buildTraffic(scene);
  const updateAviation=buildAviation(scene,tops);

  // Calle mojada: espejo + capa de asfalto semitransparente encima
  const ground=makeGround();
  const mirror=new Reflector(new THREE.PlaneGeometry(ground.size,ground.size),{
    textureWidth:1024,textureHeight:1024,color:0x777777
  });
  mirror.rotation.x=-Math.PI/2;mirror.position.y=-0.02;
  scene.add(mirror);
  const road=new THREE.Mesh(
    new THREE.PlaneGeometry(ground.size,ground.size),
    new THREE.MeshStandardMaterial({map:ground.tex,transparent:true,opacity:0.82,roughness:0.6,metalness:0.25})
  );
  road.rotation.x=-Math.PI/2;
  scene.add(road);

  // Controles: en PC se puede arrastrar; en móvil la ciudad gira sola y el scroll queda libre
  const controls=new OrbitControls(camera,renderer.domElement);
  controls.target.set(0,8,0);
  controls.enableZoom=false;controls.enablePan=false;
  controls.enableDamping=true;controls.dampingFactor=0.06;
  controls.autoRotate=true;controls.autoRotateSpeed=0.35;
  controls.minPolarAngle=0.85;controls.maxPolarAngle=1.42;
  if(coarse){
    controls.enabled=false;
    renderer.domElement.style.touchAction='pan-y';
  } else {
    controls.enableRotate=true;
  }

  const composer=new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene,camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(container.clientWidth,container.clientHeight),0.7,0.4,0.75));
  const vig=new ShaderPass(VignetteShader);
  vig.uniforms.offset.value=0.25;vig.uniforms.darkness.value=0.8;
  composer.addPass(vig);
  composer.addPass(new OutputPass());

  addEventListener('resize',()=>{
    camera.aspect=container.clientWidth/container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth,container.clientHeight);
    composer.setSize(container.clientWidth,container.clientHeight);
  });

  const clock=new THREE.Clock();
  renderer.setAnimationLoop(()=>{
    const dt=clock.getDelta(),t=clock.elapsedTime;
    controls.update();
    updateTraffic(dt);
    updateAviation(t);
    composer.render();
  });
}

try{initCity();}catch(err){console.warn('Ciudad 3D no disponible, se muestra la imagen de fondo:',err);}
