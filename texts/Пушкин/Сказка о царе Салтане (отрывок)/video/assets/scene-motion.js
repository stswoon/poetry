(function () {
  'use strict';
  const spring = window.Motion.spring({keyframes:[0,1], stiffness:150, damping:18, mass:1});
  const samples = Array.from({length:241}, (_,i)=>spring.next(i*1000/240).value);
  const springEase = (p) => {
    if (p<=0) return 0;
    if (p>=1) return 1;
    const x=p*240, n=Math.floor(x);
    return samples[n]+(samples[n+1]-samples[n])*(x-n);
  };
  function cyclic(tl, els, prop, a, b, duration, period, phase) {
    if (!els.length) return;
    const count=Math.max(1,Math.ceil((duration-phase)/period));
    const span=Math.max(0.1,(duration-phase)/count);
    tl.fromTo(els, {[prop]:a}, {[prop]:b,duration:span,repeat:count-1,yoyo:true,ease:'sine.inOut',overwrite:'auto'},phase);
  }
  window.createComicTimeline = function (id,duration,number,events) {
    const root=document.getElementById(id) || document.querySelector('[data-composition-id="'+id+'"]');
    if (!root) throw new Error('Missing scene '+id);
    const q=(s)=>Array.from(root.querySelectorAll(s));
    const tl=gsap.timeline({paused:true});
    const visual=q('.scene-visual');
    const stage=q('.art-stage');
    if(number>0 && number<8) {
      tl.fromTo(visual,{clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)',duration:0.32,ease:'power2.inOut'},0);
    }
    cyclic(tl,q('.anim-waves-back'),'x',-30,28,duration,2.2,0);
    cyclic(tl,q('.anim-waves-front'),'x',45,-40,duration,1.5,0);
    cyclic(tl,q('.anim-sail'),'rotation',-1.4,1.3,duration,1.8,0);
    q('.anim-sail').forEach(e=>gsap.set(e,{transformOrigin:'50% 70%'}));
    if(number===1 || number===7) {
      tl.fromTo(q('.anim-ship'),{x:number===1?-110:-95},{x:number===1?70:155,duration:duration,ease:'none'},0);
      cyclic(tl,q('.anim-ship'),'y',-6,9,duration,1.7,0);
      cyclic(tl,q('.anim-ship'),'rotation',-1.1,1.2,duration,2.0,0);
      q('.anim-ship').forEach(e=>gsap.set(e,{transformOrigin:'50% 80%'}));
    } else {
      cyclic(tl,q('.anim-ship'),'y',-3,4,duration,2.8,0);
    }
    if(q('.anim-cloud').length) tl.fromTo(q('.anim-cloud'),{x:-18},{x:35,duration:duration,ease:'none'},0);
    q('.anim-bird').forEach((e,i)=>tl.fromTo(e,{x:-70-i*15,y:3*i},{x:100+i*12,y:-12+3*i,duration:duration,ease:'none'},0));
    q('.anim-hero').forEach((e,i)=>{
      tl.fromTo(e,{y:18,rotation:(i%2?1:-1)*1.5},{y:0,rotation:0,duration:0.55,ease:springEase},0.14+i*0.07);
    });
    q('.anim-arm').forEach((e,i)=>{
      gsap.set(e,{transformOrigin:'15% 50%'});
      const at=Math.min(duration-0.7,0.7+i*0.27);
      tl.fromTo(e,{rotation:-2},{rotation:5+(i%2)*2,duration:0.38,yoyo:true,repeat:1,ease:'power2.inOut'},Math.max(0,at));
    });
    cyclic(tl,q('.anim-splash'),'y',2,-10,duration,0.8,0);
    if(number===2) {
      const t=Math.max(0.3,events.wonder || 2);
      tl.fromTo(q('.anim-city'),{opacity:0,scale:0.88,y:20},{opacity:1,scale:1,y:0,duration:0.55,ease:springEase},t);
    }
    if(number===3) {
      tl.fromTo(q('.anim-city'),{y:24},{y:0,duration:0.65,ease:springEase},0.1);
      const t=Math.max(0.1,events.cannon || 2);
      tl.fromTo(q('.anim-flash'),{opacity:0,scale:0.55},{opacity:1,scale:1,duration:0.07,ease:'power3.out'},t);
      tl.to(q('.anim-flash'),{opacity:0,scale:1.35,duration:0.32,ease:'power2.out'},t+0.07);
      tl.fromTo(q('.anim-cannon'),{x:0},{x:7,duration:0.09,yoyo:true,repeat:1,ease:'power1.out'},t);
    }
    if(number===4) {
      tl.fromTo(stage,{x:35},{x:0,duration:0.75,ease:'power3.out'},0);
    }
    if(number===5) {
      tl.fromTo(stage,{scale:1.035},{scale:1,duration:0.6,ease:'power3.out'},0);
    }
    if(number===6) {
      tl.fromTo(stage,{rotation:-1.1,scale:1.04},{rotation:0,scale:1,duration:0.65,ease:'power3.out'},0);
      q('.route-stroke').forEach(p=>{
        const length=p.getTotalLength();
        gsap.set(p,{strokeDasharray:length+' '+length});
        tl.fromTo(p,{strokeDashoffset:length},{strokeDashoffset:0,duration:Math.max(0.5,duration-0.7),ease:'power1.inOut'},0.5);
      });
    }
    if(number===7) {
      tl.fromTo(q('.journey-arrow'),{scaleX:0},{scaleX:1,duration:Math.max(0.5,duration-0.6),ease:'power1.inOut'},0.4);
    }
    if(number===0 || number===8) {
      const at=number===8?1.0:0.12;
      tl.fromTo(q('.title-sheet'),{scale:0.92,y:22,opacity:0},{scale:1,y:0,opacity:1,duration:0.5,ease:springEase},at);
      tl.fromTo(q('.title-author'),{opacity:0},{opacity:1,duration:0.2,ease:'none'},at+0.35);
    }
    tl.to({p:0},{p:1,duration:duration,ease:'none'},0);
    return tl;
  };
})();
