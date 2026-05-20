import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '../components/ui/drawer';
import { Toaster } from '../components/ui/sonner';
import { Menu, Camera, List, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import HeroMetrics from '../components/reports/HeroMetrics';
import SalesTrendChart from '../components/reports/SalesTrendChart';
import TopProducts from '../components/reports/TopProducts';
import PaymentDonut from '../components/reports/PaymentDonut';
import CategoryChart from '../components/reports/CategoryChart';
import BranchTable from '../components/reports/BranchTable';
import { useReportData } from '../hooks/useReportData';
import { getTodayYmdInReportZone, type RangeKey } from '../../lib/reportDateRange';
import { cn } from '../components/ui/utils';

export const REPORT_NAV_LABEL = 'Sales Report Dashboard';

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' },
];

export default function ReportDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerSection, setDrawerSection] = useState<'pos' | 'inventory' | 'reports' | 'users'>('reports');
  const [range, setRange] = useState<RangeKey>('today');
  const [customStart, setCustomStart] = useState<string>(() => getTodayYmdInReportZone());
  const [customEnd, setCustomEnd] = useState<string>(() => getTodayYmdInReportZone());

  const { data, loading } = useReportData(range, undefined, customStart, customEnd);

  const navItems = [
    { id: 'pos', name: 'Point of Sale', path: '/' },
    { id: 'inventory', name: 'Inventory Management', path: '/inventory' },
    { id: 'reports', name: REPORT_NAV_LABEL, path: '/reports' },
    { id: 'users', name: 'User Management', path: '/users' },
  ];

  React.useEffect(() => {
    const p = location.pathname;
    if (p === '/' || p === '') return setDrawerSection('pos');
    const match = navItems.find((n) => p.startsWith(n.path) && n.path !== '/');
    if (match) setDrawerSection(match.id as 'pos' | 'inventory' | 'reports' | 'users');
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign out failed:', err);
    }
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Toaster richColors />

      <header className="bg-[#1E8C5A] text-white shadow-lg">
        <div className="px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Drawer direction="left">
              <DrawerTrigger asChild>
                <button className="w-11 h-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
                  <Menu className="w-5 h-5" />
                </button>
              </DrawerTrigger>

              <DrawerContent className="bg-white">
                <DrawerHeader>
                  <DrawerTitle>Menu</DrawerTitle>
                  <p className="text-sm text-gray-500">Quick navigation</p>
                </DrawerHeader>

                <div className="px-4 pb-4">
                  <nav className="space-y-2">
                    {navItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setDrawerSection(item.id as 'pos' | 'inventory' | 'reports' | 'users');
                          navigate(item.path);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${drawerSection === item.id ? 'bg-[#E7F7EE] text-[#1E8C5A]' : 'text-gray-700 hover:bg-[#F8FAF8]'}`}
                      >
                        {item.name}
                      </button>
                    ))}

                    <div className="mt-3">
                      <DrawerClose asChild>
                        <button className="w-full rounded-2xl border border-[#E8DFD0] bg-[#F5F7F3] py-3 text-sm font-semibold text-[#2C3E2E]">
                          Close
                        </button>
                      </DrawerClose>
                    </div>
                  </nav>
                </div>
              </DrawerContent>
            </Drawer>

            <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center">
              <span className="text-2xl">🐾</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold">Mini Step Pet Supplies</h1>
              <p className="text-xs text-white/80">{REPORT_NAV_LABEL}</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <button className="w-11 h-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
              <Camera className="w-5 h-5" />
            </button>
            <button className="w-11 h-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition">
              <List className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="w-11 h-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
              title="Logout"
            >
              <User className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 max-w-7xl mx-auto w-full">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#E5E7EB] pb-4">
          <span className="text-sm font-semibold text-gray-700 shrink-0"></span>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap sm:justify-end">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Select date range">
              {RANGE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setRange(option.value)}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    range === option.value
                      ? 'bg-[#15803d] text-white shadow-sm'
                      : 'border border-[#D1D5DB] bg-white text-gray-700 hover:border-[#15803d]/40 hover:bg-[#F9FAFB]',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

          {range === 'custom' && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="report-custom-start">
                Start date
              </label>
              <input
                id="report-custom-start"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20"
              />
              <span className="text-sm text-gray-500" aria-hidden>
                to
              </span>
              <label className="sr-only" htmlFor="report-custom-end">
                End date
              </label>
              <input
                id="report-custom-end"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg border border-[#D1D5DB] bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm outline-none focus:border-[#15803d] focus:ring-2 focus:ring-[#15803d]/20"
              />
            </div>
          )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4 py-4 max-w-7xl mx-auto">
        <HeroMetrics loading={loading} data={data} />

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[620px_1fr] gap-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <SalesTrendChart loading={loading} data={data} range={range} customStart={customStart} customEnd={customEnd} />
          </div>

          <div className="space-y-4">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <TopProducts items={data?.topProducts ?? []} loading={loading} />
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <PaymentDonut data={data} loading={loading} />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm">
            <CategoryChart data={data} loading={loading} />
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm lg:col-span-1">
            <BranchTable rows={data?.branches ?? []} loading={loading} />
          </div>
        </div>
      </div>
    </div>
  );
}
