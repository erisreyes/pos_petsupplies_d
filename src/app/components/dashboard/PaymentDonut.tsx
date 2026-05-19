import React from 'react';

export default function PaymentDonut({ data }: { data?: any }) {
  const payments = data?.paymentBreakdown ?? [];
  return (
    <div>
      <h4 className="font-semibold text-gray-700 mb-2">Payment Methods</h4>
      <div className="w-full h-36 flex items-center justify-center text-gray-500">Donut placeholder</div>
      <ul className="mt-2 text-sm text-gray-600">
        {payments.length === 0 ? <li>No data</li> : payments.map((p: any) => <li key={p.method}>{p.method}: {p.percentage}%</li>)}
      </ul>
    </div>
  );
}
