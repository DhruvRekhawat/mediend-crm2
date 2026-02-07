"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  Activity,
  Database,
  AlertCircle,
  Users,
  Clock,
  Server,
  GitCommit,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { apiGet } from "@/lib/api-client";

export default function SystemObservabilityPage() {
  const [autoRefresh, setAutoRefresh] = useState(false);
  const refreshInterval = autoRefresh ? 5000 : false;

  // Fetch all data
  const { data: health, refetch: refetchHealth } = useQuery({
    queryKey: ["system-health"],
    queryFn: () => apiGet("/api/admin/system/health"),
    refetchInterval: refreshInterval,
  });

  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ["system-metrics"],
    queryFn: () => apiGet("/api/admin/system/metrics"),
    refetchInterval: refreshInterval,
  });

  const { data: deploy } = useQuery({
    queryKey: ["system-deploy"],
    queryFn: () => apiGet("/api/admin/system/deploy"),
  });

  const { data: logs } = useQuery({
    queryKey: ["system-logs"],
    queryFn: () => apiGet("/api/admin/system/logs?limit=50"),
    refetchInterval: refreshInterval,
  });

  const { data: cronLogs } = useQuery({
    queryKey: ["system-cron-logs"],
    queryFn: () => apiGet("/api/admin/system/cron-logs"),
    refetchInterval: refreshInterval,
  });

  const { data: dbInfo } = useQuery({
    queryKey: ["system-db"],
    queryFn: () => apiGet("/api/admin/system/db"),
    refetchInterval: refreshInterval,
  });

  const { data: errors } = useQuery({
    queryKey: ["system-errors"],
    queryFn: () => apiGet("/api/admin/system/errors"),
    refetchInterval: refreshInterval,
  });

  const { data: activeUsers } = useQuery({
    queryKey: ["system-active-users"],
    queryFn: () => apiGet("/api/admin/system/active-users"),
    refetchInterval: refreshInterval,
  });

  const refetchAll = () => {
    refetchHealth();
    refetchMetrics();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">System Observability</h1>
            <p className="text-muted-foreground">Monitor system health, logs, and performance</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
              {autoRefresh ? "Auto-refresh ON" : "Auto-refresh OFF"}
            </Button>
            <Button variant="outline" size="sm" onClick={refetchAll}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Now
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="logs">API Logs</TabsTrigger>
            <TabsTrigger value="cron">Cron Jobs</TabsTrigger>
            <TabsTrigger value="database">Database</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
            <TabsTrigger value="users">Active Users</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {/* Health Status */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">System Health</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {health?.status === "healthy" ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="text-2xl font-bold">
                      {health?.status === "healthy" ? "Healthy" : "Unhealthy"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Uptime: {health?.uptimeFormatted || "N/A"}
                  </p>
                </CardContent>
              </Card>

              {/* CPU Usage */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
                  <Server className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics?.cpu?.usagePercent?.toFixed(1) || "0"}%
                  </div>
                  <Progress value={metrics?.cpu?.usagePercent || 0} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics?.cpu?.count || 0} cores
                  </p>
                </CardContent>
              </Card>

              {/* Memory Usage */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics?.memory?.usagePercent?.toFixed(1) || "0"}%
                  </div>
                  <Progress value={metrics?.memory?.usagePercent || 0} className="mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {metrics?.memory?.usedFormatted || "0"} / {metrics?.memory?.totalFormatted || "0"}
                  </p>
                </CardContent>
              </Card>

              {/* Disk Usage */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Disk Usage</CardTitle>
                  <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metrics?.disk?.usagePercent?.toFixed(1) || "N/A"}%
                  </div>
                  {metrics?.disk && (
                    <>
                      <Progress value={metrics.disk.usagePercent} className="mt-2" />
                      <p className="text-xs text-muted-foreground mt-1">
                        {metrics.disk.used} / {metrics.disk.total}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Deploy Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GitCommit className="h-5 w-5" />
                  Current Deployment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Commit</p>
                    <p className="text-lg font-mono">{deploy?.commit || "unknown"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Deployed At</p>
                    <p className="text-lg">
                      {deploy?.time && deploy.time !== "unknown"
                        ? format(new Date(deploy.time), "MMM d, yyyy HH:mm")
                        : "unknown"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Environment</p>
                    <p className="text-lg capitalize">{deploy?.environment || "unknown"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{activeUsers?.totalActive || 0}</div>
                  <p className="text-xs text-muted-foreground">Last 15 minutes</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Recent Errors</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{errors?.totalErrors || 0}</div>
                  <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Database Size</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{dbInfo?.dbSize || "N/A"}</div>
                  <p className="text-xs text-muted-foreground">
                    {dbInfo?.activeConnections || 0} active connections
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* API Logs Tab */}
          <TabsContent value="logs" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent API Requests</CardTitle>
                <CardDescription>Last 50 API requests to the system</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Path</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logs?.logs?.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.createdAt), "HH:mm:ss")}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.method}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{log.path}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                log.status < 300
                                  ? "default"
                                  : log.status < 400
                                  ? "secondary"
                                  : log.status < 500
                                  ? "outline"
                                  : "destructive"
                              }
                            >
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{log.durationMs}ms</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Cron Jobs Tab */}
          <TabsContent value="cron" className="space-y-4">
            {/* Last Runs */}
            <div className="grid gap-4 md:grid-cols-3">
              {cronLogs?.lastRuns?.map((job: any) => (
                <Card key={job.jobName}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center justify-between">
                      {job.jobName.replace(/_/g, " ").toUpperCase()}
                      {job.lastRun?.status === "success" ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500" />
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {job.lastRun ? (
                      <>
                        <div className="space-y-2">
                          <div>
                            <p className="text-xs text-muted-foreground">Last Run</p>
                            <p className="text-sm">
                              {format(new Date(job.lastRun.createdAt), "MMM d, HH:mm:ss")}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Duration</p>
                            <p className="text-sm">{job.lastRun.durationMs}ms</p>
                          </div>
                          {job.lastRun.recordsProcessed !== null && (
                            <div>
                              <p className="text-xs text-muted-foreground">Records Processed</p>
                              <p className="text-sm">{job.lastRun.recordsProcessed}</p>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">No runs yet</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Full History */}
            <Card>
              <CardHeader>
                <CardTitle>Cron Job History</CardTitle>
                <CardDescription>Complete execution history for all cron jobs</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Time</TableHead>
                        <TableHead>Job Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Records</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cronLogs?.logs?.map((log: any) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm">
                            {format(new Date(log.createdAt), "MMM d, HH:mm")}
                          </TableCell>
                          <TableCell className="font-medium">{log.jobName}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === "success" ? "default" : "destructive"}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.durationMs}ms</TableCell>
                          <TableCell>{log.recordsProcessed || "-"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {log.message}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Database Tab */}
          <TabsContent value="database" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Database Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Size</p>
                    <p className="text-2xl font-bold">{dbInfo?.dbSize || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Connections</p>
                    <p className="text-2xl font-bold">{dbInfo?.activeConnections || 0}</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Largest Tables</CardTitle>
                  <CardDescription>Top tables by size</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {dbInfo?.tableSizes?.slice(0, 5).map((table: any) => (
                      <div key={table.table_name} className="flex justify-between items-center">
                        <span className="text-sm font-mono">{table.table_name}</span>
                        <Badge variant="outline">{table.size}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>All Tables</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Table Name</TableHead>
                        <TableHead className="text-right">Size</TableHead>
                        <TableHead className="text-right">Row Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dbInfo?.tableSizes?.map((table: any) => (
                        <TableRow key={table.table_name}>
                          <TableCell className="font-mono">{table.table_name}</TableCell>
                          <TableCell className="text-right">{table.size}</TableCell>
                          <TableCell className="text-right">
                            {table.row_count.toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Errors Tab */}
          <TabsContent value="errors" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Error Summary</CardTitle>
                <CardDescription>Errors grouped by endpoint (last 24 hours)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Path</TableHead>
                        <TableHead className="text-right">Count</TableHead>
                        <TableHead>Last Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errors?.grouped?.map((group: any) => (
                        <TableRow key={group.path}>
                          <TableCell className="font-mono">{group.path}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant="destructive">{group.count}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(group.lastError.createdAt), "MMM d, HH:mm:ss")}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!errors?.grouped || errors.grouped.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground">
                            No errors in the last 24 hours
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Active Users Tab */}
          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Active Users</CardTitle>
                <CardDescription>Users with activity in the last 15 minutes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Last Path</TableHead>
                        <TableHead>Last Active</TableHead>
                        <TableHead className="text-right">Requests</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {activeUsers?.activeUsers?.map((user: any) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge>{user.role}</Badge>
                          </TableCell>
                          <TableCell className="font-mono text-sm">{user.lastPath}</TableCell>
                          <TableCell className="text-sm">
                            {format(new Date(user.lastActive), "HH:mm:ss")}
                          </TableCell>
                          <TableCell className="text-right">{user.requestCount}</TableCell>
                        </TableRow>
                      ))}
                      {(!activeUsers?.activeUsers || activeUsers.activeUsers.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground">
                            No active users in the last 15 minutes
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
