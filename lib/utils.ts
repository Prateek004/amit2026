import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(paise: number): string {
  return `₹${(paise / 100).toFixed(2)}`;
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateTime(date: string): string {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function calculateGST(subtotal: number, gstRate: number, isIGST: boolean = false) {
  const gstAmount = Math.round((subtotal * gstRate) / 100);
  
  if (isIGST) {
    return { cgst: 0, sgst: 0, igst: gstAmount };
  } else {
    const cgst = Math.round(gstAmount / 2);
    const sgst = gstAmount - cgst;
    return { cgst, sgst, igst: 0 };
  }
}

export function validateGSTNumber(gst: string): boolean {
  const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  return gstRegex.test(gst);
}
