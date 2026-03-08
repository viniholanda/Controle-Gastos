import { formatCurrency, formatDate, parseNaturalDate, slugify, truncate, getInitials } from "@/lib/utils"

describe("formatCurrency", () => {
  it("formats BRL currency correctly", () => {
    const result = formatCurrency(1234.56, "BRL", "pt-BR")
    expect(result).toContain("1.234,56")
  })

  it("handles zero", () => {
    const result = formatCurrency(0)
    expect(result).toContain("0,00")
  })

  it("handles string input", () => {
    const result = formatCurrency("100.50")
    expect(result).toContain("100,50")
  })
})

describe("parseNaturalDate", () => {
  it("parses 'hoje'", () => {
    const result = parseNaturalDate("hoje")
    const today = new Date()
    expect(result?.getDate()).toBe(today.getDate())
  })

  it("parses 'today'", () => {
    const result = parseNaturalDate("today")
    const today = new Date()
    expect(result?.getDate()).toBe(today.getDate())
  })

  it("parses 'ontem'", () => {
    const result = parseNaturalDate("ontem")
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    expect(result?.getDate()).toBe(yesterday.getDate())
  })

  it("returns null for invalid input", () => {
    const result = parseNaturalDate("not a date xyz")
    expect(result).toBeNull()
  })
})

describe("slugify", () => {
  it("converts to lowercase slug", () => {
    expect(slugify("Hello World")).toBe("hello-world")
  })

  it("removes accents", () => {
    expect(slugify("João")).toBe("joao")
  })

  it("removes special characters", () => {
    expect(slugify("Hello! World@")).toBe("hello-world")
  })
})

describe("truncate", () => {
  it("truncates long strings", () => {
    const result = truncate("Hello World", 5)
    expect(result).toBe("Hello…")
  })

  it("does not truncate short strings", () => {
    expect(truncate("Hi", 10)).toBe("Hi")
  })
})

describe("getInitials", () => {
  it("gets initials from full name", () => {
    expect(getInitials("João Silva")).toBe("JS")
  })

  it("handles single name", () => {
    expect(getInitials("João")).toBe("J")
  })

  it("uses only first two words", () => {
    expect(getInitials("João Maria Silva")).toBe("JM")
  })
})
