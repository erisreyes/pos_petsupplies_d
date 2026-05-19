import React from 'react';

export default function CashierTable({ rows, loading }: { rows: any[]; loading?: boolean }) {
  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-3">Cashier Performance</h4>
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : rows.length === 0 ? (
        <div className="text-gray-500">No cashier data</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-600">
              <th>Cashier</th>
              <th className="text-right">Sales</th>
              <th className="text-right">Trans.</th>
              <th className="text-right">Avg</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="py-2">{r.name}</td>
                <td className="py-2 text-right">₱{Number(r.sales || 0).toFixed(2)}</td>
                <td className="py-2 text-right">{r.transactions || 0}</td>
                <td className="py-2 text-right">₱{Number(r.avg || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
