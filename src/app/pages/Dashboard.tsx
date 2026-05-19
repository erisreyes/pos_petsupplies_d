import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '../components/ui/drawer';
import { Toaster } from '../components/ui/sonner';
import { Menu, Camera, List, User } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import HeroMetrics from '../components/dashboard/HeroMetrics';
import SalesTrendChart from '../components/dashboard/SalesTrendChart';
import TopProducts from '../components/dashboard/TopProducts';
import PaymentDonut from '../components/dashboard/PaymentDonut';
import CategoryChart from '../components/dashboard/CategoryChart';
import CashierTable from '../components/dashboard/CashierTable';
import { useDashboardData } from '../hooks/useDashboardData';

type RangeKey = 'today' | 'yesterday' | 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'single_day' | 'custom';

export default function Dashboard() {
  const { data, loading, error } = useDashboardData();

  const navigate = useNavigate();
  const location = useLocation();
  const [drawerSection, setDrawerSection] = useState<'pos' | 'inventory' | 'reports' | 'users'>('reports');
  const [range, setRange] = useState<RangeKey>('this_month');
  const [singleDate, setSingleDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [customStart, setCustomStart] = useState<string>(new Date().toISOString().slice(0, 10));
  const [customEnd, setCustomEnd] = useState<string>(new Date().toISOString().slice(0, 10));

  const navItems = [
    { id: 'pos', name: 'Point of Sale', path: '/' },
    { id: 'inventory', name: 'Inventory Management', path: '/inventory' },
    { id: 'reports', name: 'Sales Reports', path: '/reports' },
    { id: 'users', name: 'User Management', path: '/users' },
  ];

  // Keep active drawer item in sync with current route
  React.useEffect(() => {
    const p = location.pathname;
    if (p === '/' || p === '') return setDrawerSection('pos');
    const match = navItems.find((n) => p.startsWith(n.path) && n.path !== '/');
    if (match) setDrawerSection(match.id as any);
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
                          setDrawerSection(item.id as any);
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
              <p className="text-xs text-white/80">Sales Dashboard</p>
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

      {/* Range Selector */}
      <div className="bg-[#166B47] text-white px-4 py-3 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <span className="text-sm text-white/90">Date Range:</span>
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as RangeKey)}
            className="rounded-lg bg-white/20 border border-white/40 px-3 py-2 text-sm text-white outline-none hover:bg-white/30 transition"
          >
            <option value="today" className="bg-slate-800">Today</option>
            <option value="yesterday" className="bg-slate-800">Yesterday</option>
            <option value="this_week" className="bg-slate-800">This Week</option>
            <option value="last_week" className="bg-slate-800">Last Week</option>
            <option value="this_month" className="bg-slate-800">This Month</option>
            <option value="last_month" className="bg-slate-800">Last Month</option>
            <option value="single_day" className="bg-slate-800">Single Day</option>
            <option value="custom" className="bg-slate-800">Custom Range</option>
          </select>

          {range === 'single_day' && (
            <input
              type="date"
              value={singleDate}
              onChange={(e) => setSingleDate(e.target.value)}
              className="rounded-lg bg-white/20 border border-white/40 px-3 py-2 text-sm text-white outline-none hover:bg-white/30 transition"
            />
          )}

          {range === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-lg bg-white/20 border border-white/40 px-3 py-2 text-sm text-white outline-none hover:bg-white/30 transition"
              />
              <span className="text-white/70">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-lg bg-white/20 border border-white/40 px-3 py-2 text-sm text-white outline-none hover:bg-white/30 transition"
              />
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          <div>
          <HeroMetrics loading={loading} data={data} />

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-[620px_1fr] gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <SalesTrendChart loading={loading} data={data} range={range} singleDate={singleDate} customStart={customStart} customEnd={customEnd} />
            </div>

            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <TopProducts items={data?.topProducts ?? []} loading={loading} />
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <PaymentDonut data={data} />
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm">
              <CategoryChart data={data} />
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm lg:col-span-1">
              <CashierTable rows={data?.cashiers ?? []} loading={loading} />
            </div>
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="bg-white p-4 rounded-lg shadow-sm">Quick Filters / Actions</div>
        </aside>
      </div>
    </div>
  </div>
  );
}
