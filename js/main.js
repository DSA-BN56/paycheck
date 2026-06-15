
gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis();
function raf(t){lenis.raf(t);requestAnimationFrame(raf)}
requestAnimationFrame(raf);

gsap.utils.toArray('.panel').forEach(panel=>{
 gsap.from(panel,{
  opacity:0,
  y:100,
  duration:1,
  scrollTrigger:{
   trigger:panel,
   start:'top 80%'
  }
 });
});
