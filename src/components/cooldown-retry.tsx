"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
export function CooldownRetry({message,onRetry}:{message:string;onRetry:()=>void}) {
  const seconds=Number(message.match(/Rapid skipping cooldown: wait (\d+) seconds/)?.[1]??0);
  const [remaining,setRemaining]=useState(seconds);
  useEffect(()=>{
    const end=Date.now()+seconds*1000;
    const timer=setInterval(()=>setRemaining(Math.max(0,Math.ceil((end-Date.now())/1000))),200);
    return ()=>clearInterval(timer);
  },[seconds]);
  const blocked=message.includes("paused for your account for 48 hours");
  return <Button variant="outline" disabled={remaining>0 || blocked} onClick={onRetry}>{remaining>0?`Continue in ${remaining}s`:"Try again"}</Button>;
}
