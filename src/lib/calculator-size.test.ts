import { afterEach,expect,it,vi } from "vitest";
import { watchCalculatorSize } from "./calculator-size";
const setup=()=>{
 let callback:()=>void=()=>{};
 const disconnect=vi.fn();
 const frames=new Map<number,FrameRequestCallback>();let seq=0;
 vi.stubGlobal("ResizeObserver",class {constructor(fn:()=>void){callback=fn;}observe(){}disconnect=disconnect;});
 vi.stubGlobal("requestAnimationFrame",(fn:FrameRequestCallback)=>{const id=++seq;frames.set(id,fn);return id;});
 vi.stubGlobal("cancelAnimationFrame",(id:number)=>frames.delete(id));
 const frame=()=>{const queue=[...frames.values()];frames.clear();queue.forEach(fn=>fn(0));};
 return {resize:()=>callback(),frame,disconnect};
};
afterEach(()=>vi.unstubAllGlobals());
it("uses the actual first-open size after layout settles and refreshes when the applet becomes ready",()=>{
 const env=setup(),host={clientWidth:410,clientHeight:320} as HTMLElement,onSize=vi.fn();
 const watcher=watchCalculatorSize(host,onSize);
 env.frame();expect(onSize).not.toHaveBeenCalled();
 Object.assign(host,{clientWidth:392});env.frame();expect(onSize).toHaveBeenLastCalledWith(392,320);
 watcher.refresh();env.frame();env.frame();expect(onSize).toHaveBeenCalledTimes(2);
});
it("never sizes a hidden host, and resizes on reopening and fullscreen changes",()=>{
 const env=setup(),host={clientWidth:0,clientHeight:0} as HTMLElement,onSize=vi.fn();
 watchCalculatorSize(host,onSize);env.frame();env.frame();expect(onSize).not.toHaveBeenCalled();
 Object.assign(host,{clientWidth:400,clientHeight:320});env.resize();env.frame();env.frame();expect(onSize).toHaveBeenLastCalledWith(400,320);
 Object.assign(host,{clientWidth:0,clientHeight:0});env.resize();env.frame();env.frame();
 Object.assign(host,{clientWidth:400,clientHeight:320});env.resize();env.frame();env.frame();expect(onSize).toHaveBeenCalledTimes(2);
 Object.assign(host,{clientWidth:1200,clientHeight:800});env.resize();env.frame();env.frame();expect(onSize).toHaveBeenLastCalledWith(1200,800);
});
it("cancels pending frames and observers when a panel closes or unmounts",()=>{
 const env=setup(),onSize=vi.fn();
 const watcher=watchCalculatorSize({clientWidth:400,clientHeight:320} as HTMLElement,onSize);
 env.frame();watcher.disconnect();env.frame();env.resize();env.frame();env.frame();
 expect(onSize).not.toHaveBeenCalled();expect(env.disconnect).toHaveBeenCalledOnce();
});
