"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getMyProfile, homeFor } from "../lib/auth";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    getMyProfile().then((p) => router.replace(p ? homeFor(p.role) : "/login"));
  }, [router]);

  return <div className="p-10 text-muted">Loading…</div>;
}
