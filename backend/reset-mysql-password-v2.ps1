# Script melhorado para resetar senha do MySQL
# Execute como Administrador

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "MySQL Root Password Reset v2" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "ERRO: Execute como Administrador!" -ForegroundColor Red
    pause
    exit 1
}

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.1\bin"
$initFile = "C:\mysql-init.txt"

Write-Host "Passo 1: Parando MySQL service..." -ForegroundColor Yellow
Stop-Service MySQL81 -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# Matar qualquer processo mysqld que possa estar rodando
Get-Process mysqld -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2

Write-Host "Passo 2: Criando arquivo de inicialização..." -ForegroundColor Yellow
@"
ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';
FLUSH PRIVILEGES;
"@ | Out-File -FilePath $initFile -Encoding ASCII -NoNewline

Write-Host "Conteúdo do arquivo:" -ForegroundColor Gray
Get-Content $initFile
Write-Host ""

Write-Host "Passo 3: Iniciando MySQL em modo de recuperação..." -ForegroundColor Yellow
$mysqldProcess = Start-Process -FilePath "$mysqlPath\mysqld.exe" -ArgumentList "--init-file=$initFile", "--console", "--skip-grant-tables" -PassThru -WindowStyle Hidden

Write-Host "Aguardando 10 segundos para MySQL processar..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "Passo 4: Verificando se MySQL está rodando..." -ForegroundColor Yellow
$mysqlRunning = Get-Process mysqld -ErrorAction SilentlyContinue
if ($mysqlRunning) {
    Write-Host "MySQL está rodando, aguardando mais 5 segundos..." -ForegroundColor Green
    Start-Sleep -Seconds 5
} else {
    Write-Host "MySQL não está rodando, tentando iniciar novamente..." -ForegroundColor Yellow
    Start-Sleep -Seconds 2
}

Write-Host "Passo 5: Parando processo MySQL..." -ForegroundColor Yellow
Get-Process mysqld -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

Write-Host "Passo 6: Removendo arquivo temporário..." -ForegroundColor Yellow
Remove-Item $initFile -Force -ErrorAction SilentlyContinue

Write-Host "Passo 7: Iniciando MySQL service normalmente..." -ForegroundColor Yellow
Start-Service MySQL81
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "Testando conexão..." -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Green

# Testar várias vezes com pequenos delays
$maxAttempts = 5
$attempt = 0
$connected = $false

while ($attempt -lt $maxAttempts -and -not $connected) {
    $attempt++
    Write-Host "Tentativa $attempt de $maxAttempts..." -ForegroundColor Gray
    
    try {
        $result = & "$mysqlPath\mysql.exe" -u root -proot -e "SELECT 1;" 2>&1
        if ($LASTEXITCODE -eq 0 -or $result -match "1") {
            $connected = $true
            Write-Host "✅ CONEXÃO FUNCIONANDO!" -ForegroundColor Green
            break
        }
    } catch {
        # Continua tentando
    }
    
    if (-not $connected) {
        Write-Host "Aguardando 3 segundos antes da próxima tentativa..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
    }
}

if (-not $connected) {
    Write-Host ""
    Write-Host "⚠️  Não foi possível conectar automaticamente." -ForegroundColor Yellow
    Write-Host "Mas a senha pode ter sido resetada. Tente:" -ForegroundColor Yellow
    Write-Host "1. Reiniciar o serviço MySQL manualmente" -ForegroundColor Cyan
    Write-Host "2. Verificar se a senha 'root' funciona" -ForegroundColor Cyan
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "SENHA RESETADA COM SUCESSO!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Senha do root MySQL: root" -ForegroundColor Cyan
    Write-Host "Agora você pode rodar: npm run dev" -ForegroundColor Green
    Write-Host ""
}

pause

