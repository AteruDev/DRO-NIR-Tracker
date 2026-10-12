"use client";

import { FormEvent, ReactNode, useState } from "react";
import Select from "./Select";
import { Division, DocType, Drafter, RECEIVED_VIA, createDocument } from "../lib/documents";

const INPUT =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-200";

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-brand-800">
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
    </label>
  );
}

const NEW_DRAFTER = "__new__"; // the "Add new name…" option in the dropdown

// "now" in the format <input type="datetime-local"> expects (local time).
function nowLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function NewDocumentModal({
  types,
  divisions,
  drafters,
  onClose,
  onCreated,
}: {
  types: DocType[];
  divisions: Division[];
  drafters: Drafter[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    doc_no: "",
    doc_type_id: types[0]?.id ?? "",
    sender: "",
    agency: "",
    subject: "",
    received_via: "Personal",
    received_via_other: "",
    remarks: "",
    drafted_by: "", // "" = none, a name, or NEW_DRAFTER
    new_drafter: "",
    received_at: nowLocal(),
  });
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));
  const toggle = (id: string) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!form.doc_type_id || !form.sender.trim() || !form.subject.trim()) {
      setError("Please fill in the document type, sender and subject.");
      return;
    }
    if (form.received_via === "Others" && !form.received_via_other.trim()) {
      setError("Please specify how the document was received.");
      return;
    }

    // Resolve the drafter: picked from the list, or typed. A typed name that matches an
    // existing one (ignoring capitals) reuses the existing spelling.
    let drafted = form.drafted_by;
    if (drafted === NEW_DRAFTER) {
      const typed = form.new_drafter.trim().replace(/\s+/g, " ");
      if (!typed) {
        setError("Type the drafter's name, or pick one from the list.");
        return;
      }
      drafted = drafters.find((d) => d.name.toLowerCase() === typed.toLowerCase())?.name ?? typed;
    }

    setSaving(true);
    const err = await createDocument({
      ...form,
      drafted_by: drafted,
      received_at: new Date(form.received_at).toISOString(),
      division_ids: selected,
    });
    setSaving(false);

    if (err) {
      setError(err);
      return;
    }
    onCreated();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="h-1.5 shrink-0 bg-accent-400" />
        <div className="flex shrink-0 items-center justify-between bg-gradient-to-r from-brand-900 to-brand-700 px-6 py-4 text-white">
          <h2 className="text-lg font-bold">Log incoming document</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full bg-white/10 text-xl leading-none transition-colors hover:bg-white/25"
          >
            ×
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 overflow-y-auto px-6 pb-0 pt-5">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Document no.">
              <input
                value={form.doc_no}
                onChange={(e) => set("doc_no", e.target.value)}
                placeholder="Auto-generated"
                className={INPUT}
              />
            </Field>
            <Field label="Document type" required>
              <Select
                ariaLabel="Document type"
                value={form.doc_type_id}
                onChange={(v) => set("doc_type_id", v)}
                options={types.map((t) => ({ value: t.id, label: t.name }))}
              />
            </Field>
            <Field label="Date / time received" required>
              <input
                type="datetime-local"
                value={form.received_at}
                onChange={(e) => set("received_at", e.target.value)}
                className={INPUT}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Sender" required>
              <input value={form.sender} onChange={(e) => set("sender", e.target.value)} className={INPUT} />
            </Field>
            <Field label="Agency">
              <input value={form.agency} onChange={(e) => set("agency", e.target.value)} className={INPUT} />
            </Field>
            <div>
              <Field label="Drafted by">
                <Select
                  ariaLabel="Drafted by"
                  value={form.drafted_by}
                  onChange={(v) => set("drafted_by", v)}
                  options={[
                    { value: "", label: "— None —" },
                    ...drafters.map((d) => ({ value: d.name, label: d.name })),
                    { value: NEW_DRAFTER, label: "＋ Add new name…", accent: true },
                  ]}
                />
              </Field>
              {form.drafted_by === NEW_DRAFTER && (
                <input
                  autoFocus
                  aria-label="New drafter name"
                  placeholder="Type the name"
                  value={form.new_drafter}
                  onChange={(e) => set("new_drafter", e.target.value)}
                  className={`${INPUT} mt-2`}
                />
              )}
            </div>
          </div>

          <Field label="Subject" required>
            <textarea
              rows={3}
              value={form.subject}
              onChange={(e) => set("subject", e.target.value)}
              className={INPUT}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Received via">
              <Select
                ariaLabel="Received via"
                value={form.received_via}
                onChange={(v) => set("received_via", v)}
                options={RECEIVED_VIA.map((v) => ({ value: v, label: v }))}
              />
            </Field>
            {form.received_via === "Others" && (
              <Field label="Please specify" required>
                <input
                  value={form.received_via_other}
                  onChange={(e) => set("received_via_other", e.target.value)}
                  className={INPUT}
                />
              </Field>
            )}
          </div>

          <Field label="Remarks">
            <textarea rows={2} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} className={INPUT} />
          </Field>

          <div>
            <p className="mb-1.5 text-xs font-semibold text-brand-800">Forward to (optional — you can also do this later)</p>
            <div className="flex flex-wrap gap-2">
              {divisions.map((d) => {
                const on = selected.includes(d.id);
                return (
                  <button
                    type="button"
                    key={d.id}
                    onClick={() => toggle(d.id)}
                    className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      on
                        ? "border-brand-700 bg-brand-700 text-white"
                        : "border-line bg-white text-brand-800 hover:bg-brand-50"
                    }`}
                  >
                    {d.name}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          )}

          <div className="sticky bottom-0 -mx-6 mt-2 flex justify-end gap-3 border-t border-line bg-white/95 px-6 py-4 backdrop-blur">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-5 py-2 text-sm font-medium text-muted transition-colors hover:bg-brand-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-brand-700 px-6 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : selected.length ? "Save & forward" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}