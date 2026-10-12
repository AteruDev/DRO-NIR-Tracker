import { DocStatus } from "../lib/documents";

export const STATUS_LABEL: Record<DocStatus, string> = {
  Received: "Not yet forwarded",
  Forwarded: "Awaiting acknowledgment",
  Delivered: "Delivered",
  Acknowledged: "Acknowledged",
  Completed: "Completed",
};

const STYLES: Record<DocStatus, string> = {
  Received: "bg-slate-100 text-slate-700",
  Forwarded: "bg-accent-100 text-accent-700",
  Delivered: "bg-brand-50 text-brand-700",
  Acknowledged: "bg-brand-100 text-brand-800",
  Completed: "bg-emerald-100 text-emerald-700",
};

export default function StatusPill({ status }: { status: DocStatus }) {
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STYLES[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}
