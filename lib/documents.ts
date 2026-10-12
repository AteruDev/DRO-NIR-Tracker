import { supabase } from "./supabase";

export const RECEIVED_VIA = ["Personal", "Courier", "Email", "Others"] as const;

export type Division = { id: string; name: string; code: string };
export type Drafter = { id: string; name: string };
export type DocType = { id: string; name: string; requires_ack: boolean };

export type AssignmentStatus = "Forwarded" | "Delivered" | "Acknowledged" | "Completed";
export type DocStatus = "Received" | AssignmentStatus;

export type Assignment = {
  id: string;
  division_id: string;
  status: AssignmentStatus;
  assigned_at: string;
  acknowledged_at: string | null;
  completed_at: string | null;
  divisions: { name: string; code: string } | null;
};

export type Doc = {
  id: string;
  doc_no: string;
  doc_type_id: string;
  sender: string;
  agency: string | null;
  subject: string;
  received_via: (typeof RECEIVED_VIA)[number];
  received_via_other: string | null;
  remarks: string | null;
  drafted_by: string | null;
  received_at: string;
  document_types: { name: string; requires_ack: boolean } | null;
  document_assignments: Assignment[];
};

/**
 * One status for the whole document, worked out from its divisions:
 * nothing forwarded → Received; anyone still has to acknowledge → Forwarded;
 * otherwise Acknowledged / Delivered; everyone finished → Completed.
 * (A division user only ever receives their own assignment, so for them
 * this is simply their own status.)
 */
export function overallStatus(a: Assignment[]): DocStatus {
  if (a.length === 0) return "Received";
  if (a.every((x) => x.status === "Completed")) return "Completed";
  if (a.some((x) => x.status === "Forwarded")) return "Forwarded";
  if (a.some((x) => x.status === "Acknowledged")) return "Acknowledged";
  return "Delivered";
}

export function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

const DOC_SELECT = [
  "id, doc_no, doc_type_id, sender, agency, subject, received_via, received_via_other, remarks, drafted_by, received_at",
  "document_types(name, requires_ack)",
  "document_assignments(id, division_id, status, assigned_at, acknowledged_at, completed_at, divisions(name, code))",
].join(",");

// Row Level Security does the filtering: ORD gets every document; a division
// user only gets documents (and assignments) belonging to their division.
export async function fetchDocuments(): Promise<Doc[]> {
  const { data, error } = await supabase
    .from("documents")
    .select(DOC_SELECT)
    .is("archived_at", null)
    .order("received_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Doc[];
}

export async function fetchLookups(): Promise<{ divisions: Division[]; types: DocType[]; drafters: Drafter[] }> {
  const [d, t, dr] = await Promise.all([
    supabase.from("divisions").select("id, name, code").eq("active", true).order("sort_order"),
    supabase.from("document_types").select("id, name, requires_ack").eq("active", true).order("name"),
    supabase.from("drafters").select("id, name").eq("active", true).order("name"),
  ]);
  if (d.error) throw d.error;
  if (t.error) throw t.error;
  if (dr.error) throw dr.error;
  return {
    divisions: (d.data ?? []) as Division[],
    types: (t.data ?? []) as DocType[],
    drafters: (dr.data ?? []) as Drafter[],
  };
}

export type NewDoc = {
  doc_no: string;
  doc_type_id: string;
  sender: string;
  agency: string;
  subject: string;
  received_via: string;
  received_via_other: string;
  remarks: string;
  drafted_by: string;
  received_at: string; // ISO string
  division_ids: string[];
};

// All the helpers below return an error message, or null on success.

export async function createDocument(f: NewDoc): Promise<string | null> {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      doc_no: f.doc_no.trim() || null, // blank → the database numbers it automatically
      doc_type_id: f.doc_type_id,
      sender: f.sender.trim(),
      agency: f.agency.trim() || null,
      subject: f.subject.trim(),
      received_via: f.received_via,
      received_via_other: f.received_via === "Others" ? f.received_via_other.trim() || null : null,
      remarks: f.remarks.trim() || null,
      drafted_by: f.drafted_by.trim() || null,
      received_at: f.received_at,
    })
    .select("id")
    .single();

  if (error) {
    return error.code === "23505" ? "That document number already exists." : error.message;
  }
  // Remember a newly typed drafter name for the dropdown. Names that already exist
  // simply fail the unique check, which is fine, so the result is ignored.
  if (f.drafted_by.trim()) {
    await supabase.from("drafters").insert({ name: f.drafted_by.trim() });
  }

  return assignDocument(data.id as string, f.division_ids);
}

export async function assignDocument(documentId: string, divisionIds: string[]): Promise<string | null> {
  if (divisionIds.length === 0) return null;
  const { error } = await supabase
    .from("document_assignments")
    .insert(divisionIds.map((division_id) => ({ document_id: documentId, division_id })));
  return error ? error.message : null;
}

export async function unassign(assignmentId: string): Promise<string | null> {
  const { error } = await supabase.from("document_assignments").delete().eq("id", assignmentId);
  return error ? error.message : null;
}

export async function acknowledge(assignmentId: string): Promise<string | null> {
  const { error } = await supabase.rpc("acknowledge_assignment", { p_assignment_id: assignmentId });
  return error ? error.message : null;
}

export async function complete(assignmentId: string): Promise<string | null> {
  const { error } = await supabase.rpc("complete_assignment", { p_assignment_id: assignmentId });
  return error ? error.message : null;
}