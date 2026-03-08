import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"
import { getCurrentWorkspace } from "@/lib/workspace"
import { format } from "date-fns"

export async function GET(req: NextRequest) {
  try {
    const session = await getSession()
    if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const workspace = await getCurrentWorkspace(session.user.id)
    if (!workspace) return NextResponse.json({ error: "No workspace" }, { status: 404 })

    const { searchParams } = new URL(req.url)
    const exportFormat = searchParams.get("format") || "csv"
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const transactions = await prisma.transaction.findMany({
      where: {
        workspaceId: workspace.id,
        isArchived: false,
        ...(startDate && endDate && {
          date: { gte: new Date(startDate), lte: new Date(endDate) },
        }),
      },
      include: {
        account: { select: { name: true } },
        category: { select: { name: true } },
        merchant: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    })

    if (exportFormat === "csv") {
      const headers = ["Date", "Type", "Description", "Category", "Account", "Merchant", "Amount", "Currency", "Status", "Notes"]
      const rows = transactions.map((tx) => [
        format(new Date(tx.date), "yyyy-MM-dd"),
        tx.type,
        tx.description ?? "",
        tx.category?.name ?? "",
        tx.account?.name ?? "",
        tx.merchant?.name ?? "",
        (tx.type === "EXPENSE" ? "-" : "") + Number(tx.amount).toFixed(2),
        tx.currency,
        tx.status,
        tx.notes ?? "",
      ])

      const csv = [headers, ...rows]
        .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n")

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="fintrack-export-${format(new Date(), "yyyy-MM-dd")}.csv"`,
        },
      })
    }

    return NextResponse.json({ transactions })
  } catch (err) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
