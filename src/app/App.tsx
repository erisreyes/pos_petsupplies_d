import { useState, useEffect } from 'react';
import { Product, CartItem, Transaction, PaymentMethod } from './types/pos';
import { petProducts, petCategories, categoryMapping, quickAddItems } from './data/pet-products';
import { PetProductGrid } from './components/PetProductGrid';
import { PetCart } from './components/PetCart';
import { PetCheckoutModal } from './components/PetCheckoutModal';
import { BarcodeScanner } from './components/BarcodeScanner';
import { MemberLogin } from './components/MemberLogin';
import { PetTransactionHistory } from './components/PetTransactionHistory';
import { ShoppingCart, History, Scan, Search, User, Menu } from 'lucide-react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { toast } from 'sonner';
import { Toaster } from './components/ui/sonner';

interface Member {
  id: string;
  name: string;
  phone: string;
  petName?: string;
  petBirthday?: string;
  loyaltyPoints: number;
}

export default function App() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isMemberLoginOpen, setIsMemberLoginOpen] = useState(false);
  const [currentMember, setCurrentMember] = useState<Member | null>(null);
  const [activeView, setActiveView] = useState<'products' | 'cart' | 'history'>('products');

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

  const filteredProducts = petProducts.filter(product => {
    const categoryMatch = selectedCategory === 'all' || 
                         product.category === categoryMapping[selectedCategory];
    const searchMatch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                       product.id.toLowerCase().includes(searchQuery.toLowerCase());
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

  const handleBarcodeScan = (barcode: string) => {
    const product = petProducts.find(p => p.id === barcode);
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
    toast.success(`Welcome back, ${member.name}! 🐾`, {
      description: member.petName ? `Happy to see ${member.petName}'s parent!` : undefined,
    });
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
    setActiveView('products');
  };

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="h-screen flex flex-col bg-[#F5F1E8]">
      <Toaster richColors />
      
      {/* Header */}
      <header className="bg-gradient-to-r from-[#7BA886] to-[#6B9BD1] text-white shadow-lg">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                <span className="text-2xl">🐾</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Mini Step Pet Supplies</h1>
                <p className="text-xs text-white/80">Everything for your furry friends</p>
              </div>
            </div>
            <button 
              onClick={() => setIsMemberLoginOpen(true)}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              {currentMember ? (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-[#7BA886] font-semibold">
                    {currentMember.name.charAt(0)}
                  </div>
                </div>
              ) : (
                <User className="w-6 h-6" />
              )}
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search products or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 bg-white h-12 rounded-xl border-0 shadow-md"
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navigation Tabs */}
        <div className="bg-white border-b-2 border-[#E8DFD0] px-4 py-2 flex gap-2">
          <button
            onClick={() => setActiveView('products')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              activeView === 'products'
                ? 'bg-[#7BA886] text-white shadow-md'
                : 'text-gray-600 hover:bg-[#F5F1E8]'
            }`}
          >
            Products
          </button>
          <button
            onClick={() => setActiveView('cart')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all relative ${
              activeView === 'cart'
                ? 'bg-[#7BA886] text-white shadow-md'
                : 'text-gray-600 hover:bg-[#F5F1E8]'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              Cart
              {cartItemCount > 0 && (
                <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                  activeView === 'cart' ? 'bg-white text-[#7BA886]' : 'bg-[#7BA886] text-white'
                }`}>
                  {cartItemCount}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveView('history')}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
              activeView === 'history'
                ? 'bg-[#7BA886] text-white shadow-md'
                : 'text-gray-600 hover:bg-[#F5F1E8]'
            }`}
          >
            <History className="w-5 h-5 mx-auto" />
          </button>
        </div>

        {/* Products View */}
        {activeView === 'products' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Category Filter */}
            <div className="bg-white border-b-2 border-[#E8DFD0] px-4 py-3 overflow-x-auto">
              <div className="flex gap-2">
                {petCategories.map(category => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-4 py-2 rounded-full whitespace-nowrap transition-all font-semibold shadow-sm ${
                      selectedCategory === category.id
                        ? 'bg-[#7BA886] text-white shadow-md scale-105'
                        : 'bg-white text-gray-700 hover:bg-[#F5F1E8] border-2 border-[#E8DFD0]'
                    }`}
                  >
                    <span className="mr-1">{category.icon}</span>
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Products Grid */}
            <div className="flex-1 overflow-y-auto">
              <PetProductGrid 
                products={filteredProducts} 
                onAddToCart={addToCart}
                quickAddItems={quickAddItems}
              />
            </div>
          </div>
        )}

        {/* Cart View */}
        {activeView === 'cart' && (
          <PetCart
            items={cart}
            member={currentMember}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
            onCheckout={handleCheckout}
            onMemberLogin={() => setIsMemberLoginOpen(true)}
          />
        )}

        {/* History View */}
        {activeView === 'history' && (
          <PetTransactionHistory transactions={transactions} />
        )}
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
        onClose={() => setIsMemberLoginOpen(false)}
        onLogin={handleMemberLogin}
      />
    </div>
  );
}