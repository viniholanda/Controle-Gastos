"use client"
import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Plus, Edit2, Trash2, AlertTriangle } from "lucide-react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { startOfMonth, endOfMonth, format } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { budgetSchema, type BudgetInput } from "@/lib/validations"
import { formatCurrency, formatDate } from "@/lib/utils"

async function fetchBudgets() {
  const res = await fetch("/api/budgets")
  if (!res.ok) throw new Error("Falha")
  return res.json()
}

async function fetchCategories() {
  const res = await fetch("/api/categories")
  if (!res.ok) throw new Error("Falha")
  return res.json()
}

const periodLabels: Record<string, string> = {
  MONTHLY: "Mensal",
  WEEKLY: "Semanal",
  YEARLY: "Anual",
}

export default function BudgetsPage() {
  const [showModal, setShowModal] = useState(false)
  const [editingBudget, setEditingBudget] = useState<any>(null)
  const queryClient = useQueryClient()

  const { data: budgets = [], isLoading } = useQuery({
    queryKey: ["budgets"],
    queryFn: fetchBudgets,
  })

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  })

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<BudgetInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(budgetSchema) as any,
    defaultValues: {
      period: "MONTHLY",
      alertAt: 80,
      startDate: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    },
  })

  const mutation = useMutation({
    mutationFn: async (data: BudgetInput) => {
      const url = editingBudget ? `/api/budgets/${editingBudget.id}` : "/api/budgets"
      const method = editingBudget ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error("Falha ao salvar orçamento")
      return res.json()
    },
    onSuccess: () => {
      toast.success(editingBudget ? "Orçamento atualizado" : "Orçamento criado")
      queryClient.invalidateQueries({ queryKey: ["budgets"] })
      setShowModal(false)
      setEditingBudget(null)
      reset()
    },
    onError: () => toast.error("Falha ao salvar orçamento"),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Falha")
    },
    onSuccess: () => {
      toast.success("Orçamento excluído")
      queryClient.invalidateQueries({ queryKey: ["budgets"] })
    },
    onError: () => toast.error("Falha ao excluir"),
  })

  const handleEdit = (budget: any) => {
    setEditingBudget(budget)
    reset({
      name: budget.name,
      categoryId: budget.categoryId ?? "",
      amount: Number(budget.amount),
      period: budget.period,
      alertAt: Number(budget.alertAt),
      startDate: format(new Date(budget.startDate), "yyyy-MM-dd"),
    })
    setShowModal(true)
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground text-sm">Monitore e controle seus gastos</p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Orçamento
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : budgets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground mb-4">Nenhum orçamento criado ainda</p>
            <Button onClick={() => setShowModal(true)} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Criar seu primeiro orçamento
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {budgets.map((budget: any) => {
            const spent = 0
            const amount = Number(budget.amount)
            const percentage = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0
            const isOver = spent > amount
            const isNear = percentage >= Number(budget.alertAt)

            return (
              <Card key={budget.id} className={isOver ? "border-red-200 dark:border-red-900" : ""}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {budget.category && (
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                          style={{ background: budget.category.color ?? "#6366f1" }}
                        >
                          {budget.category.name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold">{budget.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {budget.category?.name ?? "Todas as categorias"} · {periodLabels[budget.period] ?? budget.period}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isOver && (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Acima do limite
                        </Badge>
                      )}
                      {!isOver && isNear && (
                        <Badge variant="warning" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Próximo do limite
                        </Badge>
                      )}
                      <button
                        onClick={() => handleEdit(budget)}
                        className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => confirm("Excluir este orçamento?") && deleteMutation.mutate(budget.id)}
                        className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className={isOver ? "text-red-500 font-medium" : "text-muted-foreground"}>
                        {formatCurrency(spent)} gasto
                      </span>
                      <span className="font-medium">{formatCurrency(amount)} de orçamento</span>
                    </div>
                    <Progress
                      value={percentage}
                      className="h-2"
                      indicatorClassName={
                        isOver ? "bg-red-500" : isNear ? "bg-orange-500" : "bg-primary"
                      }
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{percentage.toFixed(0)}% utilizado</span>
                      <span>{formatCurrency(amount - spent)} restante</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Dialog open={showModal} onOpenChange={(o) => { if (!o) { setShowModal(false); setEditingBudget(null); reset() } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingBudget ? "Editar Orçamento" : "Novo Orçamento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit((d) => mutation.mutate(d as unknown as BudgetInput))} className="space-y-4">
            <Input
              label="Nome do orçamento"
              placeholder="Ex: Alimentação, Lazer"
              error={errors.name?.message}
              {...register("name")}
            />
            <div>
              <label className="block text-sm font-medium mb-1.5">Categoria (opcional)</label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? "all"} onValueChange={(val) => field.onChange(val === "all" ? "" : val)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as categorias</SelectItem>
                      {categories.map((c: any) => (
                        <SelectItem key={c.id} value={c.id} textValue={c.name}>
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
                            {c.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Input
              label="Valor do orçamento (R$)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              error={errors.amount?.message}
              {...register("amount", { valueAsNumber: true })}
            />
            <div>
              <label className="block text-sm font-medium mb-1.5">Período</label>
              <Controller
                name="period"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Mensal</SelectItem>
                      <SelectItem value="WEEKLY">Semanal</SelectItem>
                      <SelectItem value="YEARLY">Anual</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Input
              label="Alertar em (%)"
              type="number"
              min="1"
              max="100"
              hint="Enviar alerta quando este % do orçamento for utilizado"
              error={errors.alertAt?.message}
              {...register("alertAt", { valueAsNumber: true })}
            />
            <Input
              label="Data de início"
              type="date"
              error={errors.startDate?.message}
              {...register("startDate")}
            />
            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => { setShowModal(false); setEditingBudget(null); reset() }} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" loading={mutation.isPending}>
                {editingBudget ? "Atualizar" : "Criar"} Orçamento
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
