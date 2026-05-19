import React from 'react';

export default function CategoryChart({ data }: { data?: any }) {
  const cats = data?.categories ?? [];
  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-2">Category Performance</h4>
      <div className="w-full h-28 bg-gray-50 rounded-lg flex items-center justify-center text-gray-500">Bar chart placeholder</div>
      <ul className="mt-2 text-sm text-gray-600">
        {cats.length === 0 ? <li>No data</li> : cats.map((c: any) => <li key={c.name}>{c.name}: ₱{c.revenue}</li>)}
      </ul>
    </div>
  );
}
