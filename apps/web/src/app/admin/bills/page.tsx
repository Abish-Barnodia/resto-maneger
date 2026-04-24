'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { RoleGuard } from '@/components/auth/role-guard';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import apiClient from '@/services/apiClient';

type BillStatus = 'draft' | 'completed' | 'printed';

type BillListItem = {
  id: number;
  bill_serial_number: number;
  cashier_id: number;
  subtotal: string;
  gst_total: string;
  grand_total: string;
  status: BillStatus;
  created_at: string;
  items_count: number;
};

type BillDetail = {
  bill: {
    id: number;
    bill_serial_number: number;
    cashier_id: number;
    subtotal: string;
    gst_total: string;
    grand_total: string;
    status: BillStatus;
    created_at: string;
  };
  items: Array<{
    id: number;
    bill_id: number;
    item_id: number;
    item_name: string;
    quantity: number;
    unit_price: string;
    gst_rate: string;
    gst_amount: string;
    line_total: string;
  }>;
};

function statusVariant(status: BillStatus): 'default' | 'secondary' | 'outline' {
  if (status === 'printed') {
    return 'default';
  }
  if (status === 'completed') {
    return 'secondary';
  }
  return 'outline';
}

export default function BillsHistoryPage() {
  const [bills, setBills] = useState<BillListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedBill, setSelectedBill] = useState<BillDetail | null>(null);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);

  const [isPrinting, setIsPrinting] = useState(false);

  const grandTotalOfAll = useMemo(() => {
    return bills.reduce((sum, bill) => sum + Number(bill.grand_total), 0);
  }, [bills]);

  async function loadBills() {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await apiClient.get<BillListItem[]>('/bills');
      setBills(response.data ?? []);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? 'Failed to load bills.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadBills();
  }, []);

  async function handleViewBill(billId: number) {
    setErrorMessage(null);

    try {
      const response = await apiClient.get<BillDetail>(`/bills/${billId}`);
      setSelectedBill(response.data);
      setSelectedBillId(billId);
      setIsDetailOpen(true);
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? 'Failed to load bill details.');
    }
  }

  async function handlePrintBill(billId: number) {
    setIsPrinting(true);
    setErrorMessage(null);

    try {
      await apiClient.post(`/bills/${billId}/print`);
      await loadBills();

      if (selectedBillId === billId) {
        await handleViewBill(billId);
      }
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message ?? 'Failed to print bill.');
    } finally {
      setIsPrinting(false);
    }
  }

  return (
    <RoleGuard allowedRoles={['superadmin', 'admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Bills History</h1>
              <p className="text-sm text-muted-foreground">
                View finalized bills, inspect line-level snapshots, and print receipts.
              </p>
            </div>
            <div className="rounded-xl border bg-white px-4 py-3 text-right shadow-sm">
              <p className="text-xs text-muted-foreground">Total Collection (Visible Rows)</p>
              <p className="text-lg font-semibold">Rs {grandTotalOfAll.toFixed(2)}</p>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          )}

          <Card className="border bg-white shadow-sm">
            <CardHeader>
              <CardTitle>All Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bill No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Items Count</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">GST</TableHead>
                    <TableHead className="text-right">Grand Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                        Loading bills...
                      </TableCell>
                    </TableRow>
                  ) : bills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                        No bills available.
                      </TableCell>
                    </TableRow>
                  ) : (
                    bills.map((bill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-medium">{bill.bill_serial_number}</TableCell>
                        <TableCell>{new Date(bill.created_at).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{bill.items_count}</TableCell>
                        <TableCell className="text-right">Rs {Number(bill.subtotal).toFixed(2)}</TableCell>
                        <TableCell className="text-right">Rs {Number(bill.gst_total).toFixed(2)}</TableCell>
                        <TableCell className="text-right">Rs {Number(bill.grand_total).toFixed(2)}</TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(bill.status)} className="capitalize">
                            {bill.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleViewBill(bill.id)}>
                              View
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handlePrintBill(bill.id)}
                              disabled={isPrinting || bill.status !== 'completed'}
                            >
                              Print
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>
                  Bill Detail{selectedBill ? ` - #${selectedBill.bill.bill_serial_number}` : ''}
                </DialogTitle>
                <DialogDescription>
                  Receipt data is shown from bill item snapshots saved at billing time.
                </DialogDescription>
              </DialogHeader>

              {selectedBill ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 rounded-lg border bg-muted/20 p-3 text-sm md:grid-cols-4">
                    <div>
                      <p className="text-muted-foreground">Bill No</p>
                      <p className="font-medium">{selectedBill.bill.bill_serial_number}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Cashier ID</p>
                      <p className="font-medium">{selectedBill.bill.cashier_id}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Date</p>
                      <p className="font-medium">{new Date(selectedBill.bill.created_at).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <Badge variant={statusVariant(selectedBill.bill.status)} className="capitalize">
                        {selectedBill.bill.status}
                      </Badge>
                    </div>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">GST%</TableHead>
                        <TableHead className="text-right">GST Amt</TableHead>
                        <TableHead className="text-right">Line Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBill.items.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell>{line.item_name}</TableCell>
                          <TableCell className="text-right">{line.quantity}</TableCell>
                          <TableCell className="text-right">Rs {Number(line.unit_price).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{Number(line.gst_rate).toFixed(2)}%</TableCell>
                          <TableCell className="text-right">Rs {Number(line.gst_amount).toFixed(2)}</TableCell>
                          <TableCell className="text-right">Rs {Number(line.line_total).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  <div className="ml-auto w-full max-w-sm space-y-1 rounded-lg border bg-muted/20 p-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>Rs {Number(selectedBill.bill.subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST Total</span>
                      <span>Rs {Number(selectedBill.bill.gst_total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-semibold">
                      <span>Grand Total</span>
                      <span>Rs {Number(selectedBill.bill.grand_total).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No bill selected.</p>
              )}

              <DialogFooter>
                {selectedBill && selectedBill.bill.status === 'completed' && (
                  <Button
                    onClick={() => handlePrintBill(selectedBill.bill.id)}
                    disabled={isPrinting}
                  >
                    {isPrinting ? 'Printing...' : 'Print'}
                  </Button>
                )}
                <Button variant="outline" onClick={() => setIsDetailOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </DashboardLayout>
    </RoleGuard>
  );
}
