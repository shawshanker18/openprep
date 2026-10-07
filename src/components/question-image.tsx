"use client";
import {useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogTrigger} from '@/components/ui/dialog';

/** Question figure that opens in a large, fit-to-screen view when clicked (or activated with the keyboard). */
export function QuestionImage({src,alt}:{src?:string;alt?:string}) {
  const [renewed,setRenewed]=useState<string|null>(null);
  const [attempted,setAttempted]=useState(false);
  const [open,setOpen]=useState(false);
  async function renew() {
    const token=src?.match(/^\/api\/question-assets\/([\w-]+)\/0$/)?.[1];
    if(attempted || !token) return;
    setAttempted(true);
    const response=await fetch('/api/question-assets/refresh',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})}).catch(()=>null);
    if(response?.ok) { const data=await response.json(); if(typeof data.src==='string') setRenewed(data.src); }
  }
  const url=renewed??src;
  // Private images require the session cookie; Next's shared image optimizer must not fetch them.
  /* eslint-disable @next/next/no-img-element */
  if(!url) return <img src={url} alt={alt??''} onError={renew} />;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<button type="button" aria-label={`View larger: ${alt||'figure'}`} className="inline-block max-w-full cursor-zoom-in rounded-sm p-0 align-top focus-visible:outline-2 focus-visible:outline-offset-2" />}>
        <img src={url} alt={alt??''} onError={renew} className="max-w-full" />
      </DialogTrigger>
      <DialogContent className="w-fit max-w-[min(96vw,64rem)] place-items-center overflow-hidden p-3 sm:max-w-[min(96vw,64rem)]">
        <DialogTitle className="sr-only">{alt||'Figure'}</DialogTitle>
        <img src={url} alt={alt??''} className="block max-h-[calc(100dvh-5rem)] w-auto max-w-full rounded-md bg-white object-contain" />
      </DialogContent>
    </Dialog>
  );
}
