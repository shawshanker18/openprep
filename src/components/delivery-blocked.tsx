import Link from 'next/link';
export function DeliveryBlockedView({message}:{message:string}) {
  return <main className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-16"><h1 className="text-xl font-semibold">Please try again later</h1><p>{message}</p><Link className="underline" href="/dashboard">Back to dashboard</Link></main>;
}
