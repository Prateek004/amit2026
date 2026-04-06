'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { formatCurrency } from '@/lib/utils';
import { db, Product, Category, getCurrentBusiness, addToSyncQueue } from '@/lib/db';

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [ocrDialogOpen, setOcrDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    category_id: '',
    price: '',
    is_veg: true,
    has_portions: false,
    half_price: '',
    full_price: '',
    stock_quantity: '',
    hsn_code: '',
    gst_rate: '5',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const business = await getCurrentBusiness();
    if (!business) return;

    const [prods, cats] = await Promise.all([
      db.products.where('business_id').equals(business.id).toArray(),
      db.categories.where('business_id').equals(business.id).toArray(),
    ]);

    setProducts(prods);
    setCategories(cats);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const business = await getCurrentBusiness();
    if (!business) return;

    const portions = formData.has_portions
      ? {
          half: formData.half_price ? parseInt(formData.half_price) * 100 : undefined,
          full: formData.full_price ? parseInt(formData.full_price) * 100 : undefined,
        }
      : undefined;

    const productData = {
      business_id: business.id,
      name: formData.name,
      category_id: formData.category_id || undefined,
      price: parseInt(formData.price) * 100,
      is_veg: formData.is_veg,
      has_portions: formData.has_portions,
      portions,
      stock_quantity: parseInt(formData.stock_quantity) || 0,
      hsn_code: formData.hsn_code || undefined,
      gst_rate: parseInt(formData.gst_rate),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (editingProduct) {
      await db.products.update(editingProduct.id, productData);
      await addToSyncQueue(business.id, 'products', 'update', editingProduct.id, productData);
    } else {
      const id = crypto.randomUUID();
      await db.products.add({ id, ...productData });
      await addToSyncQueue(business.id, 'products', 'insert', id, { id, ...productData });
    }

    loadData();
    setDialogOpen(false);
    resetForm();
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category_id: product.category_id || '',
      price: String(product.price / 100),
      is_veg: product.is_veg,
      has_portions: product.has_portions,
      half_price: product.portions?.half ? String(product.portions.half / 100) : '',
      full_price: product.portions?.full ? String(product.portions.full / 100) : '',
      stock_quantity: String(product.stock_quantity),
      hsn_code: product.hsn_code || '',
      gst_rate: String(product.gst_rate),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`Delete ${product.name}?`)) return;

    const business = await getCurrentBusiness();
    if (!business) return;

    await db.products.delete(product.id);
    await addToSyncQueue(business.id, 'products', 'delete', product.id, null);
    loadData();
  };

  const resetForm = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category_id: '',
      price: '',
      is_veg: true,
      has_portions: false,
      half_price: '',
      full_price: '',
      stock_quantity: '',
      hsn_code: '',
      gst_rate: '5',
    });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Menu & Stock</h1>
        <div className="flex gap-2">
          <Button
            onClick={() => setOcrDialogOpen(true)}
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" />
            OCR Upload
          </Button>
          <Button
            onClick={() => {
              resetForm();
              setDialogOpen(true);
            }}
            className="bg-[#E8590C] hover:bg-[#E8590C]/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card key={product.id} className="p-4">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">{product.name}</h3>
                  {product.is_veg ? (
                    <span className="text-green-600">🟢</span>
                  ) : (
                    <span className="text-red-600">🔴</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  {categories.find((c) => c.id === product.category_id)?.name || 'Uncategorized'}
                </p>
              </div>
            </div>

            <div className="mb-3">
              <p className="text-xl font-bold text-[#E8590C]">
                {formatCurrency(product.price)}
              </p>
              {product.has_portions && product.portions && (
                <div className="text-sm text-muted-foreground">
                  {product.portions.half && `Half: ${formatCurrency(product.portions.half)} `}
                  {product.portions.full && `Full: ${formatCurrency(product.portions.full)}`}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline">Stock: {product.stock_quantity}</Badge>
              <Badge variant="outline">GST: {product.gst_rate}%</Badge>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleEdit(product)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                onClick={() => handleDelete(product)}
                variant="destructive"
                size="sm"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Item Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={formData.category_id}
                onValueChange={(v) => setFormData({ ...formData, category_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_veg"
                checked={formData.is_veg}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_veg: checked as boolean })
                }
              />
              <Label htmlFor="is_veg">Vegetarian</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="has_portions"
                checked={formData.has_portions}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, has_portions: checked as boolean })
                }
              />
              <Label htmlFor="has_portions">Has Portions (Half/Full)</Label>
            </div>

            {!formData.has_portions ? (
              <div>
                <Label>Price (₹)</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  required
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Half Price (₹)</Label>
                  <Input
                    type="number"
                    value={formData.half_price}
                    onChange={(e) => setFormData({ ...formData, half_price: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Full Price (₹)</Label>
                  <Input
                    type="number"
                    value={formData.full_price}
                    onChange={(e) => setFormData({ ...formData, full_price: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div>
              <Label>Stock Quantity</Label>
              <Input
                type="number"
                value={formData.stock_quantity}
                onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>HSN Code</Label>
                <Input
                  value={formData.hsn_code}
                  onChange={(e) => setFormData({ ...formData, hsn_code: e.target.value })}
                />
              </div>
              <div>
                <Label>GST Rate (%)</Label>
                <Input
                  type="number"
                  value={formData.gst_rate}
                  onChange={(e) => setFormData({ ...formData, gst_rate: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                onClick={() => setDialogOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button type="submit" className="bg-[#E8590C] hover:bg-[#E8590C]/90">
                {editingProduct ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* OCR Dialog Placeholder */}
      <Dialog open={ocrDialogOpen} onOpenChange={setOcrDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Menu Photo</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8 text-muted-foreground">
            OCR feature coming soon
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
