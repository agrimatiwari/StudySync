'use strict';
/* ================= State & storage (same key as before: existing data is preserved) ================= */
const K='studysync.v1',TYPES=['Assignment','Practical','Project','Revision','Other'],PW={High:3,Medium:2,Low:1};
const D=()=>({subjects:[],tasks:[],sessions:[],exams:[],focus:[],prefs:{daily:3,focus:25,brk:5,name:'',theme:'light',collapsed:false}});
const arr=(x,k)=>Array.isArray(x)&&x.every(o=>o&&k.every(f=>typeof o[f]==='string'));
const norm=r=>{const d=D();if(!r||typeof r!=='object')return d;
 if(!arr(r.subjects,['id','name'])||!arr(r.tasks,['id','title','due','subject'])||!arr(r.sessions,['id','date','time'])||!arr(r.exams,['id','date','subject'])||!arr(r.focus,['date']))return d;
 return{...d,...r,prefs:{...d.prefs,...r.prefs},exams:r.exams.map(e=>({time:'09:00',...e,topics:Array.isArray(e.topics)?e.topics:[]}))}};
let S;try{S=norm(JSON.parse(localStorage.getItem(K)))}catch{S=D()}
const save=()=>{try{localStorage.setItem(K,JSON.stringify(S))}catch{toast('Could not save: browser storage unavailable')}};
let F={q:'',subject:'',priority:'',status:'',sort:'due'},C={mode:'week',off:0},DVM='focus',T={mode:'focus',left:S.prefs.focus*60,run:false,end:0,task:'',obj:''},lastDay,SGc=null;
const DISM=new Set(),OP=new Set(),CHQ=[],CHI=[];

/* ================= Icons ================= */
const IC={dash:'<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
tasks:'<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',cal:'<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
exam:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',subj:'<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 17l10 5 10-5M2 12l10 5 10-5"/>',
focus:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',ins:'<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',set:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
db:'<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',moon:'<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
plus:'<path d="M12 5v14M5 12h14"/>',search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',chev:'<path d="M15 18l-6-6 6-6"/>',x:'<path d="M18 6L6 18M6 6l12 12"/>',edit:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',inbox:'<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5h13l3.5 7v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z"/>'};
const ic=(k,s=17)=>`<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
const NAV=[['OVERVIEW',[['dash','Dashboard','dash']]],['PLAN',[['tasks','Tasks','tasks'],['calendar','Calendar','cal'],['exams','Exams','exam'],['subjects','Subjects','subj']]],['PRODUCTIVITY',[['focus','Focus Studio','focus'],['insights','Academic Insights','ins']]],['PREFERENCES',[['settings','Settings','set'],['data','Data & Backup','db']]]];

/* ================= Helpers ================= */
const $=s=>document.querySelector(s),uid=()=>Math.random().toString(36).slice(2,9)+Date.now().toString(36).slice(-4),css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0'),iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`,today=()=>iso(new Date());
const pd=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d)};
const dd=s=>Math.round((pd(s)-pd(today()))/864e5),addD=(s,n)=>{const d=pd(s);d.setDate(d.getDate()+n);return iso(d)};
const wkStart=s=>{const d=pd(s);d.setDate(d.getDate()-(d.getDay()+6)%7);return iso(d)};
const fd=s=>pd(s).toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short'}),wd=s=>pd(s).toLocaleDateString(undefined,{weekday:'short'});
const mins=t=>{const[h,m]=t.split(':').map(Number);return h*60+m},hm=m=>`${pad(Math.floor(m/60))}:${pad(m%60)}`;
const sum=a=>a.reduce((x,f)=>x+f.min,0),hrs=m=>(m/60).toFixed(1)+'h',h1=x=>+x.toFixed(1),n=(k,w)=>`${k} ${w}${k===1?'':'s'}`;
const rel=d=>d<0?`Overdue by ${n(-d,'day')}`:d===0?'Due today':d===1?'Due tomorrow':`Due in ${d} days`;
const btn=(a,l,id='',c='')=>`<button class="btn ${c}" data-a="${a}" data-id="${esc(id)}">${l}</button>`;
const ib=(a,i,id,t)=>`<button class="ib" data-a="${a}" data-id="${esc(id)}" title="${t}" aria-label="${t}">${ic(i,15)}</button>`;
const empty=(i,m,b='')=>`<div class="empty">${ic(i,26)}${m}${b?'<br>'+b:''}</div>`;
const ph=(t,s='',a='')=>`<header class="ph"><div><h1>${t}</h1><p>${s}</p></div><div class="acts">${a}</div></header>`;
const pn=(t,b,r='')=>`<section class="pn"><div class="ph2"><h3>${t}</h3>${r}</div>${b}</section>`;
const bar=p=>`<div class="bar"><i style="width:${Math.min(100,Math.max(0,p))}%"></i></div>`;
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>t.classList.remove('on'),2400)};
const go=v=>{location.hash=v};
const exTs=e=>new Date(e.date+'T'+(e.time||'09:00')).getTime(),nextExam=()=>S.exams.filter(e=>exTs(e)>Date.now()).sort((a,b)=>exTs(a)-exTs(b))[0];
const pct=e=>e.topics.length?Math.round(e.topics.filter(t=>t.done).length/e.topics.length*100):0;
const cd=ms=>{if(ms<=0)return'Started';const s=Math.floor(ms/1e3);return`${Math.floor(s/86400)}d ${pad(Math.floor(s%86400/3600))}h ${pad(Math.floor(s%3600/60))}m ${pad(s%60)}s`};
const cds=ms=>{if(ms<=0)return'Started';const m=Math.floor(ms/6e4),d=Math.floor(m/1440);return d?`${d}d ${Math.floor(m%1440/60)}h`:`${Math.floor(m/60)}h ${m%60}m`};
const cdEl=(e,s)=>`<span data-ts="${exTs(e)}" ${s?'data-s="1"':''}>${(s?cds:cd)(exTs(e)-Date.now())}</span>`;
const sesEnd=s=>pd(s.date).getTime()+(mins(s.time)+s.dur)*6e4,missed=s=>!s.done&&sesEnd(s)<Date.now();
const ovl=s=>S.sessions.some(o=>o.id!==s.id&&o.date===s.date&&mins(o.time)<mins(s.time)+s.dur&&mins(s.time)<mins(o.time)+o.dur);
const dur=m=>(m==='focus'?S.prefs.focus:S.prefs.brk)*60,mmss=s=>`${pad(Math.floor(s/60))}:${pad(s%60)}`;
const lastN=k=>[...Array(k)].map((_,i)=>addD(today(),i-k+1));
const tk=id=>S.tasks.find(t=>t.id===id);
const SC=['--subject-1','--subject-2','--subject-3','--subject-4','--subject-5','--subject-6','--subject-7'],sc=n=>css(SC[Math.max(0,S.subjects.findIndex(s=>s.name===n))%SC.length]),dot=n=>`<i class="sd" style="background:${sc(n)}"></i>`,evs=n=>`border-color:${sc(n)};background:color-mix(in srgb,${sc(n)} 16%,var(--sf))`;

/* ================= Charts (Chart.js) ================= */
const chart=(id,cfg,h=190)=>{CHQ.push([id,cfg]);return`<div class="ch" style="height:${h}px"><canvas id="${id}"></canvas></div>`};
const cfg=(type,labels,datasets,o={})=>({type,data:{labels,datasets},options:{indexAxis:o.y?'y':'x',plugins:{legend:{display:!!o.legend,position:'bottom',labels:{boxWidth:10,usePointStyle:true}}},scales:o.none?{}:{x:{grid:{display:!!o.y},stacked:!!o.stack},y:{beginAtZero:true,grid:{display:!o.y},stacked:!!o.stack,ticks:{precision:o.y?0:undefined}}}}});
function paintCharts(){CHI.splice(0).forEach(c=>c.destroy());
 if(typeof Chart==='undefined'){CHQ.splice(0).forEach(([id])=>{const e=$('#'+id);if(e)e.parentNode.innerHTML='<p class="sm">Charts need an internet connection to load Chart.js.</p>'});return}
 Chart.defaults.color=css('--mut');Chart.defaults.font.family='inherit';Chart.defaults.borderColor=css('--line');
 CHQ.splice(0).forEach(([id,c])=>{const e=$('#'+id);if(!e)return;c.options={responsive:true,maintainAspectRatio:false,animation:{duration:750,easing:'easeOutQuart'},...c.options};CHI.push(new Chart(e,c))})}

/* ================= Workload intelligence (transparent rules) ================= */
const cover=()=>{const c={};S.sessions.forEach(s=>{if(!s.done&&!missed(s))c[s.taskId]=(c[s.taskId]||0)+s.dur/60});return c};
const dem=x=>x.sch+x.unc;
/* Day load = hours of planned (unfinished, not missed) sessions + effort of tasks due that day not yet covered by sessions. */
function loads(){const cov=cover();return lastN(1).concat([...Array(6)].map((_,i)=>addD(today(),i+1))).map((d,i)=>({d,cap:S.prefs.daily,
 sch:S.sessions.filter(s=>s.date===d&&!s.done&&!missed(s)).reduce((a,s)=>a+s.dur/60,0),
 unc:S.tasks.filter(t=>!t.done&&(dd(t.due)<=0?i===0:t.due===d)).reduce((a,t)=>a+Math.max(0,t.est-(cov[t.id]||0)),0)}))}
function wlSum(L){const cap7=L.reduce((a,x)=>a+x.cap,0),used=L.reduce((a,x)=>a+dem(x),0),over=L.filter(x=>dem(x)>x.cap+.01);
 return{cap7,used,spare:cap7-used,over,st:over.length?'Overloaded':used>cap7*.7?'Busy':'Balanced'}}
/* Attention score = urgency x3 + priority x2 + 2 if effort exceeds available hours + 1 if unscheduled and due within 3 days */
function attention(){const cov=cover();return S.tasks.filter(t=>!t.done).map(t=>{const d=dd(t.due),rem=Math.max(0,t.est-(cov[t.id]||0)),u=d<0?5:d===0?4:d<=1?3:d<=3?2:d<=7?1:0,sh=d>=0&&t.est>(d+1)*S.prefs.daily;
 const why=[d<0?`overdue by ${n(-d,'day')}`:d===0?'due today':`due in ${n(d,'day')}`,`${t.priority.toLowerCase()} priority`,rem>.01?`${h1(rem)}h unscheduled`:'fully scheduled'];if(sh)why.push('effort exceeds available hours');
 return{t,d,score:u*3+PW[t.priority]*2+(sh?2:0)+(rem>.01&&d<=3?1:0),why}}).sort((a,b)=>b.score-a.score||a.d-b.d)}

/* ================= Adaptive planning (every change needs confirmation) ================= */
function freeSlot(date,d,ign,min){for(let st=Math.max(480,min);st+d<=1320;st+=30)if(!S.sessions.some(o=>o.id!==ign&&o.date===date&&mins(o.time)<st+d&&st<mins(o.time)+o.dur))return st;return null}
function findDay(t,d,SL,ign,skip){const now=new Date();
 for(let i=0;i<14;i++){const date=addD(today(),i);if(date===skip)continue;if(t.due>=today()&&date>t.due)break;
  const x=SL[date];if((x?dem(x):0)+d/60>S.prefs.daily+.01)continue;
  const st=freeSlot(date,d,ign,i===0?Math.ceil((now.getHours()*60+now.getMinutes()+15)/30)*30:480);
  if(st!=null){if(x)x.sch+=d/60;return{date,time:hm(st)}}}return null}
function sg(){if(SGc)return SGc;const out=[],L=loads(),SL=Object.fromEntries(L.map(x=>[x.d,x])),cap=S.prefs.daily;
 S.sessions.filter(missed).forEach(s=>{const t=tk(s.taskId);if(!t||t.done)return;const to=findDay(t,s.dur,SL,s.id);
  if(to)out.push({k:'m'+s.id,type:'Missed session',txt:`“${esc(t.title)}” was scheduled for ${fd(s.date)} at ${s.time}.`,act:`Reschedule to ${fd(to.date)} at ${to.time}`,fn:()=>Object.assign(s,to)})});
 L.filter(x=>dem(x)>cap+.01).forEach(x=>{const before=h1(dem(x));
  const c=S.sessions.filter(s=>s.date===x.d&&!s.done&&!missed(s)).map(s=>({s,t:tk(s.taskId)})).filter(o=>o.t&&!o.t.done).sort((a,b)=>PW[a.t.priority]-PW[b.t.priority]||b.t.due.localeCompare(a.t.due));
  for(const{s,t}of c){if(dem(x)<=cap+.01)break;const to=findDay(t,s.dur,SL,s.id,x.d);
   if(to){x.sch-=s.dur/60;out.push({k:'o'+s.id,type:'Overloaded day',txt:`${fd(x.d)} has ${before}h planned against ${cap}h available. “${esc(t.title)}” is ${t.priority.toLowerCase()} priority.`,act:`Move to ${fd(to.date)} at ${to.time}`,fn:()=>Object.assign(s,to)})}}});
 const cov=cover();
 S.tasks.filter(t=>!t.done&&dd(t.due)>=0&&dd(t.due)<=2).forEach(t=>{const rem=t.est-(cov[t.id]||0);if(rem<=.01)return;const d=Math.min(120,Math.ceil(rem*2)*30),to=findDay(t,d,SL,null);
  if(to)out.push({k:'d'+t.id,type:'Deadline approaching',txt:`“${esc(t.title)}” is ${rel(dd(t.due)).toLowerCase()} with ${h1(rem)}h of effort not yet scheduled.`,act:`Add a ${d}-minute session on ${fd(to.date)} at ${to.time}`,fn:()=>S.sessions.push({id:uid(),taskId:t.id,date:to.date,time:to.time,dur:d,done:false})})});
 return SGc=out.filter(x=>!DISM.has(x.k))}
const sgPanel=m=>{const L=sg().slice(0,m);return L.length?pn('Suggested adjustments',L.map(x=>`<div class="sg"><div class="grow"><b>${x.type}</b><div class="sm">${x.txt}</div><div class="acc" style="font-size:12.5px">${esc(x.act)}</div></div>${btn('apply','Confirm',x.k,'pri sm')}${btn('dismiss','Dismiss',x.k,'sm')}</div>`).join(''),`<span class="sm">Nothing changes until you confirm</span>`):''};

/* ================= Shared view pieces ================= */
const taskRow=t=>{const d=dd(t.due),od=!t.done&&d<0;
 return`<div class="tr${t.done?' dn':''}"><input type="checkbox" data-a="tog" data-id="${esc(t.id)}" ${t.done?'checked':''} aria-label="Complete"><div><button class="tt" data-a="editTask" data-id="${esc(t.id)}">${esc(t.title)}</button><div class="sm">${dot(t.subject)}${esc(t.subject)} · ${esc(t.type)}${t.desc?' · '+esc(t.desc):''}</div></div>
 <button class="ib hm pr ${t.priority}" data-a="cyc" data-id="${esc(t.id)}" title="Click to change priority">${t.priority}</button><span class="${od?'acc':'sm'}">${t.done?'Completed':fd(t.due)+' · '+rel(d).replace('Due ','')}</span><span class="sm hm">${t.est}h</span><span>${ib('editTask','edit',t.id,'Edit')}${ib('delTask','x',t.id,'Delete')}</span></div>`};
const tTable=()=>{let L=S.tasks.filter(t=>(!F.q||(t.title+' '+t.subject+' '+(t.desc||'')).toLowerCase().includes(F.q.toLowerCase()))&&(!F.subject||t.subject===F.subject)&&(!F.priority||t.priority===F.priority)&&(!F.status||(F.status==='pending'?!t.done:F.status==='completed'?t.done:!t.done&&dd(t.due)<0)));
 const cmp={due:(a,b)=>a.due.localeCompare(b.due),priority:(a,b)=>PW[b.priority]-PW[a.priority]||a.due.localeCompare(b.due),effort:(a,b)=>b.est-a.est,subject:(a,b)=>a.subject.localeCompare(b.subject)||a.due.localeCompare(b.due)};
 L.sort((a,b)=>(a.done-b.done)||cmp[F.sort](a,b));
 return`<div class="tr th"><span></span><span>Task</span><span class="hm">Priority</span><span>Deadline</span><span class="hm">Effort</span><span></span></div>`+(L.map(taskRow).join('')||(S.tasks.length?empty('search','No tasks match your search or filters.'):empty('inbox','No tasks yet. Capture your first assignment, practical or revision block.',btn('addTask',ic('plus',14)+' New task','','pri'))))};

/* ================= Views ================= */
const spark=(v,c)=>{const mx=Math.max(1,...v);return`<svg class="sp" viewBox="0 0 70 22" preserveAspectRatio="none">${v.map((x,i)=>{const h=Math.max(2,x/mx*22);return`<rect x="${i*10}" y="${22-h}" width="7" height="${h}" rx="2" fill="${c}" opacity="${i===v.length-1?1:.45}"/>`}).join('')}</svg>`};
const ringS=(p,c,label,sub,sz=96)=>`<div class="rg" style="width:${sz}px;height:${sz}px"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" class="rb2"/><circle cx="50" cy="50" r="42" class="rf2" stroke="${c}" stroke-dasharray="263.9" stroke-dashoffset="${263.9*(1-Math.min(1,Math.max(0,p)))}" transform="rotate(-90 50 50)"/></svg><div><b>${label}</b><span>${sub}</span></div></div>`;
function vDash(){
 const t0=today(),P=S.tasks.filter(t=>!t.done),wk=wkStart(t0),lw=addD(wk,-7),h=new Date().getHours(),nm=S.prefs.name;
 const g=(h<12?'Good morning':h<18?'Good afternoon':'Good evening')+(nm?`, ${esc(nm)}`:''),dueT=P.filter(t=>dd(t.due)===0),od=P.filter(t=>dd(t.due)<0),d7=P.filter(t=>dd(t.due)>=0&&dd(t.due)<=7);
 const ses=S.sessions.filter(s=>s.date===t0).sort((a,b)=>mins(a.time)-mins(b.time)),nx=nextExam(),L=loads(),W=wlSum(L);
 const wm=sum(S.focus.filter(f=>f.date>=wk)),lm=sum(S.focus.filter(f=>f.date>=lw&&f.date<wk)),doneW=S.tasks.filter(t=>t.done&&t.doneOn>=wk).length;
 const doneT=S.tasks.filter(t=>t.done&&t.doneOn===t0).length,sesDone=ses.filter(s=>s.done).length,totalT=ses.length+dueT.length+doneT,pT=totalT?(sesDone+doneT)/totalT:0;
 const tm=sum(S.focus.filter(f=>f.date===t0)),goal=S.prefs.focus*4,d7a=lastN(7);
 const sp1=L.map(x=>P.filter(t=>t.due===x.d||(x.d===t0&&dd(t.due)<0)).length),sp2=d7a.map(d=>sum(S.focus.filter(f=>f.date===d))),sp3=d7a.map(d=>S.tasks.filter(t=>t.doneOn===d).length);
 let streak=0;for(let i=0;i<365;i++){if(sum(S.focus.filter(f=>f.date===addD(t0,-i)))>0)streak++;else if(i===0)continue;else break}
 const wdays=[...Array(7)].map((_,i)=>addD(wk,i)),dm=wdays.map(d=>sum(S.focus.filter(f=>f.date===d))/60),act=dm.filter(x=>x>0).length;
 const parts=[];if(dueT.length)parts.push(`${n(dueT.length,'task')} due today`);if(od.length)parts.push(`${od.length} overdue`);
 if(nx&&dd(nx.date)<=14)parts.push(`${esc(nx.subject)} exam in ${n(Math.max(0,dd(nx.date)),'day')}`);if(ses.length)parts.push(`${n(ses.length,'study session')} planned (${h1(ses.reduce((a,s)=>a+s.dur,0)/60)}h)`);
 if(W.over.length)parts.push(`${n(W.over.length,'overloaded day')} ahead`);
 const brief=!S.subjects.length?'Welcome to StudySync. Start by adding your subjects, then capture your first task.':parts.length?parts.join(' · ')+'.':'Nothing urgent today. A good moment to plan ahead.';
 const nowM=new Date().getHours()*60+new Date().getMinutes(),ns=ses.find(s=>!s.done&&mins(s.time)+s.dur>nowM),nt=ns&&tk(ns.taskId),top=attention()[0];
 const up=ns&&nt?{t:nt,s:ns,when:`Today · ${ns.time}–${hm(mins(ns.time)+ns.dur)}`}:top?{t:top.t,when:top.why[0][0].toUpperCase()+top.why[0].slice(1)}:null;
 const rows=ses.map(s=>{const t=tk(s.taskId);return`<div class="ag${s.done?' dn':''}"><input type="checkbox" data-a="sdone" data-id="${esc(s.id)}" ${s.done?'checked':''} aria-label="Done"><span class="tm">${s.time}</span><div class="grow"><b>${t?esc(t.title):'Deleted task'}</b><div class="sm">${t?dot(t.subject)+esc(t.subject):''} · ${s.dur} min${missed(s)?' · <span class="acc">Missed</span>':''}${ovl(s)?' · <span class="acc">Overlaps</span>':''}</div></div>${t?`<span class="pr ${t.priority}">${t.priority}</span>`:''}${btn('editSes','Reschedule',s.id,'sm')}</div>`})
  .concat(od.concat(dueT).map(t=>`<div class="ag"><input type="checkbox" data-a="tog" data-id="${esc(t.id)}" aria-label="Complete"><span class="tm ${dd(t.due)<0?'acc':''}">${dd(t.due)<0?'Overdue':'Due'}</span><div class="grow"><b>${esc(t.title)}</b><div class="sm">${dot(t.subject)}${esc(t.subject)} · ${t.est}h estimated</div></div><span class="pr ${t.priority}">${t.priority}</span>${btn('editTask','Edit',t.id,'sm')}</div>`));
 return`<section class="hero"><div><div class="sm">${new Date().toLocaleDateString(undefined,{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</div><h1>${g}</h1><p class="brief2">${brief}</p><div class="acts">${btn('addTask',ic('plus',14)+' New task','','pri')}${btn('addSes','Schedule session')}${btn('addExam','Add exam')}${btn('startfocus',ic('focus',14)+' Focus now')}</div></div>${ringS(pT,css('--acc'),Math.round(pT*100)+'%',totalT?`${sesDone+doneT}/${totalT} today`:'no plan',112)}</section>
 <div class="ov"><div role="link" tabindex="0" data-a="kpi" data-id="tasks" aria-label="View pending tasks"><span class="stat-icon">${ic('tasks',19)}</span><span>Pending tasks</span><b>${P.length}</b><em>${od.length?od.length+' overdue':d7.length+' due in 7 days'}</em>${spark(sp1,css('--acc'))}</div>
 <div role="link" tabindex="0" data-a="kpi" data-id="focus" aria-label="View focus studio"><span class="stat-icon">${ic('focus',19)}</span><span>Study time this week</span><b>${hrs(wm)}</b><em>${lm||wm?`${wm>=lm?'+':'−'}${hrs(Math.abs(wm-lm))} vs last week`:'No sessions yet'}</em>${spark(sp2,css('--teal'))}</div>
 <div role="link" tabindex="0" data-a="kpi" data-id="insights" aria-label="View academic insights"><span class="stat-icon">${ic('ins',19)}</span><span>Completed this week</span><b>${doneW}</b><em>${doneT} today</em>${spark(sp3,css('--olive'))}</div>
 <div role="link" tabindex="0" data-a="kpi" data-id="exams" aria-label="View exams"><span class="stat-icon">${ic('exam',19)}</span><span>Next exam</span><b>${nx?cdEl(nx,1):'—'}</b><em>${nx?esc(nx.subject)+' · '+pct(nx)+'% prepared':'None scheduled'}</em><div class="bar" style="margin-top:10px"><i style="width:${nx?pct(nx):0}%;background:var(--lav)"></i></div></div></div>
 <div class="tri">${pn('Up next',up?`<div class="nx"><b style="font-size:16px">${esc(up.t.title)}</b><div class="sm" style="margin:4px 0 12px">${dot(up.t.subject)}${esc(up.t.subject)} · ${up.when} · ${up.t.est}h · ${up.t.priority}</div>${btn('startfocus','Start focus',up.t.id,'pri sm')} ${up.s?btn('editSes','Reschedule',up.s.id,'sm'):btn('editTask','Open task',up.t.id,'sm')}</div>`:empty('tasks','You are all caught up.'))}
 ${pn('Daily focus goal',`<div style="display:flex;align-items:center;gap:16px">${ringS(tm/goal,css('--teal'),tm+'m','of '+goal+'m',88)}<div class="sm">${S.focus.filter(f=>f.date===t0).length} sessions today<br>Goal: 4 × ${S.prefs.focus} min</div></div>`)}
 ${pn('Study streak',`<div style="display:flex;align-items:baseline;gap:6px"><b style="font-size:28px">${streak}</b><span class="sm">${streak===1?'day':'days'} in a row</span></div><div class="sk">${wdays.map((d,i)=>`<i class="${dm[i]>0?'on':''}">${'MTWTFSS'[i]}</i>`).join('')}</div><div class="sm" style="text-align:center">${act} of 7 days studied this week</div>`)}</div>
 ${pn('Quick actions',`<div class="quick-grid">${[['addTask','tasks','Create task','Capture an assignment'],['addSes','cal','Plan a session','Reserve study time'],['addExam','exam','Add examination','Track your syllabus'],['startfocus','focus','Start focusing','Enter focus studio']].map(([a,i,t,d])=>`<button class="quick-action" data-a="${a}"><span class="quick-icon">${ic(i,20)}</span><span><b>${t}</b><small>${d}</small></span>${ic('chev',15)}</button>`).join('')}</div>`)}
 ${sgPanel(3)}
 ${pn('Week ahead',`<div class="wk">${L.map(x=>{const r=dem(x)/x.cap,c=r>1?'var(--acc)':r>.6?'var(--amber)':'var(--sage)',k=S.sessions.filter(s=>s.date===x.d).length+P.filter(t=>t.due===x.d).length;return`<a class="wd${x.d===t0?' t':''}" href="#calendar" style="--c:${c}"><span class="sm">${wd(x.d)}</span><b>${pd(x.d).getDate()}</b>${bar(r*100)}<span class="sm">${h1(dem(x))}h · ${n(k,'item')}</span></a>`}).join('')}</div>`,`<span class="tag ${{Balanced:'ok',Busy:'warn',Overloaded:'hi'}[W.st]}">${W.st}</span>`)}
 <div class="dg"><div>${pn("Today's agenda",rows.join('')||empty('cal','Nothing scheduled for today.',btn('addSes','Schedule a session','','sm')),btn('addSes',ic('plus',13)+' Session','','sm'))}
 ${pn('Workload intelligence',`<div class="sm" style="margin-bottom:8px">${h1(W.used)}h planned of ${W.cap7}h available over 7 days · ${W.spare>=0?h1(W.spare)+'h free':h1(-W.spare)+'h shortfall'}${W.over.length?' · Overloaded: '+W.over.map(x=>wd(x.d)).join(', '):''}</div>`+
  chart('c-wl',cfg('bar',L.map(x=>wd(x.d)),[{label:'Scheduled',data:L.map(x=>h1(x.sch)),backgroundColor:css('--teal'),borderRadius:3},{label:'Unscheduled due',data:L.map(x=>h1(x.unc)),backgroundColor:css('--gold'),borderRadius:3},{type:'line',label:'Available',data:L.map(x=>x.cap),borderColor:css('--mut'),borderDash:[4,4],pointRadius:0,borderWidth:1.5}],{stack:1,legend:1}),200),`<a class="sm" href="#insights">Full analysis →</a>`)}</div>
 <div>${pn('Upcoming deadlines',`<div class="tl">${P.slice().sort((a,b)=>a.due.localeCompare(b.due)).slice(0,6).map(t=>{const d=dd(t.due);return`<div class="ti${d<=1?' urg':''}"><i></i><b>${esc(t.title)}</b><div class="sm">${dot(t.subject)}${esc(t.subject)} · ${rel(d)} · ${t.est}h · ${t.priority}</div></div>`}).join('')||empty('tasks','No pending deadlines.')}</div>`,`<a class="sm" href="#tasks">All tasks →</a>`)}
 ${pn('Weekly momentum',`<div class="dash-switch"><button class="${DVM==='focus'?'on':''}" data-a="dashMetric" data-id="focus">Focus time</button><button class="${DVM==='tasks'?'on':''}" data-a="dashMetric" data-id="tasks">Tasks completed</button></div>`+chart('c-wp',cfg('bar',wdays.map(wd),[{label:DVM==='focus'?'Focused hours':'Tasks completed',data:(DVM==='focus'?dm:wdays.map(d=>S.tasks.filter(t=>t.doneOn===d).length)),backgroundColor:wdays.map((d,i)=>d===t0?css('--clay'):[css('--teal'),css('--olive'),css('--gold'),css('--lav'),css('--clay'),css('--blue')][i%6]),borderRadius:7,borderSkipped:false,maxBarThickness:34}]),165)+`<div class="sm" style="margin-top:8px">${DVM==='focus'?`${S.focus.filter(f=>f.date>=wk).length} focus sessions · ${hrs(wm)} focused this week`:`${doneW} tasks completed this week · ${doneT} today`}</div>`)}</div></div>
 ${S.subjects.length?pn('Your subjects',`<div class="sj">${S.subjects.map(s=>{const a=S.tasks.filter(t=>t.subject===s.name),dn=a.filter(t=>t.done).length,p=a.length?dn/a.length*100:0;return`<button class="subject-tile" data-a="subjectTasks" data-id="${esc(s.name)}" style="--c:${sc(s.name)}"><span class="subject-orb"></span><b>${esc(s.name)}</b><div class="sm">${a.length-dn} pending · ${Math.round(p)}% done</div><div class="bar" style="margin-top:9px"><i style="width:${p}%;background:${sc(s.name)}"></i></div><span class="tile-hint">View tasks ↗</span></button>`}).join('')}</div>`,'<a class="sm" href="#subjects">Manage →</a>'):''}`}

function vTasks(){
 const sel=(k,o,l)=>`<select data-f="${k}"><option value="">${l}</option>${o.map(x=>{const[v,t]=Array.isArray(x)?x:[x,x];return`<option value="${esc(v)}" ${F[k]===v?'selected':''}>${esc(t)}</option>`}).join('')}</select>`;
 return ph('Tasks','Everything due, in one place.',btn('addTask',ic('plus',14)+' New task','','pri'))+`<div class="tools"><div class="sbox">${ic('search',15)}<input data-q placeholder="Search tasks" value="${esc(F.q)}"></div>${sel('subject',S.subjects.map(s=>s.name),'All subjects')}${sel('priority',['High','Medium','Low'],'All priorities')}${sel('status',[['pending','Pending'],['completed','Completed'],['overdue','Overdue']],'All statuses')}${sel('sort',[['due','Sort: deadline'],['priority','Sort: priority'],['effort','Sort: effort'],['subject','Sort: subject']],'').replace('<option value=""></option>','')}</div><section class="pn tbl" id="tl">${tTable()}</section>`}

const calItems=d=>({s:S.sessions.filter(s=>s.date===d).sort((a,b)=>mins(a.time)-mins(b.time)),t:S.tasks.filter(t=>!t.done&&t.due===d),e:S.exams.filter(e=>e.date===d)});
const evHtml=(it,max=99)=>{const r=[];it.s.forEach(s=>{const t=tk(s.taskId);r.push(`<button class="ev${ovl(s)?' ov':''}${s.done?' dn':''}" data-a="editSes" data-id="${esc(s.id)}" style="${t?evs(t.subject):''}" title="Reschedule">${s.time} ${esc(t?t.title:'Deleted task')}</button>`)});
 it.t.forEach(t=>r.push(`<span class="ev due" data-a="noop">Due: ${esc(t.title)}</span>`));it.e.forEach(e=>r.push(`<span class="ev exm" data-a="noop">Exam: ${esc(e.subject)}</span>`));
 return r.slice(0,max).join('')+(r.length>max?`<span class="sm">+${r.length-max} more</span>`:'')};
function vCal(){
 const wkv=C.mode==='week',base=new Date();let days,title;
 if(wkv){const ws=addD(wkStart(today()),C.off*7);days=[...Array(7)].map((_,i)=>addD(ws,i));title=`${fd(days[0])} – ${fd(days[6])}`}
 else{const m=new Date(base.getFullYear(),base.getMonth()+C.off,1);title=m.toLocaleDateString(undefined,{month:'long',year:'numeric'});const s=wkStart(iso(m));days=[...Array(42)].map((_,i)=>addD(s,i));if(pd(days[35]).getMonth()!==m.getMonth())days=days.slice(0,35);C.mi=m.getMonth()}
 const cells=days.map(d=>`<div class="cd${d===today()?' td':''}${!wkv&&pd(d).getMonth()!==C.mi?' om':''}" data-a="qadd" data-id="${d}"><h4><span>${wkv?fd(d):pd(d).getDate()}</span><b class="acc" style="font-weight:400">+</b></h4>${evHtml(calItems(d),wkv?99:3)}</div>`).join('');
 return ph('Calendar','Study sessions, deadlines and exams. Click any day to schedule a session.',`<div class="seg"><button class="${wkv?'on':''}" data-a="cmode" data-id="week">Week</button><button class="${wkv?'':'on'}" data-a="cmode" data-id="month">Month</button></div>${btn('addSes',ic('plus',14)+' Session','','pri')}`)+
 `<div class="tools" style="justify-content:space-between;align-items:center"><div class="acts">${btn('cnav','‹','-1','sm')}${btn('cnav','Today','0','sm')}${btn('cnav','›','1','sm')}</div><h3>${title}</h3><span class="sm">▍sessions · due dates · exams</span></div>
 ${wkv?'':`<div class="dow">${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(x=>`<span>${x}</span>`).join('')}</div>`}<div class="cal${wkv?'':' m'}">${cells}</div><div style="margin-top:16px">${sgPanel(3)}</div>`}

function vExams(){
 const L=S.exams.slice().sort((a,b)=>exTs(a)-exTs(b)),now=Date.now(),up=L.filter(e=>exTs(e)>=now),past=L.filter(e=>exTs(e)<now).reverse();
 const c=e=>{const p=pct(e),d=dd(e.date),pastE=exTs(e)<now,dt=pd(e.date);
  return`<div class="ex${pastE?' past':''}"><div class="dt"><b>${dt.getDate()}</b><span>${dt.toLocaleDateString(undefined,{month:'short'})}</span></div><div><div class="between" style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><div><b>${esc(e.subject)}</b> ${!pastE&&d<=7?'<span class="tag hi">Within 7 days</span>':''}<div class="sm">${fd(e.date)} · ${e.time}</div></div><div>${pastE?'<span class="sm">Completed</span>':`<b>${cdEl(e)}</b>`} ${ib('editExam','edit',e.id,'Edit')}${ib('delExam','x',e.id,'Delete')}</div></div>
  <div style="margin-top:8px">${bar(p)}<div class="sm" style="margin-top:4px">${p}% of syllabus covered · ${p===0?'Not started':p===100?'Ready':'In progress'}</div></div>
  <details data-o="${esc(e.id)}" ${OP.has(e.id)?'open':''}><summary>Syllabus · ${e.topics.filter(t=>t.done).length}/${e.topics.length} topics</summary>${e.topics.map((t,i)=>`<label class="topic"><input type="checkbox" data-a="topic" data-id="${esc(e.id)}" data-i="${i}" ${t.done?'checked':''}> ${esc(t.t)}</label>`).join('')}</details></div></div>`};
 const bySub=S.subjects.map(s=>{const tp=S.exams.filter(e=>e.subject===s.name).flatMap(e=>e.topics);return{n:s.name,tot:tp.length,dn:tp.filter(t=>t.done).length}}).filter(x=>x.tot);
 return ph('Exams','Countdowns and syllabus coverage.',btn('addExam',ic('plus',14)+' Add exam','','pri'))+(L.length?`<div class="dg"><div>${pn('Upcoming',up.map(c).join('')||'<p class="sm">No upcoming exams.</p>')}${past.length?pn('Past',past.map(c).join('')):''}</div>
 <div>${pn('Preparation by subject',bySub.map(x=>`<div style="margin-bottom:12px"><div style="display:flex;justify-content:space-between"><span>${esc(x.n)}</span><span class="sm">${x.dn}/${x.tot} topics · ${Math.round(x.dn/x.tot*100)}%</span></div>${bar(x.dn/x.tot*100)}</div>`).join('')||'<p class="sm">Add topics to track preparation.</p>')}</div></div>`:pn('Exam timeline',empty('exam','No exams added yet.',btn('addExam','Add your first exam','','pri'))))}

function vSubjects(){
 const W=wlSum(loads());
 const rows=S.subjects.map(s=>{const p=S.tasks.filter(t=>!t.done&&t.subject===s.name),ex=S.exams.filter(e=>e.subject===s.name&&exTs(e)>Date.now()).sort((a,b)=>exTs(a)-exTs(b)),tp=S.exams.filter(e=>e.subject===s.name).flatMap(e=>e.topics),dn=tp.filter(t=>t.done).length;
  return`<div class="tr" style="grid-template-columns:1.3fr 90px 130px 110px 80px 40px"><b>${dot(s.name)}${esc(s.name)}</b><span>${p.length} pending</span><span class="sm">${ex[0]?'Exam '+fd(ex[0].date):'No exam'}</span><span class="sm">${tp.length?Math.round(dn/tp.length*100)+'% syllabus':'—'}</span><span class="sm">${hrs(sum(S.focus.filter(f=>f.subject===s.name)))}</span>${ib('delSub','x',s.id,'Delete')}</div>`}).join('');
 return ph('Subjects','Your semester at a glance.',btn('addSub',ic('plus',14)+' Add subject','','pri'))+(S.subjects.length?`<div class="ov"><div><span>Subjects</span><b>${S.subjects.length}</b></div><div><span>Pending tasks</span><b>${S.tasks.filter(t=>!t.done).length}</b></div><div><span>Pending effort</span><b>${h1(S.tasks.filter(t=>!t.done).reduce((a,t)=>a+t.est,0))}h</b></div><div><span>7-day workload</span><b>${W.st}</b></div></div><section class="pn tbl">${rows}</section>`:pn('Subjects',empty('subj','Add the subjects you are studying this semester.',btn('addSub','Add subject','','pri'))))}

function vFocus(){
 const P=S.tasks.filter(t=>!t.done),t0=today(),td=S.focus.filter(f=>f.date===t0),k=tk(T.task),full=T.left<dur(T.mode)&&!T.run,done=td.length%4||(td.length?4:0);
 return ph('Focus Studio','Deep work, one session at a time.',btn('zen','Distraction-free','','sm'))+`<div class="fg"><section class="pn tc"><div class="seg">${['focus','break'].map(m=>`<button class="${T.mode===m?'on':''}" data-a="tmode" data-id="${m}">${m==='focus'?'Focus':'Break'}</button>`).join('')}</div>
 <div class="ring"><svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="90" class="rb"/><circle id="rp" cx="100" cy="100" r="90" class="rf" stroke-dasharray="565.5" transform="rotate(-90 100 100)"/></svg><div class="rt"><div id="tm"></div><span>${T.mode==='focus'?'Focus · '+S.prefs.focus:'Break · '+S.prefs.brk} min</span></div></div>
 <div class="sm">Session ${td.length+(T.mode==='focus'?1:0)} today · ${k?esc(k.subject):'General study'}</div><div class="dots">${[0,1,2,3].map(i=>`<i class="${i<done?'on':''}"></i>`).join('')}</div>
 <div class="fm"><select data-t aria-label="Task"><option value="">No linked task</option>${P.map(t=>`<option value="${esc(t.id)}" ${t.id===T.task?'selected':''}>${esc(t.subject)} — ${esc(t.title)}</option>`).join('')}</select><input data-obj placeholder="Objective for this session" maxlength="80" value="${esc(T.obj)}"></div>
 ${T.run?btn('tpause','Pause','','pri'):btn('tstart',full?'Resume':'Start','','pri')} ${btn('treset','Reset')}</section>
 <div>${pn('Totals',`<div class="kv"><span>Sessions today</span><span>${td.length}</span><span>Focused today</span><span>${hrs(sum(td))}</span><span>Total sessions</span><span>${S.focus.length}</span><span>Total focused time</span><span>${hrs(sum(S.focus))}</span></div>`)}
 ${pn('Session history',S.focus.slice(-8).reverse().map(f=>`<div class="ag"><span class="tm">${fd(f.date)}</span><div class="grow"><b>${esc(f.task||'Free study')}</b><div class="sm">${esc(f.subject)}</div></div><span class="sm">${f.min} min</span></div>`).join('')||empty('focus','Completed focus sessions appear here.'))}</div></div>`}

function vInsights(){
 const d14=lastN(14),dm=d14.map(d=>sum(S.focus.filter(f=>f.date===d))),by={};S.focus.forEach(f=>by[f.subject]=(by[f.subject]||0)+f.min);const subs=Object.entries(by);
 const pend={};S.tasks.filter(t=>!t.done).forEach(t=>pend[t.subject]=(pend[t.subject]||0)+t.est);const pe=Object.entries(pend);
 const act=dm.filter(x=>x>0).length;let streak=0;for(let i=0;i<60;i++){const d=addD(today(),-i);if(sum(S.focus.filter(f=>f.date===d))>0)streak++;else if(i>0)break}
 const best=Math.max(0,...dm),L=loads(),W=wlSum(L),A=attention().slice(0,5),pal=SC;
 const none=m=>`<p class="sm">${m}</p>`;
 return ph('Academic Insights','Calculated from your real activity.')+`<div class="g2">
 ${pn('Weekly study trend',S.focus.length?chart('c-tr',cfg('line',d14.map(d=>pd(d).getDate()),[{data:dm.map(m=>h1(m/60)),borderColor:css('--teal'),backgroundColor:'color-mix(in srgb, '+css('--teal')+' 13%, transparent)',fill:true,tension:.3,pointRadius:2}]),190):none('Complete a focus session to see your trend.'),'<span class="sm">hours · 14 days</span>')}
 ${pn('Subject-wise study distribution',subs.length?chart('c-sd',{type:'doughnut',data:{labels:subs.map(x=>x[0]),datasets:[{data:subs.map(x=>h1(x[1]/60)),backgroundColor:pal,borderWidth:0}]},options:{cutout:'62%',plugins:{legend:{display:true,position:'right',labels:{boxWidth:10}}}}},190):none('No study time recorded yet.'))}
 ${pn('Task completion trend',S.tasks.some(t=>t.done)?chart('c-tc',cfg('bar',d14.map(d=>pd(d).getDate()),[{data:d14.map(d=>S.tasks.filter(t=>t.doneOn===d).length),backgroundColor:css('--olive'),borderRadius:3}]),190):none('Complete a task to see this chart.'),'<span class="sm">tasks per day</span>')}
 ${pn('Focus session statistics',`<div class="kv"><span>Total sessions</span><span>${S.focus.length}</span><span>Total focused time</span><span>${hrs(sum(S.focus))}</span><span>Average session</span><span>${S.focus.length?Math.round(sum(S.focus)/S.focus.length):0} min</span><span>Active days (14)</span><span>${act}</span><span>Best day (14)</span><span>${hrs(best)}</span><span>Current streak</span><span>${n(streak,'day')}</span><span>Assignment completion</span><span>${(()=>{const a=S.tasks.filter(t=>t.type==='Assignment');return a.length?Math.round(a.filter(t=>t.done).length/a.length*100)+'%':'—'})()}</span></div>`)}
 ${pn('Academic workload distribution',pe.length?chart('c-wd',cfg('bar',pe.map(x=>x[0]),[{data:pe.map(x=>h1(x[1])),backgroundColor:pe.map(x=>sc(x[0])),borderRadius:3}],{y:1}),Math.max(120,pe.length*38)):none('No pending work.'),'<span class="sm">pending effort (h)</span>')}</div>
 <h2 style="margin:8px 0 12px;font-size:17px">Smart workload analysis</h2><div class="g2">
 ${pn('Next 7 days',`<div class="fld" style="grid-template-columns:1fr auto;padding-top:0"><span class="sm">Available study hours per day</span><input type="number" class="in" style="width:80px" min="0.5" max="16" step="0.5" value="${S.prefs.daily}" data-p="daily"></div>`+L.map(x=>`<div class="lrow"><span>${fd(x.d)}</span>${bar(dem(x)/x.cap*100)}<span class="${dem(x)>x.cap+.01?'acc':'sm'}">${h1(dem(x))}h / ${x.cap}h${dem(x)>x.cap+.01?' · over':''}</span></div>`).join('')+
  `<p class="sm" style="margin-top:10px">${W.st}: ${h1(W.used)}h of ${W.cap7}h used · ${W.spare>=0?h1(W.spare)+'h spare capacity':h1(-W.spare)+'h over capacity'}.<br>Day load = scheduled sessions + effort of tasks due that day that no session covers yet.</p>`)}
 ${pn('Needs attention first',A.map(x=>`<div class="ag"><div class="grow"><b>${esc(x.t.title)}</b><div class="sm">${esc(x.t.subject)} · ${x.why.join(' · ')}</div></div><span class="tag hi">${x.score}</span></div>`).join('')||empty('tasks','No pending tasks.'),'<span class="sm">score</span>')+`<p class="sm">Score = urgency × 3 + priority × 2, +2 if effort exceeds available hours, +1 if unscheduled and due within 3 days.</p>`}</div>${sgPanel(6)}`}

function vSettings(){
 const f=(l,s,i)=>`<div class="fld"><div><b>${l}</b><div class="sm">${s}</div></div>${i}</div>`,P=S.prefs;
 return ph('Settings','Personalise StudySync.')+`<section class="pn">${f('Your name','Used in the dashboard greeting',`<input data-p="name" maxlength="30" value="${esc(P.name)}" placeholder="Optional">`)}
 ${f('Appearance','Light or dark interface',`<div class="seg">${['light','dark'].map(m=>`<button class="${P.theme===m?'on':''}" data-a="theme" data-id="${m}">${m[0].toUpperCase()+m.slice(1)}</button>`).join('')}</div>`)}
 ${f('Daily study hours','Used by workload analysis and planning',`<input type="number" min="0.5" max="16" step="0.5" value="${P.daily}" data-p="daily">`)}
 ${f('Focus duration (minutes)','Pomodoro focus interval',`<input type="number" min="1" max="180" value="${P.focus}" data-p="focus">`)}
 ${f('Break duration (minutes)','Pomodoro break interval',`<input type="number" min="1" max="60" value="${P.brk}" data-p="brk">`)}</section>`}

function vData(){
 const sz=(localStorage.getItem(K)||'').length;
 return ph('Data & Backup','Where your information lives.')+pn('Local storage',`<div class="kv"><span>Subjects</span><span>${S.subjects.length}</span><span>Tasks</span><span>${S.tasks.length}</span><span>Study sessions</span><span>${S.sessions.length}</span><span>Exams</span><span>${S.exams.length}</span><span>Focus sessions</span><span>${S.focus.length}</span><span>Storage used</span><span>${(sz/1024).toFixed(1)} KB</span></div><p class="sm" style="margin-top:12px">All data is stored privately in this browser. Clearing browser data or switching browsers will remove it.</p>`)+
 pn('Reset',`<p class="sm" style="margin-bottom:12px">Permanently delete all subjects, tasks, sessions, exams and focus history. Your theme and name are kept.</p>${btn('wipe','Delete all data')}`)}

const VIEWS={dash:vDash,tasks:vTasks,calendar:vCal,exams:vExams,subjects:vSubjects,focus:vFocus,insights:vInsights,settings:vSettings,data:vData},V=()=>VIEWS[location.hash.slice(1)]?location.hash.slice(1):'dash';

/* ================= Forms (slide-over panel) ================= */
let FH;
function form(title,fields,vals,onSave){$('#ft').textContent=title;
 $('#ff').innerHTML=fields.map(f=>{const v=vals?.[f.k]??f.d??'';let i;
  if(f.t==='select')i=`<select name="${f.k}">${f.o.map(o=>{const[a,b]=Array.isArray(o)?o:[o,o];return`<option value="${esc(a)}" ${a==v?'selected':''}>${esc(b)}</option>`}).join('')}</select>`;
  else if(f.t==='textarea')i=`<textarea name="${f.k}" rows="${f.r||3}">${esc(v)}</textarea>`;
  else i=`<input name="${f.k}" type="${f.t||'text'}" value="${esc(v)}" ${f.s?`step="${f.s}"`:''} ${f.m?`min="${f.m}"`:''} ${f.t?'':'maxlength="80"'}>`;
  return`<label>${f.l}${i}</label>`}).join('');
 $('#fe').textContent='';FH={fields,onSave};$('#dlg').showModal()}
$('#frm').addEventListener('submit',e=>{e.preventDefault();const fdt=new FormData(e.target),v={};
 for(const f of FH.fields){v[f.k]=String(fdt.get(f.k)??'').trim();if(f.req&&!v[f.k])return $('#fe').textContent=`${f.l.replace(/ \(.*/,'')} is required`}
 const r=FH.onSave(v);if(r)return $('#fe').textContent=r;$('#dlg').close()});
const needSub=()=>{if(S.subjects.length)return false;toast('Add a subject first');go('subjects');return true};

function taskForm(id,defs){if(needSub())return;const t=id&&tk(id);
 form(t?'Edit task':'New task',[{k:'title',l:'Task title',req:1},{k:'subject',l:'Subject',t:'select',o:S.subjects.map(s=>s.name)},{k:'type',l:'Task type',t:'select',o:TYPES},{k:'due',l:'Due date',t:'date',req:1},{k:'priority',l:'Priority',t:'select',o:['High','Medium','Low'],d:'Medium'},{k:'est',l:'Estimated time (hours)',t:'number',s:'0.25',m:'0.25',req:1,d:'1'},{k:'desc',l:'Description',t:'textarea'}],t||defs,v=>{
  const est=parseFloat(v.est);if(!(est>=.25&&est<=200))return'Estimated time must be between 0.25 and 200 hours';
  if(!t&&dd(v.due)<0)return'Due date cannot be in the past';
  if(S.tasks.some(x=>x.id!==id&&!x.done&&x.title.toLowerCase()===v.title.toLowerCase()&&x.subject===v.subject&&x.due===v.due))return'This task already exists';
  const o={...v,est};t?Object.assign(t,o):S.tasks.push({id:uid(),done:false,doneOn:null,...o});save();render();toast('Task saved')})}

function sesForm(id,defs){const s=id&&S.sessions.find(x=>x.id===id),P=S.tasks.filter(t=>!t.done||(s&&t.id===s.taskId));
 if(!P.length){toast('Create a pending task first');return go('tasks')}
 form(s?'Reschedule session':'Schedule study session',[{k:'taskId',l:'Subject & task',t:'select',o:P.map(t=>[t.id,`${t.subject} — ${t.title}`])},{k:'date',l:'Date',t:'date',req:1,d:today()},{k:'time',l:'Start time',t:'time',req:1,d:'16:00'},{k:'dur',l:'Duration (minutes)',t:'number',m:'5',s:'5',req:1,d:'60'}],s||defs,v=>{
  const d=parseInt(v.dur);if(!(d>=5&&d<=480))return'Duration must be 5–480 minutes';
  if(mins(v.time)+d>1440)return'Session must finish before midnight';
  if(!s&&dd(v.date)<0)return'Date cannot be in the past';
  if(S.sessions.some(x=>x.id!==id&&x.taskId===v.taskId&&x.date===v.date&&x.time===v.time))return'This session already exists';
  const o={taskId:v.taskId,date:v.date,time:v.time,dur:d,done:false};s?Object.assign(s,o):S.sessions.push({id:uid(),...o});
  const x=s||S.sessions[S.sessions.length-1];save();render();toast(ovl(x)?'Saved. This overlaps another session':'Session saved')})}

function examForm(id){if(needSub())return;const e=id&&S.exams.find(x=>x.id===id);
 form(e?'Edit exam':'New exam',[{k:'subject',l:'Subject',t:'select',o:S.subjects.map(s=>s.name)},{k:'date',l:'Exam date',t:'date',req:1},{k:'time',l:'Start time',t:'time',req:1,d:'09:00'},{k:'topics',l:'Syllabus topics (one per line)',t:'textarea',r:6,req:1}],e&&{...e,topics:e.topics.map(t=>t.t).join('\n')},v=>{
  const tp=[...new Set(v.topics.split(/\r?\n/).map(x=>x.trim()).filter(Boolean))];if(!tp.length)return'Add at least one topic';
  if(!e&&exTs(v)<Date.now())return'Exam date must be in the future';
  if(S.exams.some(x=>x.id!==id&&x.subject===v.subject&&x.date===v.date))return'An exam for this subject on this date already exists';
  const old=e?Object.fromEntries(e.topics.map(t=>[t.t,t.done])):{},o={subject:v.subject,date:v.date,time:v.time,topics:tp.map(t=>({t,done:!!old[t]}))};
  e?Object.assign(e,o):S.exams.push({id:uid(),...o});save();render();toast('Exam saved')})}

const subForm=()=>form('New subject',[{k:'name',l:'Subject name',req:1}],null,v=>{
 if(S.subjects.some(s=>s.name.toLowerCase()===v.name.toLowerCase()))return'This subject already exists';
 S.subjects.push({id:uid(),name:v.name});save();render();toast('Subject added')});

/* ================= Actions ================= */
const setTheme=t=>{S.prefs.theme=t;save();render()};
const acts={noop:()=>{},kpi:id=>{if(id==='tasks'){F.status='pending';F.subject=''}go(id)},cancel:()=>$('#dlg').close(),
 theme:id=>setTheme(id||(S.prefs.theme==='dark'?'light':'dark')),collapse:()=>{S.prefs.collapsed=!S.prefs.collapsed;save();render()},
 tog:id=>{const t=tk(id);t.done=!t.done;t.doneOn=t.done?today():null;save();render();if(t.done)toast('Task completed — nice work!')},
 cyc:id=>{const t=tk(id);t.priority={High:'Medium',Medium:'Low',Low:'High'}[t.priority];save();render()},
 addTask:()=>taskForm(),editTask:id=>taskForm(id),capture:()=>taskForm(null,{due:today()}),
 delTask:id=>{if(confirm('Delete this task and its study sessions?')){S.tasks=S.tasks.filter(t=>t.id!==id);S.sessions=S.sessions.filter(s=>s.taskId!==id);save();render()}},
 addSes:()=>sesForm(),editSes:id=>sesForm(id),qadd:id=>sesForm(null,{date:id}),sdone:id=>{const s=S.sessions.find(x=>x.id===id);s.done=!s.done;save();render();if(s.done)toast('Study session completed!')},
 cmode:id=>{C={mode:id,off:0};render()},cnav:id=>{C.off=id==='0'?0:C.off+Number(id);render()},
 addExam:()=>examForm(),editExam:id=>examForm(id),
 delExam:id=>{if(confirm('Delete this exam?')){S.exams=S.exams.filter(e=>e.id!==id);save();render()}},
 topic:(id,el)=>{S.exams.find(x=>x.id===id).topics[+el.dataset.i].done=el.checked;save();render()},
 addSub:subForm,
 dashMetric:id=>{DVM=id;render()},subjectTasks:id=>{F.subject=id;F.status='';go('tasks')},
 delSub:id=>{const s=S.subjects.find(x=>x.id===id);if(S.tasks.some(t=>t.subject===s.name)||S.exams.some(e=>e.subject===s.name))return toast('Remove this subject\'s tasks and exams first');if(confirm(`Delete ${s.name}?`)){S.subjects=S.subjects.filter(x=>x.id!==id);save();render()}},
 apply:id=>{const x=sg().find(y=>y.k===id);if(!x)return;x.fn();save();render();toast('Schedule updated')},dismiss:id=>{DISM.add(id);render()},
 tstart:()=>{T.end=Date.now()+T.left*1e3;T.run=true;render()},tpause:()=>{T.left=Math.max(0,Math.round((T.end-Date.now())/1e3));T.run=false;render()},
 treset:()=>{T.run=false;T.left=dur(T.mode);render()},tmode:id=>{T.run=false;T.mode=id;T.left=dur(id);render()},
 zen:()=>document.body.classList.toggle('zen'),
 startfocus:id=>{T.task=id;T.mode='focus';T.run=false;T.left=dur('focus');go('focus')},
 wipe:()=>{if(confirm('Delete ALL StudySync data? This cannot be undone.')){const p=S.prefs;S=D();S.prefs.theme=p.theme;S.prefs.name=p.name;save();render();toast('All data deleted')}}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(b&&acts[b.dataset.a])acts[b.dataset.a](b.dataset.id,b)});
document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role=link][data-a]')){e.preventDefault();acts[e.target.dataset.a]?.(e.target.dataset.id,e.target)}if(e.key==='Escape')document.body.classList.remove('zen')});
document.addEventListener('toggle',e=>{const o=e.target.dataset&&e.target.dataset.o;if(o)e.target.open?OP.add(o):OP.delete(o)},true);
document.addEventListener('input',e=>{const el=e.target;if('q' in el.dataset){F.q=el.value;$('#tl').innerHTML=tTable()}else if('obj' in el.dataset)T.obj=el.value});
document.addEventListener('change',e=>{const el=e.target,p=el.dataset.p;
 if(p==='name'){S.prefs.name=el.value.trim().slice(0,30);save();return render()}
 if(p){const r={daily:[.5,16],focus:[1,180],brk:[1,60]}[p],v=parseFloat(el.value);if(!(v>=r[0]&&v<=r[1])){toast(`Enter a value from ${r[0]} to ${r[1]}`);return render()}
  S.prefs[p]=p==='daily'?v:Math.round(v);if(!T.run&&p!=='daily')T.left=dur(T.mode);save();render()}
 else if(el.dataset.f){F[el.dataset.f]=el.value;render()}
 else if('t' in el.dataset){T.task=el.value;render()}});

/* ================= Timer & render ================= */
function finish(){T.run=false;
 if(T.mode==='focus'){const k=tk(T.task);S.focus.push({id:uid(),date:today(),min:S.prefs.focus,subject:k?k.subject:'General',task:k?k.title:T.obj.trim()});save();toast('Focus session complete. Time for a break.');T.mode='break'}
 else{toast('Break over. Ready to focus.');T.mode='focus'}
 T.left=dur(T.mode);render()}
function paintT(){if($('#tm')){$('#tm').textContent=mmss(T.left);$('#rp').style.strokeDashoffset=565.5*(1-T.left/dur(T.mode))}document.title=T.run?`${mmss(T.left)} · StudySync`:'StudySync'}
function tick(){document.querySelectorAll('[data-ts]').forEach(el=>el.textContent=(el.dataset.s?cds:cd)(+el.dataset.ts-Date.now()));
 if(lastDay&&lastDay!==today())return render();
 if(T.run){T.left=Math.max(0,Math.ceil((T.end-Date.now())/1e3));if(T.left<=0)return finish()}paintT()}
const applySb=()=>document.body.classList.toggle('sb-c',S.prefs.collapsed||innerWidth<820);
function render(){const v=V(),dark=S.prefs.theme==='dark';SGc=null;CHQ.length=0;lastDay=today();
 document.documentElement.dataset.theme=S.prefs.theme;applySb();
 $('#side').innerHTML=`<div class="brand"><span class="mk">S</span><span class="lb">Study<b>Sync</b></span></div>`+NAV.map(([g,it])=>`<div class="ng"><div class="gl">${g}</div>${it.map(([k,l,i])=>`<a href="#${k}" class="${k===v?'on':''}" title="${l}">${ic(i)}<span class="lb">${l}</span></a>`).join('')}</div>`).join('')+
  `<div class="sfoot"><button class="nb" data-a="theme" title="Toggle light / dark mode">${ic(dark?'sun':'moon')}<span class="lb">${dark?'Light mode':'Dark mode'}</span></button><button class="nb" data-a="collapse" title="Collapse sidebar">${ic('chev')}<span class="lb">Collapse</span></button></div>`;
 $('#fab').innerHTML=ic('plus',22);$('#main').innerHTML=VIEWS[v]();paintCharts();tick()}
addEventListener('hashchange',render);addEventListener('resize',applySb);setInterval(tick,1000);render();
