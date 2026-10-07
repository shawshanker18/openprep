"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { beginGoogleOAuth } from "@/app/auth/actions";
export function OAuthGoogleButton({enabled,privacyAccepted,signupRequired=false}:{enabled:boolean;privacyAccepted:boolean;signupRequired?:boolean}){
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState<string|null>(null);
  async function openGoogle(email:string|null){if(busy||!enabled)return;setBusy(true);setError(null);try{const result=await beginGoogleOAuth(email,privacyAccepted);if(!result.ok){setError(result.error);setBusy(false);return;}window.location.assign(result.url);}catch{setError("Couldn’t open Google. Check your connection or use email sign-in.");setBusy(false);}}
  const signupForm=<form className="flex flex-col gap-2" onSubmit={e=>{e.preventDefault();void openGoogle(String(new FormData(e.currentTarget).get('email')??''));}}><label className="text-sm">Google email<input name="email" type="email" required autoComplete="email" maxLength={254} className="mt-1 h-11 w-full rounded-lg border px-3"/></label><Button type="submit" disabled={busy||!enabled}>Create account with Google</Button></form>;
  return <div className="flex flex-col gap-2">{signupRequired?signupForm:<><Button variant="outline" className="min-h-11 w-full rounded-full" disabled={busy||!enabled} onClick={()=>void openGoogle(null)}>{busy?'Opening Google…':'Continue with Google'}</Button><details className="text-sm"><summary className="cursor-pointer text-muted-foreground">New to OpenPrep? Create an account with Google</summary><div className="mt-2">{signupForm}</div></details></>}{error&&<p role="alert" className="text-sm text-destructive">{error}</p>}</div>
}
