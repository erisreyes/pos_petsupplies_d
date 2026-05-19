import { useState, useEffect } from 'react';
import { Product, CartItem, Transaction, PaymentMethod } from './types/pos';
import { quickAddItems } from './data/pet-products';
import { fetchProducts, fetchProductById } from './services/productService';
import { PetProductGrid } from './components/PetProductGrid';
import { PetCart } from './components/PetCart';
import { PetCheckoutModal } from './components/PetCheckoutModal';
import { BarcodeScanner } from './components/BarcodeScanner';
import { UserLogin, type Member } from './components/UserLogin';
import InventoryPage from './pages/InventoryPage';
import DashboardPage from './pages/Dashboard';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { AddItemModal } from './components/AddItemModal';
import { UpdateItemModal } from './components/UpdateItemModal';
import { supabase } from '../lib/supabase';
import { Scan, Search, User, Menu, Camera, List } from 'lucide-react';
import { Button } from './components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './components/ui/dropdown-menu';
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from './components/ui/drawer';
import { Input } from './components/ui/input';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';

export default function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [discount, setDiscount] = useState(20);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isUpdateItemOpen, setIsUpdateItemOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [cashierId, setCashierId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [drawerSection, setDrawerSection] = useState<'pos' | 'inventory' | 'reports' | 'users'>('pos');
  
  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchProducts();
      setProducts(data);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products from database');
    } finally {
      setLoading(false);
    }
  };

  // Initialize authenticated user (cashier) ID and subscribe to auth state
  useEffect(() => {
    const fetchUserRole = async (userId: string | null) => {
      if (!userId) return;
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .single();
        if (!error && profile?.role) {
          setUserRole(profile.role);
        } else {
          setUserRole(null);
        }
      } catch (err) {
        setUserRole(null);
        console.error('Failed to fetch user role:', err);
      }
    };

    const initialize = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCashierId(user.id);
        fetchUserRole(user.id);
        setIsLoginOpen(false);
      } else {
        setIsLoginOpen(true);
      }
      loadProducts();
    };

    initialize();

    // subscribe to auth state
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        const id = session?.user?.id ?? null;
        setCashierId(id);
        fetchUserRole(id);
        setIsLoginOpen(false);
      } else if (event === 'SIGNED_OUT') {
        setCashierId(null);
        setUserRole(null);
        setIsLoginOpen(true);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Load data from localStorage
  useEffect(() => {
    const savedTransactions = localStorage.getItem('pet-pos-transactions');
    
    if (savedTransactions) {
      const parsed = JSON.parse(savedTransactions);
      setTransactions(parsed.map((t: any) => ({
        ...t,
        timestamp: new Date(t.timestamp)
      })));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem('pet-pos-transactions', JSON.stringify(transactions));
    }
  }, [transactions]);

  

  const categoryTabs = [
    { id: 'all', name: 'All' },
    { id: 'dog', name: 'Dog' },
    { id: 'cat', name: 'Cat' },
    { id: 'meds', name: 'Meds' },
  ];

  const filteredProducts = products.filter((product) => {
    const query = searchQuery.toLowerCase();
    const categoryMatch =
      selectedCategory === 'all' ||
      (selectedCategory === 'dog' && product.category.toLowerCase().includes('dog')) ||
      (selectedCategory === 'cat' && product.category.toLowerCase().includes('cat')) ||
      (selectedCategory === 'meds' && product.category.toLowerCase() === 'pharmacy');

    const searchMatch =
      product.name.toLowerCase().includes(query) ||
      product.category.toLowerCase().includes(query) ||
      product.id.toLowerCase().includes(query);

    return categoryMatch && searchMatch;
  });

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        toast.success(`Added another ${product.name} to cart`, {
          description: `Quantity: ${existing.quantity + 1}`,
        });
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      toast.success(`${product.name} added to cart`, {
        icon: '🐾',
      });
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const product = await fetchProductById(barcode);
      if (product) {
        addToCart(product);
        toast.success('Scanned successfully!', {
          description: product.name,
          icon: '✅',
        });
      } else {
        toast.error('Product not found', {
          description: `SKU: ${barcode}`,
        });
      }
    } catch (error) {
      console.error('Scan error:', error);
      toast.error('Error scanning product');
    }
  };

  const openEditProduct = (product: Product) => {
    setProductToEdit(product);
    setIsUpdateItemOpen(true);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item
      );
    });
  };

  const removeFromCart = (productId: string) => {
    const item = cart.find(i => i.product.id === productId);
    setCart(prev => prev.filter(item => item.product.id !== productId));
    if (item) {
      toast.info(`${item.product.name} removed from cart`);
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }
    setIsCheckoutOpen(true);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Supabase sign out failed:', error);
    }

    setCart([]);
    toast.success('Logged out successfully');
    setIsLoginOpen(true);
  };

  const handleStaffLogin = (member: Member) => {
    // member.id should correspond to the authenticated user's id/profile
    setCashierId(member.id);
    setUserRole(member.role);
    setIsLoginOpen(false);
    toast.success(`Welcome, ${member.name}`);
  };

  const completeCheckout = (paymentMethod: PaymentMethod) => {
    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const total = subtotal;

    const transaction: Transaction = {
      id: Date.now().toString(),
      items: [...cart],
      total,
      paymentMethod,
      timestamp: new Date(),
      status: 'completed'
    };

    setTransactions(prev => [transaction, ...prev]);
    
    toast.success('Transaction completed!', {
      icon: '✅',
    });

    setCart([]);
    setIsCheckoutOpen(false);
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discounted = Math.max(0, subtotal - subtotal * (discount / 100));
  const taxAmount = Number((discounted * 0.015).toFixed(2));
  const totalAmount = Number((discounted + taxAmount).toFixed(2));

  const Main = () => {
    const navigate = useNavigate();

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
                        onClick={() => { setDrawerSection('pos'); navigate('/'); }}
                        className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${drawerSection === 'pos' ? 'bg-[#E7F7EE] text-[#1E8C5A]' : 'text-gray-700 hover:bg-[#F8FAF8]'}`}
                      >
                        Point of Sale
                      </button>

                      {drawerSection === 'pos' && (
                        <div className="mt-2 grid grid-cols-2 gap-3">
                          {categoryTabs.map((category) => (
                            <button
                              key={category.id}
                              onClick={() => {
                                setSelectedCategory(category.id);
                              }}
                              className={`rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                                selectedCategory === category.id
                                  ? 'bg-[#E7F7EE] text-[#1E8C5A] border border-[#C9E8D5]'
                                  : 'bg-[#F8FAF8] text-gray-600 border border-[#E6ECE7] hover:bg-[#ECF5EE]'
                              }`}
                            >
                              {category.name}
                            </button>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => { setDrawerSection('inventory'); navigate('/inventory'); }}
                        className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${drawerSection === 'inventory' ? 'bg-[#E7F7EE] text-[#1E8C5A]' : 'text-gray-700 hover:bg-[#F8FAF8]'}`}
                      >
                        Inventory Management
                      </button>

                      <button
                        onClick={() => { setDrawerSection('reports'); navigate('/reports'); }}
                        className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${drawerSection === 'reports' ? 'bg-[#E7F7EE] text-[#1E8C5A]' : 'text-gray-700 hover:bg-[#F8FAF8]'}`}
                      >
                        Sales Dashboard
                      </button>

                      <button
                        onClick={() => { setDrawerSection('users'); navigate('/users'); }}
                        className={`w-full text-left px-3 py-2 rounded-lg font-semibold ${drawerSection === 'users' ? 'bg-[#E7F7EE] text-[#1E8C5A]' : 'text-gray-700 hover:bg-[#F8FAF8]'}`}
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
                <p className="text-xs text-white/80">Point of Sale</p>
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
          <div className="grid grid-cols-1 md:grid-cols-[1.8fr_1fr] gap-4 h-full">
            <section className="flex flex-col rounded-[32px] bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#E8EFED]">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {userRole === 'admin' && (
                    <button
                      onClick={() => setIsAddItemOpen(true)}
                      className="text-sm font-semibold text-[#1E8C5A] hover:text-[#166c44] transition"
                    >
                      + Add New Item
                    </button>
                  )}
                  <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search items here..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 h-12 rounded-2xl border border-[#E6ECE7] shadow-sm"
                    />
                  </div>
                </div>

              </div>

              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-full p-10 text-gray-500">
                    Loading products...
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-full p-10 text-gray-500">
                    No products found
                  </div>
                ) : (
                  <PetProductGrid
                    products={filteredProducts}
                    onAddToCart={addToCart}
                    quickAddItems={quickAddItems}
                    onEditProduct={userRole === 'admin' ? openEditProduct : undefined}
                  />
                )}
              </div>
            </section>

            <section className="flex flex-col rounded-[32px] bg-white shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-[#E8EFED]">
                <h2 className="text-xl font-semibold text-[#1E3D2D]">Checkout</h2>
                <div className="mt-4 grid grid-cols-[2fr_1fr_1fr] gap-3 text-xs uppercase tracking-[0.18em] text-gray-500">
                  <span>Name</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Price</span>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                <PetCart
                  items={cart}
                  onUpdateQuantity={updateQuantity}
                  onRemoveItem={removeFromCart}
                />
              </div>

              <div className="border-t border-[#E8EFED] bg-[#F8FBF8] p-5">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between text-base font-semibold text-[#1E8C5A]">
                    <span>Total</span>
                    <span>₱{subtotal.toFixed(2)}</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button
                    onClick={() => setCart([])}
                    className="flex-1 rounded-2xl border border-[#E6ECE7] bg-white text-[#4B6154] hover:bg-[#F2F6F2]"
                  >
                    Cancel Order
                  </Button>
                  <Button
                    onClick={handleCheckout}
                    className="flex-1 rounded-2xl bg-[#1E8C5A] text-white hover:bg-[#166c44]"
                  >
                    Pay (₱{subtotal.toFixed(2)})
                  </Button>
                </div>
              </div>

            </section>
          </div>
        </div>

        {/* Modals and helpers */}
        <BarcodeScanner isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} onScan={handleBarcodeScan} />

        <PetCheckoutModal isOpen={isCheckoutOpen} onClose={() => setIsCheckoutOpen(false)} items={cart} cashierId={cashierId || ''} onComplete={completeCheckout} />

        <UserLogin isOpen={isLoginOpen} onLogin={handleStaffLogin} isRequired={true} />

        <AddItemModal isOpen={isAddItemOpen} onClose={() => setIsAddItemOpen(false)} onProductAdded={() => { loadProducts(); }} />

        <UpdateItemModal isOpen={isUpdateItemOpen} onClose={() => { setIsUpdateItemOpen(false); setProductToEdit(null); }} product={productToEdit} onProductUpdated={() => { loadProducts(); setIsUpdateItemOpen(false); setProductToEdit(null); }} userRole={userRole ?? 'staff'} />

      </div>
    );
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Main />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/reports" element={<DashboardPage />} />
        <Route path="/users" element={<div className="p-6">User Management (placeholder)</div>} />
      </Routes>
    </BrowserRouter>
  );
}