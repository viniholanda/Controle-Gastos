import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { transactionSchema } from "@/lib/validations"
import { getCurrentWorkspace } from "@/lib/workspace"
import { createAuditLog } from "@/lib/audit"
import { Prisma } from "@prisma/client"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace found" }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const type = searchParams.get("type") || ""
    const accountId = searchParams.get("accountId") || ""
    const categoryId = searchParams.get("categoryId") || ""
    const startDate = searchParams.get("startDate") || ""
    const endDate = searchParams.get("endDate") || ""
    const status = searchParams.get("status") || ""
    const minAmount = searchParams.get("minAmount") || ""
    const maxAmount = searchParams.get("maxAmount") || ""

    const where: Prisma.TransactionWhereInput = {
      workspaceId: workspace.id,
      isArchived: false,
      ...(type && { type: type as any }),
      ...(accountId && { accountId }),
      ...(categoryId && { categoryId }),
      ...(status && { status: status as any }),
      ...(search && {
        OR: [
          { description: { contains: search, mode: "insensitive" } },
          { notes: { contains: search, mode: "insensitive" } },
          { merchant: { name: { contains: search, mode: "insensitive" } } },
        ],
      }),
      ...(startDate || endDate
        ? {
            date: {
              ...(startDate && { gte: new Date(startDate) }),
              ...(endDate && { lte: new Date(endDate + "T23:59:59") }),
            },
          }
        : {}),
      ...(minAmount || maxAmount
        ? {
            amount: {
              ...(minAmount && { gte: new Prisma.Decimal(minAmount) }),
              ...(maxAmount && { lte: new Prisma.Decimal(maxAmount) }),
            },
          }
        : {}),
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: { select: { id: true, name: true, color: true, type: true } },
          category: { select: { id: true, name: true, color: true, icon: true } },
          merchant: { select: { id: true, name: true } },
          tags: { include: { tag: true } },
          splits: { include: { category: true } },
          attachments: { select: { id: true, fileName: true, url: true, fileType: true } },
        },
        orderBy: { date: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.transaction.count({ where }),
    ])

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (err) {
    console.error("GET /api/transactions error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace found" }, { status: 404 })

    const body = await req.json()
    const parsed = transactionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const { tags, splits, date, ...data } = parsed.data

    const transaction = await prisma.$transaction(async (tx) => {
      const t = await tx.transaction.create({
        data: {
          workspaceId: workspace.id,
          createdById: session.user.id,
          date: new Date(date),
          ...data,
          ...(tags?.length
            ? {
                tags: {
                  create: tags.map((tagId) => ({ tagId })),
                },
              }
            : {}),
          ...(splits?.length
            ? {
                isSplit: true,
                splits: {
                  create: splits,
                },
              }
            : {}),
        },
        include: {
          account: true,
          category: true,
          merchant: true,
          tags: { include: { tag: true } },
          splits: { include: { category: true } },
        },
      })

      // Update account balance
      const balanceChange =
        data.type === "INCOME" ? data.amount : data.type === "EXPENSE" ? -data.amount : 0

      if (balanceChange !== 0) {
        await tx.financialAccount.update({
          where: { id: data.accountId },
          data: { currentBalance: { increment: balanceChange } },
        })
      }

      // Handle transfer
      if (data.type === "TRANSFER" && data.transferToId) {
        await tx.financialAccount.update({
          where: { id: data.accountId },
          data: { currentBalance: { decrement: data.amount } },
        })
        await tx.financialAccount.update({
          where: { id: data.transferToId },
          data: { currentBalance: { increment: data.amount } },
        })
      }

      // Update merchant use count
      if (data.merchantId) {
        await tx.merchant.update({
          where: { id: data.merchantId },
          data: { useCount: { increment: 1 } },
        })
      }

      return t
    })

    await createAuditLog({
      workspaceId: workspace.id,
      userId: session.user.id,
      action: "CREATE",
      resource: "transaction",
      resourceId: transaction.id,
      newData: transaction,
    })

    return NextResponse.json(transaction, { status: 201 })
  } catch (err) {
    console.error("POST /api/transactions error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
