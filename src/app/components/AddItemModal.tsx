import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { addProduct, getLastProductCategory, fetchCategories } from '../services/productService';
import { toast } from 'sonner';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductAdded: () => void;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

export function AddItemModal({ isOpen, onClose, onProductAdded }: AddItemModalProps) {
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    price: '',
    cost: '',
    category: '',
    stock: '',
    minStockLevel: '5'
  });
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Load categories and set default category
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const categoryData = await fetchCategories();
        setCategories(categoryData);

        // Set default category based on last entry
        const lastCategory = await getLastProductCategory();
        setFormData(prev => ({ ...prev, category: lastCategory }));
      } catch (error) {
        console.error('Error loading categories:', error);
      }
    };

    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.cost || !formData.category || !formData.stock) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const productData = {
        id: formData.id,
        name: formData.name,
        price: parseFloat(formData.price),
        cost: parseFloat(formData.cost),
        category: formData.category,
        stock: parseInt(formData.stock),
        minStockLevel: parseInt(formData.minStockLevel)
      };

      await addProduct(productData);
      toast.success('Product added successfully!', {
        description: `${productData.name} has been added to inventory.`,
        icon: '✅'
      });

      // Reset form
      setFormData({
        id: '',
        name: '',
        price: '',
        cost: '',
        category: '',
        stock: '',
        minStockLevel: '5'
      });

      onProductAdded();
      onClose();
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product', {
        description: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      id: '',
      name: '',
      price: '',
      cost: '',
      category: '',
      stock: '',
      minStockLevel: '5'
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="text-2xl">➕</span>
            Add New Item
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category" className="text-sm font-medium">
                Category *
              </Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.name}>
                      {category.icon} {category.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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

          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="Cost" className="text-sm font-medium">
                Cost (₱) *
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
                  placeholder="89.99"
                  className="pl-8"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="stock" className="text-sm font-medium">
                Initial Stock *
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
              type="submit"
              className="flex-1 bg-[#1E8C5A] hover:bg-[#166c44] text-white"
              disabled={loading}
            >
              {loading ? 'Adding...' : 'Add Product'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}