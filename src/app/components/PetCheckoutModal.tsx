import { useState } from 'react';
import { CartItem, PaymentMethod } from '../types/pos';
import { CheckCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { supabase } from '../../lib/supabase';

interface PetCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  cashierId: string;
  branch?: string;
  onComplete: (paymentMethod: PaymentMethod) => void;
}

export function PetCheckoutModal({ 
  isOpen, 
  onClose, 
  items, 
  cashierId,
  branch,
  onComplete 
}: PetCheckoutModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenderedAmount, setTenderedAmount] = useState<number>(0);
  const [receiptData, setReceiptData] = useState<{ txnNumber: string; change: number } | null>(null);

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const total = subtotal;
  const change = Math.max(0, tenderedAmount - total);
  const paymentMethod: PaymentMethod = 'cash';

  const processPayment = async () => {
    const txnNumber = `TXN-${Date.now()}`;

    const { data: txn, error: txnErr } = await supabase
      .from('transactions')
      .insert({
        transaction_number: txnNumber,
        cashier_id: cashierId,
        member_id: null,
        branch: branch ?? null,
        subtotal,
        discount_amount: 0,
        tax_amount: 0,
        total_amount: total,
        amount_tendered: tenderedAmount,
        change_amount: change,
        payment_method: paymentMethod,
        payment_status: 'completed',
      })
      .select()
      .single();

    if (txnErr) throw new Error(txnErr.message || 'Unable to save transaction.');

    const lineItems = items.map((item) => ({
      transaction_id: txn.id,
      product_id: item.product.id,
      product_name: item.product.name,
      unit_price: item.product.price,
      cost_price: item.product.cost ?? 0,
      quantity: item.quantity,
      discount_amount: 0,
      subtotal: item.product.price * item.quantity,
    }));

    const { error: itemsErr } = await supabase
      .from('transaction_items')
      .insert(lineItems);

    if (itemsErr) throw new Error(itemsErr.message || 'Unable to save transaction items.');

    for (const item of items) {
      const { error: stockErr } = await supabase.rpc('decrement_stock', {
        p_product_id: item.product.id,
        p_quantity: item.quantity,
      });
      if (stockErr) throw new Error(`Stock update failed: ${stockErr.message}`);
    }

    return { txnNumber, change };
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    setError(null);

    try {
      const receipt = await processPayment();
      setReceiptData(receipt);
      setIsComplete(true);

      setTimeout(() => {
        onComplete(paymentMethod);
        resetState();
      }, 3000);
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetState = () => {
    setError(null);
    setTenderedAmount(0);
    setReceiptData(null);
    setIsComplete(false);
  };

  const handleClose = () => {
    if (!isProcessing && !isComplete) {
      resetState();
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

            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="space-y-6">

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

                  <div className="flex justify-between items-center pt-2 border-t border-[#E8DFD0]">
                    <span className="font-bold text-lg text-[#2C3E2E]">Total</span>
                    <span className="font-bold text-2xl text-[#7BA886]">
                      ₱{total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Cash/Tendered Amount */}
              <div className="bg-white border-2 border-[#E8DFD0] rounded-2xl p-4">
                  <h3 className="font-semibold mb-4 text-[#2C3E2E]">Cash Payment</h3>
                  
                  <div className="space-y-4">
                    {/* Amount Due */}
                    <div className="bg-[#F5F1E8] rounded-xl p-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Amount Due</span>
                        <span className="font-bold text-2xl text-[#7BA886]">₱{total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Tendered Amount Input */}
                    <div>
                      <label className="text-sm font-semibold text-[#2C3E2E] mb-2 block">
                        Cash Tendered (₱)
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">₱</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={tenderedAmount || ''}
                          onChange={(e) => setTenderedAmount(parseFloat(e.target.value) || 0)}
                          className="pl-8 text-lg font-semibold h-12 border-[#E8DFD0]"
                        />
                      </div>
                    </div>

                    {/* Change Calculation */}
                    <div className="border-t-2 border-[#E8DFD0] pt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Change</span>
                        <span className={`font-bold text-lg ${change >= 0 ? 'text-[#7BA886]' : 'text-red-500'}`}>
                          ₱{change.toFixed(2)}
                        </span>
                      </div>
                      {change < 0 && (
                        <p className="text-xs text-red-500">
                          ⚠ Short of ₱{Math.abs(change).toFixed(2)}
                        </p>
                      )}
                    </div>
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
                  disabled={isProcessing}
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
