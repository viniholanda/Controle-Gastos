"use client"
import { useState, useEffect, useCallback } from "react"
import { useTheme } from "next-themes"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { User, CreditCard, Palette, Globe, Plus, Trash2, Edit2, Wallet, Banknote, Smartphone, TrendingUp, HelpCircle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AccountModal } from "@/components/accounts/account-modal"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getInitials, cn } from "@/lib/utils"

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  CASH: "Dinheiro / Carteira",
  BANK_ACCOUNT: "Conta Bancária",
  CREDIT_CARD: "Cartão de Crédito",
  DIGITAL_WALLET: "Carteira Digital",
  INVESTMENT: "Investimento",
  OTHER: "Outro",
}

const ACCOUNT_TYPE_ICONS: Record<string, React.ElementType> = {
  CASH: Banknote,
  BANK_ACCOUNT: Wallet,
  CREDIT_CARD: CreditCard,
  DIGITAL_WALLET: Smartphone,
  INVESTMENT: TrendingUp,
  OTHER: HelpCircle,
}

const COLOR_PRESETS = [
  "#6366f1", "#3b82f6", "#10b981", "#f59e0b",
  "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f97316", "#06b6d4", "#84cc16", "#6b7280",
]

// ─── Category Modal ──────────────────────────────────────────────────────────

function CategoryModal({
  open,
  editData,
  parentCategories,
  onClose,
}: {
  open: boolean
  editData: any | null
  parentCategories: any[]
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const isEditing = !!editData

  const [name, setName] = useState("")
  const [color, setColor] = useState("#6366f1")
  const [parentId, setParentId] = useState<string>("none")

  // Sync editData to form state when it changes
  const [prevEditData, setPrevEditData] = useState<any>(null)
  if (editData !== prevEditData) {
    setPrevEditData(editData)
    if (editData) {
      setName(editData.name ?? "")
      setColor(editData.color ?? "#6366f1")
      setParentId(editData.parentId ?? "none")
    } else {
      setName("")
      setColor("#6366f1")
      setParentId("none")
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const url = isEditing ? `/api/categories/${editData.id}` : "/api/categories"
      const method = isEditing ? "PATCH" : "POST"
      const body: any = { name, color }
      if (parentId && parentId !== "none") body.parentId = parentId
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Falha ao salvar categoria")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(isEditing ? "Categoria atualizada" : "Categoria criada")
      queryClient.invalidateQueries({ queryKey: ["categories"] })
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Nome é obrigatório")
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Categoria" : "Nova Categoria"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome *"
            placeholder="Ex: Alimentação, Transporte"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium mb-2">Cor</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all",
                    color === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">Categoria pai (opcional)</label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger>
                <SelectValue placeholder="Nenhuma (categoria raiz)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma (categoria raiz)</SelectItem>
                {parentCategories
                  .filter((c: any) => c.id !== editData?.id)
                  .map((cat: any) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ background: cat.color }} />
                        {cat.name}
                      </span>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Tag Modal ───────────────────────────────────────────────────────────────

function TagModal({
  open,
  editData,
  onClose,
}: {
  open: boolean
  editData: any | null
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const isEditing = !!editData

  const [name, setName] = useState("")
  const [color, setColor] = useState("#6366f1")

  const [prevEditData, setPrevEditData] = useState<any>(null)
  if (editData !== prevEditData) {
    setPrevEditData(editData)
    if (editData) {
      setName(editData.name ?? "")
      setColor(editData.color ?? "#6366f1")
    } else {
      setName("")
      setColor("#6366f1")
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const url = isEditing ? `/api/tags/${editData.id}` : "/api/tags"
      const method = isEditing ? "PATCH" : "POST"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? "Falha ao salvar etiqueta")
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success(isEditing ? "Etiqueta atualizada" : "Etiqueta criada")
      queryClient.invalidateQueries({ queryKey: ["tags"] })
      onClose()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("Nome é obrigatório")
      return
    }
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Etiqueta" : "Nova Etiqueta"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nome *"
            placeholder="Ex: Urgente, Recorrente"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium mb-2">Cor</label>
            <div className="flex flex-wrap gap-2">
              {COLOR_PRESETS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-all",
                    color === c ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {isEditing ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ─── Settings Page ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { theme, setTheme } = useTheme()
  const queryClient = useQueryClient()
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<any>(null)

  // Category modal state
  const [showCategoryModal, setShowCategoryModal] = useState(false)
  const [editingCategory, setEditingCategory] = useState<any>(null)

  // Tag modal state
  const [showTagModal, setShowTagModal] = useState(false)
  const [editingTag, setEditingTag] = useState<any>(null)

  const [notifications, setNotifications] = useState({
    budgetAlerts: true,
    unusualSpending: true,
    billReminders: true,
  })
  const [regional, setRegional] = useState({
    currency: "BRL",
    dateFormat: "DD/MM/AAAA",
  })

  useEffect(() => {
    try {
      const saved = localStorage.getItem("fintrack-preferences")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.notifications) setNotifications(parsed.notifications)
        if (parsed.regional) setRegional(parsed.regional)
      }
    } catch {}
  }, [])

  const savePreferences = useCallback(
    (newNotifications: typeof notifications, newRegional: typeof regional) => {
      const prefs = { notifications: newNotifications, regional: newRegional }
      localStorage.setItem("fintrack-preferences", JSON.stringify(prefs))
    },
    []
  )

  const handleNotificationChange = (key: keyof typeof notifications, value: boolean) => {
    const updated = { ...notifications, [key]: value }
    setNotifications(updated)
    savePreferences(updated, regional)
  }

  const handleRegionalChange = (key: keyof typeof regional, value: string) => {
    const updated = { ...regional, [key]: value }
    setRegional(updated)
    savePreferences(notifications, updated)
  }

  const { data: accounts = [] } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => fetch("/api/accounts").then((r) => r.ok ? r.json() : []),
  })

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.ok ? r.json() : []),
  })

  const { data: tags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: () => fetch("/api/tags").then((r) => r.ok ? r.json() : []),
  })

  // ─── Account mutations ──────────────────────────────────────────────────

  const deleteAccountMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/accounts/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir")
    },
    onSuccess: () => {
      toast.success("Conta excluída")
      queryClient.invalidateQueries({ queryKey: ["accounts"] })
      queryClient.invalidateQueries({ queryKey: ["dashboard"] })
    },
    onError: () => toast.error("Falha ao excluir a conta"),
  })

  const handleDeleteAccount = (id: string, name: string) => {
    if (confirm(`Excluir a conta "${name}"? Esta ação não pode ser desfeita.`)) {
      deleteAccountMutation.mutate(id)
    }
  }

  // ─── Category mutations ─────────────────────────────────────────────────

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir")
    },
    onSuccess: () => {
      toast.success("Categoria excluída")
      queryClient.invalidateQueries({ queryKey: ["categories"] })
    },
    onError: () => toast.error("Falha ao excluir a categoria"),
  })

  const handleDeleteCategory = (id: string, name: string) => {
    if (confirm(`Excluir a categoria "${name}"? Transações vinculadas perderão esta categoria.`)) {
      deleteCategoryMutation.mutate(id)
    }
  }

  // ─── Tag mutations ──────────────────────────────────────────────────────

  const deleteTagMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/tags/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Falha ao excluir")
    },
    onSuccess: () => {
      toast.success("Etiqueta excluída")
      queryClient.invalidateQueries({ queryKey: ["tags"] })
    },
    onError: () => toast.error("Falha ao excluir a etiqueta"),
  })

  const handleDeleteTag = (id: string, name: string) => {
    if (confirm(`Excluir a etiqueta "${name}"?`)) {
      deleteTagMutation.mutate(id)
    }
  }

  const user = { name: "Demo", email: "demo@fintrack.app", image: null }

  const parentCategories = categories.filter((c: any) => !c.parentId)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-muted-foreground text-sm">Gerencie sua conta e preferências</p>
      </div>

      <Tabs defaultValue="profile">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Perfil
          </TabsTrigger>
          <TabsTrigger value="accounts">
            <CreditCard className="mr-2 h-4 w-4" />
            Contas
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Globe className="mr-2 h-4 w-4" />
            Categorias
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Palette className="mr-2 h-4 w-4" />
            Preferências
          </TabsTrigger>
        </TabsList>

        {/* Aba Perfil */}
        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>Atualize suas informações pessoais</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={user?.image ?? ""} />
                  <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                    {user?.name ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <Button variant="outline" size="sm" className="mt-2">
                    Alterar foto
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nome completo" defaultValue={user?.name ?? ""} />
                <Input label="E-mail" type="email" defaultValue={user?.email ?? ""} disabled />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Alterar Senha</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input label="Senha atual" type="password" placeholder="••••••••" />
                  <Input label="Nova senha" type="password" placeholder="••••••••" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => toast.success("Perfil atualizado")}>Salvar Alterações</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Contas */}
        <TabsContent value="accounts">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Contas Financeiras</CardTitle>
                <CardDescription>Gerencie suas contas e saldos</CardDescription>
              </div>
              <Button size="sm" onClick={() => { setEditingAccount(null); setShowAccountModal(true) }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova Conta
              </Button>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3">
                    <Wallet className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="font-medium mb-1">Nenhuma conta cadastrada</p>
                  <p className="text-sm text-muted-foreground mb-4">Adicione suas contas bancárias, cartões e carteiras</p>
                  <Button onClick={() => { setEditingAccount(null); setShowAccountModal(true) }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeira Conta
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {accounts.map((account: any) => {
                    const TypeIcon = ACCOUNT_TYPE_ICONS[account.type] ?? Wallet
                    const balance = Number(account.currentBalance)
                    const isNegative = balance < 0
                    return (
                      <div key={account.id} className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/30 transition-colors group">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white flex-shrink-0"
                          style={{ background: account.color ?? "#6366f1" }}
                        >
                          <TypeIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{account.name}</p>
                            {account.isDefault && <Badge variant="secondary" className="text-xs">Padrão</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {ACCOUNT_TYPE_LABELS[account.type] ?? account.type}
                            {account.institution ? ` · ${account.institution}` : ""}
                            {account.lastFour ? ` ···· ${account.lastFour}` : ""}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold tabular-nums ${isNegative ? "text-red-500" : ""}`}>
                            {isNegative ? "-" : ""}R$ {Math.abs(balance).toFixed(2).replace(".", ",")}
                          </p>
                          <p className="text-xs text-muted-foreground">Saldo atual</p>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingAccount(account); setShowAccountModal(true) }}
                            className="p-1.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                            title="Editar"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id, account.name)}
                            className="p-1.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Categorias */}
        <TabsContent value="categories">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Categorias</CardTitle>
                <CardDescription>Organize suas transações</CardDescription>
              </div>
              <Button size="sm" onClick={() => { setEditingCategory(null); setShowCategoryModal(true) }}>
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Categoria
              </Button>
            </CardHeader>
            <CardContent>
              {parentCategories.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-14 h-14 bg-muted rounded-full flex items-center justify-center mb-3">
                    <Globe className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <p className="font-medium mb-1">Nenhuma categoria cadastrada</p>
                  <p className="text-sm text-muted-foreground mb-4">Crie categorias para organizar suas transações</p>
                  <Button onClick={() => { setEditingCategory(null); setShowCategoryModal(true) }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar Primeira Categoria
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {parentCategories.map((cat: any) => (
                    <div key={cat.id} className="p-3 rounded-lg border hover:bg-muted/30 transition-colors group">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ background: cat.color }}
                        >
                          {cat.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{cat.name}</p>
                          {cat.children?.length > 0 && (
                            <p className="text-xs text-muted-foreground">{cat.children.length} subcategorias</p>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingCategory(cat); setShowCategoryModal(true) }}
                            className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                            title="Editar"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id, cat.name)}
                            className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      {cat.children?.length > 0 && (
                        <div className="mt-2 ml-11 space-y-1">
                          {cat.children.map((sub: any) => (
                            <div key={sub.id} className="flex items-center gap-2 group/sub">
                              <div
                                className="w-2 h-2 rounded-full flex-shrink-0"
                                style={{ background: sub.color }}
                              />
                              <span className="text-xs text-muted-foreground flex-1">{sub.name}</span>
                              <div className="flex gap-0.5 opacity-0 group-hover/sub:opacity-100 transition-opacity">
                                <button
                                  onClick={() => { setEditingCategory(sub); setShowCategoryModal(true) }}
                                  className="p-0.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
                                  title="Editar"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteCategory(sub.id, sub.name)}
                                  className="p-0.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive"
                                  title="Excluir"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <Separator className="my-6" />

              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Etiquetas</h3>
                <Button size="sm" variant="outline" onClick={() => { setEditingTag(null); setShowTagModal(true) }}>
                  <Plus className="mr-1 h-3 w-3" />
                  Adicionar Etiqueta
                </Button>
              </div>
              {tags.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma etiqueta ainda</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: any) => (
                    <div
                      key={tag.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs group/tag hover:bg-muted/30 transition-colors"
                    >
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: tag.color }} />
                      <span>{tag.name}</span>
                      <button
                        onClick={() => { setEditingTag(tag); setShowTagModal(true) }}
                        className="p-0.5 hover:bg-accent rounded text-muted-foreground hover:text-foreground opacity-0 group-hover/tag:opacity-100 transition-opacity"
                        title="Editar"
                      >
                        <Edit2 className="h-2.5 w-2.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTag(tag.id, tag.name)}
                        className="p-0.5 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive opacity-0 group-hover/tag:opacity-100 transition-opacity"
                        title="Excluir"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Aba Preferências */}
        <TabsContent value="preferences">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Aparência</CardTitle>
                <CardDescription>Personalize a aparência do FinTrack</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Modo escuro</Label>
                    <p className="text-sm text-muted-foreground">Alternar entre temas claro e escuro</p>
                  </div>
                  <Switch
                    checked={theme === "dark"}
                    onCheckedChange={(c) => setTheme(c ? "dark" : "light")}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>Configure as preferências de alerta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {([
                  { key: "budgetAlerts" as const, label: "Alertas de orçamento", desc: "Notificar ao se aproximar do limite do orçamento" },
                  { key: "unusualSpending" as const, label: "Gastos incomuns", desc: "Alertar sobre padrões de gasto inesperados" },
                  { key: "billReminders" as const, label: "Lembretes de contas", desc: "Lembrar de contas a vencer" },
                ]).map((item) => (
                  <div key={item.key} className="flex items-center justify-between">
                    <div>
                      <Label>{item.label}</Label>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key]}
                      onCheckedChange={(checked) => handleNotificationChange(item.key, checked)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Regional</CardTitle>
                <CardDescription>Moeda, fuso horário e formato de data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1.5 block">Moeda</Label>
                    <select
                      value={regional.currency}
                      onChange={(e) => handleRegionalChange("currency", e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="BRL">BRL — Real Brasileiro</option>
                      <option value="USD">USD — Dólar Americano</option>
                      <option value="EUR">EUR — Euro</option>
                    </select>
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Formato de data</Label>
                    <select
                      value={regional.dateFormat}
                      onChange={(e) => handleRegionalChange("dateFormat", e.target.value)}
                      className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="DD/MM/AAAA">DD/MM/AAAA</option>
                      <option value="MM/DD/AAAA">MM/DD/AAAA</option>
                      <option value="AAAA-MM-DD">AAAA-MM-DD</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => {
                    savePreferences(notifications, regional)
                    toast.success("Preferências salvas")
                  }}>Salvar Preferências</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Modal de conta */}
      <AccountModal
        open={showAccountModal}
        editData={editingAccount}
        onClose={() => {
          setShowAccountModal(false)
          setEditingAccount(null)
        }}
      />

      {/* Modal de categoria */}
      <CategoryModal
        open={showCategoryModal}
        editData={editingCategory}
        parentCategories={parentCategories}
        onClose={() => {
          setShowCategoryModal(false)
          setEditingCategory(null)
        }}
      />

      {/* Modal de etiqueta */}
      <TagModal
        open={showTagModal}
        editData={editingTag}
        onClose={() => {
          setShowTagModal(false)
          setEditingTag(null)
        }}
      />
    </div>
  )
}
