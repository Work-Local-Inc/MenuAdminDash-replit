"use client"

import { useState, useMemo } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { format, startOfWeek, subWeeks, addDays } from "date-fns"
import { CalendarIcon, Plus, Trash2, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Switch } from "@/components/ui/switch"
import { apiRequest, queryClient } from "@/lib/queryClient"
import { useToast } from "@/hooks/use-toast"

interface Restaurant {
  id: number
  name: string
}

interface Adjustment {
  id: number
  restaurant_id: number
  adjustment_type: "credit" | "charge"
  category: string
  description: string | null
  amount: number
  tax_exempt: boolean
  applies_to_week_start: string
  applies_to_week_end: string | null
  recurring: boolean
  created_at: string
  created_by: number | null
}

type DatePreset = "last_week" | "this_week" | "custom"

const CATEGORY_LABELS: Record<string, string> = {
  refund: "Refund",
  domain_renewal: "Domain Renewal",
  fixed_weekly_deduction: "Fixed Weekly Deduction",
  mazen_donation: "Mazen Donation",
  advance_deduction: "Advance Deduction",
  other: "Other",
}

const CATEGORIES = [
  { value: "refund", label: "Refund" },
  { value: "domain_renewal", label: "Domain Renewal" },
  { value: "fixed_weekly_deduction", label: "Fixed Weekly Deduction (Darrell Corp)" },
  { value: "mazen_donation", label: "Mazen Donation" },
  { value: "advance_deduction", label: "Advance Deduction" },
  { value: "other", label: "Other" },
]

function formatCurrency(amount: number) {
  return `$${Math.abs(amount).toFixed(2)}`
}

function getDefaultTaxExempt(category: string): boolean {
  if (category === "refund") return true
  if (category === "domain_renewal") return false
  return true
}

function getPresetDates(preset: DatePreset): { start: Date; end: Date } {
  const thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 })
  switch (preset) {
    case "last_week": {
      const prevMonday = subWeeks(thisMonday, 1)
      return { start: prevMonday, end: addDays(prevMonday, 6) }
    }
    case "this_week": {
      return { start: thisMonday, end: addDays(thisMonday, 6) }
    }
    default:
      return { start: subWeeks(thisMonday, 1), end: addDays(subWeeks(thisMonday, 1), 6) }
  }
}

export default function AdjustmentsPage() {
  const { toast } = useToast()
  const defaultDates = getPresetDates("last_week")

  const [datePreset, setDatePreset] = useState<DatePreset>("last_week")
  const [startDate, setStartDate] = useState<Date>(defaultDates.start)
  const [endDate, setEndDate] = useState<Date>(defaultDates.end)
  const [filterRestaurantId, setFilterRestaurantId] = useState<string>("all")

  const [formRestaurantId, setFormRestaurantId] = useState<string>("")
  const [adjustmentType, setAdjustmentType] = useState<"credit" | "charge">("credit")
  const [category, setCategory] = useState<string>("")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [taxExempt, setTaxExempt] = useState(true)
  const [weekStart, setWeekStart] = useState<Date | undefined>(undefined)
  const [weekEnd, setWeekEnd] = useState<Date | undefined>(undefined)
  const [recurring, setRecurring] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset)
    if (preset !== "custom") {
      const dates = getPresetDates(preset)
      setStartDate(dates.start)
      setEndDate(dates.end)
    }
  }

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)
    setTaxExempt(getDefaultTaxExempt(newCategory))
  }

  const { data: restaurants = [] } = useQuery<Restaurant[]>({
    queryKey: ["/api/restaurants"],
    select: (data: any) => data.restaurants || data,
  })

  const adjustmentsQueryKey = `/api/reports/adjustments?startDate=${format(startDate, "yyyy-MM-dd")}&endDate=${format(endDate, "yyyy-MM-dd")}${filterRestaurantId !== "all" ? `&restaurantId=${filterRestaurantId}` : ""}`

  const { data: adjustments = [], isLoading } = useQuery<Adjustment[]>({
    queryKey: [adjustmentsQueryKey],
  })

  const restaurantMap = useMemo(() => {
    const map: Record<number, string> = {}
    restaurants.forEach((r) => {
      map[r.id] = r.name
    })
    return map
  }, [restaurants])

  const summary = useMemo(() => {
    let totalCredits = 0
    let totalCharges = 0
    adjustments.forEach((adj) => {
      if (adj.adjustment_type === "credit") {
        totalCredits += adj.amount
      } else {
        totalCharges += adj.amount
      }
    })
    return {
      totalCredits: Math.round(totalCredits * 100) / 100,
      totalCharges: Math.round(totalCharges * 100) / 100,
      net: Math.round((totalCredits - totalCharges) * 100) / 100,
    }
  }, [adjustments])

  const createMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/reports/adjustments", {
        method: "POST",
        body: JSON.stringify({
          restaurant_id: parseInt(formRestaurantId),
          adjustment_type: adjustmentType,
          category,
          description: description || null,
          amount: parseFloat(amount),
          tax_exempt: taxExempt,
          applies_to_week_start: weekStart ? format(weekStart, "yyyy-MM-dd") : null,
          applies_to_week_end: weekEnd ? format(weekEnd, "yyyy-MM-dd") : null,
          recurring,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [adjustmentsQueryKey] })
      resetForm()
      toast({ title: "Adjustment created", description: "The adjustment has been added successfully." })
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest(`/api/reports/adjustments?id=${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [adjustmentsQueryKey] })
      toast({ title: "Adjustment deleted", description: "The adjustment has been removed." })
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const resetForm = () => {
    setFormRestaurantId("")
    setAdjustmentType("credit")
    setCategory("")
    setDescription("")
    setAmount("")
    setTaxExempt(true)
    setWeekStart(undefined)
    setWeekEnd(undefined)
    setRecurring(false)
  }

  const canSubmit =
    formRestaurantId &&
    category &&
    amount &&
    parseFloat(amount) > 0 &&
    weekStart &&
    !createMutation.isPending

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Statement Adjustments</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Manage credits and charges for restaurant statements
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter adjustments by restaurant and date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Restaurant</Label>
              <Select value={filterRestaurantId} onValueChange={setFilterRestaurantId}>
                <SelectTrigger data-testid="select-filter-restaurant">
                  <SelectValue placeholder="All Restaurants" />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  <SelectItem value="all">All Restaurants</SelectItem>
                  {restaurants.map((r) => (
                    <SelectItem key={r.id} value={r.id.toString()}>
                      {r.name} (#{r.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={datePreset} onValueChange={(v) => handlePresetChange(v as DatePreset)}>
                <SelectTrigger data-testid="select-date-preset">
                  <SelectValue placeholder="Select date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_week">Last Week</SelectItem>
                  <SelectItem value="this_week">This Week</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {datePreset === "custom" ? (
              <div className="flex flex-row items-end gap-2 flex-wrap">
                <div className="space-y-2">
                  <Label>Start</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-filter-start-date">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(startDate, "MMM d, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={(d) => d && setStartDate(d)} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label>End</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-filter-end-date">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {format(endDate, "MMM d, yyyy")}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={(d) => d && setEndDate(d)} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ) : (
              <div className="flex items-end">
                <p className="text-sm text-muted-foreground pb-2" data-testid="text-date-range-preview">
                  {format(startDate, "MMM d, yyyy")} — {format(endDate, "MMM d, yyyy")}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <div>
            <CardTitle>Add Adjustment</CardTitle>
            <CardDescription>Create a new credit or charge</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
            data-testid="button-toggle-form"
          >
            <Plus className="h-4 w-4 mr-2" />
            {showForm ? "Hide Form" : "New Adjustment"}
          </Button>
        </CardHeader>
        {showForm && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Restaurant *</Label>
                <Select value={formRestaurantId} onValueChange={setFormRestaurantId}>
                  <SelectTrigger data-testid="select-form-restaurant">
                    <SelectValue placeholder="Select restaurant" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {restaurants.map((r) => (
                      <SelectItem key={r.id} value={r.id.toString()}>
                        {r.name} (#{r.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Type *</Label>
                <div className="flex gap-1">
                  <Button
                    variant={adjustmentType === "credit" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setAdjustmentType("credit")}
                    data-testid="button-type-credit"
                  >
                    Credit
                  </Button>
                  <Button
                    variant={adjustmentType === "charge" ? "default" : "outline"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setAdjustmentType("charge")}
                    data-testid="button-type-charge"
                  >
                    Charge
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={category} onValueChange={handleCategoryChange}>
                  <SelectTrigger data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  data-testid="input-description"
                />
              </div>

              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-amount"
                />
              </div>

              <div className="space-y-2">
                <Label>Week Start *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-week-start">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {weekStart ? format(weekStart, "MMM d, yyyy") : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={weekStart} onSelect={setWeekStart} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Week End</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal" data-testid="button-week-end">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {weekEnd ? format(weekEnd, "MMM d, yyyy") : "Optional"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={weekEnd} onSelect={setWeekEnd} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-center gap-4 pt-6">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={taxExempt}
                    onCheckedChange={setTaxExempt}
                    data-testid="switch-tax-exempt"
                  />
                  <Label className="cursor-pointer">Tax Exempt</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={recurring}
                    onCheckedChange={setRecurring}
                    data-testid="switch-recurring"
                  />
                  <Label className="cursor-pointer">Recurring</Label>
                </div>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!canSubmit}
                  className="w-full"
                  data-testid="button-add-adjustment"
                >
                  {createMutation.isPending ? "Adding..." : "Add Adjustment"}
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adjustments</CardTitle>
          <CardDescription>
            {format(startDate, "MMM d, yyyy")} — {format(endDate, "MMM d, yyyy")}
            {filterRestaurantId !== "all" && restaurantMap[parseInt(filterRestaurantId)]
              ? ` for ${restaurantMap[parseInt(filterRestaurantId)]}`
              : " for all restaurants"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : adjustments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4" />
              <p data-testid="text-empty-state">No adjustments found for this period</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Restaurant</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Tax Exempt</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adjustments.map((adj) => (
                    <TableRow key={adj.id} data-testid={`row-adjustment-${adj.id}`}>
                      <TableCell className="whitespace-nowrap" data-testid={`text-date-${adj.id}`}>
                        {format(new Date(adj.applies_to_week_start), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell data-testid={`text-restaurant-${adj.id}`}>
                        {restaurantMap[adj.restaurant_id] || `#${adj.restaurant_id}`}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={adj.adjustment_type === "credit" ? "default" : "destructive"}
                          data-testid={`badge-type-${adj.id}`}
                          className={adj.adjustment_type === "credit" ? "bg-green-600 no-default-hover-elevate" : ""}
                        >
                          {adj.adjustment_type === "credit" ? "Credit" : "Charge"}
                        </Badge>
                      </TableCell>
                      <TableCell data-testid={`text-category-${adj.id}`}>
                        {CATEGORY_LABELS[adj.category] || adj.category}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate" data-testid={`text-description-${adj.id}`}>
                        {adj.description || "—"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${adj.adjustment_type === "credit" ? "text-green-600" : "text-red-600"}`}
                        data-testid={`text-amount-${adj.id}`}
                      >
                        {adj.adjustment_type === "credit" ? "+" : "-"}{formatCurrency(adj.amount)}
                      </TableCell>
                      <TableCell data-testid={`text-tax-exempt-${adj.id}`}>
                        {adj.tax_exempt ? "Yes" : "No"}
                      </TableCell>
                      <TableCell>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="icon"
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${adj.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Adjustment</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this {adj.adjustment_type} of {formatCurrency(adj.amount)}? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel data-testid={`button-cancel-delete-${adj.id}`}>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteMutation.mutate(adj.id)}
                                data-testid={`button-confirm-delete-${adj.id}`}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="flex flex-row items-center justify-between gap-4 flex-wrap mt-4 pt-4 border-t">
                <div className="flex flex-row items-center gap-4 flex-wrap">
                  <div className="text-sm" data-testid="text-total-credits">
                    <span className="text-muted-foreground">Total Credits: </span>
                    <span className="font-medium text-green-600">+{formatCurrency(summary.totalCredits)}</span>
                  </div>
                  <div className="text-sm" data-testid="text-total-charges">
                    <span className="text-muted-foreground">Total Charges: </span>
                    <span className="font-medium text-red-600">-{formatCurrency(summary.totalCharges)}</span>
                  </div>
                </div>
                <div className="text-sm font-medium" data-testid="text-net-total">
                  <span className="text-muted-foreground">Net: </span>
                  <span className={summary.net >= 0 ? "text-green-600" : "text-red-600"}>
                    {summary.net >= 0 ? "+" : "-"}{formatCurrency(summary.net)}
                  </span>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
