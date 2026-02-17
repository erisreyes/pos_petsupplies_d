import { Product } from '../types/pos';
import { Plus, Package } from 'lucide-react';

interface PetProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  quickAddItems?: string[];
}

export function PetProductGrid({ products, onAddToCart, quickAddItems = [] }: PetProductGridProps) {
  const isQuickAdd = (productId: string) => quickAddItems.includes(productId);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onAddToCart(product)}
          className={`bg-white rounded-2xl border-2 p-4 hover:shadow-lg transition-all text-left relative overflow-hidden ${
            isQuickAdd(product.id) 
              ? 'border-[#7BA886] ring-2 ring-[#7BA886]/20' 
              : 'border-[#E8DFD0] hover:border-[#7BA886]'
          }`}
        >
          {isQuickAdd(product.id) && (
            <div className="absolute top-2 right-2 bg-[#7BA886] text-white text-xs px-2 py-1 rounded-full">
              Popular
            </div>
          )}
          
          <div className="flex flex-col h-full">
            {/* Product Icon Placeholder */}
            <div className="w-12 h-12 rounded-xl bg-[#F5F1E8] flex items-center justify-center mb-3">
              <Package className="w-6 h-6 text-[#7BA886]" />
            </div>
            
            <div className="flex-1">
              <h3 className="font-semibold mb-1 line-clamp-2 text-[#2C3E2E]">
                {product.name}
              </h3>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs text-white bg-[#6B9BD1] px-2 py-1 rounded-full">
                  {product.category}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Stock: {product.stock}
              </p>
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              <span className="text-xl font-bold text-[#7BA886]">
                ₱{product.price.toFixed(2)}
              </span>
              <div className="w-9 h-9 rounded-full bg-[#7BA886] flex items-center justify-center text-white shadow-md hover:shadow-lg transition-shadow">
                <Plus className="w-5 h-5" />
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
