import { Product } from '../types/pos';
import { Plus, Package, Edit2 } from 'lucide-react';

interface PetProductGridProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  onEditProduct?: (product: Product) => void;
  quickAddItems?: string[];
}

export function PetProductGrid({ products, onAddToCart, onEditProduct, quickAddItems = [] }: PetProductGridProps) {
  const isQuickAdd = (productId: string) => quickAddItems.includes(productId);
  const isLowStock = (product: Product) => product.stock <= (product.minStockLevel || 5);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 p-2 lg:p-3">
      {products.map((product) => {
        const lowStock = isLowStock(product);
        const quickAdd = isQuickAdd(product.id);

        return (
          <button
            key={product.id}
            onClick={() => onAddToCart(product)}
            className={`group bg-white rounded-2xl border p-3 hover:shadow-lg transition-all text-left relative overflow-hidden min-h-[150px] lg:min-h-[160px] touch-manipulation active:scale-[0.98] ${
              lowStock
                ? 'border-red-300 ring-1 ring-red-200'
                : quickAdd
                ? 'border-[#7BA886] ring-1 ring-[#7BA886]/20'
                : 'border-[#E8DFD0] hover:border-[#7BA886]'
            }`}
          >
            {onEditProduct && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditProduct(product);
                }}
                className="absolute top-3 left-3 flex items-center justify-center w-8 h-8 rounded-full border border-[#E6ECE7] bg-white text-[#4B6154] hover:bg-[#F2F6F2]"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {lowStock && (
              <div className="absolute top-3 right-3 bg-red-500 text-white text-[11px] px-2 py-1 rounded-full">
                Low Stock
              </div>
            )}
            {quickAdd && !lowStock && (
              <div className="absolute top-3 right-3 bg-[#7BA886] text-white text-[11px] px-2 py-1 rounded-full">
                Popular
              </div>
            )}

            <div className="flex flex-col h-full">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                lowStock ? 'bg-red-50' : 'bg-[#F5F1E8]'
              }`}>
                <Package className={`w-5 h-5 ${lowStock ? 'text-red-500' : 'text-[#7BA886]'}`} />
              </div>

              <div className="flex-1">
                <h3 className={`font-semibold mb-1 line-clamp-2 text-sm ${
                  lowStock ? 'text-red-700' : 'text-[#2C3E2E]'
                }`}>
                  {product.name}
                </h3>
                <div className="flex items-center justify-between gap-2 mb-2 text-[13px] text-gray-600">
                  <span className={`font-semibold ${lowStock ? 'text-red-600' : 'text-[#2C3E2E]'}`}>
                    ₱{product.price.toFixed(2)}
                  </span>
                  <span className={`text-xs ${lowStock ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                    ({product.stock})
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 uppercase tracking-[0.08em]">{product.category}</p>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">Tap to add</span>
                <div className={`rounded-full px-2 py-1 text-white text-xs font-semibold shadow-sm transition-all ${
                  lowStock
                    ? 'bg-red-500 group-hover:bg-red-600'
                    : 'bg-[#7BA886] group-hover:bg-[#5A8A6B]'
                }`}>
                  Add
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
