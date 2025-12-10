"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Store } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Restaurant {
  id: number
  name: string
}

interface SearchableRestaurantSelectProps {
  restaurants: Restaurant[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  isLoading?: boolean
  className?: string
  "data-testid"?: string
}

export function SearchableRestaurantSelect({
  restaurants,
  value,
  onValueChange,
  placeholder = "Select a restaurant",
  disabled = false,
  isLoading = false,
  className,
  "data-testid": testId = "select-restaurant",
}: SearchableRestaurantSelectProps) {
  const [open, setOpen] = React.useState(false)

  const sortedRestaurants = React.useMemo(() => {
    return [...restaurants].sort((a, b) => 
      a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    )
  }, [restaurants])

  const selectedRestaurant = React.useMemo(() => {
    return restaurants.find((r) => r.id.toString() === value)
  }, [restaurants, value])

  const filterRestaurants = (searchValue: string, search: string) => {
    const restaurant = sortedRestaurants.find(r => r.id.toString() === searchValue)
    if (!restaurant) return 0
    
    const searchLower = search.toLowerCase()
    const nameMatch = restaurant.name.toLowerCase().includes(searchLower)
    const idMatch = restaurant.id.toString().includes(search)
    
    return nameMatch || idMatch ? 1 : 0
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            className
          )}
          data-testid={testId}
        >
          <span className="flex items-center gap-2 truncate">
            {isLoading ? (
              "Loading restaurants..."
            ) : selectedRestaurant ? (
              <>
                <Store className="h-4 w-4 shrink-0 opacity-50" />
                <span className="truncate">{selectedRestaurant.name}</span>
                <span className="text-muted-foreground text-xs shrink-0">
                  (ID: {selectedRestaurant.id})
                </span>
              </>
            ) : (
              placeholder
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command filter={filterRestaurants}>
          <CommandInput 
            placeholder="Search by name or ID..." 
            data-testid={`${testId}-search`}
          />
          <CommandList>
            <CommandEmpty>No restaurant found.</CommandEmpty>
            <CommandGroup>
              {sortedRestaurants.map((restaurant) => (
                <CommandItem
                  key={restaurant.id}
                  value={restaurant.id.toString()}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                  data-testid={`${testId}-option-${restaurant.id}`}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === restaurant.id.toString() ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <Store className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                  <span className="flex-1 truncate">{restaurant.name}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    ID: {restaurant.id}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
