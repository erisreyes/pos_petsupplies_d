import { useState, useEffect } from 'react';
import { Product } from '../types/pos';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { updateProduct, fetchProductById, fetchCategories, deleteProduct } from '../services/productService';
import { toast } from 'sonner';

interface UpdateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductUpdated: () => void;
  userRole: string;
  product?: Product | null;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

export function UpdateItemModal({ isOpen, onClose, onProductUpdated, userRole, product }: UpdateItemModalProps) {
  const [formData, setFormData] = useState({
    id: '',
    barcode: '',
    name: '',
    price: '',
    cost: '',
    category_id: '',
    stock: '',
    minStockLevel: '5'
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        id: product.id,
        barcode: product.barcode,
        name: product.name,
        price: product.price.toString(),
        cost: product.cost?.toString() || '',
        category_id: product.category_id ?? '',
        stock: product.stock.toString(),
        minStockLevel: String(product.minStockLevel ?? 5)
      });
    }

    if (isOpen && !product) {
      setFormData({
        id: '',
        barcode: '',
        name: '',
        price: '',
        cost: '',
        category_id: '',
        stock: '',
        minStockLevel: '5'
      });
    }
  }, [isOpen, product]);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoryData = await fetchCategories();
        console.debug('[UpdateItemModal] Fetched categories:', categoryData);
        
        // Validate category structure
        if (categoryData && categoryData.length > 0) {
          console.debug('[UpdateItemModal] First category structure:', {
            keys: Object.keys(categoryData[0]),
            firstItem: categoryData[0]
          });
        }
        
        setCategories(categoryData);
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  // const handleBarcodeScan = async (barcode: string) => {
  //   try {
  //     const product = await fetchProductById(barcode);
  //     if (product) {
  //       setFormData({
  //         id: product.id,
  //         barcode: product.barcode,
  //         name: product.name,
  //         price: product.price.toString(),
  //         category_id: product.category_id ?? '',
  //         stock: product.stock.toString(),
  //         minStockLevel: String(product.minStockLevel ?? 5)
  //       });
  //     } else {
  //       toast.error('Product not found');
  //     }
  //   } catch (error) {
  //     console.error('Error fetching product by barcode:', error);
  //     toast.error('Failed to fetch product');
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.debug('[UpdateItemModal] Form submission started:', {
      id: formData.id,
      name: formData.name,
      price: formData.price,
      cost: formData.cost,
      category_id: formData.category_id,
      stock: formData.stock,
      minStockLevel: formData.minStockLevel
    });

    // if (!formData.id || !formData.name || !formData.price || !formData.category_id || !formData.stock) {
    if (!formData.name) {
      toast.error('Please fill in all required fields');
      console.warn('[UpdateItemModal] Missing required fields:', {
        id: !formData.id,
        name: !formData.name,
        price: !formData.price,
        category_id: !formData.category_id,
        stock: !formData.stock
      });
      return;
    }

    setLoading(true);
    try {
      const productData = {
        id: formData.id,
        barcode: formData.barcode,
        name: formData.name,
        price: parseFloat(formData.price),
        cost: formData.cost ? parseFloat(formData.cost) : undefined,
        category_id: formData.category_id,
        stock: parseInt(formData.stock),
        minStockLevel: parseInt(formData.minStockLevel) || 0
      };

      console.debug('[UpdateItemModal] Sending update payload to service:', productData);

      await updateProduct(productData);
      toast.success('Product updated successfully!', {
        description: `${productData.name} has been updated.`,
        icon: '✅'
      });

      onProductUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      id: '',
      barcode: '',
      name: '',
      price: '',
      cost: '',
      category_id: '',
      stock: '',
      minStockLevel: '5'
    });
    onClose();
  };

  const handleAddStock = (amount: number) => {
    setFormData(prev => ({
      ...prev,
      stock: (parseInt(prev.stock || '0') + amount).toString()
    }));
  };

  const handleDelete = async () => {
    if (!formData.id) {
      toast.error('No product selected for deletion');
      return;
    }

    const confirmed = window.confirm(`Are you sure you want to delete "${formData.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    setLoading(true);
    try {
      await deleteProduct(formData.id);
      toast.success('Product deleted successfully!', {
        description: `${formData.name} has been removed.`,
        icon: '🗑️'
      });
      onProductUpdated();
      onClose();
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-white rounded-lg shadow-lg p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-[#1E3D2D]">Update Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="barcode" className="text-sm font-medium">
              Barcode (Scan or Enter Manually) *
            </Label>
            {/* <Input
              id="barcode"
              value={formData.id}
              onChange={(e) => handleBarcodeScan(e.target.value)}
              placeholder="Scan or enter barcode"
              className="mt-1"
              required
            /> */}
          </div>

          <div>
            <Label htmlFor="category" className="text-sm font-medium">
              Category *
            </Label>
            <Select
              value={formData.category_id}
              onValueChange={(value) => {
                console.debug('[UpdateItemModal] Category changed:', { newValue: value, categories });
                setFormData(prev => ({ ...prev, category_id: value }));
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter(category => category.id !== 'all')
                  .map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.icon} {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="name" className="text-sm font-medium">
              Product Name *
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Premium Dog Food"
              className="mt-1"
              required
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="cost" className="text-sm font-medium">
                Cost (₱)
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cost}
                  onChange={(e) => setFormData(prev => ({ ...prev, cost: e.target.value }))}
                  placeholder="45.00"
                  className="pl-8"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="price" className="text-sm font-medium">
                Price (₱) *
              </Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  placeholder="89.99"
                  className="pl-8"
                  required
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="stock" className="text-sm font-medium">
                Stock *
              </Label>
              <Input
                id="stock"
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData(prev => ({ ...prev, stock: e.target.value }))}
                placeholder="50"
                className="mt-1"
                required
              />
              <div className="space-y-2">
                <Label>Quick Add Stock</Label>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="flex-1" // Pinupuno ang space nang pantay-pantay
                    onClick={() => handleAddStock(5)}
                  >
                    +5
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleAddStock(10)}
                  >
                    +10
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => handleAddStock(20)}
                  >
                    +20
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="minStockLevel" className="text-sm font-medium">
              Minimum Stock Level (Low Stock Alert)
            </Label>
            <Input
              id="minStockLevel"
              type="number"
              min="0"
              value={formData.minStockLevel}
              onChange={(e) => setFormData(prev => ({ ...prev, minStockLevel: e.target.value }))}
              placeholder="5"
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Product card will show warning color when stock falls below this level
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              className="flex-1"
              disabled={loading || !formData.id}
            >
              {loading ? 'Deleting...' : 'Delete Product'}
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-[#1E8C5A] hover:bg-[#166c44] text-white"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}