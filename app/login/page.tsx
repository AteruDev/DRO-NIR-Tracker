"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile, homeFor, signIn, signOut } from "../../lib/auth";

const INPUT =
  "w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");

    const err = await signIn(email.trim(), password);
    if (err) {
      setError("Incorrect email or password.");
      setBusy(false);
      return;
    }

    const profile = await getMyProfile();
    if (!profile) {
      await signOut();
      setError("Your account isn't set up yet. Please contact the ORD secretariat.");
      setBusy(false);
      return;
    }
    router.replace(homeFor(profile.role));
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-accent-50 p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="h-1.5 bg-accent-400" />
        <div className="bg-gradient-to-r from-brand-900 to-brand-700 px-6 py-5 text-white">
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-accent-400">
            Office of the Regional Director
          </p>
          <h1 className="text-xl font-bold">Document Tracker</h1>
        </div>

        <div className="space-y-4 p-6">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-brand-800">Email</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-brand-800">Password</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={INPUT}
            />
          </label>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-brand-700 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </div>
      </form>
    </main>
  );
}
