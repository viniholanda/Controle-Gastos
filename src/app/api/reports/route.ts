import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getCurrentWorkspace } from "@/lib/workspace"
import { startOfMonth, endOfMonth, eachMonthOfInterval, format } from "date-fns"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get("startDate") || new Date(new Date().getFullYear(), 0, 1).toISOString()
    const endDate = searchParams.get("endDate") || new Date().toISOString()
    const groupBy = searchParams.get("groupBy") || "category"

    const start = new Date(startDate)
    const end = new Date(endDate)

    const [
      expensesByCategory,
      incomeByCategory,
      expensesByAccount,
      monthlyData,
      topMerchants,
    ] = await Promise.all([
      // Expenses by category
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          workspaceId: workspace.id,
          type: "EXPENSE",
          date: { gte: start, lte: end },
          isArchived: false,
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: "desc" } },
      }),

      // Income by category
      prisma.transaction.groupBy({
        by: ["categoryId"],
        where: {
          workspaceId: workspace.id,
          type: "INCOME",
          date: { gte: start, lte: end },
          isArchived: false,
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: "desc" } },
      }),

      // Expenses by account
      prisma.transaction.groupBy({
        by: ["accountId"],
        where: {
          workspaceId: workspace.id,
          type: "EXPENSE",
          date: { gte: start, lte: end },
          isArchived: false,
        },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
      }),

      // Monthly breakdown
      (async () => {
        const months = eachMonthOfInterval({ start, end })
        return Promise.all(
          months.map(async (month) => {
            const ms = startOfMonth(month)
            const me = endOfMonth(month)
            const [exp, inc] = await Promise.all([
              prisma.transaction.aggregate({
                where: { workspaceId: workspace.id, type: "EXPENSE", date: { gte: ms, lte: me }, isArchived: false },
                _sum: { amount: true },
              }),
              prisma.transaction.aggregate({
                where: { workspaceId: workspace.id, type: "INCOME", date: { gte: ms, lte: me }, isArchived: false },
                _sum: { amount: true },
              }),
            ])
            return {
              month: format(month, "MMM yyyy"),
              expenses: Number(exp._sum.amount ?? 0),
              income: Number(inc._sum.amount ?? 0),
              net: Number(inc._sum.amount ?? 0) - Number(exp._sum.amount ?? 0),
            }
          })
        )
      })(),

      // Top merchants
      prisma.transaction.groupBy({
        by: ["merchantId"],
        where: {
          workspaceId: workspace.id,
          type: "EXPENSE",
          date: { gte: start, lte: end },
          isArchived: false,
          merchantId: { not: null },
        },
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 10,
      }),
    ])

    // Enrich with names
    const categoryIds = [...new Set([
      ...expensesByCategory.map((e) => e.categoryId),
      ...incomeByCategory.map((e) => e.categoryId),
    ].filter(Boolean))] as string[]

    const accountIds = expensesByAccount.map((e) => e.accountId)
    const merchantIds = topMerchants.map((m) => m.merchantId).filter(Boolean) as string[]

    const [categories, accounts, merchants] = await Promise.all([
      prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { id: true, name: true, color: true } }),
      prisma.financialAccount.findMany({ where: { id: { in: accountIds } }, select: { id: true, name: true, color: true } }),
      prisma.merchant.findMany({ where: { id: { in: merchantIds } }, select: { id: true, name: true } }),
    ])

    return NextResponse.json({
      expensesByCategory: expensesByCategory.map((e) => ({
        category: categories.find((c) => c.id === e.categoryId) ?? { name: "Uncategorized", color: "#6b7280" },
        amount: Number(e._sum.amount ?? 0),
        count: e._count.id,
      })),
      incomeByCategory: incomeByCategory.map((e) => ({
        category: categories.find((c) => c.id === e.categoryId) ?? { name: "Uncategorized", color: "#6b7280" },
        amount: Number(e._sum.amount ?? 0),
        count: e._count.id,
      })),
      expensesByAccount: expensesByAccount.map((e) => ({
        account: accounts.find((a) => a.id === e.accountId) ?? { name: "Unknown", color: "#6b7280" },
        amount: Number(e._sum.amount ?? 0),
      })),
      monthlyData,
      topMerchants: topMerchants.map((m) => ({
        merchant: merchants.find((merch) => merch.id === m.merchantId) ?? { name: "Unknown" },
        amount: Number(m._sum.amount ?? 0),
        count: m._count.id,
      })),
    })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
