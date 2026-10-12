import { Doc, DocStatus, overallStatus } from "./documents";

export type SortKey = "doc_no" | "type" | "sender" | "subject" | "received" | "status";
export type SortDir = "asc" | "desc";
export type SortState = { key: SortKey; dir: SortDir } | null;

// The direction you most likely want first when clicking a column:
// text A–Z, but "Received" newest-first.
export const DEFAULT_SORT_DIR: Record<SortKey, SortDir> = {
  doc_no: "asc",
  type: "asc",
  sender: "asc",
  subject: "asc",
  received: "desc",
  status: "asc",
};

// Click cycle: default direction → opposite direction → back to normal order.
export function nextSort(current: SortState, key: SortKey): SortState {
  if (!current || current.key !== key) return { key, dir: DEFAULT_SORT_DIR[key] };
  if (current.dir === DEFAULT_SORT_DIR[key]) {
    return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  }
  return null;
}

// Status sorts by workflow stage (not alphabetically), so ascending puts
// "not yet forwarded" and "awaiting acknowledgment" first.
const STATUS_RANK: Record<DocStatus, number> = {
  Received: 0,
  Forwarded: 1,
  Acknowledged: 2,
  Delivered: 3,
  Completed: 4,
};

function sortValue(doc: Doc, key: SortKey): string | number | null {
  switch (key) {
    case "doc_no":
      return doc.doc_no?.trim() || null;
    case "type":
      return doc.document_types?.name?.trim() || null;
    case "sender":
      return doc.sender?.trim() || null;
    case "subject":
      return doc.subject?.trim() || null;
    case "received":
      return new Date(doc.received_at).getTime();
    case "status":
      return STATUS_RANK[overallStatus(doc.document_assignments)];
  }
}

// Blank values always sink to the bottom, in either direction.
export function sortDocuments(docs: Doc[], sort: SortState): Doc[] {
  if (!sort) return docs;
  const sign = sort.dir === "asc" ? 1 : -1;

  return [...docs].sort((a, b) => {
    const va = sortValue(a, sort.key);
    const vb = sortValue(b, sort.key);
    if (va === null && vb === null) return 0;
    if (va === null) return 1;
    if (vb === null) return -1;
    if (typeof va === "number" && typeof vb === "number") return (va - vb) * sign;
    return String(va).localeCompare(String(vb), undefined, { numeric: true, sensitivity: "base" }) * sign;
  });
}