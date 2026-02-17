import { useState } from 'react';
import { CartItem, PaymentMethod } from '../types/pos';
import { X, CreditCard, Banknote, Smartphone, CheckCircle, QrCode } from 'lucide-react';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';

interface Member {
  id: string;
  name: string;
  phone: string;
  petName?: string;
  loyaltyPoints: number;
}

interface PetCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  member: Member | null;
  onComplete: (paymentMethod: PaymentMethod) => void;
}

export function PetCheckoutModal({ 
  isOpen, 
  onClose, 
  items, 
  member,
  onComplete 
}: PetCheckoutModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const memberDiscount = member ? subtotal * 0.05 : 0;
  const total = subtotal - memberDiscount;

  const paymentMethods = [
    { 
      id: 'cash' as PaymentMethod, 
      label: 'Cash', 
      icon: Banknote,
      color: 'bg-[#7BA886]',
      description: 'Pay with cash'
    },
    { 
      id: 'card' as PaymentMethod, 
      label: 'Card', 
      icon: CreditCard,
      color: 'bg-[#6B9BD1]',
      description: 'Credit/Debit card'
    },
    { 
      id: 'mobile' as PaymentMethod, 
      label: 'E-Wallet', 
      icon: Smartphone,
      color: 'bg-[#D4866A]',
      description: 'GCash/Maya/PayMaya'
    },
  ];

  const handlePayment = async () => {
    if (!selectedMethod) return;
    
    setIsProcessing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    setIsProcessing(false);
    setIsComplete(true);
    
    setTimeout(() => {
      onComplete(selectedMethod);
      setIsComplete(false);
      setSelectedMethod(null);
    }, 2000);
  };

  const handleClose = () => {
    if (!isProcessing && !isComplete) {
      setSelectedMethod(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {isComplete ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-24 h-24 rounded-full bg-[#7BA886]/10 flex items-center justify-center mb-6 animate-in zoom-in duration-500">
              <CheckCircle className="w-16 h-16 text-[#7BA886]" />
            </div>
            <h3 className="text-3xl font-bold mb-2 text-[#2C3E2E]">Payment Successful!</h3>
            <p className="text-gray-600 mb-4">Thank you for shopping with us</p>
            <div className="flex gap-2 text-2xl">
              <span>🐾</span>
              <span>💚</span>
              <span>🐾</span>
            </div>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl text-[#2C3E2E]">Payment</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Member Info */}
              {member && (
                <div className="bg-[#F5F1E8] rounded-2xl p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#7BA886] flex items-center justify-center text-white">
                      {member.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-[#2C3E2E]">{member.name}</p>
                      <p className="text-sm text-gray-600">
                        {member.petName && `🐾 ${member.petName}'s Parent`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#E8DFD0]">
                    <span className="text-sm text-gray-600">Loyalty Points</span>
                    <span className="font-semibold text-[#7BA886]">{member.loyaltyPoints} pts</span>
                  </div>
                </div>
              )}

              {/* Order Summary */}
              <div className="bg-white border-2 border-[#E8DFD0] rounded-2xl p-4">
                <h3 className="font-semibold mb-3 text-[#2C3E2E]">Order Summary</h3>
                <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                  {items.map((item) => (
                    <div key={item.product.id} className="flex justify-between text-sm">
                      <span className="text-gray-600">
                        {item.quantity}x {item.product.name}
                      </span>
                      <span className="font-semibold text-[#2C3E2E]">
                        ₱{(item.product.price * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
                
                <div className="space-y-2 pt-3 border-t-2 border-[#E8DFD0]">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span>
                    <span className="font-semibold">₱{subtotal.toFixed(2)}</span>
                  </div>
                  {memberDiscount > 0 && (
                    <div className="flex justify-between text-sm text-[#7BA886]">
                      <span>Member Discount (5%)</span>
                      <span className="font-semibold">-₱{memberDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-2 border-t border-[#E8DFD0]">
                    <span className="font-bold text-lg text-[#2C3E2E]">Total</span>
                    <span className="font-bold text-2xl text-[#7BA886]">
                      ₱{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <h3 className="font-semibold mb-3 text-[#2C3E2E]">Select Payment Method</h3>
                <div className="space-y-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon;
                    const isSelected = selectedMethod === method.id;
                    return (
                      <button
                        key={method.id}
                        onClick={() => setSelectedMethod(method.id)}
                        className={`w-full p-4 rounded-2xl border-2 transition-all ${
                          isSelected
                            ? 'border-[#7BA886] bg-[#7BA886]/5 shadow-md'
                            : 'border-[#E8DFD0] hover:border-[#7BA886]/50 hover:bg-[#F5F1E8]'
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`w-14 h-14 rounded-xl ${method.color} flex items-center justify-center text-white`}>
                            <Icon className="w-7 h-7" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-semibold text-[#2C3E2E]">{method.label}</p>
                            <p className="text-sm text-gray-600">{method.description}</p>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-6 h-6 text-[#7BA886]" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleClose}
                  variant="outline"
                  className="flex-1 h-12 rounded-xl border-2"
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handlePayment}
                  className="flex-1 bg-[#7BA886] hover:bg-[#5A8A6B] text-white h-12 rounded-xl shadow-md hover:shadow-lg transition-all"
                  disabled={!selectedMethod || isProcessing}
                >
                  {isProcessing ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Processing...
                    </div>
                  ) : (
                    'Complete Payment'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
