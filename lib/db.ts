import Dexie, { Table } from 'dexie';

export interface Business {
  id: string;
  name: string;
  logo_url?: string;
  gst_number?: string;
  address?: string;
  phone?: string;
  email?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  business_id: string;
  role: 'owner' | 'cashier';
  username: string;
  pin?: string;
  created_at: string;
}

export interface Category {
  id: string;
  business_id: string;
  name: string;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  category_id?: string;
  name: string;
  price: number; // paise
  is_veg: boolean;
  has_portions: boolean;
  portions?: { half?: number; full?: number };
  stock_quantity: number;
  hsn_code?: string;
  gst_rate: number;
  created_at: string;
}

export interface Addon {
  id: string;
  business_id: string;
  product_id: string;
  name: string;
  price: number; // paise
  created_at: string;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string;
  email?: string;
  udhaar_balance: number; // paise
  created_at: string;
}

export interface Order {
  id: string;
  business_id: string;
  bill_number: string;
  customer_id?: string;
  customer_name?: string;
  customer_phone?: string;
  table_number?: string;
  items: OrderItem[];
  subtotal: number; // paise
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  payment_mode?: 'cash' | 'upi' | 'split' | 'udhaar';
  payment_details?: { cash?: number; upi?: number };
  status: 'completed' | 'voided';
  voided_by?: string;
  voided_at?: string;
  kot_printed: boolean;
  created_at: string;
  created_by?: string;
}

export interface OrderItem {
  product_id: string;
  name: string;
  qty: number;
  price: number; // paise per unit
  portion?: 'half' | 'full';
  addons?: { id: string; name: string; price: number }[];
}

export interface SyncQueueItem {
  id: string;
  business_id: string;
  table_name: string;
  operation: 'insert' | 'update' | 'delete';
  record_id: string;
  payload: any;
  synced: boolean;
  created_at: string;
}

export interface TableEntity {
  id: string;
  business_id: string;
  table_number: string;
  status: 'available' | 'occupied';
  current_order_id?: string;
  cart_items?: OrderItem[];
  created_at: string;
}

export class HissabWalaDB extends Dexie {
  businesses!: Table<Business>;
  profiles!: Table<Profile>;
  categories!: Table<Category>;
  products!: Table<Product>;
  addons!: Table<Addon>;
  customers!: Table<Customer>;
  orders!: Table<Order>;
  sync_queue!: Table<SyncQueueItem>;
  tables!: Table<TableEntity>;

  constructor() {
    super('HissabWalaDB');
    this.version(1).stores({
      businesses: 'id, name',
      profiles: 'id, business_id, username',
      categories: 'id, business_id',
      products: 'id, business_id, category_id, name',
      addons: 'id, business_id, product_id',
      customers: 'id, business_id, phone',
      orders: 'id, business_id, bill_number, created_at',
      sync_queue: 'id, business_id, synced, created_at',
      tables: 'id, business_id, table_number',
    });
  }
}

export const db = new HissabWalaDB();

// Helper functions
export async function getCurrentBusiness(): Promise<Business | undefined> {
  const businesses = await db.businesses.toArray();
  return businesses[0];
}

export async function getCurrentProfile(): Promise<Profile | undefined> {
  const profiles = await db.profiles.toArray();
  return profiles[0];
}

export async function addToSyncQueue(
  business_id: string,
  table_name: string,
  operation: 'insert' | 'update' | 'delete',
  record_id: string,
  payload: any
) {
  await db.sync_queue.add({
    id: crypto.randomUUID(),
    business_id,
    table_name,
    operation,
    record_id,
    payload,
    synced: false,
    created_at: new Date().toISOString(),
  });
}

export async function getNextBillNumber(business_id: string): Promise<string> {
  const orders = await db.orders.where('business_id').equals(business_id).toArray();
  const billNumbers = orders.map(o => {
    const match = o.bill_number.match(/\d+$/);
    return match ? parseInt(match[0]) : 0;
  });
  const maxNumber = billNumbers.length > 0 ? Math.max(...billNumbers) : 0;
  return `INV${String(maxNumber + 1).padStart(6, '0')}`;
}
