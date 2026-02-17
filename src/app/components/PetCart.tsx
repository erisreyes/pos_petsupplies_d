import { CartItem } from '../types/pos';
import { Trash2, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Button } from './ui/button';

interface Member {
  id: string;
  name: string;
  phone: string;
  petName?: string;
  petBirthday?: string;
  loyaltyPoints: number;
}

interface PetCartProps {
  items: CartItem[];
  member: Member | null;
  onUpdateQuantity: (productId: string, delta: number) => void;
  onRemoveItem: (productId: string) => void;
  onCheckout: () => void;
  onMemberLogin: () => void;
}

export function PetCart({ 
  items, 
  member, 
  onUpdateQuantity, 
  onRemoveItem, 
  onCheckout,
  onMemberLogin 
}: PetCartProps) {
  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculate member discount (5% if logged in)
  const memberDiscount = member ? subtotal * 0.05 : 0;
  const total = subtotal - memberDiscount;

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-8">
        <div className="w-24 h-24 rounded-full bg-[#F5F1E8] flex items-center justify-center mb-4">
          <ShoppingCart className="w-12 h-12 text-[#7BA886]" />
        </div>
        <p className="text-gray-500 mb-2">Your cart is empty</p>
        <p className="text-sm text-gray-400">Start adding items to get started</p>
        
        {/* Decorative paw prints */}
        <div className="mt-8 flex gap-4 opacity-20">
          <span className="text-4xl">🐾</span>
          <span className="text-4xl">🐾</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F5F1E8]">
      {/* Member Info or Login */}
      <div className="bg-white p-4 border-b border-[#E8DFD0]">
        {member ? (
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#7BA886] flex items-center justify-center text-white text-xl">
              {member.name.charAt(0)}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-[#2C3E2E]">{member.name}</p>
              <p className="text-sm text-gray-600">
                {member.petName && `🐾 ${member.petName}'s Parent`} • {member.loyaltyPoints} pts
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Member Discount</p>
              <p className="font-semibold text-[#7BA886]">5% OFF</p>
            </div>
          </div>
        ) : (
          <button
            onClick={onMemberLogin}
            className="w-full p-3 bg-[#F5F1E8] rounded-xl hover:bg-[#E8DFD0] transition-colors flex items-center justify-between"
          >
            <span className="font-medium text-[#2C3E2E]">Login as Pet Parent</span>
            <span className="text-xs bg-[#7BA886] text-white px-3 py-1 rounded-full">
              Get 5% OFF
            </span>
          </button>
        )}
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.map((item) => (
          <div
            key={item.product.id}
            className="bg-white rounded-2xl border-2 border-[#E8DFD0] p-4 shadow-sm"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 pr-2">
                <h4 className="font-semibold text-[#2C3E2E] mb-1">{item.product.name}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white bg-[#6B9BD1] px-2 py-1 rounded-full">
                    {item.product.category}
                  </span>
                  <span className="text-sm text-gray-600">
                    ₱{item.product.price.toFixed(2)} each
                  </span>
                </div>
              </div>
              <button
                onClick={() => onRemoveItem(item.product.id)}
                className="text-[#D4866A] hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => onUpdateQuantity(item.product.id, -1)}
                  disabled={item.quantity <= 1}
                  className="w-10 h-10 rounded-full border-2 border-[#7BA886] flex items-center justify-center hover:bg-[#7BA886] hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-bold text-lg text-[#2C3E2E]">
                  {item.quantity}
                </span>
                <button
                  onClick={() => onUpdateQuantity(item.product.id, 1)}
                  className="w-10 h-10 rounded-full border-2 border-[#7BA886] bg-[#7BA886] text-white flex items-center justify-center hover:bg-[#5A8A6B] transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="font-bold text-xl text-[#7BA886]">
                ₱{(item.product.price * item.quantity).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Checkout Summary */}
      <div className="border-t-2 border-[#E8DFD0] p-4 space-y-3 bg-white rounded-t-3xl shadow-lg">
        <div className="space-y-2">
          <div className="flex justify-between items-center text-gray-600">
            <span>Items ({itemCount}):</span>
            <span className="font-semibold">₱{subtotal.toFixed(2)}</span>
          </div>
          {member && memberDiscount > 0 && (
            <div className="flex justify-between items-center text-[#7BA886]">
              <span>Member Discount (5%):</span>
              <span className="font-semibold">-₱{memberDiscount.toFixed(2)}</span>
            </div>
          )}
        </div>
        
        <div className="border-t-2 border-[#E8DFD0] pt-3 flex justify-between items-center">
          <span className="font-semibold text-lg text-[#2C3E2E]">Total:</span>
          <span className="font-bold text-3xl text-[#7BA886]">
            ₱{total.toFixed(2)}
          </span>
        </div>
        
        <Button
          onClick={onCheckout}
          className="w-full bg-[#7BA886] hover:bg-[#5A8A6B] text-white h-14 text-lg rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          Proceed to Checkout
        </Button>
      </div>
    </div>
  );
}
