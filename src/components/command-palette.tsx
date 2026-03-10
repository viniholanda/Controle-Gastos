"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  Search, LayoutDashboard, ArrowLeftRight, PiggyBank, BarChart3,
  Upload, Settings, Plus, FileDown, CreditCard, Loader2, ArrowRight,
  Wallet
} from "lucide-react"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

interface SearchResult {
  id: string
  type: "page" | "action" | "transaction"
  title: string
  subtitle?: string
  icon: React.ReactNode
  href?: string
  action?: () => void
}

const pages: SearchResult[] = [
  { id: "page-dashboard", type: "page", title: "Dashboard", subtitle: "Visão geral das finanças", icon: <LayoutDashboard className="h-4 w-4" />, href: "/dashboard" },
  { id: "page-transactions", type: "page", title: "Transações", subtitle: "Gerenciar transações", icon: <ArrowLeftRight className="h-4 w-4" />, href: "/transactions" },
  { id: "page-budgets", type: "page", title: "Orçamentos", subtitle: "Limites e metas", icon: <PiggyBank className="h-4 w-4" />, href: "/budgets" },
  { id: "page-reports", type: "page", title: "Relatórios", subtitle: "Gráficos e análises", icon: <BarChart3 className="h-4 w-4" />, href: "/reports" },
  { id: "page-import", type: "page", title: "Importar", subtitle: "Importar extratos e arquivos", icon: <Upload className="h-4 w-4" />, href: "/import" },
  { id: "page-settings", type: "page", title: "Configurações", subtitle: "Preferências e conta", icon: <Settings className="h-4 w-4" />, href: "/settings" },
]

const actions: SearchResult[] = [
  { id: "action-new-transaction", type: "action", title: "Nova Transação", subtitle: "Criar uma nova transação", icon: <Plus className="h-4 w-4" />, href: "/transactions?new=true" },
  { id: "action-new-account", type: "action", title: "Nova Conta", subtitle: "Adicionar conta bancária", icon: <Wallet className="h-4 w-4" />, href: "/settings?tab=accounts&new=true" },
  { id: "action-export", type: "action", title: "Exportar Dados", subtitle: "Exportar transações", icon: <FileDown className="h-4 w-4" />, href: "/reports?export=true" },
]

type GroupLabel = "Páginas" | "Ações" | "Transações"

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const [transactionResults, setTransactionResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const router = useRouter()

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("")
      setActiveIndex(0)
      setTransactionResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Search transactions with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (!query || query.length < 2) {
      setTransactionResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/transactions?search=${encodeURIComponent(query)}&limit=5`)
        if (res.ok) {
          const data = await res.json()
          const results: SearchResult[] = (data.transactions || []).map((t: any) => ({
            id: `txn-${t.id}`,
            type: "transaction" as const,
            title: t.description || "Sem descrição",
            subtitle: `${formatCurrency(t.amount)} · ${formatDate(t.date)} · ${t.account?.name || ""}`,
            icon: <CreditCard className="h-4 w-4" />,
            href: `/transactions?highlight=${t.id}`,
          }))
          setTransactionResults(results)
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  // Filter static results
  const lowerQuery = query.toLowerCase()
  const filteredPages = query
    ? pages.filter(
        (p) =>
          p.title.toLowerCase().includes(lowerQuery) ||
          p.subtitle?.toLowerCase().includes(lowerQuery)
      )
    : pages
  const filteredActions = query
    ? actions.filter(
        (a) =>
          a.title.toLowerCase().includes(lowerQuery) ||
          a.subtitle?.toLowerCase().includes(lowerQuery)
      )
    : actions

  // Group results
  const groups: { label: GroupLabel; items: SearchResult[] }[] = []
  if (filteredPages.length > 0) groups.push({ label: "Páginas", items: filteredPages })
  if (filteredActions.length > 0) groups.push({ label: "Ações", items: filteredActions })
  if (transactionResults.length > 0) groups.push({ label: "Transações", items: transactionResults })

  const allResults = groups.flatMap((g) => g.items)
  const totalResults = allResults.length

  // Handle selection
  const handleSelect = useCallback(
    (result: SearchResult) => {
      setOpen(false)
      if (result.action) {
        result.action()
      } else if (result.href) {
        router.push(result.href)
      }
    },
    [router]
  )

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault()
        setActiveIndex((i) => (i + 1) % Math.max(totalResults, 1))
      } else if (e.key === "ArrowUp") {
        e.preventDefault()
        setActiveIndex((i) => (i - 1 + Math.max(totalResults, 1)) % Math.max(totalResults, 1))
      } else if (e.key === "Enter" && totalResults > 0) {
        e.preventDefault()
        handleSelect(allResults[activeIndex])
      } else if (e.key === "Escape") {
        e.preventDefault()
        setOpen(false)
      }
    },
    [totalResults, activeIndex, allResults, handleSelect]
  )

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return
    const activeEl = listRef.current.querySelector(`[data-index="${activeIndex}"]`)
    activeEl?.scrollIntoView({ block: "nearest" })
  }, [activeIndex])

  // Reset active index when results change
  useEffect(() => {
    setActiveIndex(0)
  }, [query, transactionResults.length])

  if (!open) return null

  let globalIndex = -1

  return (
    <div className="fixed inset-0 z-[100]" onKeyDown={handleKeyDown}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-[20%] z-[101] w-full max-w-lg -translate-x-1/2 px-4 sm:px-0">
        <div className="overflow-hidden rounded-xl border bg-background shadow-2xl">
          {/* Search input */}
          <div className="flex items-center gap-3 border-b px-4">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar páginas, transações, ações..."
              className="flex-1 bg-transparent py-3.5 text-sm outline-none placeholder:text-muted-foreground"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground flex-shrink-0" />}
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[360px] overflow-y-auto p-2">
            {totalResults === 0 && query.length >= 2 && !loading && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhum resultado encontrado para &ldquo;{query}&rdquo;
              </div>
            )}

            {totalResults === 0 && query.length < 2 && query.length > 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Digite pelo menos 2 caracteres para buscar transações
              </div>
            )}

            {groups.map((group) => (
              <div key={group.label} className="mb-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                  {group.label}
                </div>
                {group.items.map((result) => {
                  globalIndex++
                  const idx = globalIndex
                  return (
                    <button
                      key={result.id}
                      data-index={idx}
                      onClick={() => handleSelect(result)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
                        idx === activeIndex
                          ? "bg-primary text-primary-foreground"
                          : "text-foreground hover:bg-accent"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-md flex-shrink-0",
                          idx === activeIndex
                            ? "bg-primary-foreground/20"
                            : "bg-muted"
                        )}
                      >
                        {result.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{result.title}</div>
                        {result.subtitle && (
                          <div
                            className={cn(
                              "text-xs truncate",
                              idx === activeIndex
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                            )}
                          >
                            {result.subtitle}
                          </div>
                        )}
                      </div>
                      <ArrowRight
                        className={cn(
                          "h-3.5 w-3.5 flex-shrink-0 opacity-0 transition-opacity",
                          idx === activeIndex && "opacity-100"
                        )}
                      />
                    </button>
                  )
                })}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center gap-4 border-t px-4 py-2.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↑</kbd>
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd>
              selecionar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">esc</kbd>
              fechar
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
