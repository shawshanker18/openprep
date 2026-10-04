"use client";
import Link from 'next/link';
export default function GlobalError({error,retry}:{error:Error&{digest?:string};retry:()=>void}) {
  return <html lang="en"><body style={{fontFamily:'system-ui',padding:'2rem',maxWidth:'40rem',margin:'auto'}}>
    <title>OpenPrep — Something went wrong</title>
    <h1>Something went wrong</h1>
    <p>Try again when your connection is working. Unsaved changes may need to be entered again.</p>
    {error.digest && <p>Reference: {error.digest}</p>}
    <button onClick={retry}>Try again</button><p><Link href="/">Back to OpenPrep</Link></p>
  </body></html>;
}
