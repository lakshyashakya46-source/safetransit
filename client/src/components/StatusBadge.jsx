const styles = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-rose-50 text-rose-700 border-rose-200",
  blue: "bg-blue-50 text-blue-700 border-blue-200",
  purple: "bg-purple-50 text-purple-700 border-purple-200",
  slate: "bg-slate-50 text-slate-600 border-slate-200"
};

function toneFor(val = "") {
  if (typeof val === "boolean") return val ? "green" : "red";
  const text = String(val).toLowerCase();

  if (text.includes("high") || text.includes("emergency") || text.includes("reject") || text.includes("fail") || text.includes("maintenance") || text.includes("discrepancy") || text.includes("not eligible") || text.includes("mismatch")) return "red";
  if (text.includes("pending") || text.includes("review") || text.includes("leave") || text.includes("medium") || text.includes("warning") || text.includes("suggested")) return "yellow";
  if (text.includes("approved") || text.includes("active") || text.includes("eligible") || text.includes("paid") || text.includes("pass") || text.includes("reconciled") || text === "ok" || text.includes("resolved") || text === "low" || text === "available") return "green";
  if (text.includes("scheduled") || text.includes("progress") || text.includes("reported") || text.includes("responding") || text.includes("completed")) return "blue";
  if (text.includes("override") || text.includes("assigned")) return "purple";

  return "slate";
}

export default function StatusBadge({ value }) {
  if (value === null || value === undefined) return <span className="text-slate-400">—</span>;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[toneFor(value)]}`}>
      {toneFor(value) === "red" && <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />}
      {toneFor(value) === "green" && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
      {toneFor(value) === "yellow" && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />}
      {String(value)}
    </span>
  );
}
