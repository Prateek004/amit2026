'use client';

import { useState, useEffect } from 'react';
import { Search, Plus, Minus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { db, Product, Category, getCurrentBusiness } from '@/lib/db';
import { useCartStore } from '@/store/useCartStore';
import { CheckoutModal } from '@/components/CheckoutModal';
import { AddOnModal } from '@/components/AddOnModal';
import { SyncIndicator } from '@/components/SyncIndicator';

export default function POSPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { items, addItem, updateQuantity, removeItem, getTotal, getSubtotal } = useCartStore();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [selectedCategory, searchQuery, products]);

  const loadData = async () => {
    const business = await getCurrentBusiness();
    if (!business) return;

    const [cats, prods] = await Promise.all([
      db.categories.where('business_id').equals(business.id).toArray(),
      db.products.where('business_id').equals(business.id).toArray(),
    ]);

    setCategories(cats);
    setProducts(prods);
  };

  const filterProducts = () => {
    let filtered = products;

    if (selectedCategory) {
      filtered = filtered.filter((p) => p.category_id === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredProducts(filtered);
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setAddonModalOpen(true);
  };

  const handleAddToCart = (addons: any[], portion?: 'half' | 'full') => {
    if (!selectedProduct) return;

    let price = selectedProduct.price;
    if (portion && selectedProduct.portions) {
      price = selectedProduct.portions[portion] || price;
    }

    addItem({
      product_id: selectedProduct.id,
      name: selectedProduct.name,
      qty: 1,
      price,
      portion,
      addons: addons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
    });
  };

  const getItemQuantity = (productId: string) => {
    return items
      .filter((item) => item.product_id === productId)
      .reduce((sum, item) => sum + item.qty, 0);
  };

  return (
    <div className="h-full flex flex-col md:flex-row">
      {/* Left Panel: Products */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b bg-background">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">POS</h1>
            <SyncIndicator />
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Categories */}
        <div className="p-4 border-b overflow-x-auto">
          <div className="flex gap-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={selectedCategory === null ? 'bg-[#E8590C]' : ''}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(cat.id)}
                className={selectedCategory === cat.id ? 'bg-[#E8590C]' : ''}
              >
                {cat.name}
              </Button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const qty = getItemQuantity(product.id);
              return (
                <Card
                  key={product.id}
                  className="p-3 cursor-pointer hover:shadow-md transition-shadow relative"
                  onClick={() => handleProductClick(product)}
                >
                  <div className="absolute top-2 right-2">
                    {product.is_veg ? (
                      <span className="text-green-600">🟢</span>
                    ) : (
                      <span className="text-red-600">🔴</span>
                    )}
                  </div>
                  <h3 className="font-medium text-sm mb-1 pr-6">{product.name}</h3>
                  <p className="text-lg font-bold text-[#E8590C]">
                    {formatCurrency(product.price)}
                  </p>
                  {qty > 0 && (
                    <Badge className="mt-2 bg-[#E8590C]">
                      In cart: {qty}
                    </Badge>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Panel: Cart (Desktop) */}
      <div className="hidden md:block w-96 border-l bg-muted/20 flex flex-col">
        <div className="p-4 border-b bg-background">
          <h2 className="text-xl font-bold">Current Order</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Cart is empty
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <Card key={`${item.product_id}-${item.portion || 'default'}-${idx}`} className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <h4 className="font-medium">{item.name}</h4>
                      {item.portion && (
                        <p className="text-xs text-muted-foreground">
                          {item.portion}
                        </p>
                      )}
                      {item.addons && item.addons.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.addons.map((a) => (
                            <div key={a.id}>+ {a.name}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeItem(item.product_id, item.portion)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.product_id, item.portion, item.qty - 1)
                        }
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center font-medium">{item.qty}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() =>
                          updateQuantity(item.product_id, item.portion, item.qty + 1)
                        }
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <span className="font-bold">
                      {formatCurrency(
                        item.price * item.qty +
                          (item.addons?.reduce((s, a) => s + a.price, 0) || 0) * item.qty
                      )}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t bg-background space-y-3">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>{formatCurrency(getSubtotal())}</span>
              </div>
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatCurrency(getTotal())}</span>
              </div>
            </div>
            <Button
              onClick={() => setCheckoutOpen(true)}
              className="w-full bg-[#E8590C] hover:bg-[#E8590C]/90"
              size="lg"
            >
              Proceed to Checkout
            </Button>
          </div>
        )}
      </div>

      {/* Mobile Cart Button */}
      {items.length > 0 && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 p-4 bg-background border-t z-40">
          <Button
            onClick={() => setCheckoutOpen(true)}
            className="w-full bg-[#E8590C] hover:bg-[#E8590C]/90"
            size="lg"
          >
            Checkout • {items.length} items • {formatCurrency(getTotal())}
          </Button>
        </div>
      )}

      <CheckoutModal open={checkoutOpen} onOpenChange={setCheckoutOpen} />
      <AddOnModal
        open={addonModalOpen}
        onOpenChange={setAddonModalOpen}
        product={selectedProduct}
        onConfirm={handleAddToCart}
      />
    </div>
  );
}
