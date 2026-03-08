import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO, isValid } from "date-fns"
import { ptBR } from "date-fns/locale"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(
  amount: number | string,
  currency = "BRL",
  locale = "pt-BR"
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(num)
}

export function formatDate(date: Date | string, fmt = "dd/MM/yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date
  if (!isValid(d)) return ""
  return format(d, fmt, { locale: ptBR })
}

export function parseNaturalDate(input: string): Date | null {
  const lower = input.toLowerCase().trim()
  const today = new Date()

  if (lower === "hoje" || lower === "today") return today
  if (lower === "ontem" || lower === "yesterday") {
    const d = new Date(today)
    d.setDate(d.getDate() - 1)
    return d
  }
  if (lower === "anteontem" || lower === "day before yesterday") {
    const d = new Date(today)
    d.setDate(d.getDate() - 2)
    return d
  }

  // "last friday" / "última sexta"
  const dayNames: Record<string, number> = {
    domingo: 0, sunday: 0,
    segunda: 1, monday: 1,
    terça: 2, tuesday: 2,
    quarta: 3, wednesday: 3,
    quinta: 4, thursday: 4,
    sexta: 5, friday: 5,
    sábado: 6, saturday: 6,
  }
  const lastDayMatch = lower.match(/(?:last|última?)\s+(\w+)/)
  if (lastDayMatch) {
    const dayName = lastDayMatch[1]
    const targetDay = dayNames[dayName]
    if (targetDay !== undefined) {
      const d = new Date(today)
      const diff = (today.getDay() - targetDay + 7) % 7 || 7
      d.setDate(d.getDate() - diff)
      return d
    }
  }

  // Try parsing as regular date
  const parsed = new Date(input)
  if (isValid(parsed)) return parsed

  return null
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function truncate(str: string, len = 50): string {
  if (str.length <= len) return str
  return str.slice(0, len) + "…"
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
