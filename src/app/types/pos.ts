export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image?: string;
  stock: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Transaction {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile';
  timestamp: Date;
  status: 'completed' | 'refunded';
}

export type PaymentMethod = 'cash' | 'card' | 'mobile';
