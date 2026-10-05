"use client";
import {useState} from 'react';

export function QuestionImage({src,alt}:{src?:string;alt?:string}) {
  const [renewed,setRenewed]=useState<string|null>(null);
  const [attempted,setAttempted]=useState(false);
  async function renew() {
    const token=src?.match(/^\/api\/question-assets\/([\w-]+)\/0$/)?.[1];
    if(attempted || !token) return;
    setAttempted(true);
    const response=await fetch('/api/question-assets/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})}).catch(()=>null);
    if(response?.ok) { const data=await response.json(); if(typeof data.src==='string') setRenewed(data.src); }
  }
  // Private images require the session cookie; Next's shared image optimizer must not fetch them.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={renewed??src} alt={alt??''} onError={renew} />;
}
