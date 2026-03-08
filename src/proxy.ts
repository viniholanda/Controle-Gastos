import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Auth removed — all routes are publicly accessible
export default function proxy(_req: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|public).*)"],
}
