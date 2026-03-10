"use client"
import { useState, useEffect, useCallback } from "react"
import { Upload, CheckCircle2, AlertCircle, ArrowRight, X, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select"
import Papa from "papaparse"
import * as XLSX from "xlsx"

type Step = "upload" | "mapping" | "preview" | "done"

interface ParsedRow {
  date: string
  description: string
  amount: number
  type: "EXPENSE" | "INCOME"
  status: "new" | "duplicate"
}

interface FinancialAccount {
  id: string
  name: string
  type: string
  color: string | null
}

interface ColumnMapping {
  date: string
  amount: string
  description: string
  type: string
}

// Common column name aliases for auto-mapping
const DATE_ALIASES = ["date", "data", "dt", "fecha", "dat", "transaction date", "trans date", "posting date"]
const AMOUNT_ALIASES = ["valor", "value", "amount", "amt", "quantia", "total", "montante", "price"]
const DESCRIPTION_ALIASES = ["descrição", "descricao", "description", "desc", "memo", "details", "detail", "observação", "observacao", "historico", "histórico", "nome", "name"]
const TYPE_ALIASES = ["tipo", "type", "natureza", "category", "categoria"]

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
}

function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = { date: "", amount: "", description: "", type: "" }

  for (const header of headers) {
    const normalized = normalizeHeader(header)

    if (!mapping.date && DATE_ALIASES.some((a) => normalized === a || normalized.includes(a))) {
      mapping.date = header
    }
    if (!mapping.amount && AMOUNT_ALIASES.some((a) => normalized === a || normalized.includes(a))) {
      mapping.amount = header
    }
    if (!mapping.description && DESCRIPTION_ALIASES.some((a) => normalized === a || normalized.includes(a))) {
      mapping.description = header
    }
    if (!mapping.type && TYPE_ALIASES.some((a) => normalized === a || normalized.includes(a))) {
      mapping.type = header
    }
  }

  return mapping
}

function parseAmount(value: string | number | undefined | null): number {
  if (value === undefined || value === null) return 0
  if (typeof value === "number") return value

  // Handle Brazilian number format: 1.234,56 -> 1234.56
  let cleaned = String(value).trim()

  // Remove currency symbols
  cleaned = cleaned.replace(/[R$€£\s]/g, "")

  // Check if it uses comma as decimal separator (Brazilian/European format)
  // Pattern: optional minus, digits, dots for thousands, comma, decimal digits
  if (/^-?\d{1,3}(\.\d{3})*,\d{1,2}$/.test(cleaned)) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".")
  } else if (/^-?\d+,\d{1,2}$/.test(cleaned)) {
    // Simple comma decimal: 123,45
    cleaned = cleaned.replace(",", ".")
  }

  // Remove any remaining non-numeric chars except minus and dot
  cleaned = cleaned.replace(/[^0-9.\-]/g, "")

  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : num
}

function parseDate(value: string | number | undefined | null): string {
  if (!value) return new Date().toISOString().split("T")[0]

  const str = String(value).trim()

  // Try YYYY-MM-DD (ISO format) first -- most unambiguous
  const isoMatch = str.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})/)
  if (isoMatch) {
    const [, year, month, day] = isoMatch
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  // Brazilian format is the default for ambiguous cases
  const shortMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (shortMatch) {
    const [, first, second, year] = shortMatch
    const firstNum = parseInt(first)
    const secondNum = parseInt(second)

    // If first > 12, it must be a day (DD/MM/YYYY)
    // If second > 12, it must be a day (MM/DD/YYYY)
    // If ambiguous, assume Brazilian DD/MM/YYYY
    if (secondNum > 12) {
      // Must be MM/DD/YYYY (US format)
      return `${year}-${first.padStart(2, "0")}-${second.padStart(2, "0")}`
    }
    // DD/MM/YYYY (Brazilian format) -- default
    return `${year}-${second.padStart(2, "0")}-${first.padStart(2, "0")}`
  }

  // Try 2-digit year: DD/MM/YY
  const shortYearMatch = str.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2})$/)
  if (shortYearMatch) {
    const [, day, month, yy] = shortYearMatch
    const year = parseInt(yy) > 50 ? `19${yy}` : `20${yy}`
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
  }

  // Try parsing as Date object
  const d = new Date(str)
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0]
  }

  return new Date().toISOString().split("T")[0]
}

function detectType(amount: number, typeValue?: string): "EXPENSE" | "INCOME" {
  if (typeValue) {
    const normalized = normalizeHeader(String(typeValue))
    if (["income", "receita", "credito", "crédito", "credit", "c", "entrada"].some((t) => normalized.includes(t))) {
      return "INCOME"
    }
    if (["expense", "despesa", "debito", "débito", "debit", "d", "saida", "saída"].some((t) => normalized.includes(t))) {
      return "EXPENSE"
    }
  }

  // Fall back to sign detection
  return amount < 0 ? "EXPENSE" : "INCOME"
}

export default function ImportPage() {
  const [step, setStep] = useState<Step>("upload")
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [preview, setPreview] = useState<ParsedRow[]>([])
  const [progress, setProgress] = useState(0)
  const [rawHeaders, setRawHeaders] = useState<string[]>([])
  const [rawData, setRawData] = useState<Record<string, unknown>[]>([])
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({ date: "", amount: "", description: "", type: "" })
  const [accounts, setAccounts] = useState<FinancialAccount[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [importedCount, setImportedCount] = useState(0)

  // Fetch accounts on mount
  useEffect(() => {
    fetch("/api/accounts")
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setAccounts(list)
        // Auto-select the default account or first one
        const defaultAcc = list.find((a: FinancialAccount) => (a as any).isDefault)
        if (defaultAcc) {
          setSelectedAccountId(defaultAcc.id)
        } else if (list.length > 0) {
          setSelectedAccountId(list[0].id)
        }
      })
      .catch(() => {
        toast.error("Erro ao carregar contas")
      })
  }, [])

  const parseCSV = (file: File): Promise<{ headers: string[]; data: Record<string, unknown>[] }> => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        encoding: "UTF-8",
        complete: (results) => {
          const headers = results.meta.fields || []
          resolve({ headers, data: results.data as Record<string, unknown>[] })
        },
        error: (err: Error) => reject(err),
      })
    })
  }

  const parseXLSX = async (file: File): Promise<{ headers: string[]; data: Record<string, unknown>[] }> => {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })
    const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : []
    return { headers, data: jsonData }
  }

  const applyMapping = useCallback((data: Record<string, unknown>[], mapping: ColumnMapping): ParsedRow[] => {
    return data
      .map((row) => {
        const rawAmount = row[mapping.amount]
        const amount = parseAmount(rawAmount as string)
        const rawDate = row[mapping.date]
        const date = parseDate(rawDate as string)
        const description = String(row[mapping.description] || "").trim()
        const typeValue = mapping.type ? String(row[mapping.type] || "") : undefined
        const type = detectType(amount, typeValue)

        return {
          date,
          description,
          amount,
          type,
          status: "new" as const,
        }
      })
      .filter((row) => row.amount !== 0 || row.description !== "")
  }, [])

  const handleFile = async (selectedFile: File) => {
    const ext = selectedFile.name.split(".").pop()?.toLowerCase()

    if (!["csv", "xlsx", "xls"].includes(ext || "")) {
      toast.error("Formato de arquivo nao suportado. Use CSV ou Excel (.xlsx/.xls).")
      return
    }

    if (!selectedAccountId) {
      toast.error("Selecione uma conta antes de importar")
      return
    }

    setFile(selectedFile)
    setIsProcessing(true)

    try {
      let parsed: { headers: string[]; data: Record<string, unknown>[] }

      if (ext === "csv") {
        parsed = await parseCSV(selectedFile)
      } else {
        parsed = await parseXLSX(selectedFile)
      }

      if (parsed.data.length === 0) {
        toast.error("O arquivo esta vazio ou nao foi possivel ler os dados.")
        setIsProcessing(false)
        return
      }

      setRawHeaders(parsed.headers)
      setRawData(parsed.data)

      // Auto-map columns
      const mapping = autoMapColumns(parsed.headers)
      setColumnMapping(mapping)

      // Check if we have enough mapped columns to proceed directly
      if (mapping.date && mapping.amount) {
        const rows = applyMapping(parsed.data, mapping)
        setPreview(rows)
        setIsProcessing(false)
        setStep("mapping")
      } else {
        // Go to mapping step so user can manually map
        setIsProcessing(false)
        setStep("mapping")
      }
    } catch (err) {
      console.error("File parse error:", err)
      toast.error("Erro ao processar o arquivo. Verifique o formato.")
      setIsProcessing(false)
    }
  }

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    const newMapping = { ...columnMapping, [field]: value }
    setColumnMapping(newMapping)

    // Re-apply mapping to regenerate preview
    if (newMapping.date && newMapping.amount) {
      const rows = applyMapping(rawData, newMapping)
      setPreview(rows)
    }
  }

  const handleConfirmMapping = () => {
    if (!columnMapping.date || !columnMapping.amount) {
      toast.error("Mapeie pelo menos as colunas de Data e Valor")
      return
    }

    if (preview.length === 0) {
      const rows = applyMapping(rawData, columnMapping)
      setPreview(rows)
    }

    setStep("preview")
  }

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  const handleImport = async () => {
    setIsProcessing(true)
    setProgress(0)

    const newRows = preview.filter((r) => r.status === "new")

    if (newRows.length === 0) {
      toast.error("Nenhuma transacao nova para importar")
      setIsProcessing(false)
      return
    }

    try {
      setProgress(20)

      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accountId: selectedAccountId,
          transactions: newRows.map((row) => ({
            date: row.date,
            amount: row.amount,
            description: row.description,
            type: row.type,
            accountId: selectedAccountId,
          })),
        }),
      })

      setProgress(80)

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || "Erro ao importar")
      }

      const result = await response.json()
      setProgress(100)
      setImportedCount(result.count)
      setIsProcessing(false)
      setStep("done")
      toast.success(`${result.count} transacoes importadas com sucesso`)
    } catch (err) {
      console.error("Import error:", err)
      toast.error(err instanceof Error ? err.message : "Erro ao importar transacoes")
      setIsProcessing(false)
      setProgress(0)
    }
  }

  const resetAll = () => {
    setStep("upload")
    setFile(null)
    setPreview([])
    setProgress(0)
    setRawHeaders([])
    setRawData([])
    setColumnMapping({ date: "", amount: "", description: "", type: "" })
    setImportedCount(0)
  }

  const stepLabels: Record<string, string> = {
    upload: "Enviar Arquivo",
    mapping: "Mapear Colunas",
    preview: "Revisar Dados",
    done: "Concluido",
  }

  const stepList: Step[] = ["upload", "mapping", "preview", "done"]
  const currentStepIndex = stepList.indexOf(step)

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Importar Transacoes</h1>
        <p className="text-muted-foreground text-sm">Importe a partir de arquivos CSV ou Excel</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {stepList.map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
              step === s ? "bg-primary text-primary-foreground" :
              currentStepIndex > i ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
            }`}>
              {currentStepIndex > i ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                i + 1
              )}
            </div>
            <span className="text-sm hidden sm:block">{stepLabels[s]}</span>
            {i < stepList.length - 1 && <div className="flex-1 h-px bg-border mx-2 hidden sm:block" />}
          </div>
        ))}
      </div>

      {/* Step: Upload */}
      {step === "upload" && (
        <div className="space-y-6">
          {/* Account selector */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conta de Destino</CardTitle>
              <CardDescription>Selecione a conta onde as transacoes serao importadas</CardDescription>
            </CardHeader>
            <CardContent>
              {accounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Carregando contas...</p>
              ) : (
                <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          <Card
            className={`border-2 border-dashed cursor-pointer transition-colors ${
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <CardContent className="py-16 text-center">
              {isProcessing ? (
                <>
                  <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-lg font-medium mb-2">Processando arquivo...</p>
                  <p className="text-muted-foreground text-sm">{file?.name}</p>
                </>
              ) : (
                <>
                  <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
                  <p className="text-lg font-medium mb-2">
                    {isDragging ? "Solte o arquivo aqui" : "Envie seu arquivo de transacoes"}
                  </p>
                  <p className="text-muted-foreground text-sm mb-4">
                    Arraste e solte ou clique para selecionar -- CSV e Excel suportados
                  </p>
                  <Button variant="outline">Escolher Arquivo</Button>
                </>
              )}
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                onChange={handleFileInput}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Formatos suportados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { format: "CSV", desc: "Valores separados por virgula", example: "Exportacoes de banco, planilhas" },
                  { format: "Excel", desc: "Arquivos .xlsx / .xls", example: "Arquivos do Microsoft Excel" },
                ].map((f) => (
                  <div key={f.format} className="p-3 rounded-lg bg-muted/50">
                    <div className="font-mono font-bold text-primary mb-1">.{f.format.toLowerCase()}</div>
                    <div className="text-xs text-muted-foreground">{f.desc}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step: Column Mapping */}
      {step === "mapping" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Mapear Colunas
                  </CardTitle>
                  <CardDescription>
                    {rawHeaders.length} colunas detectadas no arquivo &quot;{file?.name}&quot; -- {rawData.length} linhas
                  </CardDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={resetAll}>
                  <X className="h-4 w-4 mr-1" />
                  Recomecar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Date mapping */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Data <span className="text-destructive">*</span>
                  </label>
                  <Select value={columnMapping.date || "__unset__"} onValueChange={(v) => handleMappingChange("date", v === "__unset__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna de data" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unset__">(Selecione)</SelectItem>
                      {rawHeaders.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount mapping */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Valor <span className="text-destructive">*</span>
                  </label>
                  <Select value={columnMapping.amount || "__unset__"} onValueChange={(v) => handleMappingChange("amount", v === "__unset__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna de valor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unset__">(Selecione)</SelectItem>
                      {rawHeaders.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description mapping */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descricao</label>
                  <Select value={columnMapping.description || "__none__"} onValueChange={(v) => handleMappingChange("description", v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a coluna de descricao" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">(Nenhuma)</SelectItem>
                      {rawHeaders.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Type mapping */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo (opcional)</label>
                  <Select value={columnMapping.type || "__none__"} onValueChange={(v) => handleMappingChange("type", v === "__none__" ? "" : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Detectar automaticamente pelo valor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">(Detectar pelo sinal do valor)</SelectItem>
                      {rawHeaders.map((h) => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Auto-mapping info */}
              {(columnMapping.date || columnMapping.amount) && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <p className="font-medium mb-1">Mapeamento detectado automaticamente:</p>
                  <div className="flex flex-wrap gap-2">
                    {columnMapping.date && (
                      <Badge variant="secondary">Data: {columnMapping.date}</Badge>
                    )}
                    {columnMapping.amount && (
                      <Badge variant="secondary">Valor: {columnMapping.amount}</Badge>
                    )}
                    {columnMapping.description && (
                      <Badge variant="secondary">Descricao: {columnMapping.description}</Badge>
                    )}
                    {columnMapping.type && (
                      <Badge variant="secondary">Tipo: {columnMapping.type}</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Preview of raw data (first 3 rows) */}
              {rawData.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Amostra dos dados do arquivo:</p>
                  <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/30">
                          {rawHeaders.map((h) => (
                            <th key={h} className="text-left px-3 py-2 text-muted-foreground font-medium whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rawData.slice(0, 3).map((row, i) => (
                          <tr key={i} className="border-t">
                            {rawHeaders.map((h) => (
                              <td key={h} className="px-3 py-1.5 whitespace-nowrap">{String(row[h] ?? "")}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>

            <div className="p-4 flex justify-end gap-3 border-t">
              <Button variant="outline" onClick={resetAll}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmMapping} disabled={!columnMapping.date || !columnMapping.amount}>
                Continuar para Revisao
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Step: Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          {isProcessing ? (
            <Card>
              <CardContent className="py-12 text-center">
                <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
                <p className="font-medium">Importando transacoes...</p>
                <p className="text-muted-foreground text-sm mt-1">{progress}% concluido</p>
                <div className="w-full max-w-xs mx-auto mt-3 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Revisar Transacoes</CardTitle>
                    <CardDescription>
                      {preview.length} encontradas -- {preview.filter((r) => r.status === "new").length} novas --{" "}
                      Conta: {accounts.find((a) => a.id === selectedAccountId)?.name || "N/A"}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => setStep("mapping")}>
                      Voltar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={resetAll}>
                      <X className="h-4 w-4 mr-1" />
                      Recomecar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y bg-muted/30">
                      <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Data</th>
                      <th className="text-left px-4 py-2.5 text-muted-foreground font-medium">Descricao</th>
                      <th className="text-left px-4 py-2.5 text-muted-foreground font-medium hidden sm:table-cell">Tipo</th>
                      <th className="text-right px-4 py-2.5 text-muted-foreground font-medium">Valor</th>
                      <th className="text-center px-4 py-2.5 text-muted-foreground font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className={`border-b ${row.status === "duplicate" ? "opacity-50" : ""}`}>
                        <td className="px-4 py-3 text-muted-foreground">{row.date}</td>
                        <td className="px-4 py-3 font-medium">{row.description || "(sem descricao)"}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                          <Badge variant={row.type === "INCOME" ? "success" : "destructive"} className="text-xs">
                            {row.type === "INCOME" ? "Receita" : "Despesa"}
                          </Badge>
                        </td>
                        <td className={`px-4 py-3 text-right font-semibold ${row.type === "EXPENSE" ? "text-red-500" : "text-emerald-600"}`}>
                          {row.type === "EXPENSE" ? "-" : "+"}R$ {Math.abs(row.amount).toFixed(2).replace(".", ",")}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.status === "new" ? (
                            <Badge variant="success" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Nova
                            </Badge>
                          ) : (
                            <Badge variant="warning" className="gap-1">
                              <AlertCircle className="h-3 w-3" />
                              Duplicada
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <p>Nenhuma transacao encontrada no arquivo. Verifique o mapeamento de colunas.</p>
                </div>
              )}
              <div className="p-4 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setStep("mapping")}>
                  Voltar
                </Button>
                <Button onClick={handleImport} loading={isProcessing} disabled={preview.filter((r) => r.status === "new").length === 0}>
                  Importar {preview.filter((r) => r.status === "new").length} Transacoes
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && (
        <Card>
          <CardContent className="py-16 text-center">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Importacao Concluida!</h2>
            <p className="text-muted-foreground mb-6">
              {importedCount} transacoes foram importadas com sucesso para a conta{" "}
              <strong>{accounts.find((a) => a.id === selectedAccountId)?.name}</strong>.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={resetAll}>
                Importar Outro Arquivo
              </Button>
              <Button onClick={() => window.location.href = "/transactions"}>
                Ver Transacoes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
