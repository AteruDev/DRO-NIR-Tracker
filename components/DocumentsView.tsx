"use client";

import { Fragment, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { Profile } from "../lib/auth";
import {
  Assignment,
  Division,
  Doc,
  DocStatus,
  DocType,
  Drafter,
  acknowledge,
  assignDocument,
  complete,
  fetchDocuments,
  fetchLookups,
  fmtDateTime,
  overallStatus,
  unassign,
} from "../lib/documents";
import StatusPill, { STATUS_LABEL } from "./StatusPill";
import NewDocumentModal from "./NewDocumentModal";
import Select from "./Select";
import SortableTh from "./SortableTh";
import { SortKey, SortState, nextSort, sortDocuments } from "../lib/documentSort";

type Filter = "All" | DocStatus;

const INPUT =
  "rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200";

function chipClass(s: Assignment["status"]) {
  if (s === "Forwarded") return "bg-accent-100 text-accent-700";
  if (s === "Completed") return "bg-emerald-100 text-emerald-700";
  return "bg-brand-100 text-brand-800";
}

// Left-edge colour bar on each row, by status.
const STATUS_BAR: Record<DocStatus, string> = {
  Received: "border-slate-300",
  Forwarded: "border-accent-400",
  Delivered: "border-brand-300",
  Acknowledged: "border-brand-600",
  Completed: "border-emerald-500",
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-PH", { dateStyle: "medium" });
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("en-PH", { timeStyle: "short" });

function Item({ label, value }: { label: string; value?: ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="whitespace-pre-line font-medium">{value || "—"}</dd>
    </div>
  );
}

// ORD only: pick more divisions to forward an existing document to.
function ForwardPanel({
  available,
  busy,
  onForward,
}: {
  available: Division[];
  busy: boolean;
  onForward: (ids: string[]) => void;
}) {
  const [sel, setSel] = useState<string[]>([]);

  if (available.length === 0) {
    return <p className="mt-3 text-xs text-muted">Already forwarded to every division.</p>;
  }
  return (
    <div className="mt-4">
      <p className="mb-1.5 text-xs font-semibold text-brand-800">Forward to</p>
      <div className="flex flex-wrap items-center gap-2">
        {available.map((d) => {
          const on = sel.includes(d.id);
          return (
            <button
              key={d.id}
              onClick={() => setSel((s) => (on ? s.filter((x) => x !== d.id) : [...s, d.id]))}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                on ? "border-brand-700 bg-brand-700 text-white" : "border-line bg-white text-brand-800 hover:bg-brand-50"
              }`}
            >
              {d.name}
            </button>
          );
        })}
        <button
          disabled={sel.length === 0 || busy}
          onClick={() => {
            onForward(sel);
            setSel([]);
          }}
          className="rounded-full bg-accent-400 px-4 py-1.5 text-xs font-bold text-ink transition-colors hover:bg-accent-500 disabled:opacity-40"
        >
          Forward
        </button>
      </div>
    </div>
  );
}

export default function DocumentsView({ profile }: { profile: Profile }) {
  const isOrd = profile.role === "ord";

  const [docs, setDocs] = useState<Doc[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [types, setTypes] = useState<DocType[]>([]);
  const [drafters, setDrafters] = useState<Drafter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<Filter>("All");
  const [sort, setSort] = useState<SortState>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [d, l] = await Promise.all([fetchDocuments(), fetchLookups()]);
      setDocs(d);
      setDivisions(l.divisions);
      setTypes(l.types);
      setDrafters(l.drafters);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Runs an action, shows any error, then reloads the list.
  async function run(id: string, action: () => Promise<string | null>) {
    setBusyId(id);
    setError("");
    const err = await action();
    if (err) setError(err);
    await load();
    setBusyId(null);
  }

  const filters: Filter[] = isOrd
    ? ["All", "Received", "Forwarded", "Acknowledged", "Delivered", "Completed"]
    : ["All", "Forwarded", "Acknowledged", "Delivered", "Completed"];

  const counts = useMemo(() => {
    const c: Record<string, number> = { All: docs.length };
    for (const d of docs) {
      const s = overallStatus(d.document_assignments);
      c[s] = (c[s] ?? 0) + 1;
    }
    return c;
  }, [docs]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = docs.filter((d) => {
      if (statusFilter !== "All" && overallStatus(d.document_assignments) !== statusFilter) return false;
      if (typeFilter && d.doc_type_id !== typeFilter) return false;
      if (divisionFilter && !d.document_assignments.some((a) => a.division_id === divisionFilter)) return false;
      if (!q) return true;
      return [d.doc_no, d.subject, d.sender, d.agency ?? ""].some((v) => v.toLowerCase().includes(q));
    });
    return sortDocuments(filtered, sort);
  }, [docs, query, typeFilter, divisionFilter, statusFilter, sort]);

  const sortProps = (key: SortKey) => ({
    sortDir: sort?.key === key ? sort.dir : null,
    onSort: () => setSort((s) => nextSort(s, key)),
  });

  const waitingForMe = !isOrd ? (counts["Forwarded"] ?? 0) : 0;

  return (
    <main className="mx-auto max-w-7xl px-6 py-8">
      {!isOrd && waitingForMe > 0 && (
        <div className="mb-5 rounded-xl border-l-4 border-accent-400 bg-accent-50 px-4 py-3 text-sm text-accent-700">
          <span className="font-bold">{waitingForMe}</span> document{waitingForMe === 1 ? "" : "s"} waiting for your
          acknowledgment.
        </div>
      )}

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {/* Status chips */}
      <div className="mb-5 flex flex-wrap gap-2">
        {filters.map((f) => {
          const on = statusFilter === f;
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
                on
                  ? "border-brand-700 bg-brand-700 text-white shadow-sm"
                  : "border-line bg-white text-brand-800 hover:bg-brand-50"
              }`}
            >
              {f === "All" ? "All" : STATUS_LABEL[f]}
              <span className={`ml-2 font-bold ${on ? "text-accent-400" : "text-brand-600"}`}>{counts[f] ?? 0}</span>
            </button>
          );
        })}
      </div>

      {/* Search + filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search doc no., subject, sender or agency"
          className={`${INPUT} min-w-64 flex-1`}
        />
        <Select
          ariaLabel="Filter by document type"
          className="w-44"
          value={typeFilter}
          onChange={setTypeFilter}
          options={[{ value: "", label: "All types" }, ...types.map((t) => ({ value: t.id, label: t.name }))]}
        />
        {isOrd && (
          <Select
            ariaLabel="Filter by division"
            className="w-44"
            value={divisionFilter}
            onChange={setDivisionFilter}
            options={[{ value: "", label: "All divisions" }, ...divisions.map((d) => ({ value: d.id, label: d.name }))]}
          />
        )}
        {isOrd && (
          <button
            onClick={() => setShowNew(true)}
            className="rounded-full bg-accent-400 px-5 py-2 text-sm font-bold text-ink shadow-sm transition-colors hover:bg-accent-500"
          >
            + New document
          </button>
        )}
      </div>

      {/* Table */}
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <p>
          Showing <span className="font-semibold text-brand-800">{rows.length}</span> of {docs.length} documents
        </p>
        {sort && (
          <button onClick={() => setSort(null)} className="font-medium text-brand-700 hover:underline">
            Clear sorting
          </button>
        )}
      </div>

      <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gradient-to-r from-brand-900 to-brand-700 text-white">
              <tr className="border-b-4 border-accent-400">
                <SortableTh {...sortProps("doc_no")}>Doc no.</SortableTh>
                <SortableTh {...sortProps("type")}>Type</SortableTh>
                <SortableTh {...sortProps("sender")}>Sender / Agency</SortableTh>
                <SortableTh {...sortProps("subject")}>Subject</SortableTh>
                <SortableTh {...sortProps("received")}>Received</SortableTh>
                {isOrd ? (
                  <>
                    <SortableTh>Forwarded to</SortableTh>
                    <SortableTh {...sortProps("status")}>Status</SortableTh>
                  </>
                ) : (
                  <>
                    <SortableTh {...sortProps("status")}>Status</SortableTh>
                    <SortableTh>Action</SortableTh>
                  </>
                )}
                <th className="w-10" aria-label="Expand" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted">
                    Loading…
                  </td>
                </tr>
              )}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted">
                    {docs.length === 0 && !isOrd
                      ? "Nothing has been forwarded to your division yet."
                      : "No documents match."}
                  </td>
                </tr>
              )}

              {rows.map((d) => {
                const status = overallStatus(d.document_assignments);
                const open = expandedId === d.id;
                const mine = isOrd ? undefined : d.document_assignments[0];
                const needsAction = mine?.status === "Forwarded";
                const busy = busyId === (mine?.id ?? d.id);

                // "2/3 acknowledged" — only counts divisions that have to acknowledge.
                const needAck = d.document_assignments.filter((a) => a.status !== "Delivered");
                const acked = needAck.filter((a) => a.status !== "Forwarded").length;

                return (
                  <Fragment key={d.id}>
                    <tr
                      onClick={() => setExpandedId(open ? null : d.id)}
                      className={`cursor-pointer border-t border-line transition-colors ${
                        needsAction ? "bg-accent-50 hover:bg-accent-100/70" : "even:bg-brand-50/40 hover:bg-brand-50"
                      }`}
                    >
                      <td className={`whitespace-nowrap border-l-4 px-4 py-4 ${STATUS_BAR[status]}`}>
                        <span className="font-semibold tabular-nums text-brand-800">{d.doc_no}</span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="whitespace-nowrap rounded-md bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-800">
                          {d.document_types?.name ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold">{d.sender}</p>
                        {d.agency && <p className="text-xs text-muted">{d.agency}</p>}
                      </td>
                      <td className="px-4 py-4">
                        <p className="line-clamp-2 min-w-56 max-w-md" title={d.subject}>
                          {d.subject}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <p className="font-medium">{fmtDate(d.received_at)}</p>
                        <p className="text-xs text-muted">{fmtTime(d.received_at)}</p>
                      </td>

                      {isOrd ? (
                        <>
                          <td className="px-4 py-4">
                            {d.document_assignments.length === 0 ? (
                              <span className="text-xs font-semibold text-accent-700">Not yet forwarded</span>
                            ) : (
                              <>
                                <div className="flex flex-wrap gap-1.5">
                                  {d.document_assignments.map((a) => (
                                    <span
                                      key={a.id}
                                      title={`${a.divisions?.name ?? ""} — ${a.status}`}
                                      className={`rounded-md px-2 py-0.5 text-xs font-semibold ${chipClass(a.status)}`}
                                    >
                                      {a.divisions?.code ?? "?"}
                                    </span>
                                  ))}
                                </div>
                                {needAck.length > 0 && (
                                  <p className="mt-1 text-xs text-muted">
                                    {acked}/{needAck.length} acknowledged
                                  </p>
                                )}
                              </>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <StatusPill status={status} />
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-4">
                            <StatusPill status={status} />
                          </td>
                          <td className="px-4 py-4">
                            {mine?.status === "Forwarded" && (
                              <button
                                disabled={busy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  run(mine.id, () => acknowledge(mine.id));
                                }}
                                className="rounded-full bg-accent-400 px-4 py-1.5 text-xs font-bold text-ink shadow-sm transition-colors hover:bg-accent-500 disabled:opacity-50"
                              >
                                {busy ? "…" : "Acknowledge"}
                              </button>
                            )}
                            {(mine?.status === "Acknowledged" || mine?.status === "Delivered") && (
                              <button
                                disabled={busy}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  run(mine.id, () => complete(mine.id));
                                }}
                                className="rounded-full border border-brand-700 px-4 py-1.5 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-700 hover:text-white disabled:opacity-50"
                              >
                                {busy ? "…" : "Mark completed"}
                              </button>
                            )}
                          </td>
                        </>
                      )}

                      <td className="pr-4 text-right text-lg leading-none text-brand-600">
                        <span className={`inline-block transition-transform ${open ? "rotate-90" : ""}`}>›</span>
                      </td>
                    </tr>

                    {open && (
                      <tr className="bg-brand-50/70">
                        <td colSpan={8} className="border-l-4 border-brand-600 px-6 py-5">
                          <div className="grid gap-8 md:grid-cols-2">
                            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                              <Item label="Document type" value={d.document_types?.name} />
                              <Item
                                label="Received via"
                                value={
                                  d.received_via === "Others" && d.received_via_other
                                    ? `Others — ${d.received_via_other}`
                                    : d.received_via
                                }
                              />
                              <Item label="Sender" value={d.sender} />
                              <Item label="Agency" value={d.agency} />
                              <Item label="Drafted by" value={d.drafted_by} />
                              <Item label="Date / time received" value={fmtDateTime(d.received_at)} />
                              <Item label="Remarks" value={d.remarks} />
                            </dl>

                            <div>
                              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-brand-700">
                                Routing
                              </p>
                              {d.document_assignments.length === 0 ? (
                                <p className="text-sm text-muted">Not yet forwarded to any division.</p>
                              ) : (
                                <ul className="space-y-2">
                                  {d.document_assignments.map((a) => (
                                    <li
                                      key={a.id}
                                      className="flex items-start justify-between gap-3 rounded-xl border border-line bg-white px-3 py-2.5 text-sm"
                                    >
                                      <div>
                                        <p className="font-semibold">{a.divisions?.name ?? "Division"}</p>
                                        <p className="text-xs text-muted">
                                          Forwarded {fmtDateTime(a.assigned_at)}
                                          {a.acknowledged_at && ` · Acknowledged ${fmtDateTime(a.acknowledged_at)}`}
                                          {a.completed_at && ` · Completed ${fmtDateTime(a.completed_at)}`}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <StatusPill status={a.status} />
                                        {isOrd && (a.status === "Forwarded" || a.status === "Delivered") && (
                                          <button
                                            title="Remove this division"
                                            onClick={() => {
                                              if (
                                                window.confirm(
                                                  `Remove ${a.divisions?.name ?? "this division"} from this document?`
                                                )
                                              )
                                                run(a.id, () => unassign(a.id));
                                            }}
                                            className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-700 hover:text-white"
                                          >
                                            Remove
                                          </button>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {isOrd && (
                                <ForwardPanel
                                  busy={busyId === d.id}
                                  available={divisions.filter(
                                    (div) => !d.document_assignments.some((a) => a.division_id === div.id)
                                  )}
                                  onForward={(ids) => run(d.id, () => assignDocument(d.id, ids))}
                                />
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showNew && (
        <NewDocumentModal
          types={types}
          divisions={divisions}
          drafters={drafters}
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            load();
          }}
        />
      )}
    </main>
  );
}