"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  useDevices,
  useToggleDevice,
  useDeleteDevice,
  useRegenerateDeviceKey,
  useDeviceRecoveryCommands,
  useIssueRecoveryCommand,
} from "@/lib/hooks/use-devices"
import { formatDate, formatTime } from "@/lib/utils"
import {
  Tablet,
  Wifi,
  WifiOff,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Battery,
  Printer,
  Settings,
  MoreHorizontal,
  Key,
  Trash2,
  Copy,
  Check,
  QrCode,
  Plus,
  Search,
  RefreshCw,
  RotateCcw,
  ChevronDown,
  History,
  Zap,
  Clock,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"

function getRelativeTime(isoString: string | null): string {
  if (!isoString) return "Never"
  const now = Date.now()
  const then = new Date(isoString).getTime()
  const diffMs = now - then
  if (diffMs < 0) return "Just now"
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return "Just now"
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr} hr ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays} days ago`
}

function getHealthBadge(status: string) {
  switch (status) {
    case "healthy":
      return <Badge data-testid="badge-health-healthy" className="bg-green-600 text-white border-transparent"><CheckCircle2 className="h-3 w-3 mr-1" />Healthy</Badge>
    case "warning":
      return <Badge data-testid="badge-health-warning" className="bg-amber-500 text-white border-transparent"><AlertTriangle className="h-3 w-3 mr-1" />Warning</Badge>
    case "critical":
      return <Badge data-testid="badge-health-critical" className="bg-red-600 text-white border-transparent"><AlertCircle className="h-3 w-3 mr-1" />Critical</Badge>
    case "offline":
      return <Badge data-testid="badge-health-offline" variant="secondary"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>
    default:
      return <Badge data-testid="badge-health-unknown" variant="outline">Unknown</Badge>
  }
}

function getCommandStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-amber-500 text-white border-transparent">Pending</Badge>
    case "executed":
      return <Badge className="bg-green-600 text-white border-transparent">Executed</Badge>
    case "expired":
      return <Badge variant="secondary">Expired</Badge>
    case "failed":
      return <Badge className="bg-red-600 text-white border-transparent">Failed</Badge>
    default:
      return <Badge variant="outline">{status}</Badge>
  }
}

function RecoveryHistorySection({ deviceId }: { deviceId: number }) {
  const [isOpen, setIsOpen] = useState(false)
  const { data: commands = [], isLoading } = useDeviceRecoveryCommands(deviceId)

  if (!isOpen && commands.length === 0) return null

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between gap-2"
          data-testid={`button-history-toggle-${deviceId}`}
        >
          <span className="flex items-center gap-1">
            <History className="h-3 w-3" />
            Recovery History ({commands.length})
          </span>
          <ChevronDown className={`h-3 w-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-2">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : commands.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-2">No recovery commands issued</p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">Reason</TableHead>
                  <TableHead className="text-xs">Issued By</TableHead>
                  <TableHead className="text-xs">Issued At</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Executed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {commands.map((cmd: any) => (
                  <TableRow key={cmd.id} data-testid={`row-command-${cmd.id}`}>
                    <TableCell className="text-xs font-medium">
                      {cmd.action === "resync" ? "Resync" : "Reload App"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[120px] truncate">
                      {cmd.reason || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{cmd.issued_by || "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{getRelativeTime(cmd.issued_at)}</TableCell>
                    <TableCell>{getCommandStatusBadge(cmd.execution_status)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {cmd.executed_at ? getRelativeTime(cmd.executed_at) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

export default function DevicesPage() {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [healthFilter, setHealthFilter] = useState<string>("all")
  const [deleteDevice, setDeleteDevice] = useState<any>(null)
  const [regeneratedCredentials, setRegeneratedCredentials] = useState<any>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [recoveryDialog, setRecoveryDialog] = useState<{
    device: any
    action: "resync" | "reload_app"
  } | null>(null)
  const [recoveryReason, setRecoveryReason] = useState("")
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [secondsAgo, setSecondsAgo] = useState(0)

  const { data: devices = [], isLoading, dataUpdatedAt } = useDevices(
    statusFilter !== "all" ? { is_active: statusFilter === "active" } : undefined
  )
  const toggleDevice = useToggleDevice()
  const deleteDeviceMutation = useDeleteDevice()
  const regenerateKey = useRegenerateDeviceKey()
  const issueRecoveryCommand = useIssueRecoveryCommand()

  useEffect(() => {
    if (dataUpdatedAt) {
      setLastUpdated(new Date(dataUpdatedAt))
    }
  }, [dataUpdatedAt])

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000))
    }, 1000)
    return () => clearInterval(interval)
  }, [lastUpdated])

  const filteredDevices = devices.filter((device: any) => {
    const searchLower = search.toLowerCase()
    const matchesSearch =
      device.device_name?.toLowerCase().includes(searchLower) ||
      device.restaurant_name?.toLowerCase().includes(searchLower) ||
      device.uuid?.toLowerCase().includes(searchLower)

    let matchesHealth = true
    if (healthFilter === "healthy") matchesHealth = device.health_status === "healthy"
    else if (healthFilter === "warning") matchesHealth = device.health_status === "warning"
    else if (healthFilter === "critical") matchesHealth = device.health_status === "critical"
    else if (healthFilter === "offline") matchesHealth = device.health_status === "offline"

    return matchesSearch && matchesHealth
  })

  const handleToggleActive = async (device: any) => {
    try {
      await toggleDevice.mutateAsync({
        id: device.id,
        is_active: !device.is_active,
      })
      toast.success(
        device.is_active
          ? `Device "${device.device_name}" deactivated`
          : `Device "${device.device_name}" activated`
      )
    } catch (error: any) {
      toast.error(error.message || "Failed to update device")
    }
  }

  const handleDeleteDevice = async () => {
    if (!deleteDevice) return
    try {
      await deleteDeviceMutation.mutateAsync(deleteDevice.id)
      toast.success(`Device "${deleteDevice.device_name}" deleted`)
      setDeleteDevice(null)
    } catch (error: any) {
      toast.error(error.message || "Failed to delete device")
    }
  }

  const handleRegenerateKey = async (device: any) => {
    try {
      const result = await regenerateKey.mutateAsync(device.id)
      setRegeneratedCredentials({
        ...result,
        device_name: device.device_name,
      })
      toast.success("Device key regenerated successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to regenerate key")
    }
  }

  const handleRecoveryConfirm = async () => {
    if (!recoveryDialog) return
    try {
      await issueRecoveryCommand.mutateAsync({
        deviceId: recoveryDialog.device.id,
        action: recoveryDialog.action,
        reason: recoveryReason || undefined,
      })
      toast.success(
        recoveryDialog.action === "resync"
          ? `Resync command sent to "${recoveryDialog.device.device_name}"`
          : `Reload command sent to "${recoveryDialog.device.device_name}"`
      )
      setRecoveryDialog(null)
      setRecoveryReason("")
    } catch (error: any) {
      toast.error(error.message || "Failed to issue recovery command")
    }
  }

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const totalDevices = devices.length
  const onlineDevices = devices.filter((d: any) => d.is_online).length
  const warningDevices = devices.filter((d: any) => d.health_status === "warning").length
  const criticalDevices = devices.filter((d: any) => d.health_status === "critical").length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Device Health Monitor</h1>
          <p className="text-muted-foreground">Real-time tablet health monitoring and recovery controls</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-muted-foreground flex items-center gap-1" data-testid="text-last-updated">
            <Clock className="h-3 w-3" />
            Updated {secondsAgo}s ago
          </span>
          <Link href="/admin/devices/register">
            <Button data-testid="button-register-device">
              <Plus className="h-4 w-4 mr-2" />
              Register Device
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Devices</CardTitle>
            <Tablet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-devices">{totalDevices}</div>
            <p className="text-xs text-muted-foreground">Registered devices</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Online Now</CardTitle>
            <Wifi className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="text-online-devices">{onlineDevices}</div>
            <p className="text-xs text-muted-foreground">Connected in last 2 min</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500" data-testid="text-warning-devices">{warningDevices}</div>
            <p className="text-xs text-muted-foreground">Devices with warnings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500" data-testid="text-critical-devices">{criticalDevices}</div>
            <p className="text-xs text-muted-foreground">Immediate action needed</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by device name, restaurant, or UUID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-status-filter">
            <SelectValue placeholder="All Devices" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Devices</SelectItem>
            <SelectItem value="active">Active Only</SelectItem>
            <SelectItem value="inactive">Inactive Only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={healthFilter} onValueChange={setHealthFilter}>
          <SelectTrigger className="w-full sm:w-[180px]" data-testid="select-health-filter">
            <SelectValue placeholder="All Health" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Health</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="warning">Needs Attention</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="offline">Offline</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array(6)
            .fill(0)
            .map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-8 w-full" />
                </CardFooter>
              </Card>
            ))}
        </div>
      ) : filteredDevices.length === 0 ? (
        <div className="text-center py-12">
          <Tablet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground mb-4">No devices found</p>
          <Link href="/admin/devices/register">
            <Button data-testid="button-register-first">
              <Plus className="h-4 w-4 mr-2" />
              Register Your First Device
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDevices.map((device: any) => (
            <Card key={device.id} data-testid={`card-device-${device.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate" data-testid={`text-device-name-${device.id}`}>
                      {device.device_name}
                    </CardTitle>
                    <CardDescription className="truncate">
                      {device.restaurant_name || "Unassigned"}
                    </CardDescription>
                  </div>
                  {getHealthBadge(device.health_status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Wifi className="h-3 w-3 shrink-0" />
                    <span className="truncate">Heartbeat</span>
                  </div>
                  <span className="text-right truncate" data-testid={`text-heartbeat-${device.id}`}>
                    {getRelativeTime(device.last_check_at)}
                  </span>

                  <div className="flex items-center gap-1 text-muted-foreground">
                    <RefreshCw className="h-3 w-3 shrink-0" />
                    <span className="truncate">Last Fetch</span>
                  </div>
                  <span className="text-right truncate" data-testid={`text-last-fetch-${device.id}`}>
                    {getRelativeTime(device.last_successful_fetch)}
                  </span>

                  <div className="flex items-center gap-1 text-muted-foreground">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span className="truncate">Fetch Failures</span>
                  </div>
                  <span
                    className={`text-right ${device.consecutive_fetch_failures >= 3 ? "text-red-500 font-medium" : ""}`}
                    data-testid={`text-failures-${device.id}`}
                  >
                    {device.consecutive_fetch_failures}
                  </span>

                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3 shrink-0" />
                    <span className="truncate">Oldest Order</span>
                  </div>
                  <span
                    className={`text-right ${device.oldest_pending_order_minutes >= 5 ? "text-red-500 font-medium" : ""}`}
                    data-testid={`text-oldest-order-${device.id}`}
                  >
                    {device.oldest_pending_order_minutes} min
                  </span>

                  {device.battery_level !== null && device.battery_level !== undefined && (
                    <>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Battery className="h-3 w-3 shrink-0" />
                        <span className="truncate">Battery</span>
                      </div>
                      <span className="text-right" data-testid={`text-battery-${device.id}`}>
                        {device.battery_level}%
                      </span>
                    </>
                  )}

                  {device.printer_status && (
                    <>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Printer className="h-3 w-3 shrink-0" />
                        <span className="truncate">Printer</span>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant={device.printer_status === "connected" ? "secondary" : "outline"}
                          className="text-[10px]"
                          data-testid={`badge-printer-${device.id}`}
                        >
                          {device.printer_status}
                        </Badge>
                      </div>
                    </>
                  )}

                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Zap className="h-3 w-3 shrink-0" />
                    <span className="truncate">App Version</span>
                  </div>
                  <span className="text-right text-xs text-muted-foreground truncate" data-testid={`text-version-${device.id}`}>
                    {device.app_version || "—"}
                  </span>
                </div>

                <RecoveryHistorySection deviceId={device.id} />
              </CardContent>
              <CardFooter className="flex-wrap gap-2 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRecoveryDialog({ device, action: "resync" })}
                  disabled={issueRecoveryCommand.isPending}
                  data-testid={`button-resync-${device.id}`}
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Send Resync
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30"
                  onClick={() => setRecoveryDialog({ device, action: "reload_app" })}
                  disabled={issueRecoveryCommand.isPending}
                  data-testid={`button-reload-${device.id}`}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Force Reload
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid={`button-settings-${device.id}`}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleToggleActive(device)}
                      disabled={toggleDevice.isPending}
                      data-testid={`menuitem-toggle-${device.id}`}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      {device.is_active ? "Deactivate" : "Activate"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleRegenerateKey(device)}
                      disabled={regenerateKey.isPending}
                      data-testid={`menuitem-qr-${device.id}`}
                    >
                      <QrCode className="h-4 w-4 mr-2" />
                      Get QR Code
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleRegenerateKey(device)}
                      disabled={regenerateKey.isPending}
                      data-testid={`menuitem-regen-${device.id}`}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Regenerate Key
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setDeleteDevice(device)}
                      className="text-destructive focus:text-destructive"
                      data-testid={`menuitem-delete-${device.id}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Device
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteDevice} onOpenChange={() => setDeleteDevice(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{deleteDevice?.device_name}&quot;? This action cannot be undone.
              The device will need to be re-registered to connect again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDevice}
              className="bg-destructive text-destructive-foreground"
              data-testid="button-confirm-delete"
            >
              Delete Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!recoveryDialog}
        onOpenChange={(open) => {
          if (!open) {
            setRecoveryDialog(null)
            setRecoveryReason("")
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {recoveryDialog?.action === "resync" ? "Send Resync Command" : "Force Reload App"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {recoveryDialog?.action === "resync"
                ? `This will force the tablet "${recoveryDialog?.device?.device_name}" to re-authenticate and fetch new orders. Continue?`
                : `This will force the tablet app "${recoveryDialog?.device?.device_name}" to fully restart. Only use this as a last resort. Continue?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-6 pb-2">
            <label className="text-sm font-medium text-muted-foreground">Reason (optional)</label>
            <Textarea
              value={recoveryReason}
              onChange={(e) => setRecoveryReason(e.target.value)}
              placeholder="Enter a reason for this recovery action..."
              className="mt-1.5 resize-none"
              rows={2}
              data-testid="textarea-recovery-reason"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-recovery">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRecoveryConfirm}
              disabled={issueRecoveryCommand.isPending}
              className={recoveryDialog?.action === "reload_app" ? "bg-destructive text-destructive-foreground" : ""}
              data-testid="button-confirm-recovery"
            >
              {issueRecoveryCommand.isPending
                ? "Sending..."
                : recoveryDialog?.action === "resync"
                  ? "Send Resync"
                  : "Force Reload"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!regeneratedCredentials} onOpenChange={() => setRegeneratedCredentials(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New Device Credentials</DialogTitle>
            <DialogDescription>
              Save these credentials securely. The device key cannot be retrieved again after you close this dialog.
            </DialogDescription>
          </DialogHeader>
          {regeneratedCredentials && (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium">
                  Important: Save these credentials now!
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                  The device key is shown only once and cannot be recovered.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Device Name</label>
                  <p className="font-mono text-sm mt-1" data-testid="text-cred-device-name">
                    {regeneratedCredentials.device_name}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Device UUID</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all" data-testid="text-cred-uuid">
                      {regeneratedCredentials.device_uuid}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(regeneratedCredentials.device_uuid, "uuid")}
                      data-testid="button-copy-uuid"
                    >
                      {copiedField === "uuid" ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">Device Key</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="flex-1 p-2 bg-muted rounded text-xs font-mono break-all" data-testid="text-cred-key">
                      {regeneratedCredentials.device_key}
                    </code>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(regeneratedCredentials.device_key, "key")}
                      data-testid="button-copy-key"
                    >
                      {copiedField === "key" ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <label className="text-sm font-medium flex items-center gap-2 mb-3">
                  <QrCode className="h-4 w-4" />
                  Scan QR Code on Tablet
                </label>
                <div className="flex flex-col items-center justify-center p-4 bg-white rounded-lg border-2 border-dashed">
                  <QRCodeSVG
                    value={regeneratedCredentials.qr_code_data}
                    size={180}
                    level="M"
                    includeMargin={true}
                  />
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Scan with any QR reader app on your tablet
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setRegeneratedCredentials(null)} data-testid="button-close-credentials">
              I&apos;ve Saved the Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
