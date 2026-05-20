import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { AddItemModal } from '../components/AddItemModal';
import { UpdateItemModal } from '../components/UpdateItemModal';
import { Button } from '../components/ui/button';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '../components/ui/drawer';
import { Toaster } from '../components/ui/sonner';
import { deleteProduct, fetchProducts } from '../services/productService';
import { Product } from '../types/pos';
import { supabase } from '../../lib/supabase';
import { Camera, List, Menu, User } from 'lucide-react';

export default function InventoryPage() {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [drawerSection, setDrawerSection] = useState<'pos' | 'inventory' | 'reports' | 'users'>('inventory');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProducts();
      setProducts(data);
    } catch (err: any) {
      console.error('Failed to fetch products:', err);
      setError(err?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Supabase sign out failed:', err);
    }
    toast.success('Logged out successfully');
    navigate('/');
  };

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => {
      return (
        p.id.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.barcode ? p.barcode.toLowerCase().includes(q) : false)
      );
    });
  }, [products, search]);

  useEffect(() => {
    setPage(1);
  }, [search, pageSize, products.length]);

  const pageCount = useMemo(() => {
    return Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  }, [filteredProducts.length, pageSize]);

  const safePage = Math.min(page, pageCount);

  const pagedProducts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    const end = start + pageSize;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, pageSize, safePage]);

  const showingStart = filteredProducts.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const showingEnd = Math.min(safePage * pageSize, filteredProducts.length);

  const openEdit = (p: Product) => {
    setProductToEdit(p);
    setIsUpdateOpen(true);
  };

  const handleQuickDelete = async (p: Product) => {
    const ok = window.confirm(`Delete "${p.name}"? This can’t be undone.`);
    if (!ok) return;

    try {
      await deleteProduct(p.id);
      toast.success('Deleted product', { description: p.name });
      await load();
    } catch (err: any) {
      console.error('Failed to delete product:', err);
      const isFkViolation =
        err?.code === '23503' ||
        String(err?.message ?? '').toLowerCase().includes('foreign key constraint');

      if (isFkViolation) {
        toast.error('Unable to delete product', {
          description:
            'This product already exists in transaction history. To keep past receipts accurate, it cannot be deleted.',
        });
        return;
      }

      toast.error('Failed to delete product', { description: err?.message || 'Unknown error' });
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#F4F8F3]">
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
                    <button
                      onClick={() => {
                        setDrawerSection('pos');
                        navigate('/');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${
                        drawerSection === 'pos'
                          ? 'bg-[#E7F7EE] text-[#1E8C5A]'
                          : 'text-gray-700 hover:bg-[#F8FAF8]'
                      }`}
                    >
                      Point of Sale
                    </button>

                    <button
                      onClick={() => {
                        setDrawerSection('inventory');
                        navigate('/inventory');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${
                        drawerSection === 'inventory'
                          ? 'bg-[#E7F7EE] text-[#1E8C5A]'
                          : 'text-gray-700 hover:bg-[#F8FAF8]'
                      }`}
                    >
                      Inventory Management
                    </button>

                    <button
                      onClick={() => {
                        setDrawerSection('reports');
                        navigate('/reports');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${
                        drawerSection === 'reports'
                          ? 'bg-[#E7F7EE] text-[#1E8C5A]'
                          : 'text-gray-700 hover:bg-[#F8FAF8]'
                      }`}
                    >
                      Sales Report Dashboard
                    </button>

                    <button
                      onClick={() => {
                        setDrawerSection('users');
                        navigate('/users');
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${
                        drawerSection === 'users'
                          ? 'bg-[#E7F7EE] text-[#1E8C5A]'
                          : 'text-gray-700 hover:bg-[#F8FAF8]'
                      }`}
                    >
                      User Management
                    </button>

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
              <p className="text-xs text-white/80">Inventory</p>
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

      

      <div className="flex-1 overflow-hidden px-4 py-4">
        <div className="p-6 h-full bg-white rounded-[20px] shadow-sm overflow-hidden flex flex-col">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <h2 className="text-2xl font-semibold text-[#1E3D2D]">Inventory Management</h2>

            <div className="flex flex-col gap-2 w-full sm:w-auto sm:flex-row">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search SKU / name / category / barcode…"
                className="w-full sm:w-80 h-11 rounded-2xl border border-[#E6ECE7] px-4 text-sm shadow-sm"
              />
              <Button
                onClick={() => setIsAddOpen(true)}
                className="h-11 rounded-2xl bg-[#1E8C5A] text-white hover:bg-[#166c44]"
              >
                + Add
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="text-gray-500">Loading products...</div>
          ) : error ? (
            <div className="text-red-600">{error}</div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F7F3] text-sm text-gray-600">
                    <th className="px-3 py-2 border">SKU</th>
                    <th className="px-3 py-2 border">Name</th>
                    <th className="px-3 py-2 border">Category</th>
                    <th className="px-3 py-2 border text-right">Price</th>
                    <th className="px-3 py-2 border text-right">Stock</th>
                    <th className="px-3 py-2 border">Barcode</th>
                    <th className="px-3 py-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedProducts.map((p) => (
                    <tr key={p.id} className="odd:bg-white even:bg-[#FBFDFB] hover:bg-[#F0F6F0]">
                      <td className="px-3 py-2 border text-sm text-gray-700">{p.id}</td>
                      <td className="px-3 py-2 border text-sm text-gray-700">{p.name}</td>
                      <td className="px-3 py-2 border text-sm text-gray-600">{p.category}</td>
                      <td className="px-3 py-2 border text-sm text-right text-[#1E8C5A]">
                        ₱{Number(p.price).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 border text-sm text-right">{p.stock}</td>
                      <td className="px-3 py-2 border text-sm text-gray-600">{p.barcode || '-'}</td>
                      <td className="px-3 py-2 border">
                        <div className="flex items-center gap-2">
                          <Button variant="outline" className="h-9 rounded-xl" onClick={() => openEdit(p)}>
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            className="h-9 rounded-xl"
                            onClick={() => handleQuickDelete(p)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-3">
                <div className="text-sm text-gray-600">
                  Showing <span className="font-semibold">{showingStart}</span>–<span className="font-semibold">{showingEnd}</span>{' '}
                  of <span className="font-semibold">{filteredProducts.length}</span>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-sm text-gray-600 mr-2 hidden sm:block">Rows:</div>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="h-9 rounded-xl border border-[#E6ECE7] px-3 text-sm shadow-sm bg-white"
                    aria-label="Rows per page"
                  >
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n}/page
                      </option>
                    ))}
                  </select>

                  <Button
                    variant="outline"
                    className="h-9 rounded-xl"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage <= 1}
                  >
                    Prev
                  </Button>
                  <div className="text-sm text-gray-600">
                    Page <span className="font-semibold">{safePage}</span> / <span className="font-semibold">{pageCount}</span>
                  </div>
                  <Button
                    variant="outline"
                    className="h-9 rounded-xl"
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={safePage >= pageCount}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <AddItemModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onProductAdded={load}
      />

      <UpdateItemModal
        isOpen={isUpdateOpen}
        onClose={() => {
          setIsUpdateOpen(false);
          setProductToEdit(null);
        }}
        product={productToEdit}
        userRole="admin"
        onProductUpdated={() => {
          load();
          setIsUpdateOpen(false);
          setProductToEdit(null);
        }}
      />
    </div>
  );
}
