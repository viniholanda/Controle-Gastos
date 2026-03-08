"use client"
import { useEffect, useState, useCallback } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Receipt,
  Save, X, ChevronDown, Tag, SplitSquareVertical, ScanLine
} from "lucide-react"
import { transactionSchema, type TransactionInput } from "@/lib/validations"
import { parseNaturalDate, formatCurrency, cn } from "@/lib/utils"
import { ReceiptScanner } from "@/components/transactions/receipt-scanner"
import type { ReceiptData } from "@/lib/ocr"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

const TYPES = [
  { value: "EXPENSE", label: "Gasto", icon: ArrowDownCircle, color: "text-red-500" },
  { value: "INCOME", label: "Receita", icon: ArrowUpCircle, color: "text-emerald-600" },
  { value: "TRANSFER", label: "Transferência", icon: ArrowLeftRight, color: "text-blue-500" },
  { value: "REFUND", label: "Reembolso", icon: Receipt, color: "text-orange-500" },
]

interface Props {
  open: boolean
  editId?: string | null
  onClose: () => void
}

export function TransactionModal({ open, editId, onClose }: Props) {
  const queryClient = useQueryClient()
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [dateInput, setDateInput] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])

  const {
    register, handleSubmit, control, watch, reset, setValue,
    formState: { errors, isDirty },
  } = useForm<TransactionInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      type: "EXPENSE",
      currency: "BRL",
      date: format(new Date(), "yyyy-MM-dd"),
    },
  })

  const watchType = watch("type")

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetch("/api/accounts").then((r) => r.ok ? r.json() : []),
    enabled: open,
  })
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.ok ? r.json() : []),
    enabled: open,
  })
  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => fetch("/api/tags").then((r) => r.ok ? r.json() : []),
    enabled: open,
  })

  const { data: editData } = useQuery({
    queryKey: ["transaction", editId],
    queryFn: () => fetch(`/api/transactions/${editId}`).then((r) => r.json()),
    enabled: !!editId && open,
  })

  useEffect(() => {
    if (editData) {
      reset({
        type: editData.type,
        accountId: editData.accountId,
        categoryId: editData.categoryId ?? "",
        amount: Number(editData.amount),
        description: editData.description ?? "",
        notes: editData.notes ?? "",
        date: format(new Date(editData.date), "yyyy-MM-dd"),
        currency: editData.currency,
        paymentMethod: editData.paymentMethod ?? "",
      })
      setSelectedTags(editData.tags?.map((t: any) => t.tagId) ?? [])
      setDateInput(format(new Date(editData.date), "yyyy-MM-dd"))
    }
  }, [editData, reset])

  useEffect(() => {
    if (accounts?.length && !editId) {
      const defaultAccount = accounts.find((a: any) => a.isDefault) ?? accounts[0]
      if (defaultAccount) setValue("accountId", defaultAccount.id)
    }
  }, [accounts, editId, setValue])

  const mutation = useMutation({
    mutationFn: async (data: TransactionInput) => {
      const url = editId ? `/api/transactions/${editId}` : "/api/transactions"
      const method = editId ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, tags: selectedTags }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Falha ao salvar")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(editId ? "Transação atualizada" : "Transação salva")
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
      handleClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleReceiptResult = useCallback((data: ReceiptData) => {
    if (data.amount) setValue("amount", data.amount)
    if (data.date) {
      setValue("date", data.date)
      setDateInput(data.date)
    }
    if (data.description) setValue("description", data.description)
    if (data.paymentMethod) {
      setValue("paymentMethod", data.paymentMethod)
      setShowAdvanced(true)
    }
    setShowScanner(false)
    toast.success("Dados do cupom preenchidos!")
  }, [setValue])

  const handleClose = useCallback(() => {
    reset()
    setSelectedTags([])
    setShowAdvanced(false)
    setShowScanner(false)
    setDateInput("")
    onClose()
  }, [reset, onClose])

  const handleDateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const val = e.target.value
    const parsed = parseNaturalDate(val)
    if (parsed) {
      const formatted = format(parsed, "yyyy-MM-dd")
      setValue("date", formatted)
      setDateInput(formatted)
    }
  }

  const toggleTag = (tagId: string) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId]
    )
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose()
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        handleSubmit((data) => mutation.mutate(data as unknown as TransactionInput))()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [open, handleClose, handleSubmit, mutation])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-8">
            <DialogTitle>
              {editId ? "Editar Transação" : "Nova Transação"}
            </DialogTitle>
            {!editId && !showScanner && (
              <button
                type="button"
                onClick={() => setShowScanner(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
              >
                <ScanLine className="h-3.5 w-3.5" />
                Escanear Cupom
              </button>
            )}
          </div>
        </DialogHeader>

        {showScanner ? (
          <ReceiptScanner
            onResult={handleReceiptResult}
            onClose={() => setShowScanner(false)}
          />
        ) : (
        <form onSubmit={handleSubmit((data) => mutation.mutate(data as unknown as TransactionInput))} className="space-y-4">
          {/* Abas de tipo de transação */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-muted rounded-lg">
            {TYPES.map((type) => {
              const Icon = type.icon
              const active = watchType === type.value
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setValue("type", type.value as any)}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 px-1 rounded-md text-xs font-medium transition-all",
                    active
                      ? "bg-background shadow-sm text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-4 w-4", active && type.color)} />
                  {type.label}
                </button>
              )
            })}
          </div>

          {/* Valor */}
          <div className="relative">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-muted-foreground">
              R$
            </div>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              autoFocus={!editId}
              className={cn(
                "w-full h-14 rounded-xl border-2 bg-transparent pl-12 pr-4 text-2xl font-bold tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors",
                errors.amount ? "border-destructive" : "border-input",
                watchType === "INCOME" && "text-emerald-600",
                watchType === "EXPENSE" && "text-red-500",
                watchType === "TRANSFER" && "text-blue-500",
              )}
              {...register("amount", { valueAsNumber: true })}
            />
            {errors.amount && (
              <p className="mt-1 text-xs text-destructive">{errors.amount.message}</p>
            )}
          </div>

          {/* Data */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Data</label>
            <input
              type="date"
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={dateInput || watch("date")}
              onChange={(e) => { setDateInput(e.target.value); setValue("date", e.target.value) }}
              onBlur={handleDateBlur}
            />
          </div>

          {/* Conta */}
          <div>
            <label className="block text-sm font-medium mb-1.5">Conta</label>
            <Controller
              name="accountId"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger error={errors.accountId?.message}>
                    <SelectValue placeholder="Selecionar conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map((account: any) => (
                      <SelectItem key={account.id} value={account.id} textValue={account.name}>
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: account.color ?? "#6366f1" }} />
                          {account.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Conta destino (transferência) */}
          {watchType === "TRANSFER" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Conta Destino</label>
              <Controller
                name="transferToId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Conta de destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts?.map((account: any) => (
                        <SelectItem key={account.id} value={account.id} textValue={account.name}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Categoria */}
          {watchType !== "TRANSFER" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Categoria</label>
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar categoria (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.filter((c: any) => !c.parentId).map((category: any) => (
                        <div key={category.id}>
                          <SelectItem value={category.id} textValue={category.name}>
                            <div className="flex items-center gap-2">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: category.color }} />
                              {category.name}
                            </div>
                          </SelectItem>
                          {category.children?.map((child: any) => (
                            <SelectItem key={child.id} value={child.id} textValue={child.name}>
                              <div className="flex items-center gap-2 pl-4">
                                <div className="w-2 h-2 rounded-full" style={{ background: child.color }} />
                                {child.name}
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Descrição */}
          <Input
            label="Descrição (opcional)"
            placeholder="Para que foi isso?"
            error={errors.description?.message}
            {...register("description")}
          />

          {/* Etiquetas */}
          {tags?.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Etiquetas</label>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag: any) => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-all",
                      selectedTags.includes(tag.id)
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: tag.color }} />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Opções avançadas */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", showAdvanced && "rotate-180")} />
            {showAdvanced ? "Ocultar" : "Mostrar"} opções avançadas
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-2 border-t">
              <Input
                label="Forma de pagamento"
                placeholder="Ex: Cartão de crédito, PIX, Dinheiro"
                {...register("paymentMethod")}
              />
              <Input
                label="Referência / Número da nota"
                placeholder="Referência opcional"
                {...register("reference")}
              />
              <Textarea
                label="Observações"
                placeholder="Observações adicionais..."
                {...register("notes")}
              />
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" loading={mutation.isPending}>
              <Save className="mr-2 h-4 w-4" />
              {editId ? "Atualizar" : "Salvar"}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Pressione <kbd className="px-1 py-0.5 bg-muted rounded font-mono">Ctrl+Enter</kbd> para salvar
          </p>
        </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
