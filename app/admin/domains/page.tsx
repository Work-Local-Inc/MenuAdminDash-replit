'use client'

import { useQuery, useMutation } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Globe
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface DomainSummary {
  total_domains: number
  enabled_domains: number
  ssl_verified_count: number
  dns_verified_count: number
  fully_verified_count: number
  ssl_expiring_soon: number
  ssl_expired: number
  never_checked: number
  needs_recheck: number
  ssl_verification_percentage: number
  dns_verification_percentage: number
}

interface DomainNeedingAttention {
  domain_id: number
  restaurant_id: number
  restaurant_name: string
  domain: string
  ssl_verified: boolean
  dns_verified: boolean
  ssl_expires_at: string | null
  issue_type: string
  priority_score: number
  days_until_ssl_expires: number
  verification_errors: string | null
}

export default function DomainsPage() {
  const { toast } = useToast()

  // Fetch summary statistics
  const { data: summary, isLoading: summaryLoading } = useQuery<DomainSummary>({
    queryKey: ['/api/domains/summary'],
  })

  // Fetch domains needing attention
  const { data: needsAttention, isLoading: needsAttentionLoading } = useQuery<DomainNeedingAttention[]>({
    queryKey: ['/api/domains/needing-attention'],
  })

  // Verify single domain mutation
  const verifyMutation = useMutation({
    mutationFn: async (domainId: number) => {
      const response = await fetch(`/api/domains/${domainId}/verify`, {
        method: 'POST',
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to verify domain')
      }
      
      return response.json()
    },
    onSuccess: () => {
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/domains/summary'] })
      queryClient.invalidateQueries({ queryKey: ['/api/domains/needing-attention'] })
      
      toast({
        title: 'Verification Complete',
        description: 'Domain verification has been updated',
      })
    },
    onError: (error: Error) => {
      toast({
        title: 'Verification Failed',
        description: error.message,
        variant: 'destructive',
      })
    },
  })

  const getPriorityBadge = (score: number) => {
    if (score >= 5) {
      return <Badge variant="destructive" data-testid={`badge-priority-critical`}>Critical</Badge>
    } else if (score >= 4) {
      return <Badge variant="destructive" data-testid={`badge-priority-high`}>High</Badge>
    } else if (score >= 2) {
      return <Badge className="bg-yellow-500 text-black" data-testid={`badge-priority-medium`}>Medium</Badge>
    }
    return <Badge variant="secondary" data-testid={`badge-priority-low`}>Low</Badge>
  }

  const formatDaysRemaining = (days: number | null) => {
    if (days === null) return 'N/A'
    if (days < 0) return <span className="text-destructive font-semibold">Expired</span>
    if (days === 0) return <span className="text-destructive font-semibold">Today</span>
    if (days <= 7) return <span className="text-destructive font-semibold">{days} days</span>
    if (days <= 30) return <span className="text-yellow-600 font-semibold">{days} days</span>
    return `${days} days`
  }

  return (
    <div className="p-6 space-y-6" data-testid="page-domains">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
          <Shield className="w-8 h-8" />
          Domain Verification & SSL Monitoring
        </h1>
        <p className="text-muted-foreground mt-2">
          Monitor SSL certificates and DNS health across all restaurant domains
        </p>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-domains">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Domains</CardTitle>
            <Globe className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-domains">
              {summaryLoading ? '-' : summary?.total_domains || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {summaryLoading ? '-' : `${summary?.enabled_domains || 0} active`}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-ssl-verified">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SSL Verified</CardTitle>
            <ShieldCheck className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-ssl-verified">
              {summaryLoading ? '-' : `${Math.round(summary?.ssl_verification_percentage || 0)}%`}
            </div>
            <p className="text-xs text-muted-foreground">
              {summaryLoading ? '-' : `${summary?.ssl_verified_count || 0} of ${summary?.enabled_domains || 0} domains`}
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-expiring-soon">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="text-expiring-soon">
              {summaryLoading ? '-' : summary?.ssl_expiring_soon || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              SSL expires within 30 days
            </p>
          </CardContent>
        </Card>

        <Card data-testid="card-ssl-expired">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">SSL Expired</CardTitle>
            <ShieldAlert className="w-4 h-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive" data-testid="text-ssl-expired">
              {summaryLoading ? '-' : summary?.ssl_expired || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Immediate action required
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Domains Needing Attention */}
      <Card data-testid="card-domains-needing-attention">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Domains Needing Attention
          </CardTitle>
          <CardDescription>
            Priority-sorted list of domains requiring action
          </CardDescription>
        </CardHeader>
        <CardContent>
          {needsAttentionLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : !needsAttention || needsAttention.length === 0 ? (
            <div className="text-center py-8" data-testid="text-no-issues">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-2" />
              <p className="text-muted-foreground">All domains are healthy!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {needsAttention.map((domain) => (
                <div
                  key={domain.domain_id}
                  className="flex items-center justify-between p-4 border rounded-md hover-elevate"
                  data-testid={`domain-item-${domain.domain_id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold truncate" data-testid={`text-domain-name-${domain.domain_id}`}>
                        {domain.domain}
                      </h3>
                      {getPriorityBadge(domain.priority_score)}
                    </div>
                    <p className="text-sm text-muted-foreground truncate mb-2">
                      {domain.restaurant_name}
                    </p>
                    <div className="flex items-center gap-4 text-xs">
                      <div className="flex items-center gap-1">
                        {domain.ssl_verified ? (
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-destructive" />
                        )}
                        <span data-testid={`text-ssl-status-${domain.domain_id}`}>
                          SSL: {domain.ssl_verified ? 'Verified' : 'Failed'}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        {domain.dns_verified ? (
                          <CheckCircle2 className="w-3 h-3 text-green-600" />
                        ) : (
                          <XCircle className="w-3 h-3 text-destructive" />
                        )}
                        <span data-testid={`text-dns-status-${domain.domain_id}`}>
                          DNS: {domain.dns_verified ? 'Verified' : 'Failed'}
                        </span>
                      </div>
                      {domain.days_until_ssl_expires !== null && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span data-testid={`text-days-remaining-${domain.domain_id}`}>
                            {formatDaysRemaining(domain.days_until_ssl_expires)}
                          </span>
                        </div>
                      )}
                    </div>
                    {domain.verification_errors && (
                      <p className="text-xs text-destructive mt-2" data-testid={`text-errors-${domain.domain_id}`}>
                        {domain.verification_errors}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => verifyMutation.mutate(domain.domain_id)}
                    disabled={verifyMutation.isPending}
                    data-testid={`button-verify-${domain.domain_id}`}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${verifyMutation.isPending ? 'animate-spin' : ''}`} />
                    Verify Now
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
