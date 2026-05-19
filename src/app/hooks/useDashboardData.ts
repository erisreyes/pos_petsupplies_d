import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function useDashboardData() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const txRes = await supabase.from('transactions').select('*').order('created_at', { ascending: false }).limit(100);
        const productsRes = await supabase.from('products').select('*').limit(500);

        const transactions = txRes.data ?? [];
        const products = productsRes.data ?? [];

        const totalSales = transactions.reduce((s: number, t: any) => s + (Number(t.total || t.total_amount || 0)), 0);
        const transactionCount = transactions.length;
        const avgOrder = transactionCount ? totalSales / transactionCount : 0;

        // Simple cashiers aggregation (if transactions have cashier_id)
        const cashiersMap: Record<string, any> = {};
        transactions.forEach((t: any) => {
          const id = t.cashier_id || t.created_by || 'unknown';
          if (!cashiersMap[id]) cashiersMap[id] = { id, name: id, sales: 0, transactions: 0 };
          cashiersMap[id].sales += Number(t.total || t.total_amount || 0);
          cashiersMap[id].transactions += 1;
        });

        const cashiers = Object.values(cashiersMap).map((c: any) => ({ ...c, avg: c.transactions ? c.sales / c.transactions : 0 }));

        // Top products: try to fetch transaction_items table — fallback empty
        let topProducts: any[] = [];
        try {
          const ti = await supabase.from('transaction_items').select('product_id, quantity, subtotal').limit(1000);
          if (ti.data) {
            const map: Record<string, any> = {};
            ti.data.forEach((it: any) => {
              const id = it.product_id;
              if (!map[id]) map[id] = { id, quantity: 0, revenue: 0 };
              map[id].quantity += Number(it.quantity || 0);
              map[id].revenue += Number(it.subtotal || 0);
            });
            topProducts = Object.values(map).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
            // join product names
            topProducts = topProducts.map((p: any) => ({ ...p, name: (products.find((x: any) => x.id === p.id) || {}).name || p.id }));
          }
        } catch (e) {
          // ignore if table doesn't exist
        }

        // Payment breakdown
        const paymentCounts: Record<string, { method: string; count: number; revenue: number }> = {};
        transactions.forEach((t: any) => {
          const m = t.payment_method || t.method || 'unknown';
          if (!paymentCounts[m]) paymentCounts[m] = { method: m, count: 0, revenue: 0 };
          paymentCounts[m].count += 1;
          paymentCounts[m].revenue += Number(t.total || t.total_amount || 0);
        });
        const paymentBreakdown = Object.values(paymentCounts).map(p => ({ method: p.method, count: p.count, revenue: p.revenue, percentage: totalSales ? Math.round((p.revenue / totalSales) * 100) : 0 }));

        // categories simple aggregation
        const categoriesMap: Record<string, any> = {};
        topProducts.forEach((tp: any) => {
          const prod = products.find((x: any) => x.id === tp.id) || {};
          const cat = prod.category || prod.category_id || 'Uncategorized';
          if (!categoriesMap[cat]) categoriesMap[cat] = { name: cat, revenue: 0 };
          categoriesMap[cat].revenue += tp.revenue || 0;
        });
        const categories = Object.values(categoriesMap);

        setData({ totalSales, transactionCount, avgOrder, cashiers, topProducts, paymentBreakdown, categories });
      } catch (err: any) {
        console.error('Dashboard load failed', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return { data, loading, error } as const;
}
