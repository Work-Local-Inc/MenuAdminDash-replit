"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { FileText, Plus, Eye, CheckCircle, Printer, Trash2, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

interface VendorConfig {
  id: number
  vendor_name: string
  company_name: string | null
  tax_rate: number
  payment_terms: string | null
}

interface LineItem {
  description: string
  amount: number
}

interface VendorInvoice {
  id: number
  vendor_id: number
  vendor_name: string
  invoice_number: number
  invoice_date: string
  period_start: string
  period_end: string
  line_items: LineItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  total: number
  status: string
  created_at: string
}

interface CommissionReport {
  vendor: {
    id: number
    vendor_name: string
    company_name: string | null
    tax_rate: number
  }
  versions: Record<string, { restaurants: any[]; subtotal: number }>
  grand_subtotal: number
  tax_rate: number
  tax_amount: number
  grand_total: number
}

function formatCurrency(amount: number) {
  const sign = amount < 0 ? '-' : ''
  return `${sign}$${Math.abs(amount).toFixed(2)}`
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'draft':
      return <Badge variant="secondary" data-testid={`badge-status-${status}`}>Draft</Badge>
    case 'finalized':
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" data-testid={`badge-status-${status}`}>Finalized</Badge>
    case 'paid':
      return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" data-testid={`badge-status-${status}`}>Paid</Badge>
    default:
      return <Badge variant="secondary">{status}</Badge>
  }
}

export default function VendorInvoicesPage() {
  const { toast } = useToast()
  const [filterVendorId, setFilterVendorId] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<string>("all")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [viewInvoice, setViewInvoice] = useState<VendorInvoice | null>(null)

  const [newVendorId, setNewVendorId] = useState<string>("")
  const [newInvoiceDate, setNewInvoiceDate] = useState(() => {
    const prev = subMonths(new Date(), 1)
    return format(endOfMonth(prev), 'yyyy-MM-dd')
  })
  const [newPeriodStart, setNewPeriodStart] = useState(() => {
    const prev = subMonths(new Date(), 1)
    return format(startOfMonth(prev), 'yyyy-MM-dd')
  })
  const [newPeriodEnd, setNewPeriodEnd] = useState(() => {
    const prev = subMonths(new Date(), 1)
    return format(endOfMonth(prev), 'yyyy-MM-dd')
  })
  const [lineItems, setLineItems] = useState<LineItem[]>([{ description: '', amount: 0 }])
  const [taxRate, setTaxRate] = useState<number>(13)
  const [autoFilling, setAutoFilling] = useState(false)

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<VendorConfig[]>({
    queryKey: ['/api/reports/vendor-configs'],
  })

  const queryParams = new URLSearchParams()
  if (filterVendorId && filterVendorId !== 'all') queryParams.set('vendorId', filterVendorId)
  if (filterStatus && filterStatus !== 'all') queryParams.set('status', filterStatus)
  const queryString = queryParams.toString()

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<VendorInvoice[]>({
    queryKey: ['/api/reports/vendor-invoices', queryString],
    queryFn: () => fetch(`/api/reports/vendor-invoices${queryString ? '?' + queryString : ''}`).then(r => {
      if (!r.ok) throw new Error('Failed to fetch invoices')
      return r.json()
    }),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/reports/vendor-invoices', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports/vendor-invoices'] })
      resetCreateForm()
      setCreateDialogOpen(false)
      toast({ title: "Invoice created", description: "Invoice has been saved as draft." })
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const statusMutation = useMutation({
    mutationFn: (data: { id: number; status: string }) => apiRequest('/api/reports/vendor-invoices', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports/vendor-invoices'] })
      toast({ title: "Status updated", description: "Invoice status has been updated." })
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const resetCreateForm = () => {
    setNewVendorId("")
    const prev = subMonths(new Date(), 1)
    setNewInvoiceDate(format(endOfMonth(prev), 'yyyy-MM-dd'))
    setNewPeriodStart(format(startOfMonth(prev), 'yyyy-MM-dd'))
    setNewPeriodEnd(format(endOfMonth(prev), 'yyyy-MM-dd'))
    setLineItems([{ description: '', amount: 0 }])
    setTaxRate(13)
  }

  const subtotal = useMemo(() => {
    return lineItems.reduce((sum, item) => sum + (item.amount || 0), 0)
  }, [lineItems])

  const taxAmount = useMemo(() => {
    return Math.round(subtotal * (taxRate / 100) * 100) / 100
  }, [subtotal, taxRate])

  const total = useMemo(() => {
    return Math.round((subtotal + taxAmount) * 100) / 100
  }, [subtotal, taxAmount])

  const handleAutoFill = async () => {
    if (!newVendorId) {
      toast({ title: "Select a vendor", description: "Please select a vendor first.", variant: "destructive" })
      return
    }

    setAutoFilling(true)
    try {
      const url = `/api/reports/vendor-commissions?vendorId=${newVendorId}&startDate=${newPeriodStart}&endDate=${newPeriodEnd}`
      const response = await fetch(url)
      if (!response.ok) throw new Error('Failed to fetch commission data')
      const report: CommissionReport = await response.json()

      const newItems: LineItem[] = []
      for (const [version, data] of Object.entries(report.versions)) {
        if (data.subtotal > 0) {
          newItems.push({
            description: `${version.toUpperCase()} Commission`,
            amount: Math.round(data.subtotal * 100) / 100,
          })
        }
      }

      if (newItems.length === 0) {
        toast({ title: "No commission data", description: "No commission data found for this vendor and period.", variant: "destructive" })
        setAutoFilling(false)
        return
      }

      setLineItems(newItems)
      setTaxRate(report.tax_rate || 13)
      toast({ title: "Auto-filled", description: `Loaded ${newItems.length} line item(s) from commission report.` })
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to auto-fill from commission report.", variant: "destructive" })
    }
    setAutoFilling(false)
  }

  const handleAddLineItem = () => {
    setLineItems([...lineItems, { description: '', amount: 0 }])
  }

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return
    setLineItems(lineItems.filter((_, i) => i !== index))
  }

  const handleLineItemChange = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems]
    if (field === 'amount') {
      updated[index] = { ...updated[index], amount: parseFloat(String(value)) || 0 }
    } else {
      updated[index] = { ...updated[index], description: String(value) }
    }
    setLineItems(updated)
  }

  const handleSaveDraft = () => {
    if (!newVendorId) {
      toast({ title: "Select a vendor", description: "Please select a vendor.", variant: "destructive" })
      return
    }

    const validItems = lineItems.filter(item => item.description.trim() && item.amount > 0)
    if (validItems.length === 0) {
      toast({ title: "Add line items", description: "Please add at least one line item with description and amount.", variant: "destructive" })
      return
    }

    createMutation.mutate({
      vendor_id: parseInt(newVendorId),
      invoice_date: newInvoiceDate,
      period_start: newPeriodStart,
      period_end: newPeriodEnd,
      line_items: validItems,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
    })
  }

  const handlePrint = () => {
    window.print()
  }

  const selectedVendorConfig = vendors.find(v => String(v.id) === newVendorId)

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <FileText className="h-6 w-6" />
              Vendor Invoices
            </h1>
            <p className="text-muted-foreground mt-1">
              Generate and manage monthly vendor invoices
            </p>
          </div>

          <Button
            onClick={() => { resetCreateForm(); setCreateDialogOpen(true) }}
            data-testid="button-create-invoice"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 space-y-2">
                <Label>Vendor</Label>
                <Select value={filterVendorId} onValueChange={setFilterVendorId}>
                  <SelectTrigger data-testid="select-filter-vendor">
                    <SelectValue placeholder={vendorsLoading ? "Loading..." : "All vendors"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Vendors</SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)} data-testid={`option-filter-vendor-${v.id}`}>
                        {v.vendor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger data-testid="select-filter-status">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="finalized">Finalized</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Invoices ({invoices.length})</CardTitle>
            <CardDescription>Most recent invoices first</CardDescription>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No invoices found. Create your first invoice to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((inv) => (
                      <TableRow key={inv.id} data-testid={`row-invoice-${inv.id}`}>
                        <TableCell className="font-medium" data-testid={`text-invoice-number-${inv.id}`}>
                          #{inv.invoice_number}
                        </TableCell>
                        <TableCell data-testid={`text-invoice-vendor-${inv.id}`}>
                          {inv.vendor_name}
                        </TableCell>
                        <TableCell data-testid={`text-invoice-date-${inv.id}`}>
                          {inv.invoice_date}
                        </TableCell>
                        <TableCell data-testid={`text-invoice-period-${inv.id}`}>
                          {inv.period_start} to {inv.period_end}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-invoice-subtotal-${inv.id}`}>
                          {formatCurrency(inv.subtotal)}
                        </TableCell>
                        <TableCell className="text-right" data-testid={`text-invoice-tax-${inv.id}`}>
                          {formatCurrency(inv.tax_amount)}
                        </TableCell>
                        <TableCell className="text-right font-medium" data-testid={`text-invoice-total-${inv.id}`}>
                          {formatCurrency(inv.total)}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(inv.status)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1 flex-wrap">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewInvoice(inv)}
                              data-testid={`button-view-invoice-${inv.id}`}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            {inv.status === 'draft' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => statusMutation.mutate({ id: inv.id, status: 'finalized' })}
                                disabled={statusMutation.isPending}
                                data-testid={`button-finalize-invoice-${inv.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Finalize
                              </Button>
                            )}
                            {inv.status === 'finalized' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => statusMutation.mutate({ id: inv.id, status: 'paid' })}
                                disabled={statusMutation.isPending}
                                data-testid={`button-mark-paid-invoice-${inv.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Mark Paid
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>Generate a new vendor invoice. You can auto-fill from commission reports.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Vendor</Label>
                <Select value={newVendorId} onValueChange={(v) => {
                  setNewVendorId(v)
                  const vendor = vendors.find(vc => String(vc.id) === v)
                  if (vendor) setTaxRate(parseFloat(String(vendor.tax_rate)) || 13)
                }}>
                  <SelectTrigger data-testid="select-create-vendor">
                    <SelectValue placeholder="Select vendor..." />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)} data-testid={`option-create-vendor-${v.id}`}>
                        {v.vendor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Invoice Date</Label>
                <Input
                  type="date"
                  value={newInvoiceDate}
                  onChange={(e) => setNewInvoiceDate(e.target.value)}
                  data-testid="input-invoice-date"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input
                  type="date"
                  value={newPeriodStart}
                  onChange={(e) => setNewPeriodStart(e.target.value)}
                  data-testid="input-period-start"
                />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input
                  type="date"
                  value={newPeriodEnd}
                  onChange={(e) => setNewPeriodEnd(e.target.value)}
                  data-testid="input-period-end"
                />
              </div>
            </div>

            <div>
              <Button
                variant="outline"
                onClick={handleAutoFill}
                disabled={!newVendorId || autoFilling}
                data-testid="button-auto-fill"
              >
                <Download className="h-4 w-4 mr-2" />
                {autoFilling ? "Loading..." : "Auto-fill from Commission Report"}
              </Button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label>Line Items</Label>
                <Button variant="outline" size="sm" onClick={handleAddLineItem} data-testid="button-add-line-item">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {lineItems.map((item, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                    className="flex-1"
                    data-testid={`input-line-item-description-${index}`}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Amount"
                    value={item.amount || ''}
                    onChange={(e) => handleLineItemChange(index, 'amount', e.target.value)}
                    className="w-32"
                    data-testid={`input-line-item-amount-${index}`}
                  />
                  {lineItems.length > 1 && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleRemoveLineItem(index)}
                      data-testid={`button-remove-line-item-${index}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium" data-testid="text-create-subtotal">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between items-center gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Tax Rate (%)</span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-20"
                    data-testid="input-tax-rate"
                  />
                </div>
                <span className="font-medium" data-testid="text-create-tax-amount">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="flex justify-between items-center border-t pt-2">
                <span className="text-lg font-bold">Total</span>
                <span className="text-lg font-bold" data-testid="text-create-total">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} data-testid="button-cancel-create">
              Cancel
            </Button>
            <Button
              onClick={handleSaveDraft}
              disabled={createMutation.isPending}
              data-testid="button-save-draft"
            >
              {createMutation.isPending ? "Saving..." : "Save as Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewInvoice} onOpenChange={(open) => { if (!open) setViewInvoice(null) }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2 flex-wrap">
              <span>Invoice #{viewInvoice?.invoice_number}</span>
              <Button variant="outline" size="sm" onClick={handlePrint} data-testid="button-print-invoice">
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
            </DialogTitle>
          </DialogHeader>

          {viewInvoice && (
            <div className="space-y-6 print:text-black" id="invoice-print-area">
              <div className="text-center">
                <h2 className="text-2xl font-bold tracking-wide" data-testid="text-invoice-title">INVOICE</h2>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground print:text-gray-500">From:</p>
                  <p className="font-medium" data-testid="text-from-company">Local Media Concepts Inc.</p>
                  <p className="text-sm" data-testid="text-from-hst">HST: 82804 8280 RT0001</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground print:text-gray-500">To:</p>
                  <p className="font-medium" data-testid="text-to-vendor">{viewInvoice.vendor_name}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground print:text-gray-500">Invoice #</p>
                  <p className="font-medium" data-testid="text-view-invoice-number">{viewInvoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground print:text-gray-500">Date</p>
                  <p className="font-medium" data-testid="text-view-invoice-date">{viewInvoice.invoice_date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground print:text-gray-500">Period</p>
                  <p className="font-medium" data-testid="text-view-invoice-period">{viewInvoice.period_start} to {viewInvoice.period_end}</p>
                </div>
              </div>

              <div className="border-t border-b py-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(viewInvoice.line_items || []).map((item: LineItem, index: number) => (
                      <TableRow key={index} data-testid={`row-view-line-item-${index}`}>
                        <TableCell data-testid={`text-view-line-description-${index}`}>{item.description}</TableCell>
                        <TableCell className="text-right" data-testid={`text-view-line-amount-${index}`}>{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground print:text-gray-500">Subtotal</span>
                  <span className="font-medium" data-testid="text-view-subtotal">{formatCurrency(viewInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground print:text-gray-500">HST ({viewInvoice.tax_rate}%)</span>
                  <span className="font-medium" data-testid="text-view-tax-amount">{formatCurrency(viewInvoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-2">
                  <span className="text-lg font-bold">TOTAL</span>
                  <span className="text-lg font-bold" data-testid="text-view-total">{formatCurrency(viewInvoice.total)}</span>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground print:text-gray-500" data-testid="text-payment-terms">
                  Payment Terms: {(() => {
                    const vendor = vendors.find(v => v.id === viewInvoice.vendor_id)
                    return vendor?.payment_terms || 'Net 15'
                  })()}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground print:text-gray-500">Status:</span>
                {getStatusBadge(viewInvoice.status)}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
