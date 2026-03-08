export interface ReceiptData {
  amount?: number
  date?: string
  description?: string
  merchant?: string
  items?: string[]
  cnpj?: string
  paymentMethod?: string
}

export async function processReceiptImage(
  imageSource: string,
  onProgress?: (progress: number) => void
): Promise<ReceiptData> {
  onProgress?.(20)

  const res = await fetch("/api/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: imageSource }),
  })

  onProgress?.(80)

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error ?? "Erro ao processar cupom")
  }

  const data = await res.json()
  onProgress?.(100)

  return {
    amount: data.amount ?? undefined,
    date: data.date ?? undefined,
    merchant: data.merchant ?? undefined,
    description: data.description ?? data.merchant ?? undefined,
    paymentMethod: data.paymentMethod ?? undefined,
    cnpj: data.cnpj ?? undefined,
    items: Array.isArray(data.items) ? data.items : [],
  }
}
