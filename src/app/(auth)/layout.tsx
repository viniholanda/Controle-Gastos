export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Painel esquerdo - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 flex-col items-center justify-center p-12 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative z-10 max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14l-4-4 1.41-1.41L10 13.17l6.59-6.59L18 8l-8 8z" />
              </svg>
            </div>
            <span className="text-3xl font-bold tracking-tight">FinTrack</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            Controle suas finanças com confiança
          </h1>
          <p className="text-lg text-white/80 mb-8">
            Registre gastos, gerencie orçamentos e obtenha insights sobre sua saúde financeira — tudo em um só lugar.
          </p>
          <div className="grid grid-cols-3 gap-4 text-center">
            {[
              { value: "Rápido", label: "Lançamento" },
              { value: "Inteligente", label: "Análises" },
              { value: "Seguro", label: "& Privado" },
            ].map((item) => (
              <div key={item.label} className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <div className="text-xl font-bold">{item.value}</div>
                <div className="text-sm text-white/70">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      {/* Painel direito - formulário */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  )
}
