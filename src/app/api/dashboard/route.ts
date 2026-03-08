import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getCurrentWorkspace } from "@/lib/workspace"
import { startOfMonth, endOfMonth, startOfYear, subMonths, format } from "date-fns"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 })

    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const prevMonthStart = startOfMonth(subMonths(now, 1))
    const prevMonthEnd = endOfMonth(subMonths(now, 1))

    const [
      accounts,
      currentMonthExpenses,
      currentMonthIncome,
      prevMonthExpenses,
      prevMonthIncome,
      recentTransactions,
      topCategories,
      budgets,
      monthlyTrend,
    ] = await Promise.all([
      // Account balances
      prisma.financialAccount.findMany({
        where: { workspaceId: workspace.id, isActive: true },
        select: { id: true, name: true, type: true, currentBalance: true, currency: true, color: true },
      }),

      // Current month expenses
      prisma.transaction.aggregate({
        where: {
          workspaceId: workspace.id,
          type: "EXPENSE",
          date: { gte: monthStart, lte: monthEnd },
          isArchived: false,
        },
        _sum: { amount: true },
      }),

      // Current month income
      prisma.transaction.aggregate({
        where: {
          workspaceId: workspace.id,
          type: "INCOME",
          date: { gte: monthStart, lte: monthEnd },
          isArchived: false,
        },
        _sum: { amount: true },
      }),

      // Previous month expenses
      prisma.transaction.aggregate({
        where: {
          workspaceId: workspace.id,
          type: "EXPENSE",
          date: { gte: prevMonthStart, lte: prevMonthEnd },
          isArchived: false,
        },
        _sum: { amount: true },
      }),

      // Previous month income
      prisma.transaction.aggregate({
        where: {
          workspaceId: workspace.id,
          type: "INCOME",
          date: { gte: prevMonthStart, lte: prevMonthEnd },
          isArchived: false,
        },
        _sum: { amount: true },
      }),

      // Recent transactions
      prisma.transaction.findMany({
        where: { workspaceId: workspace.id, isArchived: false },
        include: {
          category: { select: { name: true, color: true, icon: true } },
          account: { select: { name: true } },
          merchant: { select: { name: true } },
        },
        orderBy: { date: "desc" },
        take: 10,
      }),

      // Top categories this month
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          workspaceId: workspace.id,
          type: "EXPENSE",
          date: { gte: monthStart, lte: monthEnd },
          isArchived: false,
          categoryId: { not: null },
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      }),

      // Active budgets with spend
      prisma.budget.findMany({
        where: { workspaceId: workspace.id, isActive: true },
        include: { category: { select: { name: true, color: true } } },
      }),

      // Monthly trend (last 6 months)
      Promise.all(
        Array.from({ length: 6 }, (_, i) => {
          const d = subMonths(now, 5 - i)
          const s = startOfMonth(d)
          const e = endOfMonth(d)
          return Promise.all([
            prisma.transaction.aggregate({
              where: { workspaceId: workspace.id, type: "EXPENSE", date: { gte: s, lte: e }, isArchived: false },
              _sum: { amount: true },
            }),
            prisma.transaction.aggregate({
              where: { workspaceId: workspace.id, type: "INCOME", date: { gte: s, lte: e }, isArchived: false },
              _sum: { amount: true },
            }),
          ]).then(([exp, inc]) => ({
            month: format(d, "MMM yy"),
            expenses: Number(exp._sum.amount ?? 0),
            income: Number(inc._sum.amount ?? 0),
          }))
        })
      ),
    ])

    // Enrich top categories
    const categoryIds = topCategories.map((c) => c.categoryId).filter(Boolean) as string[]
    const categoryDetails = await prisma.category.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true, color: true, icon: true },
    })

    const enrichedCategories = topCategories.map((c) => ({
      ...c,
      category: categoryDetails.find((d) => d.id === c.categoryId),
      amount: Number(c._sum.amount ?? 0),
    }))

    // Compute budget progress
    const budgetProgress = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await prisma.transaction.aggregate({
          where: {
            workspaceId: workspace.id,
            type: "EXPENSE",
            ...(budget.categoryId && { categoryId: budget.categoryId }),
            date: { gte: monthStart, lte: monthEnd },
            isArchived: false,
          },
          _sum: { amount: true },
        })
        const spentAmount = Number(spent._sum.amount ?? 0)
        const budgetAmount = Number(budget.amount)
        const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0
        return {
          ...budget,
          spent: spentAmount,
          percentage: Math.min(percentage, 100),
          isOver: spentAmount > budgetAmount,
          isNearLimit: percentage >= Number(budget.alertAt),
        }
      })
    )

    const totalBalance = accounts.reduce((sum, a) => sum + Number(a.currentBalance), 0)
    const currentExpenses = Number(currentMonthExpenses._sum.amount ?? 0)
    const currentIncome = Number(currentMonthIncome._sum.amount ?? 0)

    return NextResponse.json({
      totalBalance,
      accounts,
      currentMonth: {
        expenses: currentExpenses,
        income: currentIncome,
        netFlow: currentIncome - currentExpenses,
      },
      previousMonth: {
        expenses: Number(prevMonthExpenses._sum.amount ?? 0),
        income: Number(prevMonthIncome._sum.amount ?? 0),
      },
      recentTransactions,
      topCategories: enrichedCategories,
      budgets: budgetProgress,
      monthlyTrend,
    })
  } catch (err) {
    console.error("Dashboard error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
