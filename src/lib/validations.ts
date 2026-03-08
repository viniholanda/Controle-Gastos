import { z } from "zod"
import { TransactionType, AccountType, RecurrenceFrequency } from "@prisma/client"

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
})

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

export const transactionSchema = z.object({
  type: z.nativeEnum(TransactionType),
  accountId: z.string().min(1, "Account is required"),
  transferToId: z.string().optional(),
  categoryId: z.string().optional(),
  merchantId: z.string().optional(),
  costCenterId: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().default("BRL"),
  description: z.string().optional(),
  notes: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  paymentMethod: z.string().optional(),
  reference: z.string().optional(),
  tags: z.array(z.string()).optional(),
  splits: z.array(z.object({
    categoryId: z.string().optional(),
    amount: z.number().positive(),
    description: z.string().optional(),
  })).optional(),
})

export const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.nativeEnum(AccountType),
  currency: z.string().default("BRL"),
  initialBalance: z.number().default(0),
  color: z.string().optional(),
  institution: z.string().optional(),
  lastFour: z.string().max(4).optional(),
  notes: z.string().optional(),
  isDefault: z.boolean().default(false),
})

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required"),
  color: z.string().default("#6366f1"),
  icon: z.string().default("tag"),
  parentId: z.string().optional(),
})

export const budgetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().optional(),
  amount: z.number().positive("Amount must be positive"),
  period: z.string().default("MONTHLY"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  alertAt: z.number().min(1).max(100).default(80),
})

export const recurringSchema = z.object({
  name: z.string().min(1, "Name is required"),
  frequency: z.nativeEnum(RecurrenceFrequency),
  interval: z.number().int().min(1).default(1),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  templateData: transactionSchema,
})

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type TransactionInput = z.infer<typeof transactionSchema>
export type AccountInput = z.infer<typeof accountSchema>
export type CategoryInput = z.infer<typeof categorySchema>
export type BudgetInput = z.infer<typeof budgetSchema>
export type RecurringInput = z.infer<typeof recurringSchema>
