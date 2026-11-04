(function(){
  'use strict';
  const spring=Motion.spring({keyframes:[0,1],stiffness:155,damping:22,mass:1});
  const samples=Array.from({length:241},(_,i)=>spring.next(i*1000/240).value);
  const springEase=p=>{if(p<=0)return 0;if(p>=1)return 1;const x=p*240,n=Math.floor(x);return samples[n]+(samples[n+1]-samples[n])*(x-n)};
  function wave(tl,el,prop,a,b,duration,half=1.2,at=0){if(!el.length)return;const count=Math.max(1,Math.ceil((duration-at)/half));tl.fromTo(el,{[prop]:a},{[prop]:b,duration:(duration-at)/count,repeat:count-1,yoyo:true,ease:'sine.inOut'},at)}
  window.animeScene=function(id,d,n){
    const root=document.getElementById(id)||document.querySelector('[data-composition-id="'+id+'"]');
    if(!root)throw Error('Missing scene '+id);
    const q=s=>Array.from(root.querySelectorAll(s));const tl=gsap.timeline({paused:true});
    const bg=q('.backdrop'),cam=q('.camera');
    tl.fromTo(bg,{x:-20},{x:20,duration:d,ease:'none'},0);
    wave(tl,q('.water-copy'),'x',-20,35,d,.9);
    wave(tl,q('.sea-strip'),'y',-4,8,d,1.4);
    q('.actor-float').forEach((el,i)=>{
      gsap.set(el,{transformOrigin:'50% 80%'});
      const isShip=el.parentElement.classList.contains('ship');
      wave(tl,[el],'rotation',isShip?-1.6:-.25,isShip?1.6:.3,d,isShip?1.25:1.6);
      wave(tl,[el],'y',0,isShip?-12:-4,d,isShip?1.1:1.8);
    });
    q('.rig-head').forEach((el,i)=>{gsap.set(el,{svgOrigin:el.dataset.origin});wave(tl,[el],'rotation',i%2?-.7:.4,i%2?.7:-.9,d,1.4+i*.3)});
    q('.rig-arm').forEach((el,i)=>{gsap.set(el,{svgOrigin:el.dataset.origin});tl.fromTo(el,{rotation:2},{rotation:-2,duration:.55,ease:'power2.inOut'},.2+i*.16);tl.to(el,{rotation:0,duration:.8,ease:'sine.inOut'},Math.min(d-1.0,1.1+i*.1))});
    q('.rig-sail').forEach(el=>{gsap.set(el,{svgOrigin:el.dataset.origin});wave(tl,[el],'scaleX',.99,1.015,d,.8);wave(tl,[el],'rotation',-.35,.35,d,1.1)});
    q('.drop').forEach((el,i)=>{
      const cycle=.65+(i%5)*.1,count=Math.max(1,Math.ceil(d/cycle)),part=d/count;
      tl.fromTo(el,{x:40,y:40,opacity:0},{x:-90-(i%4)*24,y:-70-(i%3)*16,opacity:.75,duration:part*.65,ease:'power1.out',repeat:count-1,repeatDelay:part*.35},0);
    });
    if(n===0||n===14){
      tl.fromTo(q('.ship'),{x:-150},{x:30,duration:d,ease:'none'},0);
      tl.fromTo(q('.title'),{x:-22,opacity:.4},{x:0,opacity:1,duration:.45,ease:'power2.out'},0);
    }
    if(n===1){
      tl.fromTo(q('.ship'),{x:-380,scale:.9},{x:60,scale:1,duration:d,ease:'power1.out'},0);
      tl.fromTo(q('.speed'),{opacity:0},{opacity:.5,duration:.25},1.95);tl.to(q('.speed'),{opacity:0,duration:.45},Math.min(d-.5,2.7));
    }
    if(n===2){
      tl.fromTo(q('.ship'),{x:0,scale:1},{x:150,scale:1.06,duration:d,ease:'none'},0);
      tl.fromTo(bg,{scale:1.06},{scale:1,duration:d,ease:'none'},0);
      tl.fromTo(q('.speed'),{opacity:.22},{opacity:0,duration:d},0);
    }
    if(n===3){
      tl.fromTo(q('.merchant'),{x:-120,y:70},{x:0,y:0,duration:.48,ease:springEase},0);
      tl.fromTo(q('.elder'),{x:160,y:40},{x:0,y:0,duration:.6,ease:springEase},.14);
      tl.fromTo(cam,{scale:1},{scale:1.035,duration:d,ease:'none'},0);
    }
    if(n===4){
      tl.fromTo(q('.leave'),{x:0},{x:-620,duration:1.15,ease:'power2.in'},0);
      tl.fromTo(bg,{x:80,scale:1.14},{x:0,scale:1,duration:Math.min(d,2.1),ease:'power2.out'},0);
      tl.fromTo(q('.ship'),{x:-130},{x:260,duration:d,ease:'none'},0);
    }
    if(n===5){tl.fromTo(bg,{scale:1.03,x:20},{scale:1.15,x:-90,duration:d,ease:'none'},0);tl.fromTo(q('.ship'),{x:0,scale:1},{x:290,scale:.83,duration:d,ease:'none'},0)}
    if(n===6){
      tl.fromTo(q('.gun'),{x:0,y:0},{x:-20,y:9,duration:.1,ease:'power2.out'},.03);tl.to(q('.gun'),{x:0,y:0,duration:.5,ease:springEase},.13);
      tl.fromTo(q('.muzzle'),{opacity:1},{opacity:0,duration:.13,ease:'none'},.03);
      q('.smoke i').forEach((el,i)=>{tl.fromTo(el,{opacity:0,scale:.2,x:-i*55,y:30},{opacity:.84,scale:1,x:i*12,y:-i*15,duration:.5+i*.07,ease:'power2.out'},.06);tl.to(el,{opacity:0,scale:1.55,x:60+i*24,y:-90-i*9,duration:Math.max(.4,d-.8),ease:'sine.out'},.65)});
      tl.fromTo(q('.ship'),{x:-120},{x:40,duration:d,ease:'none'},0);
    }
    if(n===7){
      tl.fromTo(q('.merchant'),{x:-310},{x:0,duration:1.2,ease:'power2.out'},0);
      tl.fromTo(q('.elder'),{x:-260},{x:0,duration:1.5,ease:'power2.out'},0);
      tl.fromTo(q('.prince'),{x:120},{x:0,duration:.8,ease:'power2.out'},.3);
    }
    if(n===8){tl.fromTo(bg,{scale:1},{scale:1.13,duration:d,ease:'none'},0)}
    if(n===9){tl.fromTo(q('.prince'),{x:110},{x:0,duration:.5,ease:'power2.out'},0);tl.fromTo(cam,{scale:1},{scale:1.025,duration:d,ease:'none'},0)}
    if(n===10){tl.fromTo(q('.map'),{scale:.55,rotation:-5,opacity:0},{scale:1,rotation:0,opacity:1,duration:.65,ease:springEase},.4);tl.to(q('.map-route'),{strokeDashoffset:0,duration:Math.max(1,d-1.3),ease:'none'},1.1)}
    if(n===11){gsap.set(q('.lid'),{svgOrigin:'220 400'});tl.fromTo(q('.cargo'),{y:110,opacity:0},{y:0,opacity:1,duration:.5,ease:springEase},0);tl.fromTo(q('.lid'),{scaleY:.15},{scaleY:1,duration:.65,ease:springEase},.35);tl.to(q('.cargo'),{rotation:-.7,duration:.6,ease:'sine.inOut'},1.1)}
    if(n===12){tl.fromTo(q('.ship'),{x:-180,scale:1},{x:450,scale:.85,duration:d,ease:'power1.in'},0);tl.fromTo(bg,{x:0},{x:-170,duration:d,ease:'none'},0)}
    if(n===13){tl.fromTo(q('.ship'),{x:0,scale:1},{x:700,scale:.7,duration:d,ease:'power1.inOut'},0)}
    tl.to({p:0},{p:1,duration:d,ease:'none'},0);
    return tl;
  };
})();
