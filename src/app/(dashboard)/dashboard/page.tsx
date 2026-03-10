"use client"
import { useState, useEffect, useCallback } from "react"
import { useQuery } from "@tanstack/react-query"
import {
  TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight,
  Wallet, Plus, RefreshCcw, Target, Trash2, CalendarDays, X
} from "lucide-react"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import Link from "next/link"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency, formatDate } from "@/lib/utils"

// --- Period filter types ---
type Period = "today" | "week" | "month" | "year" | "all"

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: "today", label: "Hoje" },
  { value: "week", label: "Esta Semana" },
  { value: "month", label: "Este M\u00eas" },
  { value: "year", label: "Este Ano" },
  { value: "all", label: "Tudo" },
]

// --- Financial goals types ---
interface FinancialGoal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string
}

const GOALS_STORAGE_KEY = "finance-goals"

function loadGoals(): FinancialGoal[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem(GOALS_STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveGoals(goals: FinancialGoal[]) {
  localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals))
}

// --- Fetch function with period ---
async function fetchDashboard(period: Period) {
  const res = await fetch(`/api/dashboard?period=${period}`)
  if (!res.ok) throw new Error("Falha ao carregar")
  return res.json()
}

// --- StatCard (unchanged) ---
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
                {Math.abs(change).toFixed(1)}% vs m\u00eas anterior
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

// --- Goal form component ---
function GoalForm({ onSave, onCancel }: { onSave: (goal: Omit<FinancialGoal, "id">) => void; onCancel: () => void }) {
  const [name, setName] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [currentAmount, setCurrentAmount] = useState("")
  const [deadline, setDeadline] = useState("")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || !targetAmount || !deadline) return
    onSave({
      name: name.trim(),
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount || "0"),
      deadline,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded-xl bg-muted/30">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Nova Meta</h4>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="goal-name" className="text-xs">Nome da meta</Label>
          <Input
            id="goal-name"
            placeholder="Ex: Viagem, Reserva de emerg\u00eancia..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal-target" className="text-xs">Valor alvo (R$)</Label>
          <Input
            id="goal-target"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={targetAmount}
            onChange={(e) => setTargetAmount(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="goal-current" className="text-xs">Valor atual (R$)</Label>
          <Input
            id="goal-current"
            type="number"
            min="0"
            step="0.01"
            placeholder="0,00"
            value={currentAmount}
            onChange={(e) => setCurrentAmount(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="goal-deadline" className="text-xs">Prazo</Label>
          <Input
            id="goal-deadline"
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            required
          />
        </div>
      </div>
      <Button type="submit" size="sm" className="w-full">
        Salvar Meta
      </Button>
    </form>
  )
}

const COLORS = ["#6366f1", "#f97316", "#10b981", "#f59e0b", "#ef4444", "#3b82f6"]

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("month")
  const [goals, setGoals] = useState<FinancialGoal[]>([])
  const [showGoalForm, setShowGoalForm] = useState(false)

  // Load goals from localStorage on mount
  useEffect(() => {
    setGoals(loadGoals())
  }, [])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard", period],
    queryFn: () => fetchDashboard(period),
    refetchInterval: 60000,
  })

  const handleAddGoal = useCallback((goalData: Omit<FinancialGoal, "id">) => {
    const newGoal: FinancialGoal = {
      ...goalData,
      id: crypto.randomUUID(),
    }
    const updated = [...goals, newGoal]
    setGoals(updated)
    saveGoals(updated)
    setShowGoalForm(false)
  }, [goals])

  const handleUpdateGoalAmount = useCallback((id: string, currentAmount: number) => {
    const updated = goals.map((g) => g.id === id ? { ...g, currentAmount } : g)
    setGoals(updated)
    saveGoals(updated)
  }, [goals])

  const handleDeleteGoal = useCallback((id: string) => {
    const updated = goals.filter((g) => g.id !== id)
    setGoals(updated)
    saveGoals(updated)
  }, [goals])

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

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === period)?.label ?? "Este M\u00eas"

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Cabe\u00e7alho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground text-sm">{format(new Date(), "MMMM yyyy", { locale: ptBR })}</p>
        </div>
        <Link href="/transactions?new=true">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transa\u00e7\u00e3o
          </Button>
        </Link>
      </div>

      {/* Feature 1: Period filter pills */}
      <div className="flex flex-wrap gap-2">
        {PERIOD_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setPeriod(opt.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              period === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Cards de estat\u00edsticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Saldo Total"
          value={formatCurrency(data.totalBalance)}
          icon={Wallet}
          color="bg-indigo-500"
          subtitle={`em ${data.accounts.length} conta${data.accounts.length !== 1 ? "s" : ""}`}
        />
        <StatCard
          title={`Gastos — ${periodLabel}`}
          value={formatCurrency(data.currentMonth.expenses)}
          change={period === "month" ? -expenseChange : undefined}
          icon={CreditCard}
          color="bg-red-500"
        />
        <StatCard
          title={`Receita — ${periodLabel}`}
          value={formatCurrency(data.currentMonth.income)}
          change={period === "month" ? incomeChange : undefined}
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

      {/* Linha de gr\u00e1ficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gr\u00e1fico de \u00e1rea */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receitas vs Gastos \u2014 \u00daltimos 6 meses</CardTitle>
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

        {/* Gr\u00e1fico de pizza */}
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

      {/* Feature 2: Balance evolution chart */}
      {data.balanceEvolution && data.balanceEvolution.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolu\u00e7\u00e3o Patrimonial</CardTitle>
            <CardDescription>Saldo total estimado nos \u00faltimos 12 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.balanceEvolution} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="balanceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip
                  formatter={(value: unknown) => formatCurrency(value as number)}
                  contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  name="Saldo"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  dot={{ fill: "#6366f1", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Linha inferior */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Or\u00e7amentos */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Progresso dos Or\u00e7amentos</CardTitle>
            <Link href="/budgets">
              <Button variant="ghost" size="sm" className="text-xs">Ver todos</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.budgets.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <p className="mb-3">Nenhum or\u00e7amento criado</p>
                <Link href="/budgets">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-3 w-3" />
                    Criar Or\u00e7amento
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

        {/* Transacoes recentes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Transacoes Recentes</CardTitle>
            <Link href="/transactions">
              <Button variant="ghost" size="sm" className="text-xs">Ver todas</Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-1">
            {data.recentTransactions.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <p className="mb-3">Nenhuma transacao ainda</p>
                <Link href="/transactions?new=true">
                  <Button variant="outline" size="sm">
                    <Plus className="mr-2 h-3 w-3" />
                    Adicionar Transacao
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
                      {tx.description ?? tx.merchant?.name ?? tx.category?.name ?? "Transacao"}
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

      {/* Feature 3: Financial goals */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" />
              Metas Financeiras
            </CardTitle>
            <CardDescription className="mt-1">Acompanhe o progresso das suas metas</CardDescription>
          </div>
          {!showGoalForm && (
            <Button variant="outline" size="sm" onClick={() => setShowGoalForm(true)}>
              <Plus className="mr-2 h-3 w-3" />
              Adicionar Meta
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {showGoalForm && (
            <GoalForm
              onSave={handleAddGoal}
              onCancel={() => setShowGoalForm(false)}
            />
          )}

          {goals.length === 0 && !showGoalForm ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Target className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="mb-3">Nenhuma meta financeira criada</p>
              <Button variant="outline" size="sm" onClick={() => setShowGoalForm(true)}>
                <Plus className="mr-2 h-3 w-3" />
                Criar sua primeira meta
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map((goal) => {
                const percentage = goal.targetAmount > 0
                  ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
                  : 0
                const isComplete = percentage >= 100
                const deadlineDate = new Date(goal.deadline)
                const isOverdue = deadlineDate < new Date() && !isComplete
                return (
                  <div
                    key={goal.id}
                    className="border rounded-xl p-4 space-y-3 bg-card"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold truncate">{goal.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          <span className={isOverdue ? "text-red-500 font-medium" : ""}>
                            {formatDate(goal.deadline)}
                            {isOverdue && " (vencida)"}
                          </span>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-red-500 flex-shrink-0"
                        onClick={() => handleDeleteGoal(goal.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-semibold tabular-nums">
                          {formatCurrency(goal.currentAmount)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          de {formatCurrency(goal.targetAmount)}
                        </span>
                      </div>
                      <Progress
                        value={percentage}
                        className="h-2"
                        indicatorClassName={
                          isComplete
                            ? "bg-emerald-500"
                            : isOverdue
                              ? "bg-red-500"
                              : percentage >= 75
                                ? "bg-amber-500"
                                : "bg-primary"
                        }
                      />
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${
                          isComplete ? "text-emerald-600" : isOverdue ? "text-red-500" : "text-muted-foreground"
                        }`}>
                          {percentage.toFixed(0)}%{isComplete && " concluida!"}
                        </span>
                      </div>
                    </div>
                    {/* Inline edit current amount */}
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="h-8 text-xs"
                        placeholder="Atualizar valor"
                        defaultValue={goal.currentAmount || ""}
                        onBlur={(e) => {
                          const val = parseFloat(e.target.value)
                          if (!isNaN(val) && val !== goal.currentAmount) {
                            handleUpdateGoalAmount(goal.id, val)
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            const val = parseFloat((e.target as HTMLInputElement).value)
                            if (!isNaN(val)) {
                              handleUpdateGoalAmount(goal.id, val)
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
