import * as THREE from './vendor/three.module.js';

const el = id => document.getElementById(id);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x17262c);
scene.fog = new THREE.FogExp2(0x17262c, 0.016);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 180);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
el('game').appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight(0xa9c9c3, 0x4c4132, 2.1));
const sun = new THREE.DirectionalLight(0xffc78d, 2.8);
sun.position.set(-24, 38, -15); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -55; sun.shadow.camera.right = 55;
sun.shadow.camera.top = 55; sun.shadow.camera.bottom = -55;
sun.shadow.normalBias = 0.03;
scene.add(sun);
const world = new THREE.Group(); scene.add(world);
const mat = (color, roughness = 0.85, metalness = 0.05) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const sand = mat(0x9e8d6d), borderMat = mat(0x514d41), cyan = mat(0x43a9a4, .45, .52), cyanDark = mat(0x285c61, .48, .58);
const orange = mat(0xa85236, .55, .38), orangeDark = mat(0x5d3b32, .55, .4), black = mat(0x202d31, .9, .2), metal = mat(0x778381, .5, .55);
const glowCyan = new THREE.MeshBasicMaterial({ color: 0x93f2df });
const glowOrange = new THREE.MeshBasicMaterial({ color: 0xffb474 });
function box(parent, w, h, d, material, x=0, y=0, z=0, bevel=false) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
function cylinder(parent, r1,r2,h,material,x=0,y=0,z=0,segments=8) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r1,r2,h,segments),material);
  mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh;
}
const ground = box(world, 90,.8,90,sand,0,-.5,0); ground.castShadow=false;
const grid = new THREE.GridHelper(88, 44, 0x6f6857, 0x6f6857); grid.position.y=-.07; grid.material.transparent=true; grid.material.opacity=.24; world.add(grid);
for (let i=0;i<4;i++) {
  const wall=box(world,i<2?90:1.5,2.2,i<2?1.5:90,borderMat,i===2?-45:i===3?45:0,.7,i===0?-45:i===1?45:0);
  wall.castShadow=true;
}
const blocks = [ [-17,-13,7,4], [17,-10,6,6], [-18,15,5,8], [16,16,8,5], [0,-20,5,5], [3,20,7,4], [-28,3,4,6], [29,2,4,6] ];
for (const [x,z,w,d] of blocks) {
  box(world,w,1.5,d,borderMat,x,.7,z);
  box(world,w+.3,.22,d+.3,metal,x,1.55,z);
  for (let k=0;k<2;k++) box(world,.15,.8,d+.15,black,x+(k?1:-1)*w*.34,2.04,z);
}
// Small dunes and scattered rocks add depth without affecting movement.
const random = (()=>{let s=73;return()=>((s=(s*1664525+1013904223)>>>0)/4294967296)})();
for(let i=0;i<110;i++){
  const x=(random()-.5)*84,z=(random()-.5)*84;
  if(Math.hypot(x,z)<8 || blocks.some(([bx,bz,w,d])=>Math.abs(x-bx)<w/2+2&&Math.abs(z-bz)<d/2+2))continue;
  const rock=new THREE.Mesh(new THREE.DodecahedronGeometry(.3+random()*.5,0),mat(i%3?0x776d5b:0x605c51));
  rock.position.set(x,.02,z);rock.scale.y=.45;rock.rotation.y=random()*6.28;rock.castShadow=true;world.add(rock);
}
function tank(isPlayer,x,z){
  const group=new THREE.Group(); group.position.set(x,0,z); scene.add(group);
  const body=new THREE.Group();group.add(body);
  const main=isPlayer?cyan:orange, dark=isPlayer?cyanDark:orangeDark, light=isPlayer?glowCyan:glowOrange;
  box(body,2.5,.55,3.5,dark,0,.6,0);
  box(body,2.05,.55,2.85,main,0,.99,0);
  box(body,1.65,.2,1.8,metal,0,1.35,.2);
  for(const side of [-1,1]){
    box(body,.56,.6,3.65,black,side*1.18,.36,0);
    for(let j=-1;j<=1;j++){
      const wheel=cylinder(body,.31,.31,.17,metal,side*1.52,.35,j*1.05,12);
      wheel.rotation.z=Math.PI/2;
    }
    box(body,.16,.22,2.7,dark,side*1.49,.56,0);
  }
  box(body,1.65,.12,.24,light,0,1.13,-1.58);
  const turret=new THREE.Group(); turret.position.y=1.52;group.add(turret);
  cylinder(turret,1.02,1.13,.65,main,0,0,0,8);
  box(turret,1.25,.19,.8,dark,0,.39,.25);
  const barrel=box(turret,.27,.27,2.45,dark,0,.06,-1.82);
  box(turret,.42,.4,.35,metal,0,.06,-2.96);
  const muzzle=new THREE.Group();muzzle.position.set(0,.06,-3.16);turret.add(muzzle);
  const lamp=new THREE.PointLight(isPlayer?0x58cfc5:0xef7547,1.6,7);lamp.position.set(0,1.6,-1.8);group.add(lamp);
  return {group,body,turret,muzzle,hp:isPlayer?100:2,alive:true,fireTimer:0,speed:isPlayer?13:3.2};
}
let player, enemies=[], shells=[], particles=[], state='ready', kills=0, audioEnabled=true, audio;
const keys=new Set(), pointer=new THREE.Vector2(0,0), aim=new THREE.Vector3(0,0,-10), ray=new THREE.Raycaster();
// Match the pointer ray to the turret line so aiming at a tank does not hit the ground behind it.
const aimPlane=new THREE.Plane(new THREE.Vector3(0,1,0),-1.5);
function sound(freq=180,duration=.13,type='sawtooth',gain=.06){
  if(!audioEnabled)return;
  try{audio??=new (window.AudioContext||window.webkitAudioContext)();const o=audio.createOscillator(),g=audio.createGain();o.type=type;o.frequency.setValueAtTime(freq,audio.currentTime);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*.42),audio.currentTime+duration);g.gain.setValueAtTime(gain,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+duration);o.connect(g);g.connect(audio.destination);o.start();o.stop(audio.currentTime+duration);}catch{}
}
function updateHud(){el('health-text').textContent=Math.max(0,Math.ceil(player.hp));el('health-bar').style.width=Math.max(0,player.hp)+'%';el('enemy-count').textContent=String(enemies.filter(e=>e.alive).length).padStart(2,'0');el('kill-count').textContent=String(kills).padStart(2,'0');}
function clearGame(){
  for(const t of [player,...enemies])if(t)scene.remove(t.group);
  for(const s of shells)scene.remove(s.mesh);
  for(const p of particles)scene.remove(p.mesh);
  enemies=[];shells=[];particles=[];kills=0;
}
function start(){
  keys.clear();clearGame();player=tank(true,0,12);
  for(const [x,z] of [[-20,-30],[20,-30],[-34,-13],[34,-13],[-8,34]])enemies.push(tank(false,x,z));
  player.body.rotation.y=Math.PI;player.turret.rotation.y=Math.PI;
  state='playing';el('screen').hidden=true;el('hud').hidden=false;document.querySelector('.topbar').inert=false;updateHud();el('game').focus();audio?.resume();
}
function end(won){
  keys.clear();state=won?'won':'lost';el('screen-title').innerHTML=won?'战斗<br><span>胜利</span>':'任务<br><span>失败</span>';
  el('screen-copy').innerHTML=won?'敌方单位全部击毁。荒原暂时恢复平静。<br>你的战绩已写入这片战场。':'战车装甲已耗尽。重新整备，再次进入战场。';
  el('button-label').textContent='再战一次';document.querySelector('.topbar').inert=true;el('screen').hidden=false;el('hud').hidden=true;el('start').focus();
  sound(won?570:90,.7,won?'sine':'sawtooth',.11);
}
function blocked(x,z,r=1.5){
  if(Math.abs(x)>42-r||Math.abs(z)>42-r)return true;
  return blocks.some(([bx,bz,w,d])=>Math.abs(x-bx)<w/2+r&&Math.abs(z-bz)<d/2+r);
}
function spawnParticles(position,color,count=12,power=8){
  for(let i=0;i<count;i++){
    const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(.08+random()*.11,0),new THREE.MeshBasicMaterial({color}));
    mesh.position.copy(position);scene.add(mesh);
    const direction=new THREE.Vector3(random()-.5,random()*.7+.15,random()-.5).normalize().multiplyScalar(power*(.35+random()));
    particles.push({mesh,velocity:direction,life:.35+random()*.45});
  }
}
function fire(t,owner){
  if(!t.alive||t.fireTimer>0)return;
  t.fireTimer=owner==='player'?.26:1.8+random()*.8;
  const position=new THREE.Vector3();t.muzzle.getWorldPosition(position);
  const direction=new THREE.Vector3(0,0,-1).applyQuaternion(t.turret.getWorldQuaternion(new THREE.Quaternion())).normalize();
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(.19,8,6),new THREE.MeshBasicMaterial({color:owner==='player'?0x9afbe3:0xffa164}));
  mesh.position.copy(position);scene.add(mesh);
  const light=new THREE.PointLight(owner==='player'?0x61e8d2:0xff743c,3,5);mesh.add(light);
  shells.push({mesh,direction,owner,life:2});
  spawnParticles(position,owner==='player'?0x8cf5da:0xffaf70,5,3);sound(owner==='player'?210:135,.16,'sawtooth',.045);
}
function damage(t,amount){
  t.hp-=amount;t.flash=.2;spawnParticles(t.group.position.clone().add(new THREE.Vector3(0,1,0)),t===player?0x77d6cd:0xff9d59,14,8);
  sound(t===player?85:300,.25,'triangle',.09);
  if(t===player){el('damage-flash').style.opacity='.25';setTimeout(()=>el('damage-flash').style.opacity='0',50);updateHud();if(t.hp<=0){t.alive=false;end(false)}}
  else if(t.hp<=0){t.alive=false;scene.remove(t.group);kills++;updateHud();if(enemies.every(e=>!e.alive))end(true)}
}
function update(dt){
  ray.setFromCamera(pointer,camera);ray.ray.intersectPlane(aimPlane,aim);
  const move=new THREE.Vector3(Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),0,Number(keys.has('s')||keys.has('arrowdown'))-Number(keys.has('w')||keys.has('arrowup')));
  if(move.lengthSq()>0){move.normalize();const nx=player.group.position.x+move.x*player.speed*dt,nz=player.group.position.z+move.z*player.speed*dt;if(!blocked(nx,player.group.position.z))player.group.position.x=nx;if(!blocked(player.group.position.x,nz))player.group.position.z=nz;const angle=Math.atan2(-move.x,-move.z);player.body.rotation.y+=Math.atan2(Math.sin(angle-player.body.rotation.y),Math.cos(angle-player.body.rotation.y))*Math.min(1,dt*8)}
  const delta=aim.clone().sub(player.group.position);if(delta.lengthSq()>.5)player.turret.rotation.y=Math.atan2(-delta.x,-delta.z);
  player.fireTimer=Math.max(0,player.fireTimer-dt);if(keys.has(' ')||keys.has('mouse'))fire(player,'player');
  for(const enemy of enemies){if(!enemy.alive)continue;enemy.fireTimer=Math.max(0,enemy.fireTimer-dt);
    const toward=player.group.position.clone().sub(enemy.group.position),dist=toward.length();toward.normalize();
    const desired=dist>17?1:dist<10?-1:0;
    if(desired){
      const step=toward.clone().multiplyScalar(enemy.speed*desired*dt);
      let nx=enemy.group.position.x+step.x,nz=enemy.group.position.z+step.z;
      if(blocked(nx,nz)){
        // Move around cover when a direct approach is blocked.
        const side=enemies.indexOf(enemy)%2?1:-1;
        nx=enemy.group.position.x-toward.z*enemy.speed*side*dt;
        nz=enemy.group.position.z+toward.x*enemy.speed*side*dt;
      }
      if(!blocked(nx,nz)&&Math.hypot(nx-player.group.position.x,nz-player.group.position.z)>3.3)enemy.group.position.set(nx,0,nz);
    }
    const angle=Math.atan2(-toward.x,-toward.z);enemy.body.rotation.y+=Math.atan2(Math.sin(angle-enemy.body.rotation.y),Math.cos(angle-enemy.body.rotation.y))*Math.min(1,dt*3);
    enemy.turret.rotation.y=angle;
    if(dist<31&&enemy.fireTimer<=0)fire(enemy,'enemy');
  }
  for(let i=shells.length-1;i>=0;i--){const s=shells[i],p=s.mesh.position;s.life-=dt;p.addScaledVector(s.direction,55*dt);
    let hit=s.life<=0||blocked(p.x,p.z,.2);
    if(!hit){const targets=s.owner==='player'?enemies:[player];for(const t of targets)if(t.alive&&Math.hypot(p.x-t.group.position.x,p.z-t.group.position.z)<(s.owner==='player'?2.25:1.65)){hit=true;damage(t,s.owner==='player'?1:10);break}}
    if(hit){spawnParticles(p.clone(),s.owner==='player'?0xa4f3d6:0xffa472,8,5);scene.remove(s.mesh);shells.splice(i,1)}
  }
  for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.life-=dt;p.velocity.y-=18*dt;p.mesh.position.addScaledVector(p.velocity,dt);p.mesh.scale.setScalar(Math.max(0,p.life*1.7));if(p.life<=0){scene.remove(p.mesh);particles.splice(i,1)}}
  const target=player.group.position.clone().add(new THREE.Vector3(0,0,0));const offset=new THREE.Vector3(0,32,32);camera.position.lerp(target.add(offset),Math.min(1,dt*3));camera.lookAt(player.group.position.x,0,player.group.position.z);
}
const clock=new THREE.Clock();camera.position.set(0,39,48);camera.lookAt(0,0,0);
const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function frame(){requestAnimationFrame(frame);const dt=Math.min(clock.getDelta(),.05);if(state==='playing')update(dt);else{camera.position.x=reducedMotion.matches?0:Math.sin(clock.elapsedTime*.1)*3;camera.lookAt(0,0,0)}renderer.render(scene,camera)}frame();
function resize(){camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)}addEventListener('resize',resize);
addEventListener('pointermove',e=>{pointer.x=e.clientX/innerWidth*2-1;pointer.y=-(e.clientY/innerHeight*2-1)});
addEventListener('pointerdown',e=>{if(e.button===0&&state==='playing')keys.add('mouse')});addEventListener('pointerup',()=>keys.delete('mouse'));
addEventListener('blur',()=>keys.clear());
addEventListener('keydown',e=>{if(state!=='playing')return;const k=e.key.toLowerCase();if([' ','arrowup','arrowdown','arrowleft','arrowright'].includes(k))e.preventDefault();keys.add(k)});
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
el('start').addEventListener('click',start);
el('sound').addEventListener('click',()=>{audioEnabled=!audioEnabled;el('sound').textContent='音效：'+(audioEnabled?'开':'关');el('sound').setAttribute('aria-pressed',String(audioEnabled))});
