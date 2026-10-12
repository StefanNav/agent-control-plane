'use strict';
const recipes={
  quiet:{title:'Quiet pulse',description:'A small, staggered breath. For the everyday waits that should barely interrupt a thought.',placement:'Inline / panels',footprint:'24–40 px',size:40,heading:'Checking the latest evidence',detail:'Your current review stays available.'},
  search:{title:'Signal search',description:'The pebbles become circles and explore separate orbits, staying connected through a common rhythm.',placement:'Investigation',footprint:'64–96 px',size:96,heading:'Gathering the relevant context',detail:'Looking across the connected sources.'},
  process:{title:'Common rhythm',description:'A soft circular cross. Separate signals move into a shared cadence while the system works.',placement:'Analysis / synthesis',footprint:'64–96 px',size:96,heading:'Bringing the evidence together',detail:'Comparing findings and preparing a summary.'},
  welcome:{title:'First hello',description:'A short partner dance, then a quiet wait. The workspace opens as soon as it is ready.',placement:'First entry',footprint:'120–160 px',size:140,heading:'Welcome to Attune',detail:'Getting your workspace ready.'},
  handoff:{title:'Passing insight',description:'A fluid wave moves between the pebbles. A gentle way to show work moving to its next step.',placement:'Delegation / transfer',footprint:'64–96 px',size:96,heading:'Passing context to the next step',detail:'Keeping the relevant findings together.'},
  reconnect:{title:'Find our way',description:'Small outward searches return to a shared rhythm. Use only while a connection attempt is actually running.',placement:'Active reconnect',footprint:'48–80 px',size:80,heading:'Reconnecting to the workspace',detail:'Trying to restore the connection.'}
};
const q=s=>document.querySelector(s), all=s=>[...document.querySelectorAll(s)];
let selected='quiet', paused=false;
const demos=all('[data-mini]').map(el=>AttuneMotion.create(el,{mode:el.dataset.mini,size:48}));
const signature=AttuneMotion.create(q('#signature'),{mode:'process',size:170});
let hero;
function select(mode){
  selected=mode; const r=recipes[mode];hero?.destroy();
  hero=AttuneMotion.create(q('#hero-mark'),{mode,size:r.size});if(paused)hero.pause();
  q('#recipe-title').textContent=r.title;q('#recipe-description').textContent=r.description;
  q('#placement').textContent=r.placement;q('#footprint').textContent=r.footprint;
  all('button[data-mode]').forEach(b=>{b.classList.toggle('selected',b.dataset.mode===mode);b.setAttribute('aria-pressed',b.dataset.mode===mode)});
  updateCopy('loading');
}
function updateCopy(state){
  const r=recipes[selected], welcome=selected==='welcome';
  q('#context').className='context '+selected+(state==='complete'&&welcome?' ready':'');
  q('#hero-mark').hidden=state==='complete'&&welcome;
  q('#context-extra').textContent='Your workspace is ready';
  q('#context-title').textContent=state==='complete'?(welcome?'Good to see you.':'Ready for your review'):state==='blocked'?'Connection interrupted':state==='processing'?'Bringing the evidence together':r.heading;
  q('#context-detail').textContent=state==='complete'?(welcome?'Pick up where you left off.':'The result is available. Your review is the next step.'):state==='blocked'?'Work has paused. Retry when you’re ready.':state==='processing'?'Comparing findings and preparing a summary.':r.detail;
  q('#status').textContent={loading:selected==='reconnect'?'Reconnecting':'Working',processing:'Processing',complete:'Ready',blocked:'Paused · connection lost'}[state];
  q('#motion-setting').textContent=matchMedia('(prefers-reduced-motion: reduce)').matches?'Reduced motion':paused?'Motion paused':'';
}
all('button[data-mode]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.mode)));
all('[data-event]').forEach(b=>b.addEventListener('click',()=>{
  const event=b.dataset.event;
  if(event==='loading'){hero.setMode(selected);hero.restart();updateCopy('loading')}
  else if(event==='retry'){hero.setMode('reconnect');hero.restart();updateCopy('loading');q('#context-title').textContent='Reconnecting to the workspace';q('#context-detail').textContent='Trying to restore the connection.';q('#status').textContent='Reconnecting'}
  else {hero.setState(event);updateCopy(event)}
}));
q('#pause').addEventListener('click',()=>{
  paused=!paused;[...demos,signature,hero].forEach(a=>a[paused?'pause':'resume']());
  q('#pause').textContent=paused?'Resume motion':'Pause motion';q('#pause').setAttribute('aria-pressed',paused);
  q('#motion-setting').textContent=matchMedia('(prefers-reduced-motion: reduce)').matches?'Reduced motion':paused?'Motion paused':'';
});
function setTheme(dark){document.documentElement.dataset.theme=dark?'dark':'light';q('#theme').textContent=dark?'Light view':'Dark view';q('#theme').setAttribute('aria-pressed',dark)}
setTheme(matchMedia('(prefers-color-scheme: dark)').matches);
q('#theme').addEventListener('click',()=>setTheme(document.documentElement.dataset.theme!=='dark'));
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',()=>{q('#motion-setting').textContent=matchMedia('(prefers-reduced-motion: reduce)').matches?'Reduced motion':paused?'Motion paused':''});
select('quiet');
