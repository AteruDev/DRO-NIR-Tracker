"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile, homeFor, Profile, Role } from "../lib/auth";

// Page guard. This only decides what the browser shows — the real protection is
// the Row Level Security in supabase/schema.sql, which applies to every request.
export default function RequireRole({
  role,
  children,
}: {
  role: Role;
  children: (profile: Profile) => ReactNode;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    let alive = true;
    getMyProfile().then((p) => {
      if (!alive) return;
      if (!p) router.replace("/login");
      else if (p.role !== role) router.replace(homeFor(p.role));
      else setProfile(p);
    });
    return () => {
      alive = false;
    };
  }, [role, router]);

  if (!profile) return <div className="p-10 text-muted">Loading…</div>;
  return <>{children(profile)}</>;
}
