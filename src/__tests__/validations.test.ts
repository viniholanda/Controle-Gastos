import { transactionSchema, registerSchema, loginSchema, budgetSchema } from "@/lib/validations"

describe("transactionSchema", () => {
  const validTransaction = {
    type: "EXPENSE",
    accountId: "account-123",
    amount: 100,
    date: "2024-01-15",
    currency: "BRL",
  }

  it("validates a valid transaction", () => {
    const result = transactionSchema.safeParse(validTransaction)
    expect(result.success).toBe(true)
  })

  it("rejects negative amount", () => {
    const result = transactionSchema.safeParse({ ...validTransaction, amount: -50 })
    expect(result.success).toBe(false)
  })

  it("rejects zero amount", () => {
    const result = transactionSchema.safeParse({ ...validTransaction, amount: 0 })
    expect(result.success).toBe(false)
  })

  it("rejects missing accountId", () => {
    const result = transactionSchema.safeParse({ ...validTransaction, accountId: "" })
    expect(result.success).toBe(false)
  })

  it("rejects missing date", () => {
    const result = transactionSchema.safeParse({ ...validTransaction, date: "" })
    expect(result.success).toBe(false)
  })

  it("validates INCOME type", () => {
    const result = transactionSchema.safeParse({ ...validTransaction, type: "INCOME" })
    expect(result.success).toBe(true)
  })
})

describe("registerSchema", () => {
  const validUser = {
    name: "João Silva",
    email: "joao@example.com",
    password: "password123",
    confirmPassword: "password123",
  }

  it("validates a valid registration", () => {
    expect(registerSchema.safeParse(validUser).success).toBe(true)
  })

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({
      ...validUser,
      confirmPassword: "different",
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("Passwords do not match")
  })

  it("rejects short name", () => {
    const result = registerSchema.safeParse({ ...validUser, name: "J" })
    expect(result.success).toBe(false)
  })

  it("rejects invalid email", () => {
    const result = registerSchema.safeParse({ ...validUser, email: "not-an-email" })
    expect(result.success).toBe(false)
  })

  it("rejects short password", () => {
    const result = registerSchema.safeParse({
      ...validUser,
      password: "short",
      confirmPassword: "short",
    })
    expect(result.success).toBe(false)
  })
})

describe("loginSchema", () => {
  it("validates valid credentials", () => {
    const result = loginSchema.safeParse({ email: "test@test.com", password: "password" })
    expect(result.success).toBe(true)
  })

  it("rejects empty password", () => {
    const result = loginSchema.safeParse({ email: "test@test.com", password: "" })
    expect(result.success).toBe(false)
  })
})

describe("budgetSchema", () => {
  const validBudget = {
    name: "Groceries",
    amount: 500,
    period: "MONTHLY",
    startDate: "2024-01-01",
    alertAt: 80,
  }

  it("validates a valid budget", () => {
    expect(budgetSchema.safeParse(validBudget).success).toBe(true)
  })

  it("rejects negative amount", () => {
    expect(budgetSchema.safeParse({ ...validBudget, amount: -100 }).success).toBe(false)
  })

  it("rejects alertAt > 100", () => {
    expect(budgetSchema.safeParse({ ...validBudget, alertAt: 110 }).success).toBe(false)
  })
})
