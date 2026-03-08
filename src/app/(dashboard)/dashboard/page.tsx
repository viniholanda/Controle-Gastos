"use client"
import { useQuery } from "@tanstack/react-query"
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight,
  Wallet, Plus, RefreshCcw
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { formatCurrency, formatDate } from "@/lib/utils"

async function fetchDashboard() {
  const res = await fetch("/api/dashboard")
  if (!res.ok) throw new Error("Falha ao carregar")
  return res.json()
}

function StatCard({
  title, value, change, icon: Icon, color, subtitle
}: {
  title: string
  value: string
  change?: number
  icon: React.ElementType
  color: string
  subtitle?: string
}) {
  const isPositive = (change ?? 0) >= 0
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            {change !== undefined && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${isPositive ? "text-emerald-600" : "text-red-500"}`}>
                {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {Math.abs(change).toFixed(1)}% vs mês anterior
              </div>
            )}
          </div>
          <div className={`p-3 rounded-xl ${color}`}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

const COLORS = ["#6366f1", "#f97316", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"]

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    refetchInterval: 60000,
  })

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[400px] text-center">
        <p className="text-muted-foreground mb-4">Falha ao carregar o dashboard</p>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCcw className="mr-2 h-4 w-4" />
          Tentar novamente
        </Button>
      </div>
    )
  }

  const expenseChange = data.previousMonth.expenses > 0
    ? ((data.currentMonth.expenses - data.previousMonth.expenses) / data.previousMonth.expenses) * 100
    : 0

  const incomeChange = data.previousMonth.income > 0
    ? ((data.currentMonth.income - data.previousMonth.income) / data.previousMonth.income) * 100
    : 0

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">{format(new Date(), "MMMM yyyy", { locale: ptBR })}</p>
        </div>
        <Link href="/transactions?new=true">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        </Link>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Saldo Total"
          value={formatCurrency(data.totalBalance)}
          icon={Wallet}
          color="bg-indigo-500"
          subtitle={`em ${data.accounts.length} conta${data.accounts.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          title="Gastos do Mês"
          value={formatCurrency(data.currentMonth.expenses)}
          change={-expenseChange}
          icon={CreditCard}
          color="bg-red-500"
        />
        <StatCard
          title="Receita do Mês"
          value={formatCurrency(data.currentMonth.income)}
          change={incomeChange}
          icon={TrendingUp}
          color="bg-emerald-500"
        />
        <StatCard
          title="Fluxo de Caixa"
          value={formatCurrency(data.currentMonth.netFlow)}
          icon={DollarSign}
          color={data.currentMonth.netFlow >= 0 ? "bg-blue-500" : "bg-orange-500"}
          subtitle={data.currentMonth.netFlow >= 0 ? "fluxo positivo" : "fluxo negativo"}
        />
      </div>

      {/* Linha de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gráfico de área */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receitas vs Gastos — Últimos 6 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={data.monthlyTrend} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="income" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="expenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: unknown) => formatCurrency(value as number)}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                />
                <Area type="monotone" dataKey="income" name="Receita" stroke="#10b981" fill="url(#income)" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" name="Gastos" stroke="#ef4444" fill="url(#expenses)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de pizza */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Gastos por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {data.topCategories.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                Sem dados ainda
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={data.topCategories}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="amount"
                    nameKey={(entry: any) => entry.category?.name ?? "Outros"}
                  >
                    {data.topCategories.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: unknown) => formatCurrency(v as number)} />
                  <Legend formatter={(value, entry: any) => entry.payload?.category?.name ?? value} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linha inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orçamentos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Progresso dos Orçamentos</CardTitle>
            <Link href="/budgets">
              <Button variant="ghost" size="sm" className="text-xs">Ver todos</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.budgets.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <p className="mb-3">Nenhum orçamento criado</p>
                <Link href="/budgets">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-3 w-3" />
                    Criar Orçamento
                  </Button>
                </Link>
              </div>
            ) : (
              data.budgets.slice(0, 5).map((budget: any) => (
                <div key={budget.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {budget.category && (
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: budget.category.color }}
                        />
                      )}
                      <span className="font-medium">{budget.name}</span>
                    </div>
                    <div className="text-right">
                      <span className={budget.isOver ? "text-red-500 font-medium" : "text-muted-foreground"}>
                        {formatCurrency(budget.spent)}
                      </span>
                      <span className="text-muted-foreground"> / {formatCurrency(budget.amount)}</span>
                    </div>
                  </div>
                  <Progress
                    value={budget.percentage}
                    className="h-1.5"
                    indicatorClassName={
                      budget.isOver
                        ? "bg-red-500"
                        : budget.isNearLimit
                          ? "bg-orange-500"
                          : "bg-primary"
                    }
                  />
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Transações recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Transações Recentes</CardTitle>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" className="text-xs">Ver todas</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.recentTransactions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <p className="mb-3">Nenhuma transação ainda</p>
                <Link href="/transactions?new=true">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-3 w-3" />
                    Adicionar Transação
                  </Button>
                </Link>
              </div>
            ) : (
              data.recentTransactions.slice(0, 8).map((tx: any) => (
                <div key={tx.id} className="flex items-center gap-3 py-2 hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-medium text-white"
                    style={{ background: tx.category?.color ?? "#6b7280" }}
                  >
                    {(tx.category?.name ?? tx.description ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {tx.description ?? tx.merchant?.name ?? tx.category?.name ?? "Transação"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {tx.account?.name} · {formatDate(tx.date)}
                    </p>
                  </div>
                  <div className={`text-sm font-semibold tabular-nums ${tx.type === "INCOME" ? "text-emerald-600" :
                      tx.type === "EXPENSE" ? "text-red-500" : "text-blue-500"
                    }`}>
                    {tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : ""}
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
