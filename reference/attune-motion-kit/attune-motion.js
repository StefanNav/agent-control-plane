/* Attune Motion Kit 1.0 — dependency-free, event-driven SVG motion. */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const TAU = Math.PI * 2;
  const home = [[-27.6,-25.35],[35.55,-31.05],[-36.75,30.45],[27.75,24.75]];
  const radii = [[35.1,30.6],[25.35,21.3],[25.35,22.2],[34.95,31.2]];
  const modes = ['quiet','search','process','welcome','handoff','reconnect'];
  const states = ['idle','loading','processing','complete','blocked'];
  const clamp = x => Math.max(0, Math.min(1,x));
  const ease = x => { x = clamp(x); return x*x*(3-2*x); };
  const mix = (a,b,t) => a.map((v,i) => v+(b[i]-v)*t);
  const rest = i => [...home[i],0,1,0,1];
  const slot = i => [0,1,3,2].indexOf(i);
  function path(i, circle, stretch) {
    const [ra,rb]=radii[i], r=Math.sqrt(ra*rb), c=clamp(circle);
    const a=(ra+(r-ra)*c)*stretch, b=(rb+(r-rb)*c)/stretch;
    const k=.68+(.55228475-.68)*c;
    return `M0 ${-b}C${k*a} ${-b} ${a} ${-k*b} ${a} 0C${a} ${k*b} ${k*a} ${b} 0 ${b}C${-k*a} ${b} ${-a} ${k*b} ${-a} 0C${-a} ${-k*b} ${-k*a} ${-b} 0 ${-b}Z`;
  }
  function quiet(t,i) {
    const p=(1+Math.sin(t*2.15-i*Math.PI/2))/2;
    return [home[i][0],home[i][1]-1.4*p,0,.965+.035*p,.12+.45*p,1];
  }
  function pose(mode,t,i) {
    const s=slot(i), a=t*1.35+s*Math.PI/2;
    if(mode==='quiet') return quiet(t,i);
    if(mode==='search') {
      // Four scouts explore a breathing elliptical orbit. No implied completion.
      const r=53+8*Math.sin(t*1.05+s*.8);
      return [r*Math.cos(a),r*.77*Math.sin(a),12*Math.sin(a),.65,.8+.2*Math.sin(a)**2,1+.08*Math.sin(2*a)];
    }
    if(mode==='process') {
      // A circular cross: opposing pairs exchange axes, then gently open.
      const breath=(1+Math.sin(t*2.1))/2, r=29+11*breath;
      return [r*Math.cos(a),r*Math.sin(a),a*180/Math.PI,.57+.035*Math.sin(t*2.1+s),.9,1+.13*Math.sin(t*2.1+s*Math.PI/2)];
    }
    if(mode==='welcome') {
      if(t>=2.25) return quiet(t-2.25,i);
      const u=t/2.25, pair=i<2?0:1, theta=TAU*u+(i%2)*Math.PI;
      const dance=[(pair-.5)*87+22*Math.cos(theta),25*Math.sin(theta)-10*Math.sin(Math.PI*u),22*Math.sin(theta),.72,1,1+.12*Math.sin(2*theta)];
      return mix(mix(rest(i),dance,ease(u/.18)),quiet(0,i),ease((u-.68)/.32));
    }
    if(mode==='handoff') {
      // A traveling wave passes from one pebble to the next.
      const phase=t*1.7-s*Math.PI/2, lift=Math.max(0,Math.sin(phase));
      const row=[(s-1.5)*40,-12*lift,7*Math.sin(phase),.54,1,1+.13*Math.sin(phase)];
      return mix(rest(i),row,ease(t/.45));
    }
    // Reconnecting: outward feelers return to a common rhythm, without claiming success.
    const r=39+12*(.5+.5*Math.sin(t*1.7-s*.35));
    const theta=s*Math.PI/2-Math.PI/4+.25*Math.sin(t*1.7);
    return [r*Math.cos(theta),r*Math.sin(theta),0,.65,.65+.35*Math.sin(t*1.7)**2,1+.06*Math.cos(t*1.7)];
  }
  function create(target, options={}) {
    const host=typeof target==='string'?document.querySelector(target):target;
    if(!host) throw new Error('AttuneMotion: mount element not found');
    let mode=options.mode||'quiet', state=options.state||'loading';
    if(!modes.includes(mode)||!states.includes(state)) throw new Error('AttuneMotion: invalid mode or state');
    const size=options.size??64;
    if(typeof size!=='number'||!Number.isFinite(size)||size<=0) throw new Error('AttuneMotion: size must be a positive number');
    const svg=document.createElementNS(NS,'svg');
    svg.setAttribute('viewBox','-100 -100 200 200');
    svg.setAttribute('aria-hidden','true'); svg.setAttribute('focusable','false');
    svg.classList.add('attune-motion');
    svg.style.cssText=`display:block;width:${size}px;height:${size}px;max-width:100%;overflow:visible;flex-shrink:0`;
    const paths=radii.map((_,i)=>{
      const p=document.createElementNS(NS,'path');
      p.setAttribute('fill',i===0||i===3?'var(--attune-cobalt, #0754D5)':'var(--attune-sky, #359EF5)');
      svg.appendChild(p); return p;
    });
    host.appendChild(svg);
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    let reduced=media.matches||options.reducedMotion===true, paused=false, visible=true, destroyed=false;
    let time=0, transitionTime=0, transition=null, frame=0, previous=0;
    let current=home.map((_,i)=>rest(i));
    if(!reduced&&(state==='loading'||state==='processing')) transition={from:current.map(p=>p.slice())};
    function draw(poses) {
      current=poses.map(p=>p.slice());
      paths.forEach((p,i)=>{
        const [x,y,rotation,scale,circle,stretch]=poses[i];
        p.setAttribute('d',path(i,circle,stretch));
        p.setAttribute('transform',`translate(${x} ${y}) rotate(${rotation}) scale(${scale})`);
      });
      svg.dataset.state=state; svg.dataset.mode=mode;
      svg.style.opacity=state==='blocked'?'.55':'1';
    }
    function isMoving() {return !!transition||state==='loading'||state==='processing';}
    function allowed() {return !destroyed&&!paused&&!reduced&&visible&&!document.hidden&&host.isConnected;}
    function schedule() {if(!frame&&allowed()&&isMoving()) frame=requestAnimationFrame(tick);}
    function tick(now) {
      frame=0;
      if(!allowed()) {previous=0;return;}
      const dt=previous?Math.min((now-previous)/1000,.05):0; previous=now;
      time+=dt;
      let poses;
      if(transition) {
        transitionTime+=dt;
        const from=transition.from;
        if(state==='complete'||state==='idle') {
          poses=from.map((p,i)=>mix(p,rest(i),ease((transitionTime-i*.025)/.42)));
          if(transitionTime>=.52) {poses=home.map((_,i)=>rest(i));transition=null;}
        } else {
          const active=state==='processing'?'process':mode;
          poses=from.map((p,i)=>mix(p,pose(active,time,i),ease(transitionTime/.38)));
          if(transitionTime>=.38) transition=null;
        }
      } else poses=home.map((_,i)=>pose(state==='processing'?'process':mode,time,i));
      draw(poses); schedule();
    }
    function suspend() {cancelAnimationFrame(frame);frame=0;previous=0;}
    function onVisibility() {if(document.hidden)suspend();else schedule();}
    function onReduced() {
      reduced=media.matches||options.reducedMotion===true;
      suspend();
      if(reduced) {transition=null;draw(home.map((_,i)=>rest(i)));}
      else schedule();
    }
    const observer=typeof IntersectionObserver==='function'?new IntersectionObserver(entries=>{
      visible=entries[0].isIntersecting;
      if(visible)schedule();else suspend();
    }):null;
    observer?.observe(host);
    document.addEventListener('visibilitychange',onVisibility);
    media.addEventListener('change',onReduced);
    draw(current);schedule();
    return {
      element:svg,
      setState(next) {
        if(destroyed) return;
        if(!states.includes(next)) throw new Error('AttuneMotion: invalid state');
        if(next===state)return;
        const from=current.map(p=>p.slice()); state=next; transitionTime=0;
        if(next==='blocked') {transition=null;suspend();draw(from);return;}
        transition={from};
        if(reduced) {transition=null;draw(home.map((_,i)=>rest(i)));}
        else {draw(current);schedule();}
      },
      setMode(next) {
        if(destroyed)return;
        if(!modes.includes(next))throw new Error('AttuneMotion: invalid mode');
        transition={from:current.map(p=>p.slice())};transitionTime=0;time=0;mode=next;
        if(state==='blocked'||state==='complete'||state==='idle')transition=null;
        draw(reduced?home.map((_,i)=>rest(i)):current);schedule();
      },
      pause() {paused=true;suspend();},
      resume() {paused=false;schedule();},
      restart() {
        if(destroyed)return;
        time=0;transitionTime=0;state='loading';
        transition={from:current.map(p=>p.slice())};
        if(reduced)transition=null;
        draw(reduced?home.map((_,i)=>rest(i)):current);schedule();
      },
      getState() {return {mode,state,paused,reducedMotion:reduced};},
      destroy() {
        destroyed=true;suspend();observer?.disconnect();
        document.removeEventListener('visibilitychange',onVisibility);
        media.removeEventListener('change',onReduced);svg.remove();
      }
    };
  }
  global.AttuneMotion=Object.freeze({create,modes:Object.freeze(modes),version:'1.0.0'});
})(typeof window!=='undefined'?window:globalThis);
