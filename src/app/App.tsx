import { useState, useEffect } from 'react';
import { Product, CartItem, Transaction, PaymentMethod } from './types/pos';
import { quickAddItems } from './data/pet-products';
import { fetchProducts, fetchProductById } from './services/productService';
import { PetProductGrid } from './components/PetProductGrid';
import { PetCart } from './components/PetCart';
import { PetCheckoutModal } from './components/PetCheckoutModal';
import { BarcodeScanner } from './components/BarcodeScanner';
import { MemberLogin, type Member } from './components/MemberLogin';
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
  const [isMemberLoginOpen, setIsMemberLoginOpen] = useState(true); // Required login on startup
  const [currentMember, setCurrentMember] = useState<Member | null>(null);

  // Load products from Supabase
  useEffect(() => {
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

    loadProducts();
  }, []);

  // Load data from localStorage
  useEffect(() => {
    const savedTransactions = localStorage.getItem('pet-pos-transactions');
    const savedMember = localStorage.getItem('pet-pos-member');
    
    if (savedTransactions) {
      const parsed = JSON.parse(savedTransactions);
      setTransactions(parsed.map((t: any) => ({
        ...t,
        timestamp: new Date(t.timestamp)
      })));
    }
    
    if (savedMember) {
      setCurrentMember(JSON.parse(savedMember));
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    if (transactions.length > 0) {
      localStorage.setItem('pet-pos-transactions', JSON.stringify(transactions));
    }
  }, [transactions]);

  useEffect(() => {
    if (currentMember) {
      localStorage.setItem('pet-pos-member', JSON.stringify(currentMember));
    } else {
      localStorage.removeItem('pet-pos-member');
    }
  }, [currentMember]);

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

  const handleMemberLogin = (member: Member) => {
    setCurrentMember(member);
    setIsMemberLoginOpen(false);
    toast.success(`Welcome, ${member.name}!`, {
      description: `Logged in as ${member.role.charAt(0).toUpperCase() + member.role.slice(1)}`,
      icon: '✅',
    });
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('Supabase sign out failed:', error);
    }

    setCurrentMember(null);
    setCart([]);
    setIsMemberLoginOpen(true);
    toast.success('Logged out successfully');
  };

  const completeCheckout = (paymentMethod: PaymentMethod) => {
    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
    const memberDiscount = currentMember ? subtotal * 0.05 : 0;
    const total = subtotal - memberDiscount;

    const transaction: Transaction = {
      id: Date.now().toString(),
      items: [...cart],
      total,
      paymentMethod,
      timestamp: new Date(),
      status: 'completed'
    };

    setTransactions(prev => [transaction, ...prev]);
    
    // Award loyalty points if member is logged in
    if (currentMember) {
      const pointsEarned = Math.floor(total / 10); // 1 point per 10 pesos
      setCurrentMember({
        ...currentMember,
        loyaltyPoints: currentMember.loyaltyPoints + pointsEarned
      });
      toast.success(`Transaction complete! Earned ${pointsEarned} points`, {
        icon: '⭐',
      });
    } else {
      toast.success('Transaction completed!', {
        icon: '✅',
      });
    }

    setCart([]);
    setIsCheckoutOpen(false);
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discounted = Math.max(0, subtotal - subtotal * (discount / 100));
  const taxAmount = Number((discounted * 0.015).toFixed(2));
  const totalAmount = Number((discounted + taxAmount).toFixed(2));

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
                  <DrawerTitle>Categories</DrawerTitle>
                  <p className="text-sm text-gray-500">Select a category to filter products.</p>
                </DrawerHeader>
                <div className="px-4 pb-6">
                  <div className="grid grid-cols-2 gap-3">
                    {categoryTabs.map((category) => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
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
                </div>
                <div className="px-4 pb-4">
                  <DrawerClose asChild>
                    <button className="w-full rounded-2xl border border-[#E8DFD0] bg-[#F5F7F3] py-3 text-sm font-semibold text-[#2C3E2E]">
                      Close
                    </button>
                  </DrawerClose>
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
            {currentMember ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="w-11 h-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
                    title="User menu"
                  >
                    <span className="font-semibold">{currentMember.name.charAt(0)}</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 p-2">
                  <div className="px-3 py-2 rounded-lg bg-[#F5F7F3]">
                    <p className="text-sm font-semibold text-[#1E3D2D]">{currentMember.name}</p>
                    <p className="text-xs text-gray-500">{currentMember.role.charAt(0).toUpperCase() + currentMember.role.slice(1)}</p>
                    {currentMember.phone && (
                      <p className="mt-2 text-xs text-gray-500">{currentMember.phone}</p>
                    )}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="rounded-md px-3 py-2 text-sm text-[#B91C1C] hover:bg-red-50"
                    onSelect={handleLogout}
                    variant="destructive"
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button
                onClick={() => setIsMemberLoginOpen(true)}
                className="w-11 h-11 rounded-2xl bg-white/15 hover:bg-white/25 flex items-center justify-center transition"
                title="Login"
              >
                <User className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-[1.8fr_1fr] gap-4 h-full">
          <section className="flex flex-col rounded-[32px] bg-white shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-[#E8EFED]">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <button className="text-sm font-semibold text-[#1E8C5A] hover:text-[#166c44] transition">
                  + Add New Item
                </button>
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
                member={currentMember}
                onUpdateQuantity={updateQuantity}
                onRemoveItem={removeFromCart}
                onMemberLogin={() => setIsMemberLoginOpen(true)}
              />
            </div>

            <div className="border-t border-[#E8EFED] bg-[#F8FBF8] p-5">
              <div className="grid gap-4">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Discount (%)</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-20 rounded-2xl border border-[#DCE6DC] bg-white px-3 py-2 text-right text-sm text-gray-700"
                  />
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Sub Total</span>
                  <span>₱{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>Tax 1.5%</span>
                  <span>₱{taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-base font-semibold text-[#1E8C5A]">
                  <span>Total</span>
                  <span>₱{totalAmount.toFixed(2)}</span>
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
                  onClick={() => toast.success('Order placed on hold')}
                  className="flex-1 rounded-2xl border border-[#1E8C5A] bg-[#ECF7ED] text-[#1E8C5A] hover:bg-[#D7EFDA]"
                >
                  Hold Order
                </Button>
                <Button
                  onClick={handleCheckout}
                  className="flex-1 rounded-2xl bg-[#1E8C5A] text-white hover:bg-[#166c44]"
                >
                  Pay (₱{totalAmount.toFixed(2)})
                </Button>
              </div>
            </div>

          </section>
        </div>
      </div>

      {/* Floating Action Button - Barcode Scanner */}
      <button
        onClick={() => setIsScannerOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-[#7BA886] to-[#5A8A6B] text-white rounded-full shadow-xl hover:shadow-2xl flex items-center justify-center transition-all hover:scale-110 z-40"
      >
        <Scan className="w-8 h-8" />
      </button>

      {/* Modals */}
      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />

      <PetCheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        items={cart}
        member={currentMember}
        onComplete={completeCheckout}
      />

      <MemberLogin
        isOpen={isMemberLoginOpen}
        onLogin={handleMemberLogin}
        isRequired={true}
      />
    </div>
  );
}