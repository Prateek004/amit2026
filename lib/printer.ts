import { Order } from './db';

export function generateESCPOS(order: Order, businessName: string, businessAddress?: string): string {
  const ESC = '\x1B';
  const GS = '\x1D';
  
  let receipt = '';
  
  // Initialize
  receipt += ESC + '@';
  
  // Center align
  receipt += ESC + 'a' + '\x01';
  
  // Bold + Large
  receipt += ESC + 'E' + '\x01';
  receipt += GS + '!' + '\x11';
  receipt += businessName + '\n';
  receipt += ESC + 'E' + '\x00';
  receipt += GS + '!' + '\x00';
  
  if (businessAddress) {
    receipt += businessAddress + '\n';
  }
  
  receipt += '================================\n';
  
  // Left align
  receipt += ESC + 'a' + '\x00';
  
  receipt += `Bill No: ${order.bill_number}\n`;
  receipt += `Date: ${new Date(order.created_at).toLocaleString('en-IN')}\n`;
  
  if (order.customer_name) {
    receipt += `Customer: ${order.customer_name}\n`;
  }
  if (order.customer_phone) {
    receipt += `Phone: ${order.customer_phone}\n`;
  }
  if (order.table_number) {
    receipt += `Table: ${order.table_number}\n`;
  }
  
  receipt += '================================\n';
  
  // Items
  receipt += 'Item                Qty    Price\n';
  receipt += '--------------------------------\n';
  
  order.items.forEach(item => {
    const itemName = item.name.substring(0, 18).padEnd(18);
    const qty = String(item.qty).padStart(3);
    const price = (item.price * item.qty / 100).toFixed(2).padStart(8);
    receipt += `${itemName} ${qty} ${price}\n`;
    
    if (item.portion) {
      receipt += `  (${item.portion})\n`;
    }
    
    if (item.addons && item.addons.length > 0) {
      item.addons.forEach(addon => {
        receipt += `  + ${addon.name} (₹${(addon.price / 100).toFixed(2)})\n`;
      });
    }
  });
  
  receipt += '================================\n';
  
  // Totals
  receipt += `Subtotal:         ₹${(order.subtotal / 100).toFixed(2).padStart(10)}\n`;
  
  if (order.cgst > 0) {
    receipt += `CGST:             ₹${(order.cgst / 100).toFixed(2).padStart(10)}\n`;
  }
  if (order.sgst > 0) {
    receipt += `SGST:             ₹${(order.sgst / 100).toFixed(2).padStart(10)}\n`;
  }
  if (order.igst > 0) {
    receipt += `IGST:             ₹${(order.igst / 100).toFixed(2).padStart(10)}\n`;
  }
  
  receipt += '--------------------------------\n';
  
  // Bold total
  receipt += ESC + 'E' + '\x01';
  receipt += `TOTAL:            ₹${(order.total / 100).toFixed(2).padStart(10)}\n`;
  receipt += ESC + 'E' + '\x00';
  
  receipt += '================================\n';
  
  if (order.payment_mode) {
    receipt += `Payment: ${order.payment_mode.toUpperCase()}\n`;
    if (order.payment_details) {
      if (order.payment_details.cash) {
        receipt += `  Cash: ₹${(order.payment_details.cash / 100).toFixed(2)}\n`;
      }
      if (order.payment_details.upi) {
        receipt += `  UPI: ₹${(order.payment_details.upi / 100).toFixed(2)}\n`;
      }
    }
  }
  
  // Center align
  receipt += ESC + 'a' + '\x01';
  receipt += '\n';
  receipt += 'Thank you for your visit!\n';
  receipt += '\n\n\n';
  
  // Cut paper
  receipt += GS + 'V' + '\x41' + '\x03';
  
  return receipt;
}

export function generateKOT(order: Order, tableName: string): string {
  const ESC = '\x1B';
  const GS = '\x1D';
  
  let kot = '';
  
  kot += ESC + '@';
  kot += ESC + 'a' + '\x01';
  
  kot += ESC + 'E' + '\x01';
  kot += GS + '!' + '\x11';
  kot += 'KOT\n';
  kot += ESC + 'E' + '\x00';
  kot += GS + '!' + '\x00';
  
  kot += '================================\n';
  kot += ESC + 'a' + '\x00';
  
  kot += `Table: ${tableName}\n`;
  kot += `Time: ${new Date().toLocaleTimeString('en-IN')}\n`;
  kot += '================================\n';
  
  kot += 'Item                        Qty\n';
  kot += '--------------------------------\n';
  
  order.items.forEach(item => {
    const itemName = item.name.substring(0, 26).padEnd(26);
    const qty = String(item.qty).padStart(3);
    kot += `${itemName} ${qty}\n`;
    
    if (item.portion) {
      kot += `  (${item.portion})\n`;
    }
    
    if (item.addons && item.addons.length > 0) {
      item.addons.forEach(addon => {
        kot += `  + ${addon.name}\n`;
      });
    }
  });
  
  kot += '\n\n\n';
  kot += GS + 'V' + '\x41' + '\x03';
  
  return kot;
}

export async function printToBluetooth(content: string) {
  if (!('bluetooth' in navigator)) {
    throw new Error('Bluetooth not supported');
  }

  try {
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }]
    });

    const server = await device.gatt.connect();
    const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
    const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    await characteristic.writeValue(data);
  } catch (error) {
    console.error('Bluetooth print error:', error);
    throw error;
  }
}
