"use client"
import { Suspense, useState, useCallback, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSearchParams, useRouter } from "next/navigation"
import {
  Plus, Search, Filter, Download, Copy, Trash2, Edit2,
  ArrowUpDown, ChevronLeft, ChevronRight, ArrowUp, ArrowDown
} from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { formatCurrency, formatDate } from "@/lib/utils"
import { TransactionModal } from "@/components/transactions/transaction-modal"

const typeColors: Record<string, string> = {
  EXPENSE: "expense",
  INCOME: "income",
  TRANSFER: "transfer",
  REFUND: "success",
  ADJUSTMENT: "outline",
}

const typeLabels: Record<string, string> = {
  EXPENSE: "Gasto",
  INCOME: "Receita",
  TRANSFER: "Transferência",
  REFUND: "Reembolso",
  ADJUSTMENT: "Ajuste",
}

async function fetchTransactions(params: Record<string, string>) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`/api/transactions?${qs}`)
  if (!res.ok) throw new Error("Falha ao carregar")
  return res.json()
}

async function deleteTransaction(id: string) {
  const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" })
  if (!res.ok) throw new Error("Falha ao excluir")
}

function TransactionsContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()

  const [showModal, setShowModal] = useState(searchParams.get("new") === "true")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({
    type: "",
    startDate: "",
    endDate: "",
    accountId: "",
    categoryId: "",
  })

  const queryParams = {
    page: String(page),
    limit: "20",
    ...(search && { search }),
    ...Object.fromEntries(Object.entries(filters).filter(([, v]) => v)),
  }

  const { data, isLoading } = useQuery({
    queryKey: ["transactions", queryParams],
    queryFn: () => fetchTransactions(queryParams),
    placeholderData: (prev: unknown) => prev,
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTransaction,
    onSuccess: () => {
      toast.success("Transação excluída")
      queryClient.invalidateQueries({ queryKey: ["transactions"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: () => toast.error("Falha ao excluir a transação"),
  })

  const handleDelete = (id: string) => {
    if (confirm("Excluir esta transação?")) {
      deleteMutation.mutate(id)
    }
  }

  const handleModalClose = () => {
    setShowModal(false)
    setEditingId(null)
    router.replace("/transactions")
  }

  // Atalho de teclado: N = nova transação
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "n" && !e.ctrlKey && !e.metaKey &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)) {
        setShowModal(true)
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [])

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transações</h1>
          <p className="text-muted-foreground text-sm">
            {data?.pagination?.total ?? 0} no total · Pressione <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">N</kbd> para adicionar
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={async () => {
            try {
              const params = new URLSearchParams({ format: "csv" })
              if (search) params.set("search", search)
              if (filters.type) params.set("type", filters.type)
              if (filters.startDate) params.set("startDate", filters.startDate)
              if (filters.endDate) params.set("endDate", filters.endDate)
              if (filters.accountId) params.set("accountId", filters.accountId)
              if (filters.categoryId) params.set("categoryId", filters.categoryId)
              const res = await fetch(`/api/export?${params.toString()}`)
              if (!res.ok) throw new Error("Falha ao exportar")
              const blob = await res.blob()
              const url = window.URL.createObjectURL(blob)
              const a = document.createElement("a")
              a.href = url
              a.download = `fintrack-export-${new Date().toISOString().slice(0, 10)}.csv`
              document.body.appendChild(a)
              a.click()
              a.remove()
              window.URL.revokeObjectURL(url)
              toast.success("Exportação concluída")
            } catch {
              toast.error("Falha ao exportar transações")
            }
          }}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Transação
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Pesquisar transações..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="flex h-9 w-full rounded-lg border border-input bg-transparent pl-9 pr-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <Select value={filters.type || "all"} onValueChange={(v) => setFilters(f => ({ ...f, type: v === "all" ? "" : v }))}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Todos os tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                <SelectItem value="EXPENSE">Gasto</SelectItem>
                <SelectItem value="INCOME">Receita</SelectItem>
                <SelectItem value="TRANSFER">Transferência</SelectItem>
                <SelectItem value="REFUND">Reembolso</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Data inicial"
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
              className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Data final"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Data</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Descrição</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden md:table-cell">Categoria</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden lg:table-cell">Conta</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground hidden sm:table-cell">Tipo</th>
                <th className="text-right px-4 py-3 font-medium text-muted-foreground">Valor</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(10)].map((_, i) => (
                  <tr key={i} className="border-b animate-pulse">
                    <td className="px-4 py-3"><div className="h-4 bg-muted rounded w-20" /></td>
                    <td className="px-4 py-3"><div className="h-4 bg-muted rounded w-40" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><div className="h-4 bg-muted rounded w-24" /></td>
                    <td className="px-4 py-3 hidden sm:table-cell"><div className="h-5 bg-muted rounded w-16" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-4 bg-muted rounded w-20 ml-auto" /></td>
                    <td className="px-4 py-3" />
                  </tr>
                ))
              ) : data?.transactions?.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted-foreground">
                    <div className="space-y-2">
                      <p>Nenhuma transação encontrada</p>
                      <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
                        <Plus className="mr-2 h-3 w-3" />
                        Adicionar primeira transação
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                data?.transactions?.map((tx: any) => (
                  <tr key={tx.id} className="border-b hover:bg-muted/30 transition-colors group">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(tx.date)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium truncate max-w-[200px]">
                        {tx.description ?? tx.merchant?.name ?? tx.category?.name ?? "—"}
                      </div>
                      {tx.merchant?.name && tx.description && (
                        <div className="text-xs text-muted-foreground truncate">{tx.merchant.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {tx.category ? (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: tx.category.color }}
                          />
                          <span className="truncate max-w-[120px]">{tx.category.name}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {tx.account?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <Badge variant={typeColors[tx.type] as any}>
                        {typeLabels[tx.type] ?? tx.type.charAt(0) + tx.type.slice(1).toLowerCase()}
                      </Badge>
                    </td>
                    <td className={`px-4 py-3 text-right font-semibold tabular-nums whitespace-nowrap ${tx.type === "INCOME" ? "text-emerald-600" :
                        tx.type === "EXPENSE" ? "text-red-500" : "text-blue-500"
                      }`}>
                      {tx.type === "INCOME" ? "+" : tx.type === "EXPENSE" ? "-" : ""}
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingId(tx.id); setShowModal(true) }}
                          className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                          title="Editar"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(tx.id)}
                          className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                          title="Excluir"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginação */}
        {data?.pagination && data.pagination.pages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Exibindo {((page - 1) * 20) + 1}–{Math.min(page * 20, data.pagination.total)} de {data.pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">{page} / {data.pagination.pages}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(data.pagination.pages, p + 1))}
                disabled={page === data.pagination.pages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modal de transação */}
      <TransactionModal
        open={showModal}
        editId={editingId}
        onClose={handleModalClose}
      />
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="p-4 md:p-6 space-y-4 max-w-7xl mx-auto">
      <div className="h-8 bg-muted rounded w-48 animate-pulse" />
      <div className="h-16 bg-muted rounded animate-pulse" />
      <div className="h-64 bg-muted rounded animate-pulse" />
    </div>
  )
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <TransactionsContent />
    </Suspense>
  )
}
