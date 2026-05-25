import { useState, useEffect, useMemo } from 'react';
import { Product, CartItem, Transaction, PaymentMethod } from '../types/pos';
import { quickAddItems } from '../data/pet-products';
import { fetchProducts, fetchProductById } from '../services/productService';
import {
  applyProductOrder,
  loadProductOrder,
  mergeVisibleReorder,
  saveProductOrder,
} from '../lib/productOrder';
import { CategoryTabBar } from '../components/CategoryTabBar';
import { PetProductGrid } from '../components/PetProductGrid';
import { PetCart } from '../components/PetCart';
import { PosCheckoutPanel } from '../components/PosCheckoutPanel';
import { BarcodeScanner } from '../components/BarcodeScanner';
import { UserLogin, type Member } from '../components/UserLogin';
import { AppHeader } from '../components/AppHeader';
import { PosStaffBar } from '../components/PosStaffBar';
import { AddItemModal } from '../components/AddItemModal';
import { UpdateItemModal } from '../components/UpdateItemModal';
import { useAuth } from '../context/AuthContext';
import { isAdmin, isStaff } from '../constants/roles';
import { Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';

export default function PosPage() {
  const { cashierId, userRole, setCashierId, setUserRole, authLoading, signOut } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [discount] = useState(20);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isUpdateItemOpen, setIsUpdateItemOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await fetchProducts();
      const order = loadProductOrder();
      setProducts(applyProductOrder(data, order));
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products from database');
    } finally {
      setLoading(false);
    }
  };

  // Load products after auth session is ready (avoids RLS/session race)
  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        const data = await fetchProducts();
        if (!cancelled) {
          const order = loadProductOrder();
          setProducts(applyProductOrder(data, order));
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load products:', error);
          toast.error('Failed to load products from database');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [authLoading, cashierId]);

  useEffect(() => {
    if (!authLoading) {
      setIsLoginOpen(!cashierId);
    }
  }, [cashierId, authLoading]);

  useEffect(() => {
    const savedTransactions = localStorage.getItem('pet-pos-transactions');

    if (savedTransactions) {
      const parsed = JSON.parse(savedTransactions);
      setTransactions(
        parsed.map((t: Transaction & { timestamp: string }) => ({
          ...t,
          timestamp: new Date(t.timestamp),
        })),
      );
    }
  }, []);

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

  const filteredProducts = useMemo(() => {
    const query = searchQuery.toLowerCase();
    const filtered = products.filter((product) => {
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
    return filtered;
  }, [products, searchQuery, selectedCategory]);

  const handleProductReorder = (reorderedVisible: Product[]) => {
    setProducts((prev) => {
      const merged = mergeVisibleReorder(prev, reorderedVisible);
      saveProductOrder(merged.map((p) => p.id));
      return merged;
    });
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        toast.success(`Added another ${product.name} to cart`, {
          description: `Quantity: ${existing.quantity + 1}`,
        });
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }
      toast.success(`${product.name} added to cart`, { icon: '🐾' });
      return [...prev, { product, quantity: 1 }];
    });
  };

  const handleBarcodeScan = async (barcode: string) => {
    try {
      const product = await fetchProductById(barcode);
      if (product) {
        addToCart(product);
        toast.success('Scanned successfully!', { description: product.name, icon: '✅' });
      } else {
        toast.error('Product not found', { description: `SKU: ${barcode}` });
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
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId
          ? { ...item, quantity: Math.max(1, item.quantity + delta) }
          : item,
      ),
    );
  };

  const removeFromCart = (productId: string) => {
    const item = cart.find((i) => i.product.id === productId);
    setCart((prev) => prev.filter((item) => item.product.id !== productId));
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

  const handleStaffLogin = (member: Member) => {
    setCashierId(member.id);
    setUserRole(member.role);
    setIsLoginOpen(false);
    toast.success(`Welcome, ${member.name}`);
    void loadProducts();
  };

  const completeCheckout = (paymentMethod: PaymentMethod) => {
    const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

    const transaction: Transaction = {
      id: Date.now().toString(),
      items: [...cart],
      total: subtotal,
      paymentMethod,
      timestamp: new Date(),
      status: 'completed',
    };

    setTransactions((prev) => [transaction, ...prev]);
    toast.success('Transaction completed!', { icon: '✅' });
    setCart([]);
    setIsCheckoutOpen(false);
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const showStaffBar = isStaff(userRole);

  const handleLogout = async () => {
    setCart([]);
    setIsCheckoutOpen(false);
    await signOut();
    setIsLoginOpen(true);
    toast.success('Signed out successfully');
  };

  const logoutWarning =
    cart.length > 0
      ? `You have ${cartItemCount} item${cartItemCount === 1 ? '' : 's'} in the cart. Signing out will clear the current order.`
      : isCheckoutOpen
        ? 'Checkout is in progress. Signing out will cancel it.'
        : undefined;

  return (
    <div className="h-dvh flex flex-col bg-[#F4F8F3]">
      <Toaster richColors />

      {showStaffBar ? (
        <PosStaffBar
          onLogout={handleLogout}
          logoutWarning={logoutWarning}
          onScanClick={() => setIsScannerOpen(true)}
          safeAreaTop
        />
      ) : (
        <AppHeader
          onLogout={handleLogout}
          logoutWarning={logoutWarning}
          onScanClick={() => setIsScannerOpen(true)}
          safeAreaTop
        />
      )}

      <p className="shrink-0 px-4 py-2 text-center text-xs font-medium text-[#4B6154] bg-[#E8F3EB] border-b border-[#D4E8DA] lg:hidden">
        Rotate to landscape for products and checkout side by side
      </p>

      <div className="flex-1 min-h-0 overflow-hidden px-3 py-3 lg:px-4 lg:py-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div
          className={`grid grid-cols-1 gap-3 lg:gap-4 h-full min-h-0 ${
            isCheckoutOpen ? 'lg:grid-cols-[1fr_1fr]' : 'lg:grid-cols-[1.65fr_1fr]'
          }`}
        >
          <section
            className={`flex flex-col min-h-0 rounded-2xl lg:rounded-3xl bg-white shadow-sm overflow-hidden max-lg:max-h-[58dvh] ${
              isCheckoutOpen ? 'lg:pointer-events-none lg:opacity-50' : ''
            }`}
          >
            <div className="shrink-0 px-4 py-3 lg:px-5 lg:py-4 border-b border-[#E8EFED] space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
                <CategoryTabBar
                  tabs={categoryTabs}
                  selectedId={selectedCategory}
                  onSelect={setSelectedCategory}
                />
                <div className="relative w-full lg:max-w-xs lg:shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <Input
                    type="search"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 h-11 lg:h-12 rounded-2xl border border-[#E6ECE7] shadow-sm text-base"
                  />
                </div>
              </div>
              {isAdmin(userRole) && (
                <button
                  type="button"
                  onClick={() => setIsAddItemOpen(true)}
                  className="text-sm font-semibold text-[#1E8C5A] hover:text-[#166c44] transition touch-manipulation"
                >
                  + Add New Item
                </button>
              )}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
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
                  onEditProduct={isAdmin(userRole) ? openEditProduct : undefined}
                  onReorder={handleProductReorder}
                />
              )}
            </div>
          </section>

          <section
            className={`flex flex-col min-h-0 rounded-2xl lg:rounded-3xl bg-white shadow-sm overflow-hidden lg:min-h-0 ${
              isCheckoutOpen ? 'max-lg:min-h-[52dvh] flex-1' : 'max-lg:min-h-[32dvh]'
            }`}
          >
            {!isCheckoutOpen ? (
              <>
                <div className="shrink-0 px-4 py-3 lg:px-5 lg:py-4 border-b border-[#E8EFED]">
                  <h2 className="text-lg lg:text-xl font-semibold text-[#1E3D2D]">Checkout</h2>
                  <div className="mt-3 lg:mt-4 grid grid-cols-[2fr_1fr_1fr] gap-3 text-xs uppercase tracking-[0.18em] text-gray-500">
                    <span>Name</span>
                    <span className="text-center">Qty</span>
                    <span className="text-right">Price</span>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 lg:p-5 space-y-3">
                  <PetCart
                    items={cart}
                    onUpdateQuantity={updateQuantity}
                    onRemoveItem={removeFromCart}
                  />
                </div>

                <div className="shrink-0 border-t border-[#E8EFED] bg-[#F8FBF8] p-4 lg:p-5">
                  <div className="flex items-center justify-between text-base font-semibold text-[#1E8C5A]">
                    <span>Total</span>
                    <span>₱{subtotal.toFixed(2)}</span>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 lg:flex-row">
                    <Button
                      type="button"
                      onClick={() => setCart([])}
                      className="flex-1 min-h-12 rounded-2xl border border-[#E6ECE7] bg-white text-[#4B6154] hover:bg-[#F2F6F2] text-base touch-manipulation"
                    >
                      Cancel Order
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCheckout}
                      className="flex-1 min-h-12 rounded-2xl bg-[#1E8C5A] text-white hover:bg-[#166c44] text-base touch-manipulation"
                    >
                      {cartItemCount > 0
                        ? `Pay (${cartItemCount}) · ₱${subtotal.toFixed(2)}`
                        : `Pay · ₱${subtotal.toFixed(2)}`}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <PosCheckoutPanel
                open={isCheckoutOpen}
                items={cart}
                cashierId={cashierId || ''}
                onComplete={(method) => {
                  completeCheckout(method);
                  setIsCheckoutOpen(false);
                }}
                onCancel={() => setIsCheckoutOpen(false)}
              />
            )}
          </section>
        </div>
      </div>

      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScan}
      />

      <UserLogin isOpen={isLoginOpen} onLogin={handleStaffLogin} isRequired />

      <AddItemModal
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        onProductAdded={loadProducts}
      />

      <UpdateItemModal
        isOpen={isUpdateItemOpen}
        onClose={() => {
          setIsUpdateItemOpen(false);
          setProductToEdit(null);
        }}
        product={productToEdit}
        onProductUpdated={() => {
          loadProducts();
          setIsUpdateItemOpen(false);
          setProductToEdit(null);
        }}
        userRole={userRole ?? 'staff'}
      />
    </div>
  );
}
