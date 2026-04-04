// src/app/services/productService.ts
import { supabase } from '../../lib/supabase';
import { Product } from '../types/pos';

/**
 * Fetch all products from Supabase
 */
export async function fetchProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products_with_categories')
    .select('id, name, price, category, stock')
    .order('category');

  if (error) {
    console.error('Error fetching products:', error);
    throw error;
  }

  return data as Product[];
}

/**
 * Fetch products by category
 */
export async function fetchProductsByCategory(category: string): Promise<Product[]> {
  if (category === 'All Products') {
    return fetchProducts();
  }

  const { data, error } = await supabase
    .from('products_with_categories')
    .select('id, name, price, category, stock')
    .eq('category', category)
    .order('name');

  if (error) {
    console.error('Error fetching products by category:', error);
    throw error;
  }

  return data as Product[];
}

/**
 * Fetch all categories
 */
export async function fetchCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('id');

  if (error) {
    console.error('Error fetching categories:', error);
    throw error;
  }

  return data;
}

/**
 * Get a single product by ID
 */
export async function fetchProductById(id: string): Promise<Product | null> {
  const { data, error } = await supabase
    .from('products_with_categories')
    .select('id, name, price, category, stock')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching product:', error);
    return null;
  }

  return data as Product;
}

/**
 * Update product stock (after purchase)
 */
export async function updateProductStock(id: string, newStock: number) {
  const { error } = await supabase
    .from('products')
    .update({ stock: newStock })
    .eq('id', id);

  if (error) {
    console.error('Error updating stock:', error);
    throw error;
  }
}

/**
 * Search products by name or category
 */
export async function searchProducts(query: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products_with_categories')
    .select('id, name, price, category, stock')
    .or(`name.ilike.%${query}%,category.ilike.%${query}%`);

  if (error) {
    console.error('Error searching products:', error);
    throw error;
  }

  return data as Product[];
}

/**
 * Get low stock items (for inventory management)
 */
export async function getLowStockItems(threshold: number = 20): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products_with_categories')
    .select('id, name, price, category, stock')
    .lt('stock', threshold)
    .order('stock');

  if (error) {
    console.error('Error fetching low stock items:', error);
    throw error;
  }

  return data as Product[];
}

/**
 * Batch update multiple products
 */
export async function updateMultipleProducts(
  updates: Array<{ id: string; stock: number }>
) {
  const promises = updates.map(({ id, stock }) =>
    updateProductStock(id, stock)
  );

  try {
    await Promise.all(promises);
  } catch (error) {
    console.error('Error batch updating products:', error);
    throw error;
  }
}
