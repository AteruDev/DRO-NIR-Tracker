import { supabase } from "./supabase";

export type Role = "ord" | "division";

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  division_id: string | null;
  divisions: { name: string; code: string } | null;
};

export const homeFor = (role: Role) => (role === "ord" ? "/ord" : "/division");

/** Returns an error message, or null on success. */
export async function signIn(email: string, password: string): Promise<string | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? error.message : null;
}

export async function signOut() {
  await supabase.auth.signOut();
}

/** The signed-in user's role / division, or null if signed out or not set up yet. */
export async function getMyProfile(): Promise<Profile | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, role, division_id, divisions(name, code)")
    .eq("id", userData.user.id)
    .maybeSingle();

  return (data as unknown as Profile | null) ?? null;
}
