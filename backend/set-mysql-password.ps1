# Script to set MySQL root password
# Run this in PowerShell as Administrator

$mysqlPath = "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysql.exe"

if (Test-Path $mysqlPath) {
    Write-Host "Found MySQL at: $mysqlPath"
    Write-Host ""
    Write-Host "Attempting to connect to MySQL..."
    Write-Host "If this fails, you may need to:"
    Write-Host "1. Find the temporary root password in the MySQL error log"
    Write-Host "2. Or reset the root password using MySQL's reset procedure"
    Write-Host ""
    
    # Try to connect without password first
    $command = "& `"$mysqlPath`" -u root -e `"SELECT 1;`""
    Invoke-Expression $command
    
    Write-Host ""
    Write-Host "If connection succeeded, run this SQL command:"
    Write-Host "ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';"
    Write-Host "FLUSH PRIVILEGES;"
} else {
    Write-Host "MySQL not found at: $mysqlPath"
    Write-Host "Please check your MySQL installation path"
}

