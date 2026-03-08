// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require("@prisma/client")
// eslint-disable-next-line @typescript-eslint/no-require-imports
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

async function main() {
  console.log("🌱 Seeding database...")

  // Clean up
  await prisma.auditLog.deleteMany()
  await prisma.notification.deleteMany()
  await prisma.transactionTag.deleteMany()
  await prisma.transactionSplit.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.transaction.deleteMany()
  await prisma.budget.deleteMany()
  await prisma.recurringTransaction.deleteMany()
  await prisma.transactionTemplate.deleteMany()
  await prisma.tag.deleteMany()
  await prisma.merchant.deleteMany()
  await prisma.category.deleteMany()
  await prisma.financialAccount.deleteMany()
  await prisma.workspaceMember.deleteMany()
  await prisma.workspace.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.user.deleteMany()

  // Create demo user
  const passwordHash = await bcrypt.hash("demo1234", 12)
  const user = await prisma.user.create({
    data: {
      name: "Demo User",
      email: "demo@fintrack.app",
      passwordHash,
    },
  })
  console.log(`✓ Created user: ${user.email}`)

  // Create workspace
  const workspace = await prisma.workspace.create({
    data: {
      name: "My Finances",
      slug: "my-finances",
      currency: "BRL",
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
      members: {
        create: {
          userId: user.id,
          role: "OWNER",
        },
      },
    },
  })
  console.log(`✓ Created workspace: ${workspace.name}`)

  // Create categories
  const categoriesData = [
    { name: "Food & Dining", color: "#f97316", icon: "utensils" },
    { name: "Transportation", color: "#3b82f6", icon: "car" },
    { name: "Housing", color: "#8b5cf6", icon: "home" },
    { name: "Healthcare", color: "#ef4444", icon: "heart-pulse" },
    { name: "Entertainment", color: "#ec4899", icon: "tv" },
    { name: "Shopping", color: "#f59e0b", icon: "shopping-bag" },
    { name: "Education", color: "#10b981", icon: "book" },
    { name: "Personal Care", color: "#06b6d4", icon: "sparkles" },
    { name: "Travel", color: "#84cc16", icon: "plane" },
    { name: "Utilities", color: "#64748b", icon: "zap" },
    { name: "Salary", color: "#22c55e", icon: "briefcase" },
    { name: "Freelance", color: "#0ea5e9", icon: "laptop" },
    { name: "Investment Returns", color: "#6366f1", icon: "trending-up" },
    { name: "Other Income", color: "#a78bfa", icon: "plus-circle" },
    { name: "Other", color: "#6b7280", icon: "more-horizontal" },
  ]

  const categories: Record<string, any> = {}
  for (const cat of categoriesData) {
    const created = await prisma.category.create({
      data: { workspaceId: workspace.id, ...cat },
    })
    categories[cat.name] = created
  }

  // Add subcategories
  const subCategories = [
    { name: "Restaurants", parentName: "Food & Dining", color: "#fb923c", icon: "utensils" },
    { name: "Groceries", parentName: "Food & Dining", color: "#f97316", icon: "shopping-cart" },
    { name: "Coffee", parentName: "Food & Dining", color: "#92400e", icon: "coffee" },
    { name: "Fuel", parentName: "Transportation", color: "#2563eb", icon: "fuel" },
    { name: "Uber / Taxi", parentName: "Transportation", color: "#60a5fa", icon: "car" },
    { name: "Public Transit", parentName: "Transportation", color: "#93c5fd", icon: "bus" },
    { name: "Rent", parentName: "Housing", color: "#7c3aed", icon: "home" },
    { name: "Internet", parentName: "Utilities", color: "#475569", icon: "wifi" },
    { name: "Phone", parentName: "Utilities", color: "#334155", icon: "smartphone" },
    { name: "Streaming", parentName: "Entertainment", color: "#db2777", icon: "play" },
  ]

  for (const sub of subCategories) {
    const parent = categories[sub.parentName]
    if (parent) {
      await prisma.category.create({
        data: {
          workspaceId: workspace.id,
          name: sub.name,
          color: sub.color,
          icon: sub.icon,
          parentId: parent.id,
        },
      })
    }
  }
  console.log(`✓ Created ${categoriesData.length + subCategories.length} categories`)

  // Create tags
  const tagsData = [
    { name: "Business", color: "#6366f1" },
    { name: "Personal", color: "#10b981" },
    { name: "Tax Deductible", color: "#f59e0b" },
    { name: "Recurring", color: "#3b82f6" },
    { name: "Reimbursable", color: "#ef4444" },
  ]

  const tags: Record<string, any> = {}
  for (const tag of tagsData) {
    const created = await prisma.tag.create({
      data: { workspaceId: workspace.id, ...tag },
    })
    tags[tag.name] = created
  }
  console.log(`✓ Created ${tagsData.length} tags`)

  // Create merchants
  const merchantsData = [
    { name: "Supermercado Extra", category: "Groceries" },
    { name: "Pão de Açúcar", category: "Groceries" },
    { name: "McDonald's", category: "Fast Food" },
    { name: "iFood", category: "Delivery" },
    { name: "Shell", category: "Fuel" },
    { name: "Posto BR", category: "Fuel" },
    { name: "Netflix", category: "Streaming" },
    { name: "Spotify", category: "Music" },
    { name: "Amazon", category: "Shopping" },
    { name: "Farmácia Drogasil", category: "Pharmacy" },
    { name: "Uber", category: "Transportation" },
    { name: "Starbucks", category: "Coffee" },
  ]

  const merchants: Record<string, any> = {}
  for (const m of merchantsData) {
    const created = await prisma.merchant.create({
      data: { workspaceId: workspace.id, ...m, useCount: Math.floor(Math.random() * 20) },
    })
    merchants[m.name] = created
  }
  console.log(`✓ Created ${merchantsData.length} merchants`)

  // Create financial accounts
  const checkingAccount = await prisma.financialAccount.create({
    data: {
      workspaceId: workspace.id,
      name: "Nubank Conta",
      type: "BANK_ACCOUNT",
      currency: "BRL",
      initialBalance: 5000,
      currentBalance: 5000,
      color: "#8a05be",
      institution: "Nubank",
      isDefault: true,
    },
  })

  const creditCard = await prisma.financialAccount.create({
    data: {
      workspaceId: workspace.id,
      name: "Nubank Crédito",
      type: "CREDIT_CARD",
      currency: "BRL",
      initialBalance: 0,
      currentBalance: 0,
      color: "#8a05be",
      institution: "Nubank",
      lastFour: "4242",
    },
  })

  const cashAccount = await prisma.financialAccount.create({
    data: {
      workspaceId: workspace.id,
      name: "Carteira",
      type: "CASH",
      currency: "BRL",
      initialBalance: 500,
      currentBalance: 500,
      color: "#10b981",
    },
  })
  console.log("✓ Created 3 financial accounts")

  // Create transactions for last 3 months
  const now = new Date()
  const transactionsData = []

  // Salaries
  for (let m = 0; m < 3; m++) {
    const date = new Date(now.getFullYear(), now.getMonth() - m, 5)
    transactionsData.push({
      accountId: checkingAccount.id,
      categoryId: categories["Salary"].id,
      merchantId: null,
      type: "INCOME" as const,
      amount: 7500,
      description: "Salário mensal",
      date,
    })
  }

  // Regular expenses
  const expenseTemplates = [
    { merchantName: "Netflix", amount: 55.9, categoryName: "Entertainment", desc: "Netflix mensal", day: 15, account: "credit" },
    { merchantName: "Spotify", amount: 21.9, categoryName: "Entertainment", desc: "Spotify Premium", day: 20, account: "credit" },
    { merchantName: "Supermercado Extra", amount: 420, categoryName: "Food & Dining", desc: "Supermercado semanal", day: 8, account: "debit" },
    { merchantName: "Pão de Açúcar", amount: 380, categoryName: "Food & Dining", desc: "Supermercado", day: 18, account: "credit" },
    { merchantName: "Shell", amount: 200, categoryName: "Transportation", desc: "Gasolina", day: 12, account: "debit" },
    { merchantName: "Uber", amount: 45, categoryName: "Transportation", desc: "Uber", day: 22, account: "credit" },
    { merchantName: "iFood", amount: 89.5, categoryName: "Food & Dining", desc: "Delivery jantar", day: 25, account: "credit" },
    { merchantName: "McDonald's", amount: 62, categoryName: "Food & Dining", desc: "Almoço", day: 10, account: "cash" },
    { merchantName: "Farmácia Drogasil", amount: 120, categoryName: "Healthcare", desc: "Medicamentos", day: 3, account: "debit" },
    { merchantName: "Starbucks", amount: 38, categoryName: "Food & Dining", desc: "Café", day: 7, account: "cash" },
    { merchantName: "Amazon", amount: 250, categoryName: "Shopping", desc: "Compras Amazon", day: 14, account: "credit" },
  ]

  for (let m = 0; m < 3; m++) {
    for (const t of expenseTemplates) {
      const accountId =
        t.account === "credit" ? creditCard.id :
        t.account === "cash" ? cashAccount.id :
        checkingAccount.id

      transactionsData.push({
        accountId,
        categoryId: categories[t.categoryName]?.id,
        merchantId: merchants[t.merchantName]?.id,
        type: "EXPENSE" as const,
        amount: t.amount + (Math.random() * 20 - 10),
        description: t.desc,
        date: new Date(now.getFullYear(), now.getMonth() - m, t.day),
      })
    }
  }

  // Add some random additional expenses this month
  const randomExpenses = [
    { amount: 180, desc: "Conta de luz", categoryName: "Utilities", account: checkingAccount.id },
    { amount: 120, desc: "Conta de água", categoryName: "Utilities", account: checkingAccount.id },
    { amount: 99.9, desc: "Internet", categoryName: "Utilities", account: checkingAccount.id },
    { amount: 3500, desc: "Aluguel", categoryName: "Housing", account: checkingAccount.id },
    { amount: 200, desc: "Academia", categoryName: "Personal Care", account: creditCard.id },
  ]

  for (const e of randomExpenses) {
    transactionsData.push({
      accountId: e.account,
      categoryId: categories[e.categoryName]?.id,
      merchantId: null,
      type: "EXPENSE" as const,
      amount: e.amount,
      description: e.desc,
      date: new Date(now.getFullYear(), now.getMonth(), Math.floor(Math.random() * 28) + 1),
    })
  }

  // Create all transactions
  let totalBalance = { [checkingAccount.id]: 5000, [creditCard.id]: 0, [cashAccount.id]: 500 }

  for (const tx of transactionsData) {
    const t = await prisma.transaction.create({
      data: {
        workspaceId: workspace.id,
        ...tx,
        amount: Math.abs(Number(tx.amount.toFixed(2))),
        currency: "BRL",
        status: "CLEARED",
        createdById: user.id,
      },
    })

    // Update balance
    const change = tx.type === "INCOME" ? Number(t.amount) : -Number(t.amount)
    totalBalance[tx.accountId] = (totalBalance[tx.accountId] ?? 0) + change
  }

  // Update account balances
  for (const [accountId, balance] of Object.entries(totalBalance)) {
    await prisma.financialAccount.update({
      where: { id: accountId },
      data: { currentBalance: balance },
    })
  }
  console.log(`✓ Created ${transactionsData.length} transactions`)

  // Create budgets
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const budgetsData = [
    { name: "Food & Dining", categoryName: "Food & Dining", amount: 1500, alertAt: 80 },
    { name: "Transportation", categoryName: "Transportation", amount: 500, alertAt: 80 },
    { name: "Entertainment", categoryName: "Entertainment", amount: 200, alertAt: 90 },
    { name: "Shopping", categoryName: "Shopping", amount: 800, alertAt: 75 },
    { name: "Healthcare", categoryName: "Healthcare", amount: 300, alertAt: 80 },
  ]

  for (const b of budgetsData) {
    await prisma.budget.create({
      data: {
        workspaceId: workspace.id,
        categoryId: categories[b.categoryName]?.id,
        name: b.name,
        amount: b.amount,
        period: "MONTHLY",
        startDate: monthStart,
        alertAt: b.alertAt,
        isActive: true,
      },
    })
  }
  console.log(`✓ Created ${budgetsData.length} budgets`)

  // Create recurring transactions
  await prisma.recurringTransaction.create({
    data: {
      workspaceId: workspace.id,
      name: "Netflix",
      frequency: "MONTHLY",
      interval: 1,
      startDate: new Date(now.getFullYear(), now.getMonth() - 6, 15),
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
      templateData: {
        accountId: creditCard.id,
        categoryId: categories["Entertainment"]?.id,
        merchantId: merchants["Netflix"]?.id,
        type: "EXPENSE",
        amount: 55.9,
        description: "Netflix mensal",
        currency: "BRL",
      },
    },
  })

  await prisma.recurringTransaction.create({
    data: {
      workspaceId: workspace.id,
      name: "Salário",
      frequency: "MONTHLY",
      interval: 1,
      startDate: new Date(now.getFullYear(), now.getMonth() - 12, 5),
      nextDueDate: new Date(now.getFullYear(), now.getMonth() + 1, 5),
      templateData: {
        accountId: checkingAccount.id,
        categoryId: categories["Salary"]?.id,
        type: "INCOME",
        amount: 7500,
        description: "Salário mensal",
        currency: "BRL",
      },
    },
  })
  console.log("✓ Created 2 recurring transactions")

  console.log("\n✅ Seeding complete!")
  console.log("\n📧 Demo login:")
  console.log("   Email:    demo@fintrack.app")
  console.log("   Password: demo1234\n")
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
