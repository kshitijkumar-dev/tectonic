(function(){try{
if(!window.THREE||!THREE.OrbitControls)throw 0;
const hero=document.getElementById('hero'),cv=document.getElementById('c3'),lbl=document.getElementById('lbl'),g$=id=>document.getElementById(id);
const reduce=matchMedia('(prefers-reduced-motion:reduce)').matches;
// ---- building config (from buildingConfig.js, original 3D colours) ----
const th={glass:'#9CD0AA',slab:'#EAF2E8',occupied:'#8CC68F',idle:'#CBDDC9',waste:'#C62828',wall:'#6E9275',select:'#1B5E20',people:'#1F4D2A',charcoal:'#1B5E20',concrete:'#E2ECE0'};
const FL=6,F=2.2,SL=.18,W=14,D=9,WH=1.1;
const L=a=>a.map(x=>({key:x[0],name:x[1],type:x[2],x:x[3],z:x[4],w:x[5],d:x[6],cap:x[7],on:x[8]}));
const hall=['hall','Corridor','corridor',0,0,14,1.2,0,1];
const LAY={d:L([['open','Open office','open',-3.5,-2.55,7,3.9,20],['meetA','Meeting A','meeting',1.75,-2.55,3.5,3.9,8],['meetB','Meeting B','meeting',5.25,-2.55,3.5,3.9,8],['cabinA','Cabin A','cabin',-5.25,2.55,3.5,3.9,2],['cabinB','Cabin B','cabin',-1.75,2.55,3.5,3.9,2],['pantry','Pantry','pantry',1.75,2.55,3.5,3.9,6],['wc','Restrooms','utility',5.25,2.55,3.5,3.9,4],hall]),
0:L([['lobby','Lobby','open',-3.5,-2.55,7,3.9,12],['sec','Security','cabin',1.75,-2.55,3.5,3.9,2],['mail','Mailroom','utility',5.25,-2.55,3.5,3.9,2],['cafe','Cafeteria','pantry',-3.5,2.55,7,3.9,20],['store','Utility','utility',1.75,2.55,3.5,3.9,2],['wc','Restrooms','utility',5.25,2.55,3.5,3.9,4],hall])};
const rooms=f=>LAY[f]||LAY.d,rid=(f,k)=>`F${f+1}-${k}`;
const stat=(r,s)=>!s?'idle':s.occ>0?'occupied':(!r.on&&(s.lights||s.ac))?'waste':'idle';
const hs=s=>{let h=0;for(const c of s)h=(h*31+c.charCodeAt(0))>>>0;return h};
const ST={};for(let i=0;i<FL;i++)for(const r of rooms(i)){const id=rid(i,r.key),h=hs(id);if(r.on){ST[id]={occ:0,lights:true,ac:false};continue}const o=h%4===0?0:Math.min(r.cap,Math.max(1,Math.round(r.cap*(((h%6)+2)/10))));ST[id]={occ:o,lights:o>0,ac:o>0&&r.type!=='utility'}}
Object.assign(ST,{'F3-meetB':{occ:0,lights:true,ac:true},'F5-open':{occ:0,lights:true,ac:true},'F2-cabinA':{occ:0,lights:true,ac:false}});
const wasteF=Array.from({length:FL},(_,i)=>rooms(i).some(r=>stat(r,ST[rid(i,r.key)])==='waste'));
// ---- heat model ----
const RAMP=[[0,[214,236,215]],[.3,[165,214,167]],[.55,[102,187,106]],[.7,[56,142,60]],[.82,[214,150,30]],[1,[198,40,40]]];
const RAMPOCC=RAMP.slice(0,4);
const ramp=v=>{for(let i=1;i<RAMP.length;i++)if(v<=RAMP[i][0]){const a=RAMP[i-1],b=RAMP[i],k=(v-a[0])/(b[0]-a[0]);return a[1].map((c,j)=>Math.round(c+(b[1][j]-c)*k))}return RAMP[RAMP.length-1][1]};
const watts=(r,s)=>{const A=r.w*r.d;return (s.lights?A*10:0)+(s.ac&&r.type!=='corridor'?A*60:0)+s.occ*120};
const val=(r,s,m)=>m==='occ'?(r.cap?s.occ/r.cap:0):(stat(r,s)==='waste'?.92:Math.min(1,watts(r,s)/(r.w*r.d)/130)*.62);
{let n=0,wr=0,kw=0;for(let i=0;i<FL;i++)for(const r of rooms(i)){const s=ST[rid(i,r.key)];kw+=watts(r,s)/1000;if(r.type==='corridor')continue;n++;if(stat(r,s)==='waste')wr++}
 g$('hst').innerHTML=`<div><b>${n}</b><span>Rooms</span></div><div><b class="red">${wr}</b><span>Flagged</span></div><div><b>${kw.toFixed(1)} kW</b><span>Est. load</span></div>`}
// ---- renderer ----
const R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true});R.setPixelRatio(Math.min(devicePixelRatio,2));R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;
const sc=new THREE.Scene();sc.fog=new THREE.Fog(0xE6F4E7,70,150);
const cam=new THREE.PerspectiveCamera(40,1,.1,400);
sc.add(new THREE.AmbientLight(0xffffff,.34),new THREE.HemisphereLight(0xf0faf0,0xa9ceaf,.3));
const sun=new THREE.DirectionalLight(0xfffaf0,.58);sun.position.set(20,30,15);sun.castShadow=true;sun.shadow.radius=5;sun.shadow.bias=-.0004;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-32,right:32,top:32,bottom:-32,far:110});sc.add(sun);
const mat=(c,o)=>new THREE.MeshStandardMaterial(Object.assign({color:c},o||{}));
const box=(w,h,d,m,x,y,z,sh)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);if(sh){o.castShadow=true;o.receiveShadow=true}return o};
const cyl=(a,b,h,s,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(a,b,h,s),m);o.position.set(x,y,z);o.castShadow=true;return o};
const ball=(r,m,x,y,z)=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,10,10),m);o.position.set(x,y,z);o.castShadow=true;return o};
const plane=(w,d,c,x,y,z)=>{const o=new THREE.Mesh(new THREE.PlaneGeometry(w,d),mat(c));o.rotation.x=-Math.PI/2;o.position.set(x,y,z);o.receiveShadow=true;return o};
// ---- scenery ----
const sce=new THREE.Group();sc.add(sce);
sce.add(plane(260,260,'#A9C8AF',0,0,0));
const lawn=new THREE.Mesh(new THREE.CircleGeometry(36,80),mat('#93BD9B'));lawn.rotation.x=-Math.PI/2;lawn.position.y=.012;lawn.receiveShadow=true;sce.add(lawn);
const gh=new THREE.GridHelper(160,40,0x7FB588,0x8FC196);gh.position.y=.02;gh.material.transparent=true;gh.material.opacity=.22;sce.add(gh);
// digital-twin rings around the campus
[[21,.34],[29,.2],[37,.1]].forEach(a=>{const m=new THREE.Mesh(new THREE.RingGeometry(a[0],a[0]+.1,128),new THREE.MeshBasicMaterial({color:0x2E7D32,transparent:true,opacity:a[1],depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.026;sce.add(m)});
// podium, walkway, road
sce.add(box(W+4.2,.1,D+4.2,mat('#D3E3D2'),0,.05,0,1));
sce.add(plane(240,1.4,'#DDEADB',0,.03,D/2+6.3),plane(240,5,'#8CA392',0,.035,D/2+9.5),plane(5,8,'#DDEADB',0,.045,D/2+3.6));
for(let x=-60;x<=60;x+=5)sce.add(box(2,.012,.14,mat('#EDF5EB'),x,.05,D/2+9.5));
const wc=document.createElement('canvas');wc.width=wc.height=32;{const x=wc.getContext('2d');x.fillStyle='#8FBF98';x.fillRect(6,7,20,17);x.fillStyle='rgba(255,255,255,.35)';x.fillRect(6,7,20,4)}
const wt=(a,b)=>{const t=new THREE.CanvasTexture(wc);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(Math.max(1,Math.round(a/1.2)),Math.max(1,Math.round(b/1.2)));return t};
// context buildings: soft green massing models with outlines
[[-18,-8,7,8,6,'#D3E8D7'],[19,-9,7,6,4.5,'#D9ECDC'],[-20,11,6,6,5,'#CFE5D3'],[0,-22,12,6,5,'#D9ECDC']].forEach(a=>{const x=a[0],z=a[1],w=a[2],d=a[3],h=a[4];sce.add(box(w,h,d,mat(a[5]),x,h/2,z,1),box(w+.25,.16,d+.25,mat('#B5D6BB'),x,h+.08,z,1));
 const eg=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w,h,d)),new THREE.LineBasicMaterial({color:0x7DB886,transparent:true,opacity:.65}));eg.position.set(x,h/2,z);sce.add(eg);
 const f=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:wt(w,h),transparent:true,color:0xffffff,opacity:.75}));f.position.set(x,h/2,z+d/2+.03);sce.add(f);
 const s=new THREE.Mesh(new THREE.PlaneGeometry(d,h),new THREE.MeshBasicMaterial({map:wt(d,h),transparent:true,color:0xffffff,opacity:.75}));s.rotation.y=Math.PI/2;s.position.set(x+w/2+.03,h/2,z);sce.add(s)});
// trees in the brand greens
const tr=mat('#8A7B66'),cone=['#3F9B46','#55A95B','#66B56C'].map(c=>mat(c)),rnd=['#68B66F','#7AC381','#5CAE63'].map(c=>mat(c));
[[-10,9.5],[-13,5],[13,-11],[-22,-1],[-9.8,-7],[10.8,-6],[-14.5,1],[14,-2.5],[16,3],[-15,8.6]].forEach((p,n)=>{const g=new THREE.Group(),k=.85+(n%4)*.12,c=cone[n%3];g.add(cyl(.12,.15,.8,6,tr,0,.4,0),cyl(0,.85,1.5,8,c,0,1.3,0),cyl(0,.6,1.3,8,c,0,2.1,0));g.scale.setScalar(k);g.position.set(p[0],0,p[1]);sce.add(g)});
[[-10.6,-2],[10.9,.4],[-6.8,-8.4],[7.4,-8.6],[-8.4,8],[17.5,-4.5],[-17,3.5]].forEach((p,n)=>{const g=new THREE.Group(),k=.9+(n%3)*.14;g.add(cyl(.1,.14,1,6,tr,0,.5,0),ball(.95,rnd[n%3],0,1.65,0),ball(.62,rnd[(n+1)%3],.5,2.1,.2));g.scale.setScalar(k);g.position.set(p[0],0,p[1]);sce.add(g)});
[-5.4,-3.8,3.8,5.4].forEach((x,n)=>{const b=ball(.4,mat(n%2?'#4FAE55':'#66BB6A'),x,.34,D/2+.6);b.scale.y=.8;sce.add(b)});
[[-3.4,6.2],[3.4,6.2]].forEach(p=>sce.add(cyl(.05,.06,2.4,8,mat(th.charcoal),p[0],1.2,p[1]),ball(.14,mat('#ffffff',{emissive:'#fff2b0',emissiveIntensity:.5}),p[0],2.45,p[1])));
[[-5.5,8.6]].forEach(p=>sce.add(box(1.2,.07,.4,mat('#DCE9DA'),p[0],.42,p[1],1),box(.08,.4,.36,mat(th.charcoal),p[0]-.5,.2,p[1]),box(.08,.4,.36,mat(th.charcoal),p[0]+.5,.2,p[1])));
// parking
sce.add(plane(7.4,4.6,'#B0C5B4',10,.04,8.6));
for(let i=0;i<5;i++)sce.add(box(.06,.012,3.6,mat('#F4F9F2'),6.7+i*1.6,.055,8.6));
[['#F1F8F0',0],['#2E7D32',1]].forEach(c=>{const x=7.5+c[1]*1.6;sce.add(box(1,.38,2.1,mat(c[0]),x,.35,8.6,1),box(.86,.3,1.1,mat('#BFE0C6'),x,.69,8.45,1))});
// clouds
const cc=document.createElement('canvas');cc.width=cc.height=128;{const x=cc.getContext('2d'),g=x.createRadialGradient(64,64,0,64,64,64);g.addColorStop(0,'rgba(255,255,255,.9)');g.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=g;x.fillRect(0,0,128,128)}
const ct=new THREE.CanvasTexture(cc),clouds=[];
for(let n=0;n<7;n++){const bx=-90+n*30,by=32+(n%3)*6,bz=-60-(n%2)*25;for(let k=0;k<3;k++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:ct,transparent:true,opacity:.28,fog:false,depthWrite:false}));s.scale.set(26-k*4,9-k,1);s.position.set(bx+k*9,by+k*.8,bz);clouds.push(s);sc.add(s)}}
// ---- helpers: heat texture, sign ----
const HT={};let heat=Array(FL).fill(false),metric='energy',hov=-1;
function heatTex(i){const key=i+metric;if(HT[key])return HT[key];const s=512/W,cw=512,ch=Math.round(D*s),c=document.createElement('canvas');c.width=cw;c.height=ch;const x=c.getContext('2d');
 for(const r of rooms(i)){const v=val(r,ST[rid(i,r.key)],metric);if(v<.02)continue;const n=Math.max(1,Math.round(r.w/3.5)),rad=Math.max(r.w/n,r.d)*s*.8;
  for(let k=0;k<n;k++){const cx=(r.x-r.w/2+(k+.5)*r.w/n+W/2)*s,cy=(r.z+D/2)*s,g=x.createRadialGradient(cx,cy,0,cx,cy,rad);g.addColorStop(0,`rgba(0,0,0,${Math.min(1,v*1.1).toFixed(2)})`);g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(cx-rad,cy-rad,rad*2,rad*2)}}
 const im=x.getImageData(0,0,cw,ch),d=im.data;for(let p=0;p<d.length;p+=4){const a=d[p+3]/255;if(a<.03){d[p+3]=0;continue}const q=ramp(Math.min(1,a)*(metric==='occ'?.68:1));d[p]=q[0];d[p+1]=q[1];d[p+2]=q[2];d[p+3]=Math.round(Math.min(1,a*1.2)*175)}
 x.putImageData(im,0,0);return HT[key]=new THREE.CanvasTexture(c)}
function signTex(){const c=document.createElement('canvas');c.width=512;c.height=64;const x=c.getContext('2d');x.fillStyle='#1B5E20';x.fillRect(0,0,512,64);x.fillStyle='#A5D6A7';x.fillRect(0,0,10,64);x.fillStyle='#fff';x.font='600 30px Inter,system-ui,sans-serif';x.textBaseline='middle';x.fillText('TECTONIC',34,34);x.fillStyle='#A5D6A7';x.font='500 16px system-ui,sans-serif';x.textAlign='right';x.fillText('Demo tower',496,34);return new THREE.CanvasTexture(c)}
const sgn=signTex();
// ---- dynamic building ----
const dyn=new THREE.Group();sc.add(dyn);
let inside=false,floor=2,rsel=null,pick=[],pulse=[],labels=[];
const clear=g=>{g.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material&&o.material.dispose&&!o.material.isSpriteMaterial)o.material.dispose()});g.clear()};
function furn(r,w,d,g,st){const wd=mat('#EEF3EB'),dk=mat('#22382A'),ch=mat('#86B48D'),add=(a,b,c,m,x,y,z)=>g.add(box(a,b,c,m,x,y,z,1));
 const plant=(x,z)=>{g.add(cyl(.11,.09,.24,8,mat('#9a8d7a'),x,.12,z),ball(.2,mat('#86a98a'),x,.42,z))};
 if(r.type==='open'){for(let a=0;a<4;a++)for(let b=0;b<2;b++){const x=-w/2+1.1+a*1.7,z=-.7+b*1.5;add(1.1,.36,.6,wd,x,.18,z);add(.32,.22,.04,dk,x,.47,z-.18);add(.3,.28,.3,ch,x,.14,z+.55)}plant(w/2-.4,-d/2+.4)}
 else if(r.type==='meeting'){add(Math.min(2,w-1),.4,.9,wd,0,.2,0);[-.6,0,.6].forEach(k=>{add(.3,.3,.3,ch,k,.15,-.8);add(.3,.3,.3,ch,k,.15,.8)});plant(w/2-.35,d/2-.35)}
 else if(r.type==='cabin'){add(1.3,.4,.6,wd,0,.2,-d/4);add(.32,.22,.04,dk,0,.5,-d/4-.18);add(.3,.3,.3,ch,0,.15,-d/4+.6)}
 else if(r.type==='pantry'){add(Math.min(3,w-1),.5,.5,wd,0,.25,-d/2+.4);[-.8,0,.8].forEach(k=>add(.28,.4,.28,ch,k,.2,-d/2+1.1));plant(w/2-.4,d/2-.4)}
 else if(r.type==='utility')add(.8,.6,.5,mat('#DCE6DA'),0,.3,-d/2+.5);
 if(r.type!=='corridor')add(Math.min(w*.5,3),.03,d*.35,mat('#ffffff',{emissive:st.lights?'#fff3d0':'#000000',emissiveIntensity:.6}),0,WH-.03,0)}
function build(){clear(dyn);pick=[];pulse=[];labels=[];lbl.innerHTML='';
 const n=inside?floor+1:FL,h=n*F,mm=mat(th.charcoal,{metalness:.3,roughness:.6}),sp=[];
 for(let k=0;k<=8;k++){const x=-W/2+k*(W/8);sp.push([x,-D/2],[x,D/2])}for(let k=1;k<4;k++){const z=-D/2+k*(D/4);sp.push([-W/2,z],[W/2,z])}
 sp.forEach(p=>dyn.add(box(.08,h,.08,mm,p[0],h/2,p[1],1)));
 [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(c=>dyn.add(box(.24,h,.24,mat(th.concrete),c[0]*W/2,h/2,c[1]*D/2,1)));
 // entrance
 dyn.add(box(3.2,.1,1.4,mat(th.charcoal),0,F*.8,D/2+.7,1),box(.1,F*.8,.1,mat(th.charcoal),-1.45,F*.4,D/2+1.3,1),box(.1,F*.8,.1,mat(th.charcoal),1.45,F*.4,D/2+1.3,1),box(4,.12,1.6,mat(th.concrete),0,.06,D/2+1.4,1),
  box(2.6,F*.7,.05,mat(th.glass,{transparent:true,opacity:.45,metalness:.1,roughness:.25}),0,F*.35+SL,D/2+.04));
 const sg=new THREE.Mesh(new THREE.PlaneGeometry(2.88,.36),new THREE.MeshBasicMaterial({map:sgn,transparent:true}));sg.position.set(0,2,D/2+.1);dyn.add(sg);
 const sm=mat(th.concrete),tm=mat(th.charcoal);
 for(let i=0;i<FL;i++){if(inside&&i>floor)continue;
  const g=new THREE.Group();g.position.y=i*F;
  const sl=box(W+.3,SL,D+.3,mat(th.slab),0,SL/2,0,1);sl.userData.floor=i;g.add(sl);if(!inside)pick.push(sl);
  g.add(box(W,.3,.06,sm,0,SL+.15,D/2),box(W,.3,.06,sm,0,SL+.15,-D/2),box(.06,.3,D,sm,W/2,SL+.15,0),box(.06,.3,D,sm,-W/2,SL+.15,0));
  const ty=SL+(F-SL)*.62;g.add(box(W,.04,.05,tm,0,ty,D/2),box(W,.04,.05,tm,0,ty,-D/2),box(.05,.04,D,tm,W/2,ty,0),box(.05,.04,D,tm,-W/2,ty,0));
  if(!(inside&&i===floor)){const gm=mat(th.glass,{transparent:true,opacity:inside?.08:.27,metalness:.1,roughness:.3,depthWrite:false}),gl=box(W,F-SL,D,gm,0,SL+(F-SL)/2,0);gl.renderOrder=1;gl.userData.floor=i;g.add(gl);if(!inside){pick.push(gl);pulse.push({m:gm,waste:false,sel:i===floor,fl:i});if(wasteF[i]){const rm=mat(th.waste);g.add(box(W+.34,.06,.08,rm,0,SL*.5,D/2+.15),box(.08,.06,D+.34,rm,W/2+.15,SL*.5,0))}}}
  if(heat[i]){const hp=new THREE.Mesh(new THREE.PlaneGeometry(W,D),new THREE.MeshBasicMaterial({map:heatTex(i),transparent:true,depthWrite:false,fog:false}));hp.rotation.x=-Math.PI/2;hp.position.y=SL+.09;hp.renderOrder=2;g.add(hp)}
  if(!inside){const e=document.createElement('div');e.className='fl'+(wasteF[i]?' w':'');e.textContent=(wasteF[i]?'▲ ':'')+(i+1)+'F';lbl.appendChild(e);labels.push({e,p:new THREE.Vector3(-W/2-1.1,i*F+F*.5,D/2)})}
  dyn.add(g)}
 if(!inside){const g=new THREE.Group();g.position.y=FL*F;const dk=mat(th.charcoal),gr=mat('#C9DBCC'),dg=mat('#4F7D58'),pm=mat('#2E6B38');
  g.add(box(W+.4,.24,D+.4,dk,0,.12,0,1));
  [[W+.4,.4,.12,0,D/2+.2],[W+.4,.4,.12,0,-D/2-.2],[.12,.4,D+.4,W/2+.2,0],[.12,.4,D+.4,-W/2-.2,0]].forEach(a=>g.add(box(a[0],a[1],a[2],pm,a[3],.44,a[4],1)));
  g.add(box(2.4,1.3,2,gr,-4.2,.89,-1.5,1),box(.5,.8,.04,dk,-4.2,.64,-.49),cyl(.6,.6,1.1,16,gr,3.8,.8,-2.4),cyl(.62,.62,.08,16,dg,3.8,1.38,-2.4));
  [[0,-2],[2,1.6],[4.5,1.5]].forEach(p=>g.add(box(1.6,.5,1.2,gr,p[0],.5,p[1],1),cyl(.42,.42,.06,16,dg,p[0],.78,p[1])));
  const so=mat('#2B4C3B',{metalness:.3,roughness:.5});
  [-5.6,-4.2,-2.8,-1.4].forEach(x=>[1.8,3].forEach(z=>{const p=box(1.3,.05,.8,so,x,.62,z,1);p.rotation.x=-.35;g.add(p,box(.05,.3,.05,pm,x,.4,z+.2))}));
  g.add(cyl(.04,.06,3.2,8,gr,5.5,1.8,3),ball(.1,mat('#66BB6A',{emissive:'#66BB6A',emissiveIntensity:.6}),5.5,3.45,3));
  dyn.add(g);return}
 const rg=new THREE.Group();rg.position.y=floor*F+SL;dyn.add(rg);
 for(const r of rooms(floor)){const id=rid(floor,r.key),st=ST[id],s=stat(r,st),w=r.w-.12,d=r.d-.12,sel=rsel===id,g=new THREE.Group();g.position.set(r.x,0,r.z);
  const tl=mat(th[s]);g.add(box(w,.06,d,tl,0,.03,0));pulse.push({m:tl,waste:s==='waste'});if(s==='waste')g.add(box(w,.07,.1,mat(th.waste),0,.035,d/2-.05),box(w,.07,.1,mat(th.waste),0,.035,-d/2+.05));
  const hb=box(w,WH,d,mat(sel?'#A5D6A7':'#ffffff',{transparent:true,opacity:sel?.25:.05,depthWrite:false}),0,WH/2,0);hb.userData.room=r;pick.push(hb);g.add(hb);
  const ed=new THREE.LineSegments(new THREE.EdgesGeometry(hb.geometry),new THREE.LineBasicMaterial({color:sel?th.select:th.wall}));ed.position.copy(hb.position);g.add(ed);
  furn(r,w,d,g,st);
  const cols=Math.max(1,Math.floor((w-.8)/.5));
  for(let k=0;k<Math.min(st.occ,14);k++){const p=new THREE.Group(),pm=mat(th.people);p.add(cyl(.1,.1,.35,8,pm,0,.22,0),ball(.1,pm,0,.47,0));p.position.set(-w/2+.5+(k%cols)*.5,0,d/2-.5-Math.floor(k/cols)*.5);g.add(p)}
  g.add(ball(.12,mat(st.lights?'#f0dc9a':'#B9C7BA',{emissive:st.lights?'#d9b84a':'#000000',emissiveIntensity:.5}),0,WH-.1,0));
  if(r.type!=='corridor')g.add(box(.5,.2,.2,mat(st.ac?'#66BB6A':'#C9D5C8',{emissive:st.ac?'#66BB6A':'#000000',emissiveIntensity:st.ac?.3:0}),w/2-.35,WH-.25,-d/2+.2));
  rg.add(g);
  const e=document.createElement('div');e.textContent=(s==='waste'?'▲ ':'')+r.name+(r.cap?' · '+st.occ:'');if(s==='waste')e.className='w';lbl.appendChild(e);labels.push({e,p:new THREE.Vector3(r.x,floor*F+SL+WH+.45,r.z)})}}
// ---- camera ----
const pos=()=>{const k=Math.min(2.2,Math.max(1,1.15/cam.aspect));return inside?[0,floor*F+W*.85*k,D*1.25*k]:[W*1.3*k,FL*F*.8+5,W*1.75*k]},tgt=()=>inside?[0,floor*F+.2,0]:[0,FL*F*.42,0];
const goal={on:false,p:new THREE.Vector3(),t:new THREE.Vector3()};
const fly=()=>{goal.p.set(...pos());goal.t.set(...tgt());goal.on=true};
const ctl=new THREE.OrbitControls(cam,cv);ctl.enableDamping=true;ctl.enableZoom=false;ctl.enablePan=false;ctl.minDistance=6;ctl.maxDistance=140;ctl.maxPolarAngle=Math.PI/2.05;ctl.autoRotate=!reduce;ctl.autoRotateSpeed=.5;
cv.style.touchAction='pan-y';
let idle;ctl.addEventListener('start',()=>{goal.on=false;ctl.autoRotate=false;clearTimeout(idle);idle=setTimeout(()=>{ctl.autoRotate=!inside&&!reduce},5000)});
// ---- UI ----
const fb=g$('fb');for(let i=FL-1;i>=0;i--){const b=document.createElement('button');b.className='b b2';b.textContent=(i+1)+'F';b.setAttribute('aria-label','Select floor '+(i+1));b.onclick=()=>pickFloor(i);fb.appendChild(b)}
const hc=g$('hchips'),ha=g$('hall'),hb=g$('hmb');
for(let i=FL-1;i>=0;i--){const b=document.createElement('button');b.className='chip';b.textContent=(i+1)+'F';b.dataset.f=i;b.setAttribute('aria-pressed','false');b.setAttribute('aria-label','Toggle heatmap for floor '+(i+1));b.onclick=()=>{heat[i]=!heat[i];hsync();build()};hc.appendChild(b)}
function hsync(){[...hc.children].forEach(b=>{const on=heat[b.dataset.f];b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});ha.checked=heat.every(Boolean);const any=heat.some(Boolean);hb.setAttribute('aria-pressed',any);hb.classList.toggle('on',any)}
ha.onchange=()=>{heat.fill(ha.checked);hsync();build()};
hb.onclick=()=>{heat.fill(!heat.some(Boolean));hsync();build()};
const HL={energy:{a:'Low use',b:'▲ Waste',d:'Energy intensity per room. Amber to red only where a room is running while empty.',st:RAMP},occ:{a:'Empty',b:'Full',d:'Room utilization (people ÷ capacity). Green only; no waste colors in this view.',st:RAMPOCC}};
function hleg(){const h=HL[metric];g$('hl1').textContent=h.a;g$('hl2').textContent=h.b;g$('hdesc').textContent=h.d;const mx=h.st[h.st.length-1][0];g$('hramp').style.background='linear-gradient(90deg,'+h.st.map(x=>`rgb(${x[1].join(',')}) ${Math.round(x[0]/mx*100)}%`).join(',')+')'}
g$('hmet').onclick=e=>{const m=e.target.dataset.m;if(!m)return;metric=m;[...g$('hmet').children].forEach(b=>b.classList.toggle('on',b.dataset.m===m));hleg();build()};
const SX={occupied:'In use',idle:'Idle',waste:'▲ Waste: empty but running'};
function ui(){g$('vo').classList.toggle('on',!inside);g$('vi').classList.toggle('on',inside);[...fb.children].forEach((b,k)=>b.classList.toggle('on',FL-1-k===floor));
 g$('hint').textContent=inside?'Click a room for details. Drag to rotate.':'Click a floor, double-click to go inside. Drag to rotate.';
 const c=g$('rc');if(!rsel){c.hidden=true;return}const r=rooms(floor).find(x=>rid(floor,x.key)===rsel),st=ST[rsel];
 c.innerHTML=`<b>${r.name}</b> (Floor ${floor+1})<br>People: ${st.occ}<br>Lights: ${st.lights?'on':'off'} · AC: ${st.ac?'on':'off'}<br>Load: ${(watts(r,st)/1000).toFixed(2)} kW<br>Status: <b>${SX[stat(r,st)]}</b><br><span class="m">Demo data</span>`;c.hidden=false}
let fpf=-1;const fp=g$('fp');
function fsum(i){const rs=rooms(i),rr=rs.filter(r=>r.type!=='corridor');let ppl=0,cap=0,kw=0,li=0,ac=0;const fl=[];for(const r of rs){const st=ST[rid(i,r.key)];kw+=watts(r,st)/1000;if(r.type==='corridor')continue;ppl+=st.occ;cap+=r.cap;if(st.lights)li++;if(st.ac)ac++;if(stat(r,st)==='waste')fl.push(r.name)}return{rooms:rr.length,ppl,cap,kw,li,ac,fl}}
function fpShow(i){fpf=i;const s=fsum(i);fp.innerHTML=`<button class="fx" aria-label="Close floor summary">×</button><h3>${i===0?'Ground floor':'Floor '+(i+1)}</h3>
<div class="kv"><span>Rooms</span><b>${s.rooms}</b></div><div class="kv"><span>People</span><b>${s.ppl} / ${s.cap} (${s.cap?Math.round(s.ppl/s.cap*100):0}%)</b></div><div class="kv"><span>Lights on</span><b>${s.li} of ${s.rooms}</b></div><div class="kv"><span>AC on</span><b>${s.ac} of ${s.rooms}</b></div><div class="kv"><span>Est. load</span><b>${s.kw.toFixed(1)} kW</b></div>
${s.fl.length?`<p class="fw">▲ ${s.fl.length} flagged: ${s.fl.join(', ')} (empty but running)</p>`:'<p class="fok">No waste flagged</p>'}
<button class="b b2" type="button">Enter floor</button><p class="m" style="margin:6px 0 0;font-size:11px">Demo data</p>`;
 fp.querySelector('.fx').onclick=fpHide;fp.querySelector('.b').onclick=()=>{fpHide();enter(i)};fp.hidden=false}
function fpHide(){fpf=-1;fp.hidden=true}
function pickFloor(i){floor=i;rsel=null;build();fly();ui();if(!inside)fpShow(i)}
function setView(v){inside=v==='inside';rsel=null;fpHide();ctl.autoRotate=!inside&&!reduce;build();fly();ui()}
function enter(i){floor=i;setView('inside')}
g$('vo').onclick=()=>setView('outside');g$('vi').onclick=()=>setView('inside');
window.TT3D={zoomIn(){const t=new THREE.Vector3(...tgt()),p=new THREE.Vector3(...pos());goal.t.copy(t);goal.p.copy(t).add(p.sub(t).multiplyScalar(.46));goal.on=true;ctl.autoRotate=false;clearTimeout(idle)},
 zoomOut(instant){ctl.autoRotate=!inside&&!reduce;fly();if(instant){cam.position.copy(goal.p);ctl.target.copy(goal.t);goal.on=false}}};
// ---- picking ----
const rc=new THREE.Raycaster(),m2=new THREE.Vector2();let dn=null;
const hit=e=>{const b=cv.getBoundingClientRect();m2.set((e.clientX-b.left)/b.width*2-1,-((e.clientY-b.top)/b.height)*2+1);rc.setFromCamera(m2,cam);const h=rc.intersectObjects(pick,false)[0];return h&&h.object.userData};
cv.addEventListener('pointerdown',e=>{dn=[e.clientX,e.clientY]});
cv.addEventListener('pointermove',e=>{if(e.buttons)return;const u=hit(e);hov=!inside&&u&&u.floor!=null?u.floor:-1;cv.style.cursor=u?'pointer':'grab'});
cv.addEventListener('pointerup',e=>{if(!dn||Math.hypot(e.clientX-dn[0],e.clientY-dn[1])>5)return;const u=hit(e);
 if(u&&u.room){rsel=rid(floor,u.room.key);fpHide();build();ui()}else if(u&&u.floor!=null)pickFloor(u.floor);else{if(rsel){rsel=null;build();ui()}fpHide()}});
cv.addEventListener('dblclick',e=>{const u=hit(e);if(!inside&&u&&u.floor!=null)enter(u.floor)});
// ---- sizing, visibility, loop ----
function rs(){const w=hero.clientWidth,h=hero.clientHeight;if(!w||!h)return;R.setSize(w,h,false);cam.aspect=w/h;if(w>900)cam.setViewOffset(w,h,-w*.13,0,w,h);else cam.clearViewOffset();cam.updateProjectionMatrix();if(!goal.on&&cam.position.length()>0)fly()}
cam.aspect=hero.clientWidth/hero.clientHeight||1.6;cam.position.set(...pos());ctl.target.set(...tgt());ctl.update();
new ResizeObserver(rs).observe(hero);rs();
let vis=true;new IntersectionObserver(e=>{vis=e[0].isIntersecting}).observe(hero);
const clk=new THREE.Clock(),v3=new THREE.Vector3();
build();ui();hsync();hleg();
(function loop(){requestAnimationFrame(loop);if(!vis)return;const t=clk.getElapsedTime();
 if(goal.on){cam.position.lerp(goal.p,.07);ctl.target.lerp(goal.t,.07);if(cam.position.distanceTo(goal.p)<.05)goal.on=false}
 ctl.update();
 if(!reduce)for(const s of clouds){s.position.x+=.012;if(s.position.x>110)s.position.x=-110}
 for(const p of pulse){if(p.waste){const k=reduce?1:.5+.5*Math.sin(t*4);p.m.emissive.setRGB(.28*k,.02*k,.02*k)}else if(p.sel)p.m.emissive.set('#66BB6A').multiplyScalar(.22);else if(p.fl===hov)p.m.emissive.set('#66BB6A').multiplyScalar(.1);else p.m.emissive.setRGB(0,0,0)}
 R.render(sc,cam);
 const w=cv.clientWidth,h=cv.clientHeight;
 if(fpf>=0&&!fp.hidden){v3.set(W/2+.4,fpf*F+F*.6,D/2).project(cam);const fw=fp.offsetWidth,fh=fp.offsetHeight;let x=(v3.x*.5+.5)*w+16,y=(-v3.y*.5+.5)*h-fh/2;if(x+fw>w-8)x=(v3.x*.5+.5)*w-fw-16;x=Math.max(8,Math.min(w-fw-8,x));y=Math.max(104,Math.min(h-fh-8,y));fp.style.transform=`translate(${x}px,${y}px)`}
 for(const l of labels){v3.copy(l.p).project(cam);l.e.style.display=v3.z<1?'block':'none';l.e.style.left=((v3.x*.5+.5)*w)+'px';l.e.style.top=((-v3.y*.5+.5)*h)+'px'}
})();
}catch(err){console.warn('3D hero unavailable',err);const c=document.getElementById('c3');if(c)c.style.display='none'}})();
