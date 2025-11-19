"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient, apiRequest } from "@/lib/queryClient"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Code, Save, AlertTriangle, Check } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { format } from "date-fns"
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

interface CustomCSS {
  id?: number
  restaurant_id: number
  css_code: string
  is_enabled: boolean
  updated_at: string | null
}

interface RestaurantCustomCSSProps {
  restaurantId: string
}

export function RestaurantCustomCSS({ restaurantId }: RestaurantCustomCSSProps) {
  const { toast } = useToast()
  const [cssCode, setCssCode] = useState("")
  const [isEnabled, setIsEnabled] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const { data: customCss, isLoading } = useQuery<CustomCSS>({
    queryKey: ["/api/restaurants", restaurantId, "custom-css"],
    queryFn: async () => {
      const response = await fetch(`/api/restaurants/${restaurantId}/custom-css`)
      if (!response.ok) {
        throw new Error("Failed to fetch custom CSS")
      }
      const data = await response.json()
      setCssCode(data.css_code || "")
      setIsEnabled(data.is_enabled || false)
      return data
    },
  })

  const saveMutation = useMutation({
    mutationFn: async (data: { css_code: string; is_enabled: boolean }) => {
      return apiRequest(`/api/restaurants/${restaurantId}/custom-css`, {
        method: "PUT",
        body: JSON.stringify(data),
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/restaurants", restaurantId, "custom-css"] })
      setHasUnsavedChanges(false)
      toast({
        title: "Custom CSS saved",
        description: "Your custom CSS has been saved successfully",
      })
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      })
    },
  })

  const handleSave = () => {
    if (cssCode.length > 10000) {
      toast({
        title: "Error",
        description: "CSS code must be under 10,000 characters",
        variant: "destructive",
      })
      return
    }
    setShowConfirmDialog(true)
  }

  const confirmSave = () => {
    saveMutation.mutate({ css_code: cssCode, is_enabled: isEnabled })
    setShowConfirmDialog(false)
  }

  const handleCssChange = (value: string) => {
    setCssCode(value)
    setHasUnsavedChanges(true)
  }

  const handleEnabledChange = (checked: boolean) => {
    setIsEnabled(checked)
    setHasUnsavedChanges(true)
  }

  const charCount = cssCode.length
  const charLimit = 10000
  const charPercentage = (charCount / charLimit) * 100

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Custom CSS
              </CardTitle>
              <CardDescription>
                Add custom styling to restaurant storefront
              </CardDescription>
            </div>
            {customCss?.updated_at && (
              <Badge variant="outline" data-testid="last-updated">
                Last updated: {format(new Date(customCss.updated_at), "MMM d, yyyy 'at' h:mm a")}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Warning Alert */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Custom CSS can affect the appearance of the restaurant storefront. Use with caution and test thoroughly.
            </AlertDescription>
          </Alert>

          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="enable-css" className="text-base font-medium">
                Enable Custom CSS
              </Label>
              <p className="text-sm text-muted-foreground">
                Activate custom CSS on the restaurant storefront
              </p>
            </div>
            <Switch
              id="enable-css"
              checked={isEnabled}
              onCheckedChange={handleEnabledChange}
              disabled={isLoading}
              data-testid="switch-enable-css"
            />
          </div>

          {/* CSS Code Editor */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="css-editor" className="text-base font-medium">
                CSS Code
              </Label>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${charPercentage > 90 ? 'text-destructive' : 'text-muted-foreground'}`} data-testid="char-count">
                  {charCount.toLocaleString()} / {charLimit.toLocaleString()}
                </span>
                {hasUnsavedChanges && (
                  <Badge variant="secondary" data-testid="unsaved-changes">
                    Unsaved changes
                  </Badge>
                )}
              </div>
            </div>
            <Textarea
              id="css-editor"
              value={cssCode}
              onChange={(e) => handleCssChange(e.target.value)}
              placeholder="/* Enter your custom CSS here */&#10;.restaurant-header {&#10;  background-color: #ff6b6b;&#10;  color: white;&#10;}"
              className="font-mono text-sm min-h-[400px] resize-y"
              disabled={isLoading}
              data-testid="textarea-css-code"
            />
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-3">
            <Button
              onClick={handleSave}
              disabled={isLoading || saveMutation.isPending || !hasUnsavedChanges}
              data-testid="button-save-css"
            >
              {saveMutation.isPending ? (
                <>
                  <Code className="h-4 w-4 mr-2 animate-pulse" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Custom CSS
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Save Custom CSS</AlertDialogTitle>
            <AlertDialogDescription>
              This will {isEnabled ? "enable and apply" : "save but keep disabled"} the custom CSS to the restaurant storefront. 
              {isEnabled && " Changes will be immediately visible to customers."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-save">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave} data-testid="button-confirm-save">
              <Check className="h-4 w-4 mr-2" />
              Confirm Save
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
