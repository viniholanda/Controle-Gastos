"use client"
import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Download } from "lucide-react"
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts"
import { format, startOfYear } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { formatCurrency } from "@/lib/utils"

const COLORS = ["#6366f1", "#f97316", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#8b5cf6", "#ec4899"]

async function fetchReports(startDate: string, endDate: string) {
  const params = new URLSearchParams({ startDate, endDate })
  const res = await fetch(`/api/reports?${params}`)
  if (!res.ok) throw new Error("Falha")
  return res.json()
}

export default function ReportsPage() {
  const now = new Date()
  const [startDate, setStartDate] = useState(format(startOfYear(now), "yyyy-MM-dd"))
  const [endDate, setEndDate] = useState(format(now, "yyyy-MM-dd"))

  const { data, isLoading } = useQuery({
    queryKey: ["reports", startDate, endDate],
    queryFn: () => fetchReports(startDate, endDate),
  })

  const totalExpenses = data?.expensesByCategory?.reduce((s: number, c: any) => s + c.amount, 0) ?? 0
  const totalIncome = data?.incomeByCategory?.reduce((s: number, c: any) => s + c.amount, 0) ?? 0

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground text-sm">Analise seus dados financeiros</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <span className="text-muted-foreground text-sm">até</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total de Gastos</p>
            <p className="text-2xl font-bold text-red-500 mt-1">{formatCurrency(totalExpenses)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Total de Receitas</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalIncome)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Resultado Líquido</p>
            <p className={`text-2xl font-bold mt-1 ${totalIncome - totalExpenses >= 0 ? "text-blue-500" : "text-orange-500"}`}>
              {formatCurrency(totalIncome - totalExpenses)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="categories">Categorias</TabsTrigger>
          <TabsTrigger value="merchants">Estabelecimentos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receitas vs Gastos Mensais</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-64 bg-muted animate-pulse rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data?.monthlyData ?? []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(v: unknown) => formatCurrency(v as number)}
                      contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                    />
                    <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Fluxo de Caixa Líquido</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-48 bg-muted animate-pulse rounded-lg" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={data?.monthlyData ?? []} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v: unknown) => formatCurrency(v as number)} contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                    <Line type="monotone" dataKey="net" name="Líquido" stroke="#6366f1" strokeWidth={2} dot={{ fill: "#6366f1" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Gastos por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-64 bg-muted animate-pulse rounded-lg" />
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={data?.expensesByCategory ?? []} cx="50%" cy="50%" outerRadius={90} paddingAngle={3} dataKey="amount" nameKey={(e: any) => e.category?.name}>
                        {(data?.expensesByCategory ?? []).map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v: unknown) => formatCurrency(v as number)} />
                      <Legend formatter={(_, e: any) => e.payload?.category?.name ?? "Outros"} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Detalhamento por Categoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(data?.expensesByCategory ?? []).map((item: any, i: number) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="text-sm">{item.category?.name ?? "Outros"}</span>
                        <span className="text-xs text-muted-foreground">({item.count})</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">{formatCurrency(item.amount)}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {totalExpenses > 0 ? ((item.amount / totalExpenses) * 100).toFixed(0) : 0}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {!isLoading && (data?.expensesByCategory ?? []).length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-4">Sem dados para este período</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="merchants" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Principais Estabelecimentos por Gasto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(data?.topMerchants ?? []).map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {(item.merchant?.name ?? "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium truncate">{item.merchant?.name ?? "Desconhecido"}</span>
                        <span className="text-sm font-semibold ml-2">{formatCurrency(item.amount)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{item.count} transações</span>
                        <span>{totalExpenses > 0 ? ((item.amount / totalExpenses) * 100).toFixed(1) : 0}%</span>
                      </div>
                    </div>
                  </div>
                ))}
                {!isLoading && (data?.topMerchants ?? []).length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-4">Sem dados de estabelecimentos ainda</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
