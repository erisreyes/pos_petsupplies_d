# Pawfect Pet Supplies - Mobile POS System

## 🐾 Key Screens Overview

### 1. **Home/Sales Screen (Products Tab)**
- **Product Grid**: Large touch-friendly product cards with:
  - Category badges (Dog Food, Cat Toys, Grooming, etc.)
  - Price in PHP (₱)
  - Stock levels
  - "Popular" tags for high-volume items
  - Quick-add buttons with paw icon
  
- **Category Filter**: Horizontal scrollable tabs with emoji icons
  - 🐾 All Products
  - 🦴 Dog Food
  - 🐱 Cat Food
  - 🎾 Dog Toys
  - 🧶 Cat Toys
  - ✂️ Grooming
  - 💊 Pharmacy
  - 🎒 Accessories

- **Search Bar**: Real-time search by product name, category, or SKU
- **FAB (Floating Action Button)**: Green gradient scan button (bottom-right)

---

### 2. **Scanning Active Screen**
Activated via the floating scan button, features:

- **Full-Screen Overlay**: Black background (90% opacity)
- **Viewfinder**: White corner brackets forming a scanning frame
- **Animated Scanning Line**: Sage green pulsing line with glow effect
- **Success Feedback**:
  - Green flash overlay
  - Checkmark icon animation
  - "Item scanned successfully!" message
  
- **Manual Entry Fallback**:
  - Keyboard icon button
  - Input field for SKU entry
  - Auto-uppercase formatting
  - "Add to Cart" action button

- **Demo**: Auto-simulates successful scan after 2 seconds

---

### 3. **Payment Selection Screen (Checkout Modal)**
Modern payment interface with:

- **Member Info Panel** (if logged in):
  - Pet parent name & avatar
  - Pet name with paw emoji
  - Loyalty points display
  
- **Order Summary**:
  - Line items with quantities
  - Subtotal
  - Member discount (5% off)
  - Total in large sage green text

- **Payment Methods** (3 large buttons):
  1. **Cash** 💵
     - Sage green background
     - Banknote icon
     
  2. **Card** 💳
     - Friendly blue background
     - Credit card icon
     
  3. **E-Wallet** 📱
     - Terracotta background
     - Smartphone icon
     - GCash/Maya/PayMaya support

- **Processing State**:
  - Loading spinner
  - "Processing..." text
  
- **Success State**:
  - Large green checkmark
  - "Payment Successful!" message
  - Paw print celebration emojis

---

## 🎨 Design System

### Color Palette
- **Primary (Sage Green)**: `#7BA886`
- **Primary Dark**: `#5A8A6B`
- **Background (Warm Tan)**: `#F5F1E8`
- **Secondary (Warm Beige)**: `#E8DFD0`
- **Accent (Friendly Blue)**: `#6B9BD1`
- **Highlight (Terracotta)**: `#D4866A`

### Typography
- **Font**: Quicksand (rounded, friendly sans-serif)
- **Weights**: 400 (regular), 600 (semibold), 700 (bold)

### Visual Elements
- **Border Radius**: 1rem (16px) - extra rounded
- **Shadows**: Soft, layered shadows for depth
- **Icons**: Lucide React icons
- **Emojis**: Paw prints 🐾, hearts ❤️ for pet-friendly touch

### Interactions
- **Hover States**: Subtle scale and shadow changes
- **Success Animations**: Zoom-in, fade-in effects
- **Loading States**: Spinning indicators with brand colors

---

## 💡 Features

### Member System
- Quick login with phone number
- Demo accounts available
- Pet parent profiles with pet names
- 5% member discount
- Loyalty points (1 pt per ₱10 spent)

### Inventory
- 40+ pet products
- Real stock tracking
- SKU-based barcode system
- Quick-add items for popular products

### Transaction History
- All completed sales
- Payment method tracking
- Timestamp records
- LocalStorage persistence

---

## 🎯 UX Highlights

1. **Large Touch Targets**: Minimum 44px for mobile-first design
2. **High Contrast**: Sage green CTAs on warm backgrounds
3. **Visual Hierarchy**: Bold pricing, clear categories
4. **Empty States**: Friendly illustrations and paw prints
5. **Toast Notifications**: Real-time feedback with emojis
6. **Responsive**: Works on phones and tablets
7. **Accessibility**: ARIA labels, keyboard navigation
