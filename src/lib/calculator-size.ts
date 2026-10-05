/** Measure after layout settles. Hidden hosts wait; opening them resizes even if the last visible size is unchanged. */
export function watchCalculatorSize(host: HTMLElement, onSize: (width:number,height:number)=>void) {
  let cancelled=false, first:number|null=null, second:number|null=null;
  let previous:string|null=null;
  const measure=()=>{
    if(cancelled) return;
    const width=Math.floor(host.clientWidth),height=Math.floor(host.clientHeight);
    if(width<=0 || height<=0) {previous=null;return;}
    const key=`${width}:${height}`;
    if(key===previous) return;
    previous=key;onSize(width,height);
  };
  const schedule=()=>{
    if(cancelled) return;
    if(first!==null) cancelAnimationFrame(first);
    if(second!==null) cancelAnimationFrame(second);
    first=requestAnimationFrame(()=>{
      first=null;
      second=requestAnimationFrame(()=>{second=null;measure();});
    });
  };
  const observer=new ResizeObserver(schedule);
  observer.observe(host);
  schedule();
  return {
    refresh(){previous=null;schedule();},
    disconnect(){cancelled=true;observer.disconnect();if(first!==null) cancelAnimationFrame(first);if(second!==null) cancelAnimationFrame(second);},
  };
}
