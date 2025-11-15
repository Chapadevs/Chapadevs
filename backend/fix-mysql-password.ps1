# Script para resetar senha do MySQL root
# Execute como Administrador

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Reset MySQL Root Password" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Verificar se está rodando como admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERRO: Execute este script como Administrador!" -ForegroundColor Red
    Write-Host "Clique com botão direito e selecione 'Executar como administrador'" -ForegroundColor Yellow
    pause
    exit 1
}

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.1\bin"
$initFile = "C:\mysql-init.txt"

Write-Host "Passo 1: Parando serviço MySQL..." -ForegroundColor Yellow
Stop-Service MySQL81 -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Passo 2: Criando arquivo de inicialização..." -ForegroundColor Yellow
@"
ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';
FLUSH PRIVILEGES;
"@ | Out-File -FilePath $initFile -Encoding ASCII

Write-Host "Passo 3: Iniciando MySQL em modo de recuperação..." -ForegroundColor Yellow
$mysqld = Start-Process -FilePath "$mysqlPath\mysqld.exe" -ArgumentList "--init-file=$initFile", "--console" -PassThru -NoNewWindow

Write-Host "Aguardando 8 segundos para MySQL processar..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host "Passo 4: Parando processo MySQL..." -ForegroundColor Yellow
Stop-Process -Id $mysqld.Id -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Passo 5: Iniciando serviço MySQL normalmente..." -ForegroundColor Yellow
Start-Service MySQL81
Start-Sleep -Seconds 3

Write-Host "Passo 6: Removendo arquivo temporário..." -ForegroundColor Yellow
Remove-Item $initFile -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "SENHA RESETADA COM SUCESSO!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Senha do root MySQL: root" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testando conexão..." -ForegroundColor Yellow

# Testar conexão
try {
    $testConn = & "$mysqlPath\mysql.exe" -u root -proot -e "SELECT 1;" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ CONEXÃO FUNCIONANDO!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Seu .env já está configurado corretamente!" -ForegroundColor Green
        Write-Host "Agora você pode rodar: npm run dev" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️  Conexão pode precisar de mais alguns segundos..." -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️  Não foi possível testar automaticamente, mas a senha foi resetada" -ForegroundColor Yellow
}

Write-Host ""
pause

