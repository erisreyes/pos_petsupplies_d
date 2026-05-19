import React from 'react';

export default function HeroMetrics({ loading, data }: { loading?: boolean; data?: any }) {
  const totalSales = data?.totalSales ?? 0;
  const transactions = data?.transactionCount ?? 0;
  const avgOrder = data?.avgOrder ?? 0;
  const grossProfit = data?.grossProfit ?? 0;

  const Card = ({ title, value, subtitle }: any) => (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <div className="text-sm text-gray-600">{title}</div>
      <div className="text-2xl font-semibold text-[#1E8C5A] mt-2">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
    </div>
  );

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card title="Total Sales" value={`₱${totalSales.toLocaleString()}`} subtitle="vs yesterday" />
      <Card title="Transactions" value={transactions} subtitle="count" />
      <Card title="Average Order" value={`₱${avgOrder.toFixed(2)}`} subtitle="per order" />
      <Card title="Gross Profit" value={`₱${grossProfit.toLocaleString()}`} subtitle="margin" />
    </div>
  );
}
