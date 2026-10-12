"use client";

import { useRouter } from "next/navigation";
import { Profile, signOut } from "../lib/auth";
import Logo from "./Logo";

export default function Header({ profile }: { profile: Profile }) {
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    router.replace("/login");
  }

  return (
    <header className="bg-gradient-to-r from-brand-900 to-brand-700 text-white shadow-md">
      <div className="h-1 bg-accent-400" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
        <div className="flex items-center gap-4">
          <Logo />
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent-400">
              Office of the Regional Director
            </p>
            <h1 className="text-xl font-bold leading-tight">Document Tracker</h1>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="text-right">
            <p className="font-semibold">{profile.full_name}</p>
            <p className="text-xs text-brand-200">
              {profile.role === "ord" ? "ORD · All divisions" : (profile.divisions?.name ?? "Division")}
            </p>
          </div>
            <button
              onClick={handleSignOut}
              className="rounded-full border-2 border-white bg-red-600 px-4 py-1.5 font-semibold text-white shadow-sm transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-white/0 focus:ring-offset-2 focus:ring-offset-brand-800">
              Sign out
            </button>
        </div>
      </div>
    </header>
  );
}