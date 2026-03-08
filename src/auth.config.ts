import type { NextAuthConfig } from "next-auth"

// Edge-safe auth config — no Node.js modules (no bcrypt, no Prisma)
// Used only by middleware for JWT session checks
export const authConfig: NextAuthConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isAuthPage =
        nextUrl.pathname.startsWith("/login") ||
        nextUrl.pathname.startsWith("/register")
      const isApiAuth = nextUrl.pathname.startsWith("/api/auth")

      if (isApiAuth) return true
      if (!isLoggedIn && !isAuthPage) {
        const redirectUrl = new URL("/login", nextUrl)
        redirectUrl.searchParams.set("callbackUrl", nextUrl.pathname)
        return Response.redirect(redirectUrl)
      }
      if (isLoggedIn && isAuthPage) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }
      return true
    },
  },
}
