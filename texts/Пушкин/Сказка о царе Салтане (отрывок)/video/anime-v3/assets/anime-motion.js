(function(){
'use strict';
const spring=Motion.spring({keyframes:[0,1],stiffness:155,damping:22,mass:1});
const samples=Array.from({length:241},(_,i)=>spring.next(i*1000/240).value);
const springEase=p=>{if(p<=0)return 0;if(p>=1)return 1;const x=p*240,n=Math.floor(x);return samples[n]+(samples[n+1]-samples[n])*(x-n)};
function wave(tl,el,prop,a,b,duration,half=1.2){if(!el.length)return;const count=Math.max(1,Math.ceil(duration/half));tl.fromTo(el,{[prop]:a},{[prop]:b,duration:duration/count,repeat:count-1,yoyo:true,ease:'sine.inOut'},0)}
window.animeScene=function(id,d,n,events={}){
 const root=document.getElementById(id)||document.querySelector('[data-composition-id="'+id+'"]');
 if(!root)throw Error('Missing scene '+id);
 const q=s=>Array.from(root.querySelectorAll(s)),tl=gsap.timeline({paused:true}),bg=q('.backdrop');
 tl.fromTo(bg,{x:-20},{x:20,duration:d,ease:'none'},0);
 q('.actor-float').forEach((el,i)=>{
  const ship=el.parentElement.classList.contains('ship');gsap.set(el,{transformOrigin:ship?'50% 80%':'50% 90%'});
  wave(tl,[el],'rotation',ship?-.9:-.2,ship?.9:.25,d,ship?1.4:1.6+i*.2);
  wave(tl,[el],'y',0,ship?-8:-2,d,ship?1.2:1.8+i*.2);
 });
 q('.drop').forEach((el,i)=>{const cycle=.7+i%5*.1,count=Math.ceil(d/cycle),span=d/count;tl.fromTo(el,{x:20,y:30,opacity:0},{x:-80-i%4*20,y:-50-i%3*16,opacity:.6,duration:span*.65,ease:'power1.out',repeat:count-1,repeatDelay:span*.35},0)});
 if(n===0){tl.fromTo(q('.ship'),{x:-150},{x:30,duration:d,ease:'none'},0);tl.fromTo(q('.title'),{x:-22,opacity:.4},{x:0,opacity:1,duration:.45,ease:'power2.out'},0)}
 if(n===1){tl.fromTo(q('.ship'),{x:-380,scale:.9},{x:60,scale:1,duration:d,ease:'power1.out'},0)}
 if(n===2){tl.fromTo(q('.ship'),{x:0,scale:1},{x:150,scale:1.06,duration:d,ease:'none'},0)}
 if(n===3){tl.fromTo(q('.merchant'),{x:-100,y:30},{x:0,y:0,duration:.55,ease:springEase},0);tl.fromTo(q('.elder'),{x:120,y:20},{x:0,y:0,duration:.65,ease:springEase},.14)}
 if(n===4){
  const fire=events.cannon;
  gsap.set(q('.ship'),{transformOrigin:'0% 0%'});
  tl.fromTo(q('.ship'),{x:0,scale:1},{x:900,scale:.72,duration:d,ease:'none'},0);
  tl.fromTo(q('.harbor-gun'),{x:-1050,opacity:0},{x:0,opacity:1,duration:.85,ease:'power2.out'},fire-.95);
  tl.fromTo(q('.gun'),{x:0,y:0},{x:-20,y:6,duration:.1,ease:'power2.out'},fire);
  tl.to(q('.gun'),{x:0,y:0,duration:.5,ease:springEase},fire+.1);
  tl.set(q('.muzzle'),{opacity:0},0);tl.set(q('.muzzle'),{opacity:1},fire);tl.to(q('.muzzle'),{opacity:0,duration:.13},fire+.03);
  q('.smoke i').forEach((el,i)=>{tl.set(el,{opacity:0},0);tl.fromTo(el,{opacity:0,scale:.2,x:-i*55,y:30},{opacity:.84,scale:1,x:i*12,y:-i*15,duration:.5+i*.07,ease:'power2.out'},fire+.06);tl.to(el,{opacity:0,scale:1.55,x:60+i*24,y:-90-i*9,duration:1.8,ease:'sine.out'},fire+.7)});
 }
 if(n===7){tl.fromTo(q('.merchant'),{x:-310},{x:0,duration:1.2,ease:'power2.out'},0);tl.fromTo(q('.elder'),{x:-260},{x:0,duration:1.5,ease:'power2.out'},0);tl.fromTo(q('.prince'),{x:120},{x:0,duration:.8,ease:'power2.out'},.3)}
 if(n===8){tl.fromTo(bg,{scale:1},{scale:1.08,duration:d,ease:'none'},0)}
 if(n===9){tl.fromTo(q('.prince'),{x:60},{x:0,duration:.6,ease:'power2.out'},0)}
 if(n===10){tl.fromTo(q('.map'),{scale:.94,y:30,opacity:0},{scale:1,y:0,opacity:1,duration:.65,ease:'power2.out'},.15);tl.to(q('.map-route'),{strokeDashoffset:0,duration:Math.max(1,d-1),ease:'none'},.8)}
 if(n===11){tl.fromTo(q('.cargo'),{y:35,scale:.93,opacity:0},{y:0,scale:1,opacity:1,duration:.65,ease:'power2.out'},0)}
 if(n===12){
  gsap.set(q('.ship'),{transformOrigin:'0% 0%'});
  tl.fromTo(q('.ship'),{x:0,scale:1},{x:930,scale:.72,duration:d,ease:'power1.inOut'},0);
  tl.set(q('.title,.title-shade'),{opacity:0},0);
  tl.fromTo(q('.title-shade'),{opacity:0},{opacity:1,duration:.8,ease:'sine.inOut'},events.title);
  tl.fromTo(q('.title'),{opacity:0,x:-15},{opacity:1,x:0,duration:.8,ease:'power2.out'},events.title+.1);
 }
 tl.to({p:0},{p:1,duration:d,ease:'none'},0);return tl;
};
})();
