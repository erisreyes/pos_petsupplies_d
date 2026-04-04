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
    <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2 p-3">
      {products.map((product) => (
        <button
          key={product.id}
          onClick={() => onAddToCart(product)}
          className={`group bg-white rounded-2xl border p-3 hover:shadow-lg transition-all text-left relative overflow-hidden min-h-[170px] ${
            isQuickAdd(product.id)
              ? 'border-[#7BA886] ring-1 ring-[#7BA886]/20'
              : 'border-[#E8DFD0] hover:border-[#7BA886]'
          }`}
        >
          {isQuickAdd(product.id) && (
            <div className="absolute top-3 right-3 bg-[#7BA886] text-white text-[11px] px-2 py-1 rounded-full">
              Popular
            </div>
          )}

          <div className="flex flex-col h-full">
            <div className="w-10 h-10 rounded-xl bg-[#F5F1E8] flex items-center justify-center mb-2">
              <Package className="w-5 h-5 text-[#7BA886]" />
            </div>

            <div className="flex-1">
              <h3 className="font-semibold mb-1 line-clamp-2 text-sm text-[#2C3E2E]">
                {product.name}
              </h3>
              <div className="flex items-center justify-between gap-2 mb-2 text-[13px] text-gray-600">
                <span className="font-semibold text-[#2C3E2E]">₱{product.price.toFixed(2)}</span>
                <span className="text-xs text-gray-500">({product.stock})</span>
              </div>
              <p className="text-[11px] text-gray-500 uppercase tracking-[0.08em]">{product.category}</p>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[11px] text-gray-500">Tap to add</span>
              <div className="rounded-full bg-[#7BA886] px-2 py-1 text-white text-xs font-semibold shadow-sm transition-all group-hover:bg-[#5A8A6B]">
                Add
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
