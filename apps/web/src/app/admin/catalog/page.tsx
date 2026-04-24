'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RoleGuard } from '@/components/auth/role-guard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Pencil, Power, PowerOff } from 'lucide-react';
import apiClient from '@/services/apiClient';

type StockType = 'limited' | 'unlimited';
type StatusFilter = 'all' | 'active' | 'inactive';

type Item = {
  id: number;
  serial_number: string;
  name: string;
  selling_price: string;
  category: string;
  stock_quantity: number;
  is_active: boolean;
  stock_type: StockType;
  created_at: string;
  updated_at: string;
};

type Category = {
  id: number;
  name: string;
  is_active: boolean;
};

type ItemForm = {
  name: string;
  selling_price: string;
  category: string;
  stock_quantity: string;
  stock_type: StockType;
  is_active: boolean;
};

const EMPTY_FORM: ItemForm = {
  name: '',
  selling_price: '',
  category: '',
  stock_quantity: '0',
  stock_type: 'limited',
  is_active: true,
};

export default function AdminCatalogPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCategorySaving, setIsCategorySaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const [newCategoryName, setNewCategoryName] = useState('');
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [form, setForm] = useState<ItemForm>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ItemForm, string>>>({});

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingDeactivateItem, setPendingDeactivateItem] = useState<Item | null>(null);

  const categoryNames = useMemo(
    () => categories.map((c) => c.name).sort((a, b) => a.localeCompare(b)),
    [categories]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const categoryMatch = selectedCategory === 'all' || item.category === selectedCategory;
      const statusMatch =
        statusFilter === 'all' ||
        (statusFilter === 'active' && item.is_active) ||
        (statusFilter === 'inactive' && !item.is_active);

      return categoryMatch && statusMatch;
    });
  }, [items, selectedCategory, statusFilter]);

  async function loadItems() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params: Record<string, string> = {};

      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      if (statusFilter === 'active') {
        params.is_active = 'true';
      }
      if (statusFilter === 'inactive') {
        params.is_active = 'false';
      }

      const response = await apiClient.get<Item[]>('/items', { params });
      setItems(response.data ?? []);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? 'Failed to load items.');
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCategories() {
    try {
      const response = await apiClient.get<Category[]>('/categories');
      setCategories(response.data ?? []);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? 'Failed to load categories.');
    }
  }

  useEffect(() => {
    loadItems();
  }, [selectedCategory, statusFilter]);

  useEffect(() => {
    loadCategories();
  }, []);

  function openCreateModal() {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setIsFormOpen(true);
  }

  function openEditModal(item: Item) {
    setEditingItem(item);
    setForm({
      name: item.name,
      selling_price: Number(item.selling_price).toFixed(2),
      category: item.category,
      stock_quantity: String(item.stock_quantity ?? 0),
      stock_type: item.stock_type,
      is_active: item.is_active,
    });
    setFormErrors({});
    setIsFormOpen(true);
  }

  function validateForm(): boolean {
    const nextErrors: Partial<Record<keyof ItemForm, string>> = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Item name is required.';
    }

    const price = Number(form.selling_price);
    if (!form.selling_price || !Number.isFinite(price) || price <= 0) {
      nextErrors.selling_price = 'Selling price must be greater than 0.';
    }

    if (!form.category.trim()) {
      nextErrors.category = 'Category is required.';
    }

    const qty = Number(form.stock_quantity);
    if (!Number.isInteger(qty) || qty < 0) {
      nextErrors.stock_quantity = 'Stock quantity must be an integer >= 0.';
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const payload = {
      name: form.name.trim(),
      selling_price: Number(form.selling_price),
      category: form.category.trim(),
      stock_quantity: Number(form.stock_quantity),
      stock_type: form.stock_type,
      ...(editingItem ? { is_active: form.is_active } : {}),
    };

    try {
      if (editingItem) {
        await apiClient.put(`/items/${editingItem.id}`, payload);
      } else {
        await apiClient.post('/items', payload);
      }

      setIsFormOpen(false);
      await loadItems();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? 'Failed to save item.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleActivate(item: Item) {
    try {
      await apiClient.put(`/items/${item.id}`, { is_active: true });
      await loadItems();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? 'Failed to activate item.');
    }
  }

  async function handleCreateCategory() {
    if (!newCategoryName.trim()) {
      setErrorMessage('Category name is required.');
      return;
    }

    setIsCategorySaving(true);
    try {
      await apiClient.post('/categories', { name: newCategoryName.trim() });
      setNewCategoryName('');
      setIsCategoryDialogOpen(false);
      await loadCategories();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? 'Failed to create category.');
    } finally {
      setIsCategorySaving(false);
    }
  }

  function requestDeactivate(item: Item) {
    setPendingDeactivateItem(item);
    setConfirmOpen(true);
  }

  async function handleDeactivateConfirmed() {
    if (!pendingDeactivateItem) {
      return;
    }

    try {
      await apiClient.delete(`/items/${pendingDeactivateItem.id}`);
      setConfirmOpen(false);
      setPendingDeactivateItem(null);
      await loadItems();
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? 'Failed to deactivate item.');
    }
  }

  return (
    <RoleGuard allowedRoles={['superadmin', 'admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Item Catalog</h1>
              <p className="text-sm text-muted-foreground">Manage POS items, pricing, categories, and availability.</p>
            </div>
            <Button onClick={openCreateModal} className="gap-2 rounded-xl">
              <Plus size={16} />
              Add Item
            </Button>
            <Button variant="outline" onClick={() => setIsCategoryDialogOpen(true)} className="gap-2 rounded-xl ml-2">
              <Plus size={16} />
              Add Category
            </Button>
          </div>

          <Card className="border bg-white shadow-sm">
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Category</label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    {categoryNames.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">Status</label>
                  <div className="inline-flex rounded-lg border border-input bg-muted/30 p-1">
                    <button
                      type="button"
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        statusFilter === 'active' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                      }`}
                      onClick={() => setStatusFilter('active')}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        statusFilter === 'inactive' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                      }`}
                      onClick={() => setStatusFilter('inactive')}
                    >
                      Inactive
                    </button>
                    <button
                      type="button"
                      className={`rounded-md px-3 py-1 text-xs font-medium ${
                        statusFilter === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'
                      }`}
                      onClick={() => setStatusFilter('all')}
                    >
                      All
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border bg-white shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Items</CardTitle>
            </CardHeader>
            <CardContent>
              {errorMessage && (
                <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {errorMessage}
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock Qty</TableHead>
                    <TableHead>Stock Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                        Loading catalog...
                      </TableCell>
                    </TableRow>
                  ) : filteredItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                        No items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">{item.serial_number}</TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right">Rs {Number(item.selling_price).toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.stock_quantity}</TableCell>
                        <TableCell className="capitalize">{item.stock_type}</TableCell>
                        <TableCell>
                          <Badge variant={item.is_active ? 'default' : 'secondary'}>
                            {item.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => openEditModal(item)}
                            >
                              <Pencil size={14} />
                              Edit
                            </Button>

                            {item.is_active ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => requestDeactivate(item)}
                              >
                                <PowerOff size={14} />
                                Deactivate
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="gap-1"
                                onClick={() => handleActivate(item)}
                              >
                                <Power size={14} />
                                Activate
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Edit Item' : 'Add Item'}</DialogTitle>
              <DialogDescription>
                {editingItem
                  ? 'Update item details and status.'
                  : 'Create a new catalog item. Serial number and id are generated by the system.'}
              </DialogDescription>
            </DialogHeader>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Item Name</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Ex: Paneer Tikka"
                />
                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Selling Price</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.selling_price}
                  onChange={(e) => setForm((prev) => ({ ...prev, selling_price: e.target.value }))}
                  placeholder="0.00"
                />
                {formErrors.selling_price && <p className="text-xs text-destructive">{formErrors.selling_price}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Category</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.category}
                  onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                >
                  <option value="">Select category</option>
                  {categoryNames.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {formErrors.category && <p className="text-xs text-destructive">{formErrors.category}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Stock Quantity</label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={form.stock_quantity}
                  onChange={(e) => setForm((prev) => ({ ...prev, stock_quantity: e.target.value }))}
                  placeholder="0"
                />
                {formErrors.stock_quantity && <p className="text-xs text-destructive">{formErrors.stock_quantity}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Stock Type</label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={form.stock_type}
                  onChange={(e) => setForm((prev) => ({ ...prev, stock_type: e.target.value as StockType }))}
                >
                  <option value="limited">Limited</option>
                  <option value="unlimited">Unlimited</option>
                </select>
              </div>

              {editingItem && (
                <div className="flex items-center justify-between rounded-md border border-input px-3 py-2">
                  <span className="text-sm font-medium text-foreground">Status</span>
                  <button
                    type="button"
                    className={`rounded-md px-3 py-1 text-xs font-medium ${
                      form.is_active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                    }`}
                    onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
                  >
                    {form.is_active ? 'Active' : 'Inactive'}
                  </button>
                </div>
              )}

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Saving...' : editingItem ? 'Update Item' : 'Create Item'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Deactivate Item</DialogTitle>
              <DialogDescription>
                {pendingDeactivateItem
                  ? `Are you sure you want to deactivate ${pendingDeactivateItem.name}?`
                  : 'Are you sure you want to deactivate this item?'}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button type="button" variant="destructive" onClick={handleDeactivateConfirmed}>
                Confirm Deactivate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isCategoryDialogOpen} onOpenChange={setIsCategoryDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Category</DialogTitle>
              <DialogDescription>Add a new category for item assignment.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Category Name</label>
              <Input
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="Ex: Beverages"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsCategoryDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={isCategorySaving} onClick={handleCreateCategory}>
                {isCategorySaving ? 'Creating...' : 'Create Category'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DashboardLayout>
    </RoleGuard>
  );
}
