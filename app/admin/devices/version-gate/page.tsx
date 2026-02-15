"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Skeleton } from "@/components/ui/skeleton"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

interface VersionData {
  id: number
  min_version: string
  latest_version: string
  required: boolean
  message: string
  update_url: string
  is_active: boolean
}

export default function VersionGatePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [data, setData] = useState<VersionData | null>(null)

  const [minVersion, setMinVersion] = useState("")
  const [latestVersion, setLatestVersion] = useState("")
  const [required, setRequired] = useState(false)
  const [message, setMessage] = useState("")
  const [updateUrl, setUpdateUrl] = useState("")

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await fetch("/api/tablet/version")
      const json = await res.json()
      if (res.ok && json.data) {
        setData(json.data)
        setMinVersion(json.data.min_version || "")
        setLatestVersion(json.data.latest_version || "")
        setRequired(json.data.required || false)
        setMessage(json.data.message || "")
        setUpdateUrl(json.data.update_url || "")
      }
    } catch (error: any) {
      toast.error("Failed to load version data")
    } finally {
      setLoading(false)
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch("/api/tablet/version", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          min_version: minVersion,
          latest_version: latestVersion,
          required,
          message,
          update_url: updateUrl,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || "Failed to save")
      }
      setData(json.data)
      toast.success("Version gate updated successfully")
    } catch (error: any) {
      toast.error(error.message || "Failed to save version data")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/devices">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">Version Gate</h1>
          <p className="text-muted-foreground">Manage minimum and latest tablet app version requirements</p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Tablet App Version</CardTitle>
          <CardDescription>
            Configure the version gate that controls which tablet app versions are allowed to connect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-6" data-testid="loading-skeleton">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-12" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-20 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-9 w-full" />
              </div>
            </div>
          ) : !data ? (
            <div className="text-center py-8" data-testid="text-no-data">
              <p className="text-muted-foreground">No active version record found</p>
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="min_version">Minimum Version</Label>
                <Input
                  id="min_version"
                  value={minVersion}
                  onChange={(e) => setMinVersion(e.target.value)}
                  placeholder="e.g., 1.0.0"
                  data-testid="input-min-version"
                />
                <p className="text-xs text-muted-foreground">
                  The minimum app version allowed to connect
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="latest_version">Latest Version</Label>
                <Input
                  id="latest_version"
                  value={latestVersion}
                  onChange={(e) => setLatestVersion(e.target.value)}
                  placeholder="e.g., 2.0.0"
                  data-testid="input-latest-version"
                />
                <p className="text-xs text-muted-foreground">
                  The latest available app version
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="required">Required Update</Label>
                  <p className="text-xs text-muted-foreground">
                    Force users to update before they can continue
                  </p>
                </div>
                <Switch
                  id="required"
                  checked={required}
                  onCheckedChange={setRequired}
                  data-testid="switch-required"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Update Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Message shown to users when an update is available"
                  rows={3}
                  data-testid="textarea-message"
                />
                <p className="text-xs text-muted-foreground">
                  Message displayed to users when their app version is outdated
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="update_url">Update URL</Label>
                <Input
                  id="update_url"
                  value={updateUrl}
                  onChange={(e) => setUpdateUrl(e.target.value)}
                  placeholder="https://play.google.com/store/apps/details?id=..."
                  data-testid="input-update-url"
                />
                <p className="text-xs text-muted-foreground">
                  Link to the app store or download page for updates
                </p>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={saving} data-testid="button-save">
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
