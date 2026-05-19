import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { format, subDays, startOfToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, addDays, differenceInCalendarDays, parseISO } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';

type Point = { date: string; revenue: number };

type RangeKey = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'single_day' | 'custom';

interface SalesTrendChartProps {
  loading?: boolean;
  data?: any;
  range?: RangeKey;
  singleDate?: string;
  customStart?: string;
  customEnd?: string;
}

export default function SalesTrendChart({
  loading: externalLoading,
  data,
  range: propRange,
  singleDate: propSingleDate,
  customStart: propCustomStart,
  customEnd: propCustomEnd,
}: SalesTrendChartProps) {
  const [loading, setLoading] = useState<boolean>(!!externalLoading);
  const [points, setPoints] = useState<Point[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Use prop values if provided, otherwise use internal state
  const range: RangeKey = propRange || 'this_month';
  const singleDate = propSingleDate || format(new Date(), 'yyyy-MM-dd');
  const customStart = propCustomStart || format(subDays(new Date(), 29), 'yyyy-MM-dd');
  const customEnd = propCustomEnd || format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        let startDate = subDays(new Date(), 29);
        let endDate = new Date();
        let buckets: string[] = [];
        let bucketFor: (d: Date) => string = (d: Date) => format(d, 'yyyy-MM-dd');

        if (range === 'today') {
          startDate = startOfToday();
          endDate = new Date();
          buckets = Array.from({ length: 24 }).map((_, i) => String(i));
          bucketFor = (d: Date) => String(d.getHours());
        } else if (range === 'yesterday') {
          const y = subDays(startOfToday(), 1);
          startDate = y;
          endDate = addDays(y, 1);
          buckets = Array.from({ length: 24 }).map((_, i) => String(i));
          bucketFor = (d: Date) => String(d.getHours());
        } else if (range === 'this_week') {
          startDate = startOfWeek(new Date(), { weekStartsOn: 1 });
          endDate = endOfWeek(new Date(), { weekStartsOn: 1 });
          const days = differenceInCalendarDays(endDate, startDate) + 1;
          buckets = Array.from({ length: days }).map((_, i) => format(addDays(startDate, i), 'yyyy-MM-dd'));
          bucketFor = (d: Date) => format(d, 'yyyy-MM-dd');
        } else if (range === 'last_week') {
          const sw = startOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
          startDate = sw;
          endDate = endOfWeek(subWeeks(new Date(), 1), { weekStartsOn: 1 });
          const days = differenceInCalendarDays(endDate, startDate) + 1;
          buckets = Array.from({ length: days }).map((_, i) => format(addDays(startDate, i), 'yyyy-MM-dd'));
          bucketFor = (d: Date) => format(d, 'yyyy-MM-dd');
        } else if (range === 'this_month') {
          startDate = startOfMonth(new Date());
          endDate = endOfMonth(new Date());
          const days = differenceInCalendarDays(endDate, startDate) + 1;
          buckets = Array.from({ length: days }).map((_, i) => format(addDays(startDate, i), 'yyyy-MM-dd'));
          bucketFor = (d: Date) => format(d, 'yyyy-MM-dd');
        } else if (range === 'last_month') {
          const lmStart = startOfMonth(subMonths(new Date(), 1));
          startDate = lmStart;
          endDate = endOfMonth(subMonths(new Date(), 1));
          const days = differenceInCalendarDays(endDate, startDate) + 1;
          buckets = Array.from({ length: days }).map((_, i) => format(addDays(startDate, i), 'yyyy-MM-dd'));
          bucketFor = (d: Date) => format(d, 'yyyy-MM-dd');
        } else if (range === 'single_day') {
          try {
            const sd = parseISO(singleDate);
            startDate = sd;
            endDate = addDays(sd, 1);
          } catch (e) {
            throw new Error(`Invalid single day date: ${singleDate}`);
          }
          buckets = Array.from({ length: 24 }).map((_, i) => String(i));
          bucketFor = (d: Date) => String(d.getHours());
        } else if (range === 'custom') {
          try {
            const s = parseISO(customStart);
            const e = parseISO(customEnd);
            startDate = s;
            endDate = addDays(e, 1);
          } catch (e) {
            throw new Error(`Invalid custom date range: ${customStart} to ${customEnd}`);
          }
          const days = Math.min(90, differenceInCalendarDays(parseISO(customEnd), parseISO(customStart)) + 1);
          buckets = Array.from({ length: days }).map((_, i) => format(addDays(parseISO(customStart), i), 'yyyy-MM-dd'));
          bucketFor = (d: Date) => format(d, 'yyyy-MM-dd');
        }

        const { data, error } = await supabase
          .from('transactions')
          .select('created_at, total_amount')
          .gte('created_at', startDate.toISOString())
          .lte('created_at', endDate.toISOString())
          .order('created_at', { ascending: true });

        if (error) throw new Error(`Supabase query failed: ${error.message}`);

        const map: Record<string, number> = {};
        buckets.forEach((b) => (map[b] = 0));

        (data || []).forEach((t: any) => {
          const d = new Date(t.created_at);
          const key = bucketFor(d);
          const amt = Number(t.total || t.total_amount || 0);
          map[key] = (map[key] || 0) + amt;
        });

        const pts: Point[] = buckets.map((b) => ({ date: b, revenue: Number(map[b] || 0) }));
        setPoints(pts);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('Failed to load sales trend data:', errorMsg);
        setError(errorMsg);
        setPoints([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [range, singleDate, customStart, customEnd]);

  const formatted = useMemo(() => {
    if (range === 'today') {
      return points.map((p) => ({ ...p, label: `${String(p.date).padStart(2, '0')}:00` }));
    }
    return points.map((p) => ({ ...p, label: format(new Date(p.date), 'MMM d') }));
  }, [points, range]);

  return (
    <div>
      <div className="mb-3">
        <h3 className="text-lg font-semibold text-gray-700">Sales Trend</h3>
      </div>

      <div className="w-full h-52 bg-white rounded-lg flex items-center justify-center">
        {error ? (
          <div className="p-4 text-center text-red-600 bg-red-50 rounded-lg w-full">
            <p className="font-semibold">Error loading chart</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        ) : loading ? (
          <div className="text-gray-500">Loading chart...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formatted} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1E8C5A" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#1E8C5A" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F7F4" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => `₱${Number(v).toFixed(0)}`} />
              <Tooltip formatter={(v: number) => `₱${v.toFixed(2)}`} labelFormatter={(l: any) => l} />
              <Area type="monotone" dataKey="revenue" stroke="#1E8C5A" fillOpacity={1} fill="url(#colorRev)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
