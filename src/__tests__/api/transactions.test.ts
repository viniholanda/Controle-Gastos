/**
 * Integration tests for the transactions API.
 * Run with: npx jest src/__tests__/api/transactions.test.ts
 *
 * Note: These tests require a running database. Use a test database.
 * Set DATABASE_URL to your test database in .env.test
 */

// Mock next-auth
jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}))

// Mock workspace
jest.mock("@/lib/workspace", () => ({
  getCurrentWorkspace: jest.fn(),
}))

// Mock prisma
jest.mock("@/lib/prisma", () => ({
  prisma: {
    transaction: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    financialAccount: {
      update: jest.fn(),
    },
    merchant: {
      update: jest.fn(),
    },
    $transaction: jest.fn((fn) => fn({
      transaction: {
        create: jest.fn().mockResolvedValue({ id: "tx-1", amount: 100, type: "EXPENSE" }),
        update: jest.fn(),
        delete: jest.fn(),
      },
      financialAccount: { update: jest.fn() },
      merchant: { update: jest.fn() },
      transactionTag: { deleteMany: jest.fn() },
      transactionSplit: { deleteMany: jest.fn() },
    })),
  },
}))

jest.mock("@/lib/audit", () => ({
  createAuditLog: jest.fn(),
}))

import { auth } from "@/lib/auth"
import { getCurrentWorkspace } from "@/lib/workspace"
import { NextRequest } from "next/server"

const mockAuth = auth as jest.MockedFunction<typeof auth>
const mockGetWorkspace = getCurrentWorkspace as jest.MockedFunction<typeof getCurrentWorkspace>

const mockSession = { user: { id: "user-1", email: "test@test.com", name: "Test" } }
const mockWorkspace = { id: "ws-1", name: "Test WS", slug: "test-ws", currency: "BRL", timezone: "UTC", locale: "en", dateFormat: "DD/MM/YYYY", createdAt: new Date(), updatedAt: new Date() }

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockAuth.mockResolvedValue(mockSession as any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockGetWorkspace.mockResolvedValue(mockWorkspace as any)
  jest.clearAllMocks()
})

describe("GET /api/transactions", () => {
  it("returns 401 when not authenticated", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValueOnce(null as any)

    const { GET } = await import("@/app/api/transactions/route")
    const req = new NextRequest("http://localhost:3000/api/transactions")
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it("returns 404 when no workspace", async () => {
    mockGetWorkspace.mockResolvedValueOnce(null)

    const { GET } = await import("@/app/api/transactions/route")
    const req = new NextRequest("http://localhost:3000/api/transactions")
    const res = await GET(req)

    expect(res.status).toBe(404)
  })
})

describe("POST /api/transactions", () => {
  it("returns 401 when not authenticated", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockAuth.mockResolvedValueOnce(null as any)

    const { POST } = await import("@/app/api/transactions/route")
    const req = new NextRequest("http://localhost:3000/api/transactions", {
      method: "POST",
      body: JSON.stringify({}),
    })
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it("returns 400 for invalid data", async () => {
    const { POST } = await import("@/app/api/transactions/route")
    const req = new NextRequest("http://localhost:3000/api/transactions", {
      method: "POST",
      body: JSON.stringify({ type: "EXPENSE", amount: -100 }),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
  })
})
