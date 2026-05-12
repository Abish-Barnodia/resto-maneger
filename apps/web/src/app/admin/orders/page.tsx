'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { RoleGuard } from '@/components/auth/role-guard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Bell, Plus, Calendar, RotateCcw, Filter, Search, Eye, Printer, MoreVertical, X, User, Clock, CreditCard, ChevronLeft, ChevronRight, LayoutList, CheckSquare, XCircle } from 'lucide-react';
import apiClient from '@/services/apiClient';
import { cn } from '@/lib/utils';

type OrderItem = { order_item_id?: string; item_id: string; item_name: string; quantity: number; price_at_billing: number; };
type Order = { order_id: string; table_id: string; table_number?: string; order_phase: number; status: 'open' | 'sent_to_kitchen' | 'billed' | 'cancelled' | 'completed'; items: OrderItem[]; created_at?: string; };

const PAGE_SIZE = 10;

export default function OrdersPage() {
  const router = useRouter();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().split('T')[0];

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState('all');

  // Filter state
  const [filterDate, setFilterDate] = useState(today);
  const [filterTable, setFilterTable] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ date: today, table: 'all', status: 'all', search: '' });

  // Pagination
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // Action states
  const [isSendingKOT, setIsSendingKOT] = useState(false);
  const [isGeneratingBill, setIsGeneratingBill] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => { loadOrders(); }, []);

  async function loadOrders() {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const response = await apiClient.get<Order[]>('/orders');
      const data = response.data || [];
      setOrders(data);
      if (data.length > 0) setSelectedOrder(data[0]);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || 'Failed to load orders.');
    } finally {
      setIsLoading(false);
    }
  }

  const handleApplyFilter = () => {
    setAppliedFilters({ date: filterDate, table: filterTable, status: filterStatus, search: filterSearch });
    setPage(1);
  };

  const handleReset = () => {
    setFilterDate(today);
    setFilterTable('all');
    setFilterStatus('all');
    setFilterSearch('');
    setAppliedFilters({ date: today, table: 'all', status: 'all', search: '' });
    setPage(1);
  };

  const handlePrintKOT = async () => {
    if (!selectedOrder) return;
    setIsSendingKOT(true);
    setActionMessage(null);
    try {
      if (selectedOrder.status === 'open') {
        await apiClient.post(`/orders/${selectedOrder.order_id}/send-to-kitchen`);
        setActionMessage('Order sent to kitchen!');
        await loadOrders();
      } else {
        window.print();
      }
    } catch (err: any) {
      setActionMessage(err?.response?.data?.message || 'Failed to send to kitchen.');
    } finally {
      setIsSendingKOT(false);
    }
  };

  const handleGenerateBill = async () => {
    if (!selectedOrder) return;
    setIsGeneratingBill(true);
    setActionMessage(null);
    try {
      await apiClient.post(`/tables/${selectedOrder.table_id}/bill`);
      setActionMessage('Bill generated successfully!');
      await loadOrders();
    } catch (err: any) {
      setActionMessage(err?.response?.data?.message || 'Failed to generate bill.');
    } finally {
      setIsGeneratingBill(false);
    }
  };

  const formatDate = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ', ' +
      d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  const statusBadge = (status: Order['status']) => {
    switch (status) {
      case 'open': case 'sent_to_kitchen':
        return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">Running</Badge>;
      case 'completed': case 'billed':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">Completed</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calcTotal = (items: OrderItem[]) => items.reduce((s, i) => s + i.quantity * (i.price_at_billing || 0), 0);

  // All unique table numbers for filter dropdown
  const uniqueTables = useMemo(() => [...new Set(orders.map(o => o.table_number || o.table_id).filter(Boolean))], [orders]);

  const filteredOrders = useMemo(() => {
    let list = orders;
    if (activeTab === 'running') list = list.filter(o => o.status === 'open' || o.status === 'sent_to_kitchen');
    else if (activeTab === 'completed') list = list.filter(o => o.status === 'completed' || o.status === 'billed');
    else if (activeTab === 'cancelled') list = list.filter(o => o.status === 'cancelled');

    if (appliedFilters.table !== 'all') list = list.filter(o => (o.table_number || o.table_id) === appliedFilters.table);
    if (appliedFilters.status !== 'all') {
      if (appliedFilters.status === 'running') list = list.filter(o => o.status === 'open' || o.status === 'sent_to_kitchen');
      else if (appliedFilters.status === 'completed') list = list.filter(o => o.status === 'completed' || o.status === 'billed');
      else if (appliedFilters.status === 'cancelled') list = list.filter(o => o.status === 'cancelled');
    }
    if (appliedFilters.date) {
      list = list.filter(o => {
        if (!o.created_at) return true;
        return new Date(o.created_at).toISOString().split('T')[0] === appliedFilters.date;
      });
    }
    if (appliedFilters.search) {
      const q = appliedFilters.search.toLowerCase();
      list = list.filter(o => o.order_id.toLowerCase().includes(q) || (o.table_number || o.table_id || '').toLowerCase().includes(q));
    }
    return list;
  }, [orders, activeTab, appliedFilters]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / rowsPerPage));
  const pagedOrders = filteredOrders.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const TAB_BTN = (id: string, label: string, icon: React.ReactNode) => (
    <button onClick={() => { setActiveTab(id); setPage(1); }}
      className={cn("flex items-center gap-2 px-1 py-4 text-sm font-medium border-b-2 transition-colors",
        activeTab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
      {icon} {label}
    </button>
  );

  return (
    <RoleGuard allowedRoles={['superadmin', 'admin', 'manager', 'staff']}>
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold">Orders</h1>
              <p className="text-sm text-muted-foreground">View and manage all restaurant orders</p>
            </div>
            <div className="flex items-center gap-4">
              {/* Clickable date picker */}
              <div className="relative flex items-center gap-2 bg-white border rounded-md px-3 py-2 text-sm shadow-sm cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => dateInputRef.current?.showPicker()}>
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span>{new Date(filterDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                <input ref={dateInputRef} type="date" value={filterDate}
                  onChange={e => { setFilterDate(e.target.value); setAppliedFilters(f => ({ ...f, date: e.target.value })); setPage(1); }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full" />
              </div>
              <div className="relative cursor-pointer">
                <Bell className="w-6 h-6 text-muted-foreground" />
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">3</span>
              </div>
              {/* New Order → goes to POS */}
              <Button className="bg-primary hover:bg-primary/90 text-white gap-2" onClick={() => router.push('/admin/pos')}>
                <Plus className="w-4 h-4" /> New Order
              </Button>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{errorMessage}</div>
          )}

          <div className="bg-white shadow-sm ring-1 ring-border rounded-xl overflow-hidden">
            {/* Tabs */}
            <div className="border-b px-4 flex gap-6">
              {TAB_BTN('all', 'All Orders', <LayoutList className="w-4 h-4" />)}
              {TAB_BTN('running', 'Running Orders', <Clock className="w-4 h-4" />)}
              {TAB_BTN('completed', 'Completed Orders', <CheckSquare className="w-4 h-4" />)}
              {TAB_BTN('cancelled', 'Cancelled Orders', <XCircle className="w-4 h-4" />)}
            </div>

            {/* Filters */}
            <div className="p-4 border-b bg-slate-50/50 flex flex-wrap items-end gap-4">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground uppercase">Date</label>
                <div className="relative flex items-center gap-2 bg-white border rounded-md px-3 py-2 text-sm shadow-sm w-[150px] cursor-pointer hover:border-primary/50"
                  onClick={() => dateInputRef.current?.showPicker()}>
                  <span className="truncate">{new Date(filterDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground uppercase">Table</label>
                <Select value={filterTable} onValueChange={setFilterTable}>
                  <SelectTrigger className="w-[130px] bg-white"><SelectValue placeholder="All Tables" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tables</SelectItem>
                    {uniqueTables.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground uppercase">Order Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[140px] bg-white"><SelectValue placeholder="All Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="running">Running</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[200px] relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search by Order ID / Table" className="pl-9 bg-white"
                  value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleApplyFilter()} />
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" className="text-primary border-primary/20 hover:bg-primary/5 gap-2" onClick={handleReset}>
                  <RotateCcw className="w-4 h-4" /> Reset
                </Button>
                <Button className="bg-primary hover:bg-primary/90 text-white gap-2" onClick={handleApplyFilter}>
                  <Filter className="w-4 h-4" /> Apply Filter
                </Button>
              </div>
            </div>

            {/* Split View */}
            <div className="flex flex-col xl:flex-row min-h-[500px] bg-slate-50/30">
              {/* Table */}
              <div className={cn("p-6 flex-1", selectedOrder && "xl:border-r")}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold">Orders List</h2>
                  <span className="text-sm font-medium text-primary bg-primary/10 px-3 py-1 rounded-full">Total Orders: {filteredOrders.length}</span>
                </div>
                <div className="bg-white border rounded-xl overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="hover:bg-transparent">
                        {['Order ID', 'Table No.', 'Status', 'Order Time', 'Items', 'Amount (₹)', 'Actions'].map(h => (
                          <TableHead key={h} className="font-semibold text-slate-600">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoading ? (
                        <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">Loading orders...</TableCell></TableRow>
                      ) : pagedOrders.length === 0 ? (
                        <TableRow><TableCell colSpan={7} className="h-32 text-center text-muted-foreground">No orders found.</TableCell></TableRow>
                      ) : pagedOrders.map(order => {
                        const isSelected = selectedOrder?.order_id === order.order_id;
                        return (
                          <TableRow key={order.order_id}
                            className={cn("cursor-pointer transition-colors", isSelected ? "bg-primary/5" : "hover:bg-slate-50")}
                            onClick={() => setSelectedOrder(order)}>
                            <TableCell className="font-medium text-primary uppercase">{order.order_id.slice(0, 8)}</TableCell>
                            <TableCell>{order.table_number || order.table_id}</TableCell>
                            <TableCell>{statusBadge(order.status)}</TableCell>
                            <TableCell className="text-sm">{formatDate(order.created_at)}</TableCell>
                            <TableCell>{order.items.length} Items</TableCell>
                            <TableCell className="font-semibold">₹ {calcTotal(order.items).toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-primary hover:bg-primary/10"
                                  title="View Details" onClick={e => { e.stopPropagation(); setSelectedOrder(order); }}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                  title="Print KOT" onClick={e => { e.stopPropagation(); setSelectedOrder(order); handlePrintKOT(); }}>
                                  <Printer className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  {/* Pagination */}
                  <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                    <span>Showing {filteredOrders.length === 0 ? 0 : (page - 1) * rowsPerPage + 1} to {Math.min(page * rowsPerPage, filteredOrders.length)} of {filteredOrders.length} orders</span>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="w-4 h-4" /></Button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).slice(Math.max(0, page - 2), page + 1).map(p => (
                          <Button key={p} variant="outline" size="icon" className={cn("w-8 h-8", p === page && "border-primary text-primary bg-primary/5")}
                            onClick={() => setPage(p)}>{p}</Button>
                        ))}
                        <Button variant="outline" size="icon" className="w-8 h-8" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="w-4 h-4" /></Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Rows:</span>
                        <Select value={String(rowsPerPage)} onValueChange={v => { setRowsPerPage(Number(v)); setPage(1); }}>
                          <SelectTrigger className="w-[70px] h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {[10, 20, 50].map(n => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Detail Panel */}
              {selectedOrder && (
                <div className="w-full xl:w-[430px] bg-white border-l flex flex-col shrink-0">
                  <div className="p-5 border-b flex items-center justify-between bg-slate-50/50">
                    <h3 className="font-bold text-lg">Order Details</h3>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSelectedOrder(null)}><X className="w-5 h-5" /></Button>
                  </div>
                  <div className="p-5 flex-1 overflow-y-auto space-y-5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-primary text-lg uppercase">{selectedOrder.order_id.slice(0, 8)}</span>
                      {statusBadge(selectedOrder.status)}
                    </div>
                    {actionMessage && (
                      <div className="rounded-lg bg-primary/10 text-primary px-3 py-2 text-sm">{actionMessage}</div>
                    )}
                    <div className="bg-slate-50 border rounded-xl p-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <div className="flex items-center gap-2 text-slate-500"><LayoutList className="w-4 h-4" /> Table</div>
                      <div className="font-medium text-right">{selectedOrder.table_number || selectedOrder.table_id}</div>
                      <div className="flex items-center gap-2 text-slate-500"><Clock className="w-4 h-4" /> Order Time</div>
                      <div className="font-medium text-right">{formatDate(selectedOrder.created_at)}</div>
                      <div className="flex items-center gap-2 text-slate-500"><CreditCard className="w-4 h-4" /> Payment</div>
                      <div className="text-right">
                        <Badge variant="outline" className={cn("font-normal", selectedOrder.status === 'billed' ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600 border-emerald-200")}>
                          {selectedOrder.status === 'billed' ? 'Paid' : 'Unpaid'}
                        </Badge>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-3">Order Items ({selectedOrder.items.length})</h4>
                      <div className="space-y-2">
                        {selectedOrder.items.length === 0
                          ? <p className="text-sm text-muted-foreground">No items</p>
                          : selectedOrder.items.map((item, i) => (
                            <div key={i} className="flex justify-between text-sm">
                              <span className="flex-1 font-medium">{item.item_name || `Item #${item.item_id}`}</span>
                              <span className="text-slate-500 w-28 text-right">{item.quantity} × ₹{Number(item.price_at_billing).toFixed(2)}</span>
                              <span className="font-medium w-20 text-right">₹{(item.quantity * item.price_at_billing).toFixed(2)}</span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <div className="border-t border-dashed pt-4 space-y-2">
                      {[
                        { label: 'Sub Total', val: calcTotal(selectedOrder.items) },
                        { label: 'CGST (2.5%)', val: calcTotal(selectedOrder.items) * 0.025 },
                        { label: 'SGST (2.5%)', val: calcTotal(selectedOrder.items) * 0.025 },
                      ].map(({ label, val }) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-medium">₹ {val.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-2 border-t font-bold text-lg">
                        <span>Total Amount</span>
                        <span className="text-primary">₹ {(calcTotal(selectedOrder.items) * 1.05).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-5 border-t bg-slate-50/50 flex gap-3">
                    <Button variant="outline" className="flex-1 text-primary border-primary/30 bg-primary/5 hover:bg-primary/10"
                      disabled={isSendingKOT || selectedOrder.status === 'billed'}
                      onClick={handlePrintKOT}>
                      <Printer className="w-4 h-4 mr-2" />
                      {isSendingKOT ? 'Sending...' : selectedOrder.status === 'open' ? 'Send to Kitchen' : 'Print KOT'}
                    </Button>
                    <Button className="flex-1 bg-primary hover:bg-primary/90 text-white"
                      disabled={isGeneratingBill || selectedOrder.status === 'billed'}
                      onClick={handleGenerateBill}>
                      <CreditCard className="w-4 h-4 mr-2" />
                      {isGeneratingBill ? 'Generating...' : 'Generate Bill'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
