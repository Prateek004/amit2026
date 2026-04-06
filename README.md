# HissabWala - Smart POS for Indian Businesses

Production-ready, offline-first POS system built with Next.js 15, TypeScript, Tailwind CSS, and Supabase.

## Features

- ✅ **Offline-First**: Works without internet, syncs automatically when online
- ✅ **GST Compliant**: CGST/SGST/IGST support with HSN codes
- ✅ **Split Payments**: Cash + UPI in one transaction
- ✅ **Udhaar Tracking**: Customer credit management
- ✅ **KOT Printing**: Thermal printer support via Bluetooth
- ✅ **WhatsApp Integration**: Share bills directly to customers
- ✅ **QR Code Payments**: Generate UPI QR codes
- ✅ **Reports & Analytics**: Sales reports, Z-report (Galla)
- ✅ **Role-Based Access**: Owner vs Cashier permissions
- ✅ **Mobile-First**: Responsive design optimized for tablets & phones

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Local State**: Dexie.js (IndexedDB) + Zustand
- **Backend**: Supabase (PostgreSQL + Auth + RLS)
- **Deployment**: Cloudflare Pages (Static Export)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Supabase

1. Create a new Supabase project at https://supabase.com
2. Run the SQL schema from `supabase/schema.sql` in the Supabase SQL Editor
3. Copy your project URL and anon key

### 3. Environment Variables

Create a `.env` file:

```bash
cp .env.example .env
```

Add your Supabase credentials:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
ANTHROPIC_API_KEY=your_anthropic_api_key  # Optional, for OCR feature
```

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 5. Build for Production

```bash
npm run build
```

The static export will be in the `out/` directory.

### 6. Deploy to Cloudflare Pages

1. Push your code to GitHub
2. Go to Cloudflare Pages dashboard
3. Connect your repository
4. Build settings:
   - Build command: `npm run build`
   - Output directory: `out`
5. Add environment variables in Cloudflare Pages settings
6. Deploy!

## Usage

### First Time Setup

1. Sign up with username, password, and business name
2. Complete onboarding (add logo, optional GST details)
3. Add categories and menu items
4. Start billing!

### POS Workflow

1. Select items from product grid
2. Adjust quantities in cart
3. Click "Proceed to Checkout"
4. Select payment mode (Cash/UPI/Split/Udhaar)
5. Complete sale

### Offline Mode

- All sales are saved locally in IndexedDB
- Syncs automatically when connection is restored
- Green cloud icon = synced, red = offline

### Owner Features

- Set PIN in Settings > Security
- PIN required for:
  - Voiding bills
  - Deleting items
  - Accessing reports

## Project Structure

```
hissabwala/
├── app/                    # Next.js 15 App Router pages
│   ├── pos/               # POS interface
│   ├── menu/              # Menu management
│   ├── customers/         # Customer & udhaar tracking
│   ├── reports/           # Analytics & Z-report
│   └── settings/          # Business settings
├── components/            # Reusable UI components
│   ├── ui/               # shadcn/ui components
│   ├── CheckoutModal.tsx # Checkout with split payments
│   └── SyncIndicator.tsx # Offline/online status
├── lib/
│   ├── db.ts             # Dexie.js schema
│   ├── supabase.ts       # Supabase client
│   ├── utils.ts          # Helper functions
│   └── printer.ts        # ESC/POS thermal printing
├── store/
│   └── useCartStore.ts   # Zustand cart state
└── supabase/
    └── schema.sql        # Database schema + RLS policies
```

## Database Schema

- **businesses**: Multi-tenant business data
- **profiles**: User roles (owner/cashier)
- **categories**: Product categories
- **products**: Menu items with portions, GST, HSN
- **addons**: Item modifiers (e.g., "Extra Cheese")
- **customers**: Customer data + udhaar balance
- **orders**: Bills with line items
- **sync_queue**: Offline sync tracking
- **tables**: KOT & table management

## Security

- Row-Level Security (RLS) policies enforce business isolation
- Every query scoped to `business_id`
- Owner PIN for sensitive operations
- Password-based auth (no OTP required)

## License

Proprietary - Built for Indian F&B businesses

## Support

For issues or feature requests, contact the development team.
