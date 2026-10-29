export default function MetricCard({ label, value, hint, icon: Icon }) {
  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-bold tracking-tight text-navy">{value}</p>
          {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
        </div>
        {Icon && (
          <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
            <Icon size={20} />
          </div>
        )}
      </div>
    </div>
  );
}
