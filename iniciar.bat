@echo off
title Controle Gastos - FinTrack

echo ============================================
echo     Iniciando Controle Gastos - FinTrack
echo ============================================
echo.

:: Navega para o diretorio do projeto
cd /d "%~dp0"

:: Verifica se node_modules existe
if not exist "node_modules\" (
    echo [!] Dependencias nao encontradas. Instalando...
    npm install
    echo.
)

:: Abre o navegador apos 4 segundos (tempo para o servidor subir)
echo [*] Abrindo navegador em 4 segundos...
start "" cmd /c "timeout /t 4 /nobreak >nul && start http://localhost:3000"

:: Inicia o servidor de desenvolvimento
echo [*] Iniciando servidor Next.js...
echo [*] Acesse: http://localhost:3000
echo [*] Pressione Ctrl+C para encerrar.
echo.
npm run dev

pause
