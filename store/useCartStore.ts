import { create } from 'zustand';
import { OrderItem } from '@/lib/db';

interface CartState {
  items: OrderItem[];
  currentTable?: string;
  addItem: (item: OrderItem) => void;
  updateQuantity: (productId: string, portion: string | undefined, qty: number) => void;
  removeItem: (productId: string, portion: string | undefined) => void;
  clearCart: () => void;
  setTable: (tableNumber?: string) => void;
  getTotal: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  currentTable: undefined,

  addItem: (item) => {
    const items = get().items;
    const existingIndex = items.findIndex(
      i => i.product_id === item.product_id && i.portion === item.portion
    );

    if (existingIndex >= 0) {
      const newItems = [...items];
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        qty: newItems[existingIndex].qty + item.qty,
      };
      set({ items: newItems });
    } else {
      set({ items: [...items, item] });
    }
  },

  updateQuantity: (productId, portion, qty) => {
    const items = get().items;
    const newItems = items.map(item => {
      if (item.product_id === productId && item.portion === portion) {
        return { ...item, qty: Math.max(0, qty) };
      }
      return item;
    }).filter(item => item.qty > 0);
    set({ items: newItems });
  },

  removeItem: (productId, portion) => {
    const items = get().items;
    const newItems = items.filter(
      item => !(item.product_id === productId && item.portion === portion)
    );
    set({ items: newItems });
  },

  clearCart: () => {
    set({ items: [], currentTable: undefined });
  },

  setTable: (tableNumber) => {
    set({ currentTable: tableNumber });
  },

  getSubtotal: () => {
    const items = get().items;
    return items.reduce((sum, item) => {
      let itemTotal = item.price * item.qty;
      if (item.addons && item.addons.length > 0) {
        const addonsTotal = item.addons.reduce((aSum, addon) => aSum + addon.price, 0);
        itemTotal += addonsTotal * item.qty;
      }
      return sum + itemTotal;
    }, 0);
  },

  getTotal: () => {
    return get().getSubtotal();
  },
}));
