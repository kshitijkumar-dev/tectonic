const H=12,PL={1:'1 day',7:'1 week',30:'1 month'};
// id,floor,name,type,capacity,occupancy,lightW,hvacW,daylightExposure,hvacMultiplier
const RAW=[[101,1,'Lobby','circulation',20,3,400,1200,.6],[102,1,'Open Workspace','workspace',30,18,900,2500,.5],[103,1,'Meeting Room A','meeting',10,6,300,900,.3],[104,1,'Design Office','office',12,9,450,1100,.7],[105,1,'Meeting Room B','meeting',8,4,250,800,.2],[106,1,'Pantry','shared',6,2,200,500,.2],
[201,2,'Analytics Office','office',12,8,450,1100,.4,1.8],[202,2,'Open Workspace','workspace',28,15,850,2300,.5],[203,2,'Meeting Room C','meeting',10,5,300,900,.3],[204,2,'Collab Hub','shared',8,3,300,800,.5],[205,2,'Sunlit Office','office',14,10,600,1200,.95],[206,2,'Pantry','shared',6,1,200,500,.2],
[301,3,'Open Workspace','workspace',30,2,900,2500,.5],[302,3,'Conference Room','meeting',12,0,500,1400,.4],[303,3,'Office','office',12,1,450,1100,.6],[304,3,'Meeting Room D','meeting',8,0,250,800,.3],[305,3,'Exec Office','office',6,0,300,700,.7],[306,3,'Pantry','shared',6,0,200,500,.2],
[401,4,'Open Workspace','workspace',30,17,900,2500,.5],[402,4,'Product Office','office',12,7,450,1100,.6],[403,4,'Meeting Room E','meeting',10,4,300,900,.3],[404,4,'Collab Hub','shared',8,3,300,800,.5],[405,4,'Design Studio','office',14,9,600,1200,.6],[406,4,'Pantry','shared',6,2,200,500,.2],
[501,5,'Open Workspace','workspace',28,14,850,2300,.5],[502,5,'Engineering Office','office',12,8,450,1100,.6],[503,5,'Meeting Room F','meeting',10,5,300,900,.3],[504,5,'War Room','meeting',8,3,250,800,.3],[505,5,'Training Room','meeting',16,0,500,1400,.4],[506,5,'Pantry','shared',6,2,200,500,.2],
[601,6,'Boardroom','meeting',14,6,450,1300,.5],[602,6,'Exec Office','office',8,3,300,700,.6],[603,6,'Finance Office','office',12,7,450,1100,.6],[604,6,'Open Workspace','workspace',24,11,800,2000,.5],[605,6,'Meeting Room G','meeting',8,3,250,800,.3],[606,6,'Pantry','shared',6,1,200,500,.2]];
const ph=s=>{let x=0;for(const c of s)x=(x*31+c.charCodeAt(0))>>>0;return x};
const mk=()=>RAW.map(a=>({idle:a[5]===0?240:0,rf:.75+.25*((ph(String(a[0]))%100)/100),id:String(a[0]),f:a[1],name:a[2],type:a[3],cap:a[4],occ:a[5],lw:a[6],hw:a[7],sun:a[8],hm:a[9]||1,lon:1,hon:1,dim:1,hs:1}));
const BASE=mk(),DP=()=>({lights:1,dimOn:1,dim:40,setback:60,fix:0,only:null});
let S={rooms:mk(),hour:14,period:1,tariff:8,ef:.71,floor:3,sel:'302',view:'overview',dis:[],log:[],lastV:null,P:DP(),pred:null,chat:[]};
const $=id=>document.getElementById(id);
const kwh=r=>(r.lw*r.dim*r.lon+r.hw*r.hon*r.hm*r.hs)*H/1000;
const tot=rs=>rs.reduce((a,r)=>a+kwh(r),0);
const dl=(r,h)=>r.sun*Math.max(0,Math.sin(Math.PI*(h-6)/12));
const cat=v=>v>=.6?'High':v>=.3?'Moderate':'Low';
const f1=n=>n.toFixed(1),inr=k=>'₹'+Math.round(k*S.tariff*S.period).toLocaleString('en-IN'),co2=k=>f1(k*S.ef*S.period)+' kg',kp=k=>f1(k*S.period)+' kWh',hh=()=>tm(S.min);
const room=id=>S.rooms.find(r=>r.id===id);

function alerts(){const out=[];
 for(const r of S.rooms){const f=[],pre={};let kw=0,conf='High',sev=0;const empty=r.occ===0,d=dl(r,S.hour);
  if(empty&&r.idle>=10&&r.lon&&r.dim>0&&r.type!=='circulation'){kw+=r.lw*r.dim*H/1000;f.push(`Empty (0/${r.cap}) but lighting is on at ${Math.round(r.dim*100)}%`);pre.lights=1}
  if(empty&&r.idle>=15&&r.hon&&r.hs>.5){kw+=r.hw*r.hm*r.hs*H/1000*.6;f.push(`Empty but HVAC is running (${r.hw} W rated)`);pre.setback=60}
  if(!empty&&r.lon&&r.dim>.7&&d>=.6){kw+=r.lw*(r.dim-.4)*H/1000;f.push(`Daylight is ${cat(d).toLowerCase()} (${Math.round(d*100)}%) but lights are at ${Math.round(r.dim*100)}%`);pre.dim=40;conf='Medium'}
  if(r.hm>1.3){kw+=r.hw*r.hs*(r.hm-1)*H/1000;f.push(`HVAC draws ${Math.round((r.hm-1)*100)}% above this room's baseline`);pre.fix=1;conf='Medium';sev=1}
  if(f.length&&!S.dis.includes('R-'+r.id))out.push({id:'R-'+r.id,rooms:[r.id],f,kw,pre,conf,sev:kw>=4?2:(kw>=1.5||sev)?1:0})}
 for(const fl of [1,2,3,4,5,6]){const rs=S.rooms.filter(r=>r.f===fl),o=rs.reduce((a,r)=>a+r.occ,0),c=rs.reduce((a,r)=>a+r.cap,0),act=rs.filter(r=>r.occ===0&&r.idle>=15&&r.hon&&r.hs>.5);
  if(o/c<.15&&act.length>=3&&!S.dis.includes('F-'+fl))out.push({id:'F-'+fl,roll:1,rooms:act.map(r=>r.id),f:[`Floor ${fl} is at ${Math.round(o/c*100)}% occupancy with ${act.length} empty zones still conditioned`],kw:0,pre:{lights:1,setback:60},conf:'High',sev:1})}
 return out.sort((a,b)=>b.sev-a.sev||b.kw-a.kw||a.id.localeCompare(b.id))}
const SV=['Low','Medium','High'];
const stat=id=>{const a=alerts().filter(x=>!x.roll&&x.rooms.includes(id));return !a.length?['green','✓ Efficient']:a.some(x=>x.sev===2)?['red','▲ High waste']:['amber','◆ Review']};
const presetP=a=>({lights:a.pre.lights?1:0,dimOn:a.pre.dim?1:0,dim:40,setback:a.pre.setback||0,fix:a.pre.fix?1:0,only:a.rooms});

function simulate(p){const rs=S.rooms.map(r=>({...r}));
 for(const r of rs){if(p.only&&!p.only.includes(r.id))continue;
  if(p.lights&&r.occ===0&&r.type!=='circulation')r.lon=0;
  if(p.dimOn&&r.occ>0&&r.lon&&dl(r,S.hour)>=.6&&r.dim>p.dim/100)r.dim=p.dim/100;
  if(p.setback&&r.occ===0&&r.hs>.5)r.hs=Math.min(r.hs,1-p.setback/100);
  if(p.fix)r.hm=1}
 return rs}
function approve(P,aid,pred){const s=simulate(P),b=tot(S.rooms),a=tot(s);
 if(b-a<.001){toast('No change under these settings');return}
 S.rooms=s;const e={id:'INT-'+(S.log.length+1),aid:aid||'manual',scope:P.only?P.only.join(', '):'All rooms',b,a,pred,hour:S.hour};
 S.log.push(e);S.lastV=e;S.view='report';render();toast('Applied in the demo only. No real equipment was touched.')}
function toast(t){const e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(toast.t);toast.t=setTimeout(()=>e.style.display='none',3200)}

function hdr(t){return `<div class=top><div><h1>${t}</h1><p class=m style="margin:2px 0 0">Tectonic Tower · Bengaluru · fictional building</p></div><div class=r><span class="t demo">DEMO MODE · SIMULATED BUILDING DATA</span><div class=clock><i class=dot></i><b class="mono clkx">${hh()}</b><span class=m>Simulated</span><button class=ib data-a=play aria-label="${SIM.run?'Pause':'Play'} simulation">${SIM.run?'❚❚':'▶'}</button></div><div class=seg role=group aria-label="Simulation speed">${[1,5,20].map(v=>`<button data-a=spd data-v=${v} class="${SIM.speed===v?'on':''}">${v}x</button>`).join('')}</div><select data-in=period aria-label="Reporting period">${[1,7,30].map(p=>`<option value=${p} ${S.period==p?'selected':''}>${PL[p]}</option>`).join('')}</select><button class="b b2" data-a=reset>Reset demo</button></div></div>`}
const tag=a=>`<span class="t ${['green','amber','red'][a.sev]}">${['✓','◆','▲'][a.sev]} ${SV[a.sev]}</span>`;
function card(a){const rm=a.rooms.length>1?`Rooms ${a.rooms.join(', ')}`:`Room ${a.rooms[0]}`;
 return `<div class=card style="margin:8px 0"><div class=top style="margin:0"><b>${a.roll?'Floor rollup':rm}</b>${tag(a)}</div><p class=m>Evidence</p><ul style="margin:0;padding-left:18px">${a.f.map(x=>`<li>${x}</li>`).join('')}</ul>
 <p><b>Action:</b> ${a.pre.fix?'Inspect and correct the HVAC fault':[a.pre.lights?'switch off lights':'',a.pre.setback?'set back HVAC by '+a.pre.setback+'%':'',a.pre.dim?'dim lights to 40%':''].filter(Boolean).join(', ')}.</p>
 <p class=m>${a.roll?'Overlaps the room alerts, not counted twice':`Avoidable ~${f1(a.kw)} kWh/day · ${kp(a.kw)} · ${inr(a.kw)} over ${PL[S.period]}`} · Confidence ${a.conf}</p>
 <div class=r><button class="b b2" data-a=sim data-v=${a.id}>Simulate</button><button class=b data-a=ap data-v=${a.id}>Approve (demo)</button><button class="b b2" data-a=dis data-v=${a.id}>Dismiss</button></div></div>`}

const V={
overview(){const KS=[['occ','Occupancy','M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM21 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',''],['pw','Power now','M13 2 4 14h7l-1 8 9-12h-7z','kW'],['en','Energy today','M3 12h4l3-8 4 16 3-8h4','kWh'],['co','Est. cost today','M6 4h12M6 9h12M9 4c4 0 6 2 6 5s-2 5-6 5l7 6','today'],['cb','Est. carbon today','M6 18a5 5 0 0 1 1-9.9A6 6 0 0 1 18.7 10 4 4 0 0 1 18 18z','kg CO₂e']];
 return hdr('Command Center')+`<div class=ov>
 <div class="card sum"><p id=sump></p><div class=r><button class=b data-a=nav data-v=twin>Open Digital Twin</button><button class="b b2" data-a=nav data-v=sim>Open Simulator</button></div></div>
 <div class=kr>${KS.map(kpiCard).join('')}</div>
 <div class=r2>
  <div class=card><div class=top style="margin-bottom:8px"><div><h3 style="margin:0">Power demand</h3><span class=m>Last 60 simulated minutes · modeled kW</span></div><span class=t><b id=cp class=mono>0</b> kW now</span></div><div class=ch><svg id=cs viewBox="0 0 720 240" role=img aria-label="Power demand over the last 60 simulated minutes"></svg><div class=tip id=tip hidden></div></div></div>
  <div class=card><h3>Savings potential</h3>
   <div class=ring><svg width=140 height=140 viewBox="0 0 140 140" aria-hidden=true><circle cx=70 cy=70 r=52 fill=none stroke-width=12 style="stroke:var(--pg)"/><circle id=rg cx=70 cy=70 r=52 fill=none stroke-width=12 stroke-linecap=round transform="rotate(-90 70 70)" stroke-dasharray="0 327" style="stroke:var(--dg);transition:stroke-dasharray .6s"/></svg><b><span id=sv-pc>0</span>%</b><small>of daily use</small></div>
   <div class=sr><span>Avoidable energy</span><span><b id=sv-kwh>0</b> kWh/day</span></div>
   <div class=sr><span>Estimated cost</span><span><b id=sv-cost>0</b>/day</span></div>
   <div class=sr><span>Estimated carbon</span><span><b id=sv-co2>0</b> kg/day</span></div>
   <div class=sr><span>Open issues</span><span id=sv-n></span></div>
   <div class=sr><span>Over period</span><span id=sv-per></span></div>
   <div class=sr><span>Modeled so far</span><span id=sv-done></span></div>
   <button class=b style="width:100%;margin-top:12px" data-a=fixall>Fix top issues</button><p class=m style="margin:8px 0 0">Potential only. Simulated, not measured or verified.</p></div>
 </div>
 <div class=r3>
  <div class=card><h3>Floors</h3><p class=m style="margin-bottom:6px">Power now, occupancy and flagged rooms</p>${[6,5,4,3,2,1].map(floorRow).join('')}</div>
  <div class=card><div class=top style="margin-bottom:4px"><h3 style="margin:0">Priority issues</h3><span class=m>Severity first, then avoidable energy</span></div><div id=feed></div><p class=m id=feedempty hidden>No open issues. Everything is within the configured rules.</p></div>
 </div></div>`},
twin(){return hdr('Digital Twin')+`<div class=card style="margin-bottom:12px;padding:14px 20px"><p class=m style="margin:0">Live view at <b class="mono clkx">${hh()}</b> (simulated). Occupancy and daylight follow the simulated clock. Use the header controls to pause or speed it up.</p></div><div id=tb>${twinBody()}</div>`},
intel(){return hdr('Intelligence')+'<div id=ib>'+ibody()+'</div>'},
sim(){return hdr('What-if Simulator')+`<div class="g g2"><div class=card><h3>Scenario</h3><p class=m>Scope: ${S.P.only?'Rooms '+S.P.only.join(', ')+' ':'All rooms '}${S.P.only?'<button class="b b2" data-a=scopeall>Use all rooms</button>':''}</p>
 <label><input type=checkbox data-in=lights ${S.P.lights?'checked':''}> Lights off in empty rooms (lobby excluded)</label>
 <label><input type=checkbox data-in=dimOn ${S.P.dimOn?'checked':''}> Dim in sunlit occupied rooms to <b id=dv>${S.P.dim}</b>%</label><input type=range min=30 max=90 value=${S.P.dim} data-in=dim aria-label="Dim level">
 <label>HVAC setback in empty rooms: <b id=sv>${S.P.setback}</b>%</label><input type=range min=0 max=80 value=${S.P.setback} data-in=setback aria-label="HVAC setback">
 <label><input type=checkbox data-in=fix ${S.P.fix?'checked':''}> Fix HVAC anomaly (restore baseline draw)</label>
 <p class=m>Simulated time: ${hh()}. Floor consolidation is not built yet.</p></div><div class=card id=sr>${simRes()}</div></div>`},
agent(){const chips=['Why is the building wasting energy?','Explain Room 302','What should I fix first?'];
 return hdr('AI Energy Agent')+`<div class=card><p class=m>Rule-based assistant. No live language model is connected. Every number comes from the calculation engine and is simulated.</p><div class=r>${chips.map(c=>`<button class="b b2" data-a=ask data-v="${c}">${c}</button>`).join('')}</div>
 <div class=chat aria-live=polite>${S.chat.map(m=>m.u?`<div class="msg u">${m.t}</div>`:`<div class="msg a">${m.t}${m.c.map(id=>{const a=alerts().find(x=>x.id===id);return a?card(a):''}).join('')}</div>`).join('')||'<p class=m>Ask something or tap a suggestion.</p>'}</div>
 <form class=r onsubmit="event.preventDefault();ask(this.q.value);">${'<input name=q aria-label="Ask the agent" style="flex:1;min-width:180px;font:inherit;padding:8px;border:1px solid var(--bd);border-radius:8px;background:var(--surf);color:var(--tx)" placeholder="e.g. explain room 205">'}<button class=b>Ask</button></form></div>`},
report(){const sv=S.log.reduce((s,e)=>s+e.b-e.a,0),b=tot(S.rooms),v=S.lastV;
 return hdr('Reports')+(v?`<div class=card style="margin-bottom:12px"><h3>Verification: ${v.id} <span class="t demo">SIMULATED, NOT MEASURED</span></h3><p>Scope: ${v.scope}. Alert: ${v.aid}.</p><table><tr><th></th><th>Before</th><th>Modeled after</th><th>Change</th></tr><tr><td>kWh/day</td><td>${f1(v.b)}</td><td>${f1(v.a)}</td><td>-${f1(v.b-v.a)}</td></tr><tr><td>Cost (${PL[S.period]})</td><td>${inr(v.b)}</td><td>${inr(v.a)}</td><td>-${inr(v.b-v.a)}</td></tr><tr><td>CO₂e (${PL[S.period]})</td><td>${co2(v.b)}</td><td>${co2(v.a)}</td><td>-${co2(v.b-v.a)}</td></tr></table>
 <p>${v.pred!=null?(v.b-v.a>=v.pred*.95?`<b class=green>✓ Expected saving met:</b> predicted ${f1(v.pred)} kWh/day, modeled ${f1(v.b-v.a)}.`:`<b class=amber>◆ Below prediction:</b> predicted ${f1(v.pred)}, modeled ${f1(v.b-v.a)} kWh/day.`):'No prior prediction for a manual scenario.'}</p></div>`:'')+
 `<div class="g g2"><div class=card><h3>Modeled impact of approved actions</h3><table><tr><td>Actions approved</td><td>${S.log.length}</td></tr><tr><td>Energy saved (${PL[S.period]})</td><td>${kp(sv)}</td></tr><tr><td>Cost saved</td><td>${inr(sv)}</td></tr><tr><td>CO₂e saved</td><td>${co2(sv)}</td></tr><tr><td>Share of modeled use</td><td>${b?f1(sv/b*100):0}%</td></tr></table><p class=m>Simulated at approval time. Not measured or verified.</p></div>
 <div class=card><h3>Assumptions (editable)</h3><label>Tariff ₹/kWh <input type=number step=.1 min=0 value=${S.tariff} data-in=tariff style="width:90px"></label><label>Emissions kg CO₂e/kWh <input type=number step=.01 min=0 value=${S.ef} data-in=ef style="width:90px"></label><p class=m>Energy = (lighting W × level + HVAC W × schedule factor) × ${H} operating hours/day ÷ 1000. Longer periods are the daily figure multiplied out. HVAC is a simplified model, not thermal physics. Emissions are estimates, not verified reporting.</p></div></div>
 <div class=card><h3>Intervention history</h3>${S.log.length?`<table><tr><th>ID</th><th>Scope</th><th>Saved kWh/day</th></tr>${S.log.map(e=>`<tr><td>${e.id}</td><td>${e.scope}</td><td>${f1(e.b-e.a)}</td></tr>`).join('')}</table>`:'<p class=m>No actions yet. Approve a recommendation to see it here.</p>'}</div>`}};

function twinBody(){const rs=S.rooms.filter(r=>r.f===S.floor),sr=room(S.sel)||rs[0];
 const svg=rs.map((r,i)=>{const x=i%3*196+8,y=Math.floor(i/3)*126+8,[c,l]=stat(r.id),d=dl(r,S.hour);
  return `<g><rect class="rm ${c} ${r.id===S.sel?'sel':''}" x=${x} y=${y} width=188 height=118 rx=10 tabindex=0 role=button data-a=room data-v=${r.id} aria-label="Room ${r.id} ${r.name}, ${l}, ${r.occ} of ${r.cap} people"/><rect x=${x+8} y=${y+78} width=${Math.max(2,d*60)} height=6 rx=3 fill="#66BB6A" pointer-events=none /><text x=${x+12} y=${y+26} font-size=15 font-weight=600 pointer-events=none>${r.id} ${r.name}</text><text x=${x+12} y=${y+48} font-size=12 pointer-events=none>${r.occ}/${r.cap} people</text><text x=${x+12} y=${y+68} font-size=12 pointer-events=none>${r.lon?'Lights '+Math.round(r.dim*100)+'%':'Lights off'} · HVAC ${r.hon?Math.round(r.hs*100)+'%':'off'}</text><text x=${x+76} y=${y+84} font-size=11 pointer-events=none>☀ ${cat(d)}</text><text x=${x+12} y=${y+106} font-size=12 font-weight=600 class=${c} style="fill:currentColor" pointer-events=none>${l}</text></g>`}).join('');
 const a=alerts().find(x=>!x.roll&&x.rooms.includes(sr.id)),d=dl(sr,S.hour);
 return `<div class=tabs>${[1,2,3,4,5,6].map(f=>`<button class="b b2 ${f===S.floor?'on':''}" data-a=floor data-v=${f}>Floor ${f}</button>`).join('')}</div>
 <div class="g g2"><div class=card><svg viewBox="0 0 600 260" role=group aria-label="Floor ${S.floor} map" style="width:100%;height:auto">${svg}</svg></div>
 <div class=card><h3>Room ${sr.id}: ${sr.name}</h3><table><tr><td>Floor</td><td>${sr.f}</td></tr><tr><td>Occupancy</td><td>${sr.occ} / ${sr.cap} (simulated)</td></tr><tr><td>Lighting</td><td>${sr.lon?Math.round(sr.dim*100)+'% · '+Math.round(sr.lw*sr.dim)+' W':'Off'}</td></tr><tr><td>HVAC</td><td>${sr.hon?Math.round(sr.hs*100)+'% schedule · '+Math.round(sr.hw*sr.hm*sr.hs)+' W':'Off'}</td></tr><tr><td>Daylight</td><td>${cat(d)} (${Math.round(d*100)}%)</td></tr><tr><td>Energy</td><td>${f1(kwh(sr))} kWh/day · ${kp(kwh(sr))}</td></tr></table>
 ${a?`<p class=${['green','amber','red'][a.sev]}><b>${stat(sr.id)[1]}</b></p>${card(a)}`:'<p class=green><b>✓ Efficient.</b> No alerts for this room at this time.</p>'}</div></div>`}

function simRes(){const p=S.P,s=simulate(p),b=tot(S.rooms),a=tot(s),sv=b-a,w=[];
 if(p.dimOn&&p.dim<40)w.push('Dimming below 40% may miss task lighting needs.');if(p.setback>60)w.push('Deep HVAC setback can reduce ventilation. Check air quality rules.');if(sv<=.001)w.push('No change under these settings.');
 const fl=[1,2,3,4,5,6].map(f=>{const x=tot(S.rooms.filter(r=>r.f===f)),y=tot(s.filter(r=>r.f===f));return `<tr><td>Floor ${f}</td><td>${f1(x)}</td><td>${f1(y)}</td><td>${f1(x-y)}</td></tr>`}).join('');
 return `<h3>Result <span class="t demo">SIMULATION</span></h3><table><tr><th></th><th>Baseline</th><th>Proposed</th></tr><tr><td>Energy</td><td>${kp(b)}</td><td>${kp(a)}</td></tr><tr><td>Cost</td><td>${inr(b)}</td><td>${inr(a)}</td></tr><tr><td>CO₂e</td><td>${co2(b)}</td><td>${co2(a)}</td></tr></table>
 <p><b class=green>Saved: ${kp(sv)} (${b?f1(sv/b*100):0}%) · ${inr(sv)} · ${co2(sv)}</b></p><table><tr><th>kWh/day</th><th>Base</th><th>New</th><th>Saved</th></tr>${fl}</table>${w.map(x=>`<p class=amber>◆ ${x}</p>`).join('')}
 <p class=m>Modeled for ${PL[S.period]}, extrapolated from a ${H}-hour operating day. Not measured.</p><button class=b data-a=apsim ${sv<=.001?'disabled':''}>Approve (demo only)</button>`}

function ask(q){if(!q.trim())return;const l=q.toLowerCase(),A=alerts().filter(a=>!a.roll),m=l.match(/\b([1-3]0[1-6])\b/);let t,c=[];
 if(m){const a=A.find(x=>x.rooms.includes(m[1]));if(a){t=`Room ${m[1]}: ${a.f.join('; ')}. Avoidable about ${f1(a.kw)} kWh/day, ${inr(a.kw)} over ${PL[S.period]}. Confidence ${a.conf}.`;c=[a.id]}else t=`Room ${m[1]} has no open alert at ${hh()}. It is efficient, dismissed, already fixed, or not a valid room.`}
 else if(!A.length)t='No open alerts at this time. The seeded issues come back after Reset demo.';
 else{const top=A.slice(0,3);t=`${A.length} open issues at ${hh()}. Top ${top.length}: ${top.map(a=>`Room ${a.rooms[0]} (~${f1(a.kw)} kWh/day)`).join(', ')}. Fixing all of them is worth about ${kp(A.reduce((s,x)=>s+x.kw,0))}. Figures are simulated.`;c=top.map(a=>a.id)}
 S.chat.push({u:1,t:q.replace(/</g,'&lt;')},{t,c});S.view='agent';render()}

function render(){const N=[['overview','Overview','M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],['twin','Digital Twin',P_BLD],['intel','Intelligence','M3 3v18h18M7 14l4-4 3 3 5-6'],['sim','Simulator','M4 6h10M18 6h2M4 12h2M10 12h10M4 18h10M18 18h2M14 4v4M6 10v4M14 16v4'],['agent','AI Agent','M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z'],['report','Reports','M7 3h8l4 4v14H7zM15 3v4h4M10 12h6M10 16h6']];
 $('nav').innerHTML='<div class=logo><svg width=24 height=24 viewBox="0 0 24 24" aria-hidden=true><rect x=2 y=2 width=20 height=20 rx=6 fill="#1B5E20"/><path d="M7 16.5V9.5l5-3 5 3v7" stroke="#A5D6A7" stroke-width=1.8 fill=none stroke-linejoin=round /><rect x=10 y=12 width=4 height=4.5 fill="#66BB6A"/></svg>Tectonic</div>'+N.map(n=>`<button class="nv ${S.view===n[0]?'on':''}" data-a=nav data-v=${n[0]} ${S.view===n[0]?'aria-current=page':''}>${ico(n[2],18)}${n[1]}</button>`).join('')+`<button class=nv data-a=top>${ico('M12 19V5M5 12l7-7 7 7',18)}3D view</button>`;
 $('main').innerHTML=V[S.view]();if(S.view==='overview')ovFill()}
function act(a,v){const al=()=>alerts().find(x=>x.id===v);
 if(a==='top'){TT.exit();return}
 if(a==='nav'){S.view=v;if(v==='sim'){S.P=DP();S.pred=null}}
 else if(a==='floor')S.floor=+v;
 else if(a==='room')S.sel=v;
 else if(a==='goalert'){const x=al();S.sel=x.rooms[0];S.floor=room(S.sel).f;S.view='twin'}
 else if(a==='sim'){const x=al();S.P=presetP(x);S.pred=x.roll?null:x.kw;S.view='sim'}
 else if(a==='ap'){const x=al();return approve(presetP(x),x.id,x.roll?null:x.kw)}
 else if(a==='apsim')return approve(S.P,'manual',S.pred);
 else if(a==='dis'){S.dis.push(v);toast('Dismissed')}
 else if(a==='scopeall'){S.P.only=null;S.pred=null}
 else if(a==='spd'){SIM.speed=+v}else if(a==='play'){SIM.run=!SIM.run}else if(a==='gofloor'){S.floor=+v;const x=alerts().find(y=>!y.roll&&room(y.rooms[0]).f===S.floor);S.sel=x?x.rooms[0]:S.rooms.find(r=>r.f===S.floor).id;S.view='twin'}else if(a==='fixall')return fixAll();
 else if(a==='ask')return ask(v);
 else if(a==='reset'){simReset();toast('Demo reset to the seeded baseline')}
 render()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b)act(b.dataset.a,b.dataset.v)});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[data-a][tabindex]')){e.preventDefault();act(e.target.dataset.a,e.target.dataset.v)}});
function inp(e){const t=e.target,k=t.dataset.in;if(!k)return;const rg=t.type==='range'||t.type==='checkbox';
 if(rg&&e.type==='change')return;if(!rg&&e.type==='input')return;
 if(k==='hour'){S.hour=+t.value;$('hl').textContent=hh();$('tb').innerHTML=twinBody()}
 else if(['lights','dimOn','fix'].includes(k)){S.P[k]=t.checked?1:0;$('sr').innerHTML=simRes()}
 else if(k==='dim'||k==='setback'){S.P[k]=+t.value;$(k==='dim'?'dv':'sv').textContent=t.value;$('sr').innerHTML=simRes()}
 else{S[k]=Math.max(0,+t.value||0);render()}}
document.addEventListener('input',inp);document.addEventListener('change',inp);
// ===== live simulation + command center =====
const SIM={speed:1,run:true},RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
const mul=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const EM=['302','304','305','306'],ANCH={'301':[1,3],'303':[1,2],'201':[7,9],'205':[9,11]};
let rng=mul(7);
const CK=[[0,.02],[6,.02],[8,.35],[9.5,.85],[12,.9],[13,.55],[14,.85],[17,.8],[18.5,.25],[20,.06],[24,.02]];
const curve=m=>{const h=(((m%1440)+1440)%1440)/60;for(let i=1;i<CK.length;i++)if(h<=CK[i][0]){const a=CK[i-1],b=CK[i];return a[1]+(b[1]-a[1])*(h-a[0])/(b[0]-a[0])}return .02};
function tm(m){m=((Math.floor(m)%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}
const roomW=r=>r.lw*r.dim*r.lon+r.hw*r.hon*r.hm*r.hs+r.occ*60;
const bldKw=()=>S.rooms.reduce((a,r)=>a+roomW(r),0)/1000+3.5;
const ico=(p,s=18)=>`<svg width=${s} height=${s} viewBox="0 0 24 24" fill=none stroke=currentColor stroke-width=1.8 stroke-linecap=round stroke-linejoin=round aria-hidden=true><path d="${p}"/></svg>`;
const P_BLD='M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2',P_SUN='M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',P_WR='M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z',P_BOLT='M13 2 4 14h7l-1 8 9-12h-7z';

function simInit(){rng=mul(7);S.min=14*60;S.hour=14;S.nz=0;S.hi=null;const k=bldKw(),c0=curve(S.min),hr=mul(11),oc=S.rooms.reduce((a,r)=>a+r.occ,0);
 S.kw=k;S.E=Math.round(k*14*.5);let w=0;const arr=[];
 for(let i=60;i>=0;i--){w=w*.7+(hr()-.5)*1.2;arr.push(i?Math.max(1,k*(.9+.1*curve(S.min-i)/c0)+w):k)}
 S.hist=arr;S.hocc=[];for(let i=60;i>=0;i--)S.hocc.push(i?Math.round(oc*(.9+.1*curve(S.min-i)/c0)):oc);
 const he=Array(61);he[60]=S.E;for(let i=59;i>=0;i--)he[i]=he[i+1]-arr[i+1]/60;S.hen=he}
function simReset(){S.rooms=mk();S.period=1;S.floor=3;S.sel='302';S.dis=[];S.log=[];S.lastV=null;S.P=DP();S.pred=null;S.chat=[];SIM.speed=1;SIM.run=true;simInit()}
function stepMin(){const m=S.min;
 for(const r of S.rooms){const hold=EM.includes(r.id),an=ANCH[r.id];
  if(hold)r.occ=0;
  else if(an){if(rng()<.1)r.occ=Math.max(an[0],Math.min(an[1],r.occ+(rng()<.5?-1:1)))}
  else{const tg=Math.round(r.cap*curve(m)*r.rf);if(r.occ!==tg&&rng()<.14)r.occ+=r.occ<tg?1:-1}
  r.occ=Math.max(0,Math.min(r.cap,r.occ));
  if(r.occ>0)r.idle=0;else r.idle++;
  if(hold)continue;
  if(r.occ>0){r.lon=1;if(!r.hon||r.hs<1){r.hon=1;r.hs=1}}
  else{if(r.idle>=45)r.lon=0;if(r.idle>=90)r.hon=0}}
 S.nz=S.nz*.85+(rng()-.5)*.35;const k=bldKw()+S.nz;S.kw=k;S.E+=k/60;
 S.hist.push(k);S.hocc.push(S.rooms.reduce((a,r)=>a+r.occ,0));S.hen.push(S.E);
 if(S.hist.length>61){S.hist.shift();S.hocc.shift();S.hen.shift()}}
function tick(){if(!SIM.run||document.hidden)return;for(let i=0;i<SIM.speed;i++){S.min++;if(S.min>=1440){S.min-=1440;S.E=0}stepMin()}S.hour=S.min/60;live()}
function live(){document.querySelectorAll('.clkx').forEach(e=>{e.textContent=hh()});
 if(S.view==='overview')ovFill();else if(S.view==='twin')$('tb').innerHTML=twinBody();else if(S.view==='intel')$('ib').innerHTML=ibody();else if(S.view==='sim')$('sr').innerHTML=simRes()}

// ---- tween + small helpers ----
function tw(el,to,d,pre){if(!el)return;pre=pre||'';const from=el._v==null?to:el._v,fmt=v=>pre+(d?v.toFixed(d):Math.round(v).toLocaleString('en-IN'));el._v=to;cancelAnimationFrame(el._r);
 if(RM||from===to){el.textContent=fmt(to);return}
 const t0=performance.now(),f=t=>{const k=Math.min(1,(t-t0)/600),e=1-Math.pow(1-k,3);el.textContent=fmt(from+(to-from)*e);if(k<1)el._r=requestAnimationFrame(f)};el._r=requestAnimationFrame(f)}
const chip=(v,u,d,c)=>`<span class="dl ${c||''}">${v>=0?'▲':'▼'} ${Math.abs(v).toFixed(d)}${u}</span>`;
function spark(id,a){const e=$(id);if(!e)return;const mn=Math.min(...a),mx=Math.max(...a),n=a.length;e.setAttribute('points',a.map((v,i)=>(i*100/(n-1)).toFixed(1)+','+(26-(mx===mn?.5:(v-mn)/(mx-mn))*24).toFixed(1)).join(' '))}
const kpiCard=(k,i)=>`<div class="card kpi${i===1?' hero':''}"><div class=kh><span>${k[1]}</span><i class=ki>${ico(k[2],16)}</i></div><div class=kv><b id=v-${k[0]}>0</b><u id=u-${k[0]}>${k[3]}</u></div><div class=kd id=d-${k[0]}></div><svg class=sp viewBox="0 0 100 28" preserveAspectRatio=none aria-hidden=true><polyline id=s-${k[0]} fill=none stroke-width=2 stroke-linecap=round stroke-linejoin=round vector-effect=non-scaling-stroke /></svg></div>`;
const floorRow=f=>`<div class=fr tabindex=0 role=button aria-label="Open floor ${f} in Digital Twin" data-a=gofloor data-v=${f}><b class=fn>${f}F</b><div><div class=bar><i id=fw-${f} style="width:0"></i></div><span class=m id=fm-${f}></span></div><span class=fk><b id=fk-${f}>0</b> kW</span><span class=t id=ft-${f}></span></div>`;
function issueHTML(a){const r=a.roll?null:room(a.rooms[0]),ttl=a.roll?`Floor ${a.id.slice(2)} · Low occupancy`:`Room ${r.id} · ${r.name}`,p=a.roll?P_BLD:a.pre.fix?P_WR:(a.pre.dim&&!a.pre.lights)?P_SUN:P_BOLT;
 return `<div class="ic ${['','m','h'][a.sev]}">${ico(p,18)}</div><div class=im><b>${ttl}</b><span>${a.f[0]}</span></div><div class=ia>${a.roll?'':`<span class=ik>~${f1(a.kw)} kWh/day</span>`}${tag(a)}<button class="b sm" data-a=sim data-v=${a.id}>Simulate</button><button class="b b2 sm" data-a=goalert data-v=${a.id}>View</button></div>`}
function syncFeed(A){const f=$('feed');if(!f)return;const top=A.slice(0,5),ids=top.map(a=>a.id);
 [...f.children].forEach(n=>{if(!ids.includes(n.dataset.id)&&!n.classList.contains('out')){n.classList.add('out');setTimeout(()=>n.remove(),320)}});
 top.forEach((a,i)=>{let n=f.querySelector(`[data-id="${a.id}"]:not(.out)`);const h=issueHTML(a);if(!n){n=document.createElement('div');n.className='is';n.dataset.id=a.id}
  if(n.dataset.h!==h){n.innerHTML=h;n.dataset.h=h}
  const live=[...f.children].filter(x=>!x.classList.contains('out')),cur=live[i];if(cur!==n)f.insertBefore(n,cur||null)});
 $('feedempty').hidden=top.length>0}
function sumText(A,R){if(!A.length)return `No open issues at ${hh()}. Every room is within the configured efficiency rules.`;
 const fl=A.find(a=>a.roll),top=R[0],av=R.reduce((s,a)=>s+a.kw,0);let t=fl?fl.f[0]+'. ':'';
 if(top)t+=`${fl?'Review':'Start with'} Room ${top.rooms[0]} ${fl?'first':''}: ${top.f[0].charAt(0).toLowerCase()+top.f[0].slice(1)}, about ${f1(top.kw)} kWh/day avoidable.`.replace('  ',' ');
 if(R.length>1)t+=` In all, about ${f1(av)} kWh/day is avoidable across ${R.length} rooms.`;return t}
function drawChart(){const s=$('cs');if(!s)return;const h=S.hist,n=h.length,W=720,H=240,ml=44,mr=14,mt=14,mb=28,pw=W-ml-mr,ph=H-mt-mb;
 const mn=Math.min(...h),mx=Math.max(...h),pad=(mx-mn)*.3+1,lo=Math.max(0,Math.floor((mn-pad)/5)*5),hi=Math.max(lo+5,Math.ceil((mx+pad)/5)*5);
 const X=i=>ml+i*pw/(n-1),Y=v=>mt+ph-(v-lo)/(hi-lo)*ph;drawChart.Y=Y;
 let d='';h.forEach((v,i)=>{d+=(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)});
 let g='';for(let k=0;k<=4;k++){const v=lo+(hi-lo)*k/4,y=Y(v);g+=`<line x1=${ml} x2=${W-mr} y1=${y} y2=${y} style="stroke:var(--bd)"/><text x=${ml-8} y=${y+4} text-anchor=end>${Math.round(v)}</text>`}
 let xt='';[0,15,30,45,60].forEach(i=>{xt+=`<text x=${X(i)} y=${H-8} text-anchor=${i===0?'start':i===60?'end':'middle'}>${i===60?'Now':tm(S.min-(60-i))}</text>`});
 const q=S.hi!=null?Math.min(n-1,S.hi):null;
 s.innerHTML=`<defs><linearGradient id=cg x1=0 y1=0 x2=0 y2=1><stop offset=0 style="stop-color:var(--mg);stop-opacity:.4"/><stop offset=1 style="stop-color:var(--mg);stop-opacity:0"/></linearGradient></defs>${g}${xt}<path d="${d}L${X(n-1)} ${mt+ph}L${X(0)} ${mt+ph}Z" fill="url(#cg)"/><path d="${d}" fill=none style="stroke:var(--dg)" stroke-width=2.2 stroke-linejoin=round stroke-linecap=round />${q!=null?`<line x1=${X(q)} x2=${X(q)} y1=${mt} y2=${mt+ph} style="stroke:var(--mg)" stroke-dasharray="3 3"/><circle cx=${X(q)} cy=${Y(h[q])} r=4.5 style="fill:var(--surf);stroke:var(--dg)" stroke-width=2 />`:''}<circle class=pulse cx=${X(n-1)} cy=${Y(h[n-1])} r=6 style="fill:var(--mg)"/><circle cx=${X(n-1)} cy=${Y(h[n-1])} r=4 style="fill:var(--dg)"/>`}
function showTip(){const tip=$('tip'),s=$('cs');if(!tip||!s)return;if(S.hi==null){tip.hidden=true;return}const n=S.hist.length,i=Math.min(n-1,S.hi),sc=s.getBoundingClientRect().width/720;
 tip.hidden=false;tip.style.left=(44+i*(720-58)/(n-1))*sc+'px';tip.style.top=drawChart.Y(S.hist[i])*sc+'px';tip.textContent=tm(S.min-(n-1-i))+' · '+S.hist[i].toFixed(1)+' kW'}
document.addEventListener('pointermove',e=>{const s=$('cs');if(!s)return;const r=s.getBoundingClientRect(),ins=e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;
 if(!ins){if(S.hi!=null){S.hi=null;drawChart();showTip()}return}
 const n=S.hist.length,x=(e.clientX-r.left)/r.width*720;S.hi=Math.max(0,Math.min(n-1,Math.round((x-44)/((720-58)/(n-1)))));drawChart();showTip()});

function ovFill(){if(!$('v-pw'))return;const A=alerts(),R=A.filter(a=>!a.roll),rs=S.rooms,oc=rs.reduce((a,r)=>a+r.occ,0),cap=rs.reduce((a,r)=>a+r.cap,0),kw=S.kw,E=S.E,h0=S.hist[0]||kw;
 tw($('v-occ'),oc,0);$('u-occ').textContent='/ '+cap;tw($('v-pw'),kw,1);tw($('v-en'),E,0);tw($('v-co'),E*S.tariff,0,'₹');tw($('v-cb'),E*S.ef,0);
 $('d-occ').innerHTML=chip(oc-S.hocc[0],'',0)+'<span>vs 1h ago</span>';
 const pc=h0?(kw-h0)/h0*100:0;$('d-pw').innerHTML=chip(pc,'%',1,pc>5?'up':'')+'<span>vs 1h ago</span>';
 $('d-en').innerHTML=`<span class=dl>+${Math.max(0,E-S.hen[0]).toFixed(0)} kWh</span><span>last hour</span>`;
 $('d-co').innerHTML=`<span class=dl>₹${Math.round(kw*S.tariff)}/h</span><span>at current load</span>`;
 $('d-cb').innerHTML=`<span class=dl>${(kw*S.ef).toFixed(1)} kg/h</span><span>at current load</span>`;
 spark('s-occ',S.hocc);spark('s-pw',S.hist);spark('s-en',S.hen);spark('s-co',S.hist);spark('s-cb',S.hist);
 tw($('cp'),kw,1);drawChart();showTip();
 const av=R.reduce((s,a)=>s+a.kw,0),base=tot(rs),pct=base?av/base*100:0,done=S.log.reduce((s,e)=>s+e.b-e.a,0);
 tw($('sv-pc'),pct,0);$('rg').setAttribute('stroke-dasharray',`${Math.min(100,pct)*3.267} 327`);tw($('sv-kwh'),av,1);tw($('sv-cost'),av*S.tariff,0,'₹');tw($('sv-co2'),av*S.ef,1);
 $('sv-n').textContent=`${R.length} room${R.length===1?'':'s'}${A.some(a=>a.roll)?' + floor rollup':''}`;
 $('sv-per').textContent=S.period>1?`${inr(av)} over ${PL[S.period]}`:'Select a longer period to project';
 $('sv-done').textContent=S.log.length?`${f1(done)} kWh/day (${S.log.length} action${S.log.length>1?'s':''})`:'None yet';
 const fk=[1,2,3,4,5,6].map(f=>rs.filter(r=>r.f===f).reduce((a,r)=>a+roomW(r),0)/1000),mx=Math.max(...fk,1);
 for(let f=1;f<=6;f++){const fr=rs.filter(r=>r.f===f),o=fr.reduce((a,r)=>a+r.occ,0),c=fr.reduce((a,r)=>a+r.cap,0),n=R.filter(a=>room(a.rooms[0]).f===f).length;
  $('fw-'+f).style.width=(fk[f-1]/mx*100)+'%';tw($('fk-'+f),fk[f-1],1);$('fm-'+f).textContent=`${o}/${c} people · ${Math.round(o/c*100)}% occupied`;
  const t=$('ft-'+f);t.className='t '+(n?(R.some(a=>a.sev===2&&room(a.rooms[0]).f===f)?'red':'amber'):'green');t.textContent=n?`▲ ${n} flagged`:'✓ Clear'}
 $('sump').innerHTML=`<span class=tg2>Rule-based</span>${sumText(A,R)}`;syncFeed(A)}
function fixAll(){const R=alerts().filter(a=>!a.roll);if(!R.length){toast('No open issues to fix');return}
 const P={lights:0,dimOn:0,dim:40,setback:0,fix:0,only:[]};R.forEach(a=>{if(a.pre.lights)P.lights=1;if(a.pre.dim)P.dimOn=1;if(a.pre.setback)P.setback=60;if(a.pre.fix)P.fix=1;P.only.push(a.rooms[0])});
 S.P=P;S.pred=R.reduce((s,a)=>s+a.kw,0);S.view='sim';render()}
function ibody(){return `<div class="g g2"><div class=card><h3>Room utilisation (simulated counts)</h3>${S.rooms.map(r=>{const p=Math.round(r.occ/r.cap*100);return `<div class=m>${r.id} ${r.name}: ${r.occ}/${r.cap} (${p}%)</div><div class=bar role=img aria-label="${r.name} ${p} percent"><i style="width:${p}%"></i></div>`}).join('')}</div>
 <div><div class=card style="margin-bottom:12px"><h3>Daylight at ${hh()}</h3><table>${S.rooms.map(r=>{const d=dl(r,S.hour);return `<tr><td>${r.id}</td><td>${cat(d)}</td><td>${Math.round(d*100)}%</td></tr>`}).join('')}</table><p class=m>Daylight follows the simulated clock. It is a simplified model, not measured lux.</p></div>
 <div class=card><h3>Privacy panel</h3><p><b>Collected (proposed)</b>: anonymous person counts, room-level occupancy, aggregated time intervals, operational energy data.</p><p><b>Not collected by design</b>: facial identities, names from footage, individual movement histories, raw video archives.</p><p class=m>These are proposed policies for a future build. This prototype uses simulated counts and has no cameras. Showing this panel does not establish compliance.</p></div></div></div>`}

// ===== landing <-> command center transition =====
const TT={busy:false,
 mode:()=>document.body.dataset.mode,
 swap(m){document.body.dataset.mode=m;scrollTo(0,0);if(m==='app')render()},
 enter(){if(this.busy||this.mode()==='app')return;this.busy=true;const b=document.body,v=$('veil'),a=$('app');
  if(RM){this.swap('app');this.busy=false;return}
  b.classList.add('leaving');if(window.TT3D)TT3D.zoomIn();
  setTimeout(()=>v.classList.add('on'),600);
  setTimeout(()=>{this.swap('app');a.classList.add('arrive');b.classList.remove('leaving');v.classList.remove('on');
   setTimeout(()=>{a.classList.remove('arrive');this.busy=false},1200)},1000)},
 exit(){if(this.busy||this.mode()==='hero')return;this.busy=true;const b=document.body,v=$('veil');
  if(RM){this.swap('hero');if(window.TT3D)TT3D.zoomOut(true);this.busy=false;return}
  v.classList.add('on');
  setTimeout(()=>{b.classList.add('leaving');this.swap('hero');if(window.TT3D)TT3D.zoomOut();
   requestAnimationFrame(()=>requestAnimationFrame(()=>{b.classList.remove('leaving');v.classList.remove('on');setTimeout(()=>{this.busy=false},700)}))},450)}};
$('go').addEventListener('click',()=>TT.enter());

simInit();render();setInterval(tick,2000);
