import StatusBadge from "./StatusBadge";

export default function DataTable({ columns, rows, loading, emptyText = "No records found." }) {
  if (loading) {
    return <div className="surface p-10 text-center text-sm text-slate-500">Loading records...</div>;
  }

  return (
    <div className="surface overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/80">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="whitespace-nowrap px-4 py-3 font-semibold text-slate-500">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, index) => (
              <tr key={row._id || index} className="hover:bg-blue-50/40">
                {columns.map((column) => {
                  const value = row[column.key];

                  return (
                    <td key={column.key} className="whitespace-nowrap px-4 py-3 text-slate-700">
                      {column.status ? <StatusBadge value={value} /> : (value ?? "—")}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!rows.length && <div className="p-10 text-center text-sm text-slate-400">{emptyText}</div>}
    </div>
  );
}
