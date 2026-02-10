"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { Download, FileText, Settings, Plus, Trash2 } from "lucide-react"
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
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

interface VendorConfig {
  id: number
  vendor_name: string
  vendor_code: string
  company_name: string | null
  hst_number: string | null
  tax_rate: number
  contact_email: string | null
  payment_terms: string | null
  notes: string | null
}

interface RestaurantCommission {
  restaurant_id: number
  restaurant_name: string
  total: number
  commission_rate: number
  commission: number
}

interface VersionData {
  restaurants: RestaurantCommission[]
  subtotal: number
}

interface CommissionReport {
  vendor: {
    id: number
    vendor_name: string
    company_name: string | null
    tax_rate: number
  }
  period_start: string
  period_end: string
  versions: Record<string, VersionData>
  grand_subtotal: number
  tax_rate: number
  tax_amount: number
  grand_total: number
}

interface Assignment {
  id: number
  vendor_id: number
  restaurant_id: number
  commission_rate: number
  version: string
  is_active: boolean
  restaurant_name: string
}

interface Restaurant {
  id: number
  name: string
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function formatCurrency(amount: number) {
  const sign = amount < 0 ? '-' : ''
  return `${sign}$${Math.abs(amount).toFixed(2)}`
}

function ManageAssignmentsDialog({ vendorId, vendorName }: { vendorId: number | null; vendorName: string }) {
  const { toast } = useToast()
  const [newRestaurantId, setNewRestaurantId] = useState("")
  const [newCommissionRate, setNewCommissionRate] = useState("")
  const [newVersion, setNewVersion] = useState("v1")

  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<Assignment[]>({
    queryKey: ['/api/reports/vendor-assignments', vendorId],
    queryFn: () => fetch(`/api/reports/vendor-assignments?vendorId=${vendorId}`).then(r => r.json()),
    enabled: !!vendorId,
  })

  const { data: restaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ['/api/restaurants'],
    queryFn: () => fetch('/api/restaurants').then(r => {
      if (!r.ok) return []
      return r.json().then(d => Array.isArray(d) ? d : d.restaurants || d.data || [])
    }),
  })

  const createMutation = useMutation({
    mutationFn: () => apiRequest('/api/reports/vendor-assignments', {
      method: 'POST',
      body: JSON.stringify({
        vendor_id: vendorId,
        restaurant_id: parseInt(newRestaurantId),
        commission_rate: parseFloat(newCommissionRate),
        version: newVersion,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports/vendor-assignments', vendorId] })
      setNewRestaurantId("")
      setNewCommissionRate("")
      setNewVersion("v1")
      toast({ title: "Assignment created", description: "Restaurant assignment has been added." })
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/reports/vendor-assignments?id=${id}`, {
      method: 'DELETE',
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports/vendor-assignments', vendorId] })
      toast({ title: "Assignment deleted", description: "Restaurant assignment has been removed." })
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const canAdd = newRestaurantId && newCommissionRate && parseFloat(newCommissionRate) > 0

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={!vendorId} data-testid="button-manage-assignments">
          <Settings className="h-4 w-4 mr-2" />
          Manage Assignments
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Assignments - {vendorName}</DialogTitle>
          <DialogDescription>Add or remove restaurant assignments for this vendor.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium mb-3">Current Assignments</h4>
            {assignmentsLoading ? (
              <div className="flex justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No assignments yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.id} data-testid={`row-assignment-${a.id}`}>
                      <TableCell className="font-medium" data-testid={`text-assignment-restaurant-${a.id}`}>
                        {a.restaurant_name}
                      </TableCell>
                      <TableCell data-testid={`text-assignment-rate-${a.id}`}>
                        {parseFloat(String(a.commission_rate))}%
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" data-testid={`badge-assignment-version-${a.id}`}>
                          {a.version}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => deleteMutation.mutate(a.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-assignment-${a.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Add Assignment</h4>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div className="space-y-2 sm:col-span-1">
                <Label>Restaurant</Label>
                <Select value={newRestaurantId} onValueChange={setNewRestaurantId}>
                  <SelectTrigger data-testid="select-new-restaurant">
                    <SelectValue placeholder="Select..." />
                  </SelectTrigger>
                  <SelectContent>
                    {restaurants.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)} data-testid={`option-restaurant-${r.id}`}>
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={newCommissionRate}
                  onChange={(e) => setNewCommissionRate(e.target.value)}
                  placeholder="e.g. 10"
                  data-testid="input-commission-rate"
                />
              </div>
              <div className="space-y-2">
                <Label>Version</Label>
                <Select value={newVersion} onValueChange={setNewVersion}>
                  <SelectTrigger data-testid="select-version">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="v1">v1</SelectItem>
                    <SelectItem value="v2">v2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!canAdd || createMutation.isPending}
                data-testid="button-add-assignment"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function VendorCommissionsPage() {
  const prevMonth = subMonths(new Date(), 1)
  const [selectedVendorId, setSelectedVendorId] = useState<string>("")
  const [selectedYear, setSelectedYear] = useState<string>(String(prevMonth.getFullYear()))
  const [selectedMonth, setSelectedMonth] = useState<string>(String(prevMonth.getMonth()))
  const [reportGenerated, setReportGenerated] = useState(false)

  const { toast } = useToast()

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery<VendorConfig[]>({
    queryKey: ['/api/reports/vendor-configs'],
  })

  const year = parseInt(selectedYear)
  const month = parseInt(selectedMonth)
  const periodStart = format(new Date(year, month, 1), 'yyyy-MM-dd')
  const periodEnd = format(endOfMonth(new Date(year, month, 1)), 'yyyy-MM-dd')

  const { data: report, isLoading: reportLoading, refetch } = useQuery<CommissionReport>({
    queryKey: ['/api/reports/vendor-commissions', selectedVendorId, periodStart, periodEnd],
    queryFn: () => fetch(`/api/reports/vendor-commissions?vendorId=${selectedVendorId}&startDate=${periodStart}&endDate=${periodEnd}`).then(r => {
      if (!r.ok) throw new Error('Failed to fetch report')
      return r.json()
    }),
    enabled: false,
  })

  const handleGenerate = () => {
    if (!selectedVendorId) {
      toast({ title: "Select a vendor", description: "Please select a vendor to generate the report.", variant: "destructive" })
      return
    }
    setReportGenerated(true)
    refetch()
  }

  const selectedVendor = vendors.find(v => String(v.id) === selectedVendorId)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i))

  const downloadCSV = () => {
    if (!report) return

    const rows: string[] = []
    rows.push('Version,Restaurant,Total Sales,Commission Rate (%),Commission')

    for (const [version, data] of Object.entries(report.versions)) {
      for (const r of data.restaurants) {
        rows.push([
          version.toUpperCase(),
          `"${r.restaurant_name.replace(/"/g, '""')}"`,
          r.total.toFixed(2),
          r.commission_rate.toFixed(2),
          r.commission.toFixed(2),
        ].join(','))
      }
      rows.push(`${version.toUpperCase()} Subtotal,,,,${data.subtotal.toFixed(2)}`)
    }

    rows.push('')
    rows.push(`Grand Subtotal,,,,${report.grand_subtotal.toFixed(2)}`)
    rows.push(`HST (${report.tax_rate}%),,,,${report.tax_amount.toFixed(2)}`)
    rows.push(`Grand Total,,,,${report.grand_total.toFixed(2)}`)

    const csvContent = rows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `vendor-commission-${report.vendor.vendor_name}-${periodStart}-to-${periodEnd}.csv`
    link.click()
  }

  const versionEntries = report ? Object.entries(report.versions) : []

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
              <FileText className="h-6 w-6" />
              Vendor Commission Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Monthly commission reports for vendor partners
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <ManageAssignmentsDialog
              vendorId={selectedVendorId ? parseInt(selectedVendorId) : null}
              vendorName={selectedVendor?.vendor_name || ""}
            />
            <Button
              onClick={downloadCSV}
              disabled={!report || versionEntries.length === 0}
              variant="outline"
              data-testid="button-download-csv"
            >
              <Download className="h-4 w-4 mr-2" />
              Download CSV
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Report Parameters</CardTitle>
            <CardDescription>Select a vendor and month to generate the commission report</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label>Vendor</Label>
                <Select value={selectedVendorId} onValueChange={(v) => { setSelectedVendorId(v); setReportGenerated(false) }}>
                  <SelectTrigger data-testid="select-vendor">
                    <SelectValue placeholder={vendorsLoading ? "Loading..." : "Select vendor..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)} data-testid={`option-vendor-${v.id}`}>
                        {v.vendor_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={selectedYear} onValueChange={(v) => { setSelectedYear(v); setReportGenerated(false) }}>
                  <SelectTrigger className="w-[120px]" data-testid="select-year">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Month</Label>
                <Select value={selectedMonth} onValueChange={(v) => { setSelectedMonth(v); setReportGenerated(false) }}>
                  <SelectTrigger className="w-[160px]" data-testid="select-month">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleGenerate}
                disabled={!selectedVendorId || reportLoading}
                data-testid="button-generate-report"
              >
                {reportLoading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {reportLoading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {report && reportGenerated && !reportLoading && (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium" data-testid="text-vendor-company">
                      {report.vendor.company_name || report.vendor.vendor_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Tax Rate (HST)</p>
                    <p className="font-medium" data-testid="text-vendor-tax-rate">{report.tax_rate}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Period</p>
                    <p className="font-medium" data-testid="text-report-period">
                      {format(new Date(year, month, 1), 'MMMM yyyy')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {versionEntries.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">No assignments found for this vendor. Use "Manage Assignments" to add restaurants.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {versionEntries.map(([version, data]) => (
                  <Card key={version}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Badge variant="secondary">{version.toUpperCase()}</Badge>
                        Commission Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Restaurant</TableHead>
                            <TableHead className="text-right">Total Sales</TableHead>
                            <TableHead className="text-right">Commission Rate</TableHead>
                            <TableHead className="text-right">Commission</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.restaurants.map((r) => (
                            <TableRow key={r.restaurant_id} data-testid={`row-commission-${version}-${r.restaurant_id}`}>
                              <TableCell className="font-medium" data-testid={`text-restaurant-name-${r.restaurant_id}`}>
                                {r.restaurant_name}
                              </TableCell>
                              <TableCell className="text-right" data-testid={`text-total-sales-${r.restaurant_id}`}>
                                {formatCurrency(r.total)}
                              </TableCell>
                              <TableCell className="text-right" data-testid={`text-commission-rate-${r.restaurant_id}`}>
                                {r.commission_rate}%
                              </TableCell>
                              <TableCell className="text-right" data-testid={`text-commission-amount-${r.restaurant_id}`}>
                                {formatCurrency(r.commission)}
                              </TableCell>
                            </TableRow>
                          ))}
                          <TableRow className="font-medium border-t-2">
                            <TableCell colSpan={3} className="text-right">
                              {version.toUpperCase()} Subtotal
                            </TableCell>
                            <TableCell className="text-right" data-testid={`text-subtotal-${version}`}>
                              {formatCurrency(data.subtotal)}
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}

                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Grand Subtotal</span>
                        <span className="font-medium" data-testid="text-grand-subtotal">
                          {formatCurrency(report.grand_subtotal)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">HST ({report.tax_rate}%)</span>
                        <span className="font-medium" data-testid="text-tax-amount">
                          {formatCurrency(report.tax_amount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-lg font-bold">Grand Total</span>
                        <span className="text-lg font-bold" data-testid="text-grand-total">
                          {formatCurrency(report.grand_total)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
