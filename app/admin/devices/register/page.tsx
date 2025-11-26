"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useRestaurants } from "@/lib/hooks/use-restaurants"
import { useRegisterDevice } from "@/lib/hooks/use-devices"
import { ArrowLeft, Tablet, Copy, Check, AlertTriangle, QrCode } from "lucide-react"
import { toast } from "sonner"

export default function RegisterDevicePage() {
  const router = useRouter()
  const [deviceName, setDeviceName] = useState("")
  const [restaurantId, setRestaurantId] = useState<string>("")
  const [hasPrintingSupport, setHasPrintingSupport] = useState(true)
  const [copied, setCopied] = useState(false)
  const [registrationResult, setRegistrationResult] = useState<{
    device_id: number
    device_uuid: string
    device_key: string
    qr_code_data: string
  } | null>(null)

  const { data: restaurants = [], isLoading: loadingRestaurants } = useRestaurants({ status: "active" })
  const registerDevice = useRegisterDevice()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!deviceName.trim()) {
      toast.error("Device name is required")
      return
    }

    if (!restaurantId) {
      toast.error("Please select a restaurant")
      return
    }

    try {
      const result = await registerDevice.mutateAsync({
        device_name: deviceName.trim(),
        restaurant_id: parseInt(restaurantId),
        has_printing_support: hasPrintingSupport,
      })

      setRegistrationResult(result)
      toast.success("Device registered successfully!")
    } catch (error: any) {
      toast.error(error.message || "Failed to register device")
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success("Copied to clipboard!")
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  // If registration is complete, show credentials
  if (registrationResult) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/admin/devices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Device Registered</h1>
            <p className="text-muted-foreground">Save these credentials - they won't be shown again!</p>
          </div>
        </div>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Important: Save These Credentials Now!</AlertTitle>
          <AlertDescription>
            The device key below is shown only once and cannot be retrieved later.
            Copy it now and store it securely in the tablet app.
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tablet className="h-5 w-5" />
              Device Credentials
            </CardTitle>
            <CardDescription>
              Use these credentials to authenticate the tablet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>Device ID</Label>
              <div className="flex gap-2">
                <Input value={registrationResult.device_id.toString()} readOnly className="font-mono" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Device UUID</Label>
              <div className="flex gap-2">
                <Input value={registrationResult.device_uuid} readOnly className="font-mono text-sm" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(registrationResult.device_uuid)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-red-600 font-bold">Device Key (ONE-TIME DISPLAY)</Label>
              <div className="flex gap-2">
                <Input
                  value={registrationResult.device_key}
                  readOnly
                  className="font-mono text-sm bg-red-50 border-red-200"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(registrationResult.device_key)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-red-600">
                This key will never be shown again. Copy it now!
              </p>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <QrCode className="h-4 w-4" />
                QR Code Data (for tablet scanner)
              </Label>
              <div className="flex gap-2">
                <Input
                  value={registrationResult.qr_code_data}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(registrationResult.qr_code_data)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Use this to generate a QR code for easy tablet setup
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => {
              setRegistrationResult(null)
              setDeviceName("")
              setRestaurantId("")
            }}>
              Register Another Device
            </Button>
            <Link href="/admin/devices">
              <Button>
                Done - View All Devices
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // Registration form
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/devices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Register Device</h1>
          <p className="text-muted-foreground">Add a new tablet device for order printing</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tablet className="h-5 w-5" />
            New Device
          </CardTitle>
          <CardDescription>
            Configure the device settings. After registration, you'll receive credentials
            to configure the tablet app.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="deviceName">Device Name *</Label>
              <Input
                id="deviceName"
                placeholder="e.g., Kitchen Tablet, Front Counter"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                data-testid="input-device-name"
              />
              <p className="text-xs text-muted-foreground">
                A friendly name to identify this device
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="restaurant">Restaurant *</Label>
              <Select value={restaurantId} onValueChange={setRestaurantId}>
                <SelectTrigger data-testid="select-restaurant">
                  <SelectValue placeholder={loadingRestaurants ? "Loading..." : "Select a restaurant"} />
                </SelectTrigger>
                <SelectContent>
                  {restaurants.map((restaurant: any) => (
                    <SelectItem key={restaurant.id} value={restaurant.id.toString()}>
                      {restaurant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                The device will only receive orders for this restaurant
              </p>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="printing">Printing Support</Label>
                <p className="text-xs text-muted-foreground">
                  Enable if this tablet has a thermal printer connected
                </p>
              </div>
              <Switch
                id="printing"
                checked={hasPrintingSupport}
                onCheckedChange={setHasPrintingSupport}
                data-testid="switch-printing"
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Link href="/admin/devices">
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={registerDevice.isPending || !deviceName || !restaurantId}
              data-testid="button-register"
            >
              {registerDevice.isPending ? "Registering..." : "Register Device"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
