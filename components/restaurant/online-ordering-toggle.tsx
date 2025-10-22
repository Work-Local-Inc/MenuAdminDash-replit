"use client"

import { useState } from "react"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useToggleOnlineOrdering } from "@/lib/hooks/use-restaurants"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface OnlineOrderingToggleProps {
  restaurantId: string
  restaurantName: string
  currentStatus: boolean
  isActive: boolean
}

export function OnlineOrderingToggle({
  restaurantId,
  restaurantName,
  currentStatus,
  isActive,
}: OnlineOrderingToggleProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [pendingValue, setPendingValue] = useState<boolean | null>(null)
  const { toast } = useToast()
  const toggleMutation = useToggleOnlineOrdering()

  const handleToggleClick = (checked: boolean) => {
    if (!isActive) {
      toast({
        title: "Cannot toggle",
        description: "Restaurant must be in 'active' status to toggle online ordering",
        variant: "destructive",
      })
      return
    }

    if (!checked) {
      setPendingValue(false)
      setIsDialogOpen(true)
    } else {
      handleToggle(true, "Restaurant reopened for online ordering")
    }
  }

  const handleToggle = async (enabled: boolean, closureReason: string) => {
    try {
      await toggleMutation.mutateAsync({
        restaurantId: parseInt(restaurantId),
        enabled,
        reason: closureReason,
      })
      
      toast({
        title: "Success",
        description: enabled 
          ? `${restaurantName} is now accepting online orders`
          : `${restaurantName} is temporarily closed`,
      })
      
      setIsDialogOpen(false)
      setReason("")
      setPendingValue(null)
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update online ordering status",
        variant: "destructive",
      })
    }
  }

  const handleDialogSubmit = () => {
    if (!reason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for temporarily closing online ordering",
        variant: "destructive",
      })
      return
    }
    handleToggle(false, reason)
  }

  return (
    <>
      <div className="flex items-center gap-3" data-testid="online-ordering-toggle-container">
        <Label 
          htmlFor="online-ordering-toggle" 
          className="text-sm font-medium"
        >
          Online Ordering
        </Label>
        <Switch
          id="online-ordering-toggle"
          checked={currentStatus}
          onCheckedChange={handleToggleClick}
          disabled={!isActive || toggleMutation.isPending}
          data-testid="switch-online-ordering"
        />
        {toggleMutation.isPending && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
        <span className="text-sm text-muted-foreground">
          {currentStatus ? "Enabled" : "Disabled"}
        </span>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent data-testid="dialog-closure-reason">
          <DialogHeader>
            <DialogTitle>Temporarily Close Online Ordering</DialogTitle>
            <DialogDescription>
              Please provide a reason for closing. This message will be shown to customers.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder="e.g., Equipment repair - oven malfunction. Back in 2 hours"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              data-testid="textarea-closure-reason"
            />
            <p className="text-sm text-muted-foreground">
              Examples: Equipment failure, Staff shortage, Private event, Scheduled maintenance
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDialogOpen(false)
                setReason("")
                setPendingValue(null)
              }}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleDialogSubmit}
              disabled={!reason.trim() || toggleMutation.isPending}
              data-testid="button-confirm-close"
            >
              {toggleMutation.isPending ? "Closing..." : "Temporarily Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
