'use client'

import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { Database, Table as TableIcon, Columns, Hash } from 'lucide-react'
import { useState } from 'react'
import { Input } from '@/components/ui/input'

interface SchemaInfo {
  schema: string
  tables: string[]
  tableCount: number
  schemaDetails: Record<string, Array<{
    column_name: string
    data_type: string
    is_nullable: string
    column_default: string | null
  }>>
  tableCounts: Record<string, number>
  timestamp: string
}

export default function DatabaseInspectorPage() {
  const [searchTerm, setSearchTerm] = useState('')
  
  const { data: schemaInfo, isLoading, error } = useQuery<SchemaInfo>({
    queryKey: ['/api/admin/db-inspector'],
    queryFn: async () => {
      const res = await fetch('/api/admin/db-inspector')
      if (!res.ok) throw new Error('Failed to fetch schema')
      return res.json()
    },
  })

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-8">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Database Connection Error</CardTitle>
            <CardDescription>Failed to inspect database schema</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{String(error)}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const filteredTables = schemaInfo?.tables.filter(table => 
    table.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  // Calculate total columns across all tables
  const totalColumns = schemaInfo ? Object.values(schemaInfo.schemaDetails).reduce((sum, cols) => sum + cols.length, 0) : 0

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Database className="h-8 w-8 text-primary" />
          Database Schema Inspector
        </h1>
        <p className="text-muted-foreground mt-2">
          Real-time view of menuca_v3 production database schema
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Schema</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schemaInfo?.schema}</div>
            <p className="text-xs text-muted-foreground mt-1">
              PostgreSQL Database
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tables</CardTitle>
            <TableIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{schemaInfo?.tableCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total tables
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Columns</CardTitle>
            <Columns className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalColumns}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Total columns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Hash className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Live</div>
            <p className="text-xs text-muted-foreground mt-1">
              {schemaInfo?.timestamp && new Date(schemaInfo.timestamp).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div>
        <Input
          data-testid="input-search-tables"
          placeholder="Search tables..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      {/* Tables List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <TableIcon className="h-5 w-5" />
          Tables ({filteredTables.length})
        </h2>

        {filteredTables.map(tableName => {
          const columns = schemaInfo?.schemaDetails[tableName] || []
          const rowCount = schemaInfo?.tableCounts[tableName] ?? 0
          
          return (
            <Card key={tableName} data-testid={`card-table-${tableName}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TableIcon className="h-5 w-5 text-primary" />
                      {tableName}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {columns.length} columns • {rowCount === -1 ? 'Error' : `${rowCount.toLocaleString()} rows`}
                    </CardDescription>
                  </div>
                  <Badge variant="outline">{columns.length} cols</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Column Name</TableHead>
                      <TableHead>Data Type</TableHead>
                      <TableHead>Nullable</TableHead>
                      <TableHead>Default</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {columns.map(col => (
                      <TableRow key={col.column_name} data-testid={`row-column-${tableName}-${col.column_name}`}>
                        <TableCell className="font-mono text-sm">{col.column_name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{col.data_type}</Badge>
                        </TableCell>
                        <TableCell>
                          {col.is_nullable === 'YES' ? (
                            <Badge variant="outline">NULL</Badge>
                          ) : (
                            <Badge variant="default">NOT NULL</Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {col.column_default || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
