"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { queryClient } from "@/lib/queryClient"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Plus, Clock, Pencil, Trash2 } from "lucide-react"

const scheduleSchema = z.object({
  type: z.enum(["delivery", "takeout"]),
  day_start: z.coerce.number().min(0).max(6),
  day_stop: z.coerce.number().min(0).max(6),
  time_start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  time_stop: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format (HH:MM)"),
  is_enabled: z.boolean().default(true),
  notes: z.string().optional(),
})

type ScheduleFormValues = z.infer<typeof scheduleSchema>

interface RestaurantHoursProps {
  restaurantId: string
}

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

export function RestaurantHours({ restaurantId }: RestaurantHoursProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSchedule, setEditingSchedule] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<"delivery" | "takeout">("delivery")
  const { toast } = useToast()

  // Fetch schedules
  const { data: schedules = [], isLoading } = useQuery({
    queryKey: ['/api/restaurants', restaurantId, 'schedules'],
  })

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: {
      type: "delivery",
      day_start: 1,
      day_stop: 1,
      time_start: "09:00",
      time_stop: "17:00",
      is_enabled: true,
      notes: "",
    },
  })

  // Create schedule
  const createSchedule = useMutation({
    mutationFn: async (data: ScheduleFormValues) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, restaurant_id: restaurantId }),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'schedules'] })
      toast({ title: "Success", description: "Schedule created successfully" })
      setIsDialogOpen(false)
      form.reset()
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  // Update schedule
  const updateSchedule = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ScheduleFormValues }) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/schedules/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'schedules'] })
      toast({ title: "Success", description: "Schedule updated successfully" })
      setIsDialogOpen(false)
      setEditingSchedule(null)
      form.reset()
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  // Delete schedule
  const deleteSchedule = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/restaurants/${restaurantId}/schedules/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error(await res.text())
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/restaurants', restaurantId, 'schedules'] })
      toast({ title: "Success", description: "Schedule deleted successfully" })
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" })
    },
  })

  const onSubmit = async (data: ScheduleFormValues) => {
    if (editingSchedule) {
      await updateSchedule.mutateAsync({ id: editingSchedule.id, data })
    } else {
      await createSchedule.mutateAsync(data)
    }
  }

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule)
    form.reset({
      type: schedule.type || "delivery",
      day_start: schedule.day_start ?? 1,
      day_stop: schedule.day_stop ?? 1,
      time_start: schedule.time_start || "09:00",
      time_stop: schedule.time_stop || "17:00",
      is_enabled: schedule.is_enabled ?? true,
      notes: schedule.notes || "",
    })
    setIsDialogOpen(true)
  }

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this schedule?")) {
      deleteSchedule.mutate(id)
    }
  }

  const getDayLabel = (dayNum: number) => {
    return DAYS.find(d => d.value === dayNum)?.label || `Day ${dayNum}`
  }

  const deliverySchedules = schedules.filter((s: any) => s.type === "delivery")
  const takeoutSchedules = schedules.filter((s: any) => s.type === "takeout")

  const ScheduleTable = ({ data, type }: { data: any[]; type: string }) => (
    data.length === 0 ? (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Clock className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No {type} schedules found</p>
        <p className="text-sm text-muted-foreground">Add your first schedule to get started</p>
      </div>
    ) : (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day(s)</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((schedule: any) => (
              <TableRow key={schedule.id} data-testid={`row-schedule-${schedule.id}`}>
                <TableCell>
                  {schedule.day_start === schedule.day_stop ? (
                    getDayLabel(schedule.day_start)
                  ) : (
                    `${getDayLabel(schedule.day_start)} - ${getDayLabel(schedule.day_stop)}`
                  )}
                </TableCell>
                <TableCell className="font-mono">
                  {schedule.time_start} - {schedule.time_stop}
                </TableCell>
                <TableCell>
                  <Badge variant={schedule.is_enabled ? "default" : "secondary"}>
                    {schedule.is_enabled ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {schedule.notes || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(schedule)}
                      data-testid={`button-edit-${schedule.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(schedule.id)}
                      data-testid={`button-delete-${schedule.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  )

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Operating Hours</CardTitle>
            <CardDescription>Configure delivery and takeout schedules</CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open)
            if (!open) {
              setEditingSchedule(null)
              form.reset()
            }
          }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-schedule">
                <Plus className="h-4 w-4 mr-2" />
                Add Schedule
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>{editingSchedule ? "Edit Schedule" : "Add New Schedule"}</DialogTitle>
                <DialogDescription>
                  {editingSchedule ? "Update operating hours" : "Add operating hours for delivery or takeout"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Service Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="delivery">Delivery</SelectItem>
                            <SelectItem value="takeout">Takeout</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="day_start"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Day</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger data-testid="select-day-start">
                                <SelectValue placeholder="Select day" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DAYS.map((day) => (
                                <SelectItem key={day.value} value={day.value.toString()}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="day_stop"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Day</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value?.toString()}>
                            <FormControl>
                              <SelectTrigger data-testid="select-day-stop">
                                <SelectValue placeholder="Select day" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {DAYS.map((day) => (
                                <SelectItem key={day.value} value={day.value.toString()}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>For single day, use same as start day</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="time_start"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Time</FormLabel>
                          <FormControl>
                            <Input type="time" data-testid="input-time-start" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="time_stop"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Time</FormLabel>
                          <FormControl>
                            <Input type="time" data-testid="input-time-stop" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Special hours for holidays, etc." data-testid="input-notes" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_enabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Enabled</FormLabel>
                          <FormDescription>
                            Schedule is currently active
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-enabled"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsDialogOpen(false)
                        setEditingSchedule(null)
                        form.reset()
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createSchedule.isPending || updateSchedule.isPending}
                      data-testid="button-submit-schedule"
                    >
                      {editingSchedule ? "Update Schedule" : "Add Schedule"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "delivery" | "takeout")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="delivery" data-testid="tab-delivery">
                Delivery Hours ({deliverySchedules.length})
              </TabsTrigger>
              <TabsTrigger value="takeout" data-testid="tab-takeout">
                Takeout Hours ({takeoutSchedules.length})
              </TabsTrigger>
            </TabsList>
            <TabsContent value="delivery" className="mt-4">
              <ScheduleTable data={deliverySchedules} type="delivery" />
            </TabsContent>
            <TabsContent value="takeout" className="mt-4">
              <ScheduleTable data={takeoutSchedules} type="takeout" />
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}
