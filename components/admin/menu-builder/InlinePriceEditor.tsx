"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Trash2 } from 'lucide-react'
import { MenuBuilderDish } from '@/lib/hooks/use-menu-builder'
import { useUpdateDish } from '@/lib/hooks/use-menu'

interface PriceVariant {
  id: string
  name: string
  price: number
}

interface InlinePriceEditorProps {
  dish: MenuBuilderDish
  restaurantId: number
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InlinePriceEditor({ dish, restaurantId, open, onOpenChange }: InlinePriceEditorProps) {
  const [variants, setVariants] = useState<PriceVariant[]>([
    { id: '1', name: '', price: dish.price }
  ])
  
  const updateDish = useUpdateDish()

  const addVariant = () => {
    setVariants([...variants, { id: Date.now().toString(), name: '', price: 0 }])
  }

  const removeVariant = (id: string) => {
    if (variants.length > 1) {
      setVariants(variants.filter(v => v.id !== id))
    }
  }

  const updateVariant = (id: string, field: 'name' | 'price', value: string | number) => {
    setVariants(variants.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ))
  }

  const handleSave = async () => {
    const singleVariant = variants.length === 1 && !variants[0].name
    
    if (singleVariant) {
      await updateDish.mutateAsync({
        id: dish.id,
        restaurant_id: restaurantId,
        data: { price: variants[0].price }
      })
    } else {
      // Note: Multi-price variants not yet implemented in backend
      // For now, just update the base price
      await updateDish.mutateAsync({
        id: dish.id,
        restaurant_id: restaurantId,
        data: { price: variants[0].price }
      })
    }
    
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-price-editor">
        <DialogHeader>
          <DialogTitle>Edit Prices - {dish.name}</DialogTitle>
          <DialogDescription>
            Set different prices for size variants or a single price
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {variants.map((variant, index) => (
            <div key={variant.id} className="flex gap-2 items-end">
              <div className="flex-1">
                <Label>Size Name {variants.length > 1 ? `(e.g., Small)` : ''}</Label>
                <Input
                  placeholder={variants.length === 1 ? "Leave blank for single price" : "Small, Medium, Large..."}
                  value={variant.name}
                  onChange={(e) => updateVariant(variant.id, 'name', e.target.value)}
                  data-testid={`input-variant-name-${index}`}
                />
              </div>
              <div className="w-32">
                <Label>Price ($)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={variant.price || ''}
                  onChange={(e) => updateVariant(variant.id, 'price', parseFloat(e.target.value) || 0)}
                  data-testid={`input-variant-price-${index}`}
                />
              </div>
              {variants.length > 1 && (
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeVariant(variant.id)}
                  data-testid={`button-remove-variant-${index}`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="outline"
            onClick={addVariant}
            className="w-full"
            data-testid="button-add-variant"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Size Variant
          </Button>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={updateDish.isPending}
            data-testid="button-save-prices"
          >
            {updateDish.isPending ? 'Saving...' : 'Save Prices'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
