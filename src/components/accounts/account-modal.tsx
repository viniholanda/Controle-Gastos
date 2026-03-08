"use client"
import { useEffect } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { Wallet, CreditCard, Banknote, Smartphone, TrendingUp, HelpCircle } from "lucide-react"
import { accountSchema, type AccountInput } from "@/lib/validations"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const ACCOUNT_TYPES = [
    { value: "CASH", label: "Dinheiro / Carteira", icon: Banknote, color: "bg-emerald-500" },
    { value: "BANK_ACCOUNT", label: "Conta Bancária", icon: Wallet, color: "bg-blue-500" },
    { value: "CREDIT_CARD", label: "Cartão de Crédito", icon: CreditCard, color: "bg-red-500" },
    { value: "DIGITAL_WALLET", label: "Carteira Digital", icon: Smartphone, color: "bg-purple-500" },
    { value: "INVESTMENT", label: "Investimento", icon: TrendingUp, color: "bg-amber-500" },
    { value: "OTHER", label: "Outro", icon: HelpCircle, color: "bg-gray-500" },
]

const COLOR_OPTIONS = [
    "#6366f1", "#3b82f6", "#10b981", "#f59e0b",
    "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6",
    "#f97316", "#06b6d4", "#84cc16", "#6b7280",
]

interface Props {
    open: boolean
    editData?: any | null
    onClose: () => void
}

export function AccountModal({ open, editData, onClose }: Props) {
    const queryClient = useQueryClient()
    const isEditing = !!editData

    const {
        register,
        handleSubmit,
        control,
        reset,
        watch,
        setValue,
        formState: { errors },
    } = useForm<AccountInput>({
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolver: zodResolver(accountSchema) as any,
        defaultValues: {
            type: "BANK_ACCOUNT",
            currency: "BRL",
            initialBalance: 0,
            color: "#6366f1",
            isDefault: false,
        },
    })

    const watchType = watch("type")
    const watchColor = watch("color")

    useEffect(() => {
        if (editData) {
            reset({
                name: editData.name,
                type: editData.type,
                currency: editData.currency,
                initialBalance: Number(editData.initialBalance),
                color: editData.color ?? "#6366f1",
                institution: editData.institution ?? "",
                lastFour: editData.lastFour ?? "",
                notes: editData.notes ?? "",
                isDefault: editData.isDefault,
            })
        } else {
            reset({
                type: "BANK_ACCOUNT",
                currency: "BRL",
                initialBalance: 0,
                color: "#6366f1",
                isDefault: false,
            })
        }
    }, [editData, reset])

    const mutation = useMutation({
        mutationFn: async (data: AccountInput) => {
            const url = isEditing ? `/api/accounts/${editData.id}` : "/api/accounts"
            const method = isEditing ? "PATCH" : "POST"
            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.error ?? "Falha ao salvar conta")
            }
            return res.json()
        },
        onSuccess: () => {
            toast.success(isEditing ? "Conta atualizada" : "Conta criada com sucesso")
            queryClient.invalidateQueries({ queryKey: ["accounts"] })
            queryClient.invalidateQueries({ queryKey: ["dashboard"] })
            handleClose()
        },
        onError: (err: Error) => toast.error(err.message),
    })

    const handleClose = () => {
        reset()
        onClose()
    }

    const selectedType = ACCOUNT_TYPES.find((t) => t.value === watchType)
    const TypeIcon = selectedType?.icon ?? Wallet

    return (
        <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-white", selectedType?.color ?? "bg-primary")}>
                            <TypeIcon className="w-4 h-4" />
                        </div>
                        {isEditing ? "Editar Conta" : "Nova Conta"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit((d) => mutation.mutate(d as unknown as AccountInput))} className="space-y-4">

                    {/* Tipo de conta */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Tipo de Conta</label>
                        <div className="grid grid-cols-3 gap-2">
                            {ACCOUNT_TYPES.map((type) => {
                                const Icon = type.icon
                                const active = watchType === type.value
                                return (
                                    <button
                                        key={type.value}
                                        type="button"
                                        onClick={() => setValue("type", type.value as any)}
                                        className={cn(
                                            "flex flex-col items-center gap-1.5 p-2.5 rounded-lg border-2 text-xs font-medium transition-all",
                                            active
                                                ? "border-primary bg-primary/5 text-primary"
                                                : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <div className={cn("w-7 h-7 rounded-md flex items-center justify-center text-white", active ? type.color : "bg-muted")}>
                                            <Icon className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-center leading-tight">{type.label.split(" / ")[0]}</span>
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Nome */}
                    <Input
                        label="Nome da conta *"
                        placeholder="Ex: Nubank, Bradesco, Carteira"
                        error={errors.name?.message}
                        {...register("name")}
                    />

                    {/* Cor */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Cor</label>
                        <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setValue("color", color)}
                                    className={cn(
                                        "w-7 h-7 rounded-full border-2 transition-all",
                                        watchColor === color ? "border-foreground scale-110" : "border-transparent hover:scale-105"
                                    )}
                                    style={{ background: color }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Saldo inicial e Moeda lado a lado */}
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="Saldo inicial (R$)"
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            error={errors.initialBalance?.message}
                            {...register("initialBalance", { valueAsNumber: true })}
                        />
                        <div>
                            <label className="block text-sm font-medium mb-1.5">Moeda</label>
                            <Controller
                                name="currency"
                                control={control}
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BRL">R$ — Real</SelectItem>
                                            <SelectItem value="USD">$ — Dólar</SelectItem>
                                            <SelectItem value="EUR">€ — Euro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                        </div>
                    </div>

                    {/* Instituição (banco) */}
                    <Input
                        label="Instituição / Banco"
                        placeholder="Ex: Banco do Brasil, Itaú, Nubank"
                        {...register("institution")}
                    />

                    {/* Últimos 4 dígitos (só para cartão) */}
                    {(watchType === "CREDIT_CARD" || watchType === "BANK_ACCOUNT") && (
                        <Input
                            label={watchType === "CREDIT_CARD" ? "Últimos 4 dígitos do cartão" : "Últimos 4 dígitos da conta"}
                            placeholder="0000"
                            maxLength={4}
                            {...register("lastFour")}
                        />
                    )}

                    {/* Conta padrão */}
                    <div className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                            <Label className="text-sm font-medium">Conta padrão</Label>
                            <p className="text-xs text-muted-foreground">Usar esta conta nos novos lançamentos</p>
                        </div>
                        <Controller
                            name="isDefault"
                            control={control}
                            render={({ field }) => (
                                <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                />
                            )}
                        />
                    </div>

                    {/* Ações */}
                    <div className="flex gap-3 pt-1">
                        <Button type="button" variant="outline" onClick={handleClose} className="flex-1">
                            Cancelar
                        </Button>
                        <Button type="submit" className="flex-1" loading={mutation.isPending}>
                            {isEditing ? "Salvar Alterações" : "Criar Conta"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
