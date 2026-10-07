import { GuestNavigation } from "./navigation";

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col lg:flex-row">
      <GuestNavigation />
      <div className="min-w-0 flex-1 lg:ml-56">
        <main className="mx-auto w-full min-w-0 max-w-5xl p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
