@echo off
echo ========================================
echo MySQL Root Password Reset Script
echo ========================================
echo.
echo This script will reset MySQL root password to 'root'
echo.
echo WARNING: This will stop MySQL service temporarily
echo.
pause

echo.
echo Step 1: Stopping MySQL service...
net stop MySQL81
if %errorlevel% neq 0 (
    echo ERROR: Could not stop MySQL service
    echo You may need to run this script as Administrator
    pause
    exit /b 1
)

echo.
echo Step 2: Creating initialization file...
echo ALTER USER 'root'@'localhost' IDENTIFIED BY 'root'; > C:\mysql-init.txt
echo FLUSH PRIVILEGES; >> C:\mysql-init.txt

echo.
echo Step 3: Starting MySQL with skip-grant-tables...
start /wait "" "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysqld.exe" --init-file=C:\mysql-init.txt --console

echo.
echo Step 4: Waiting 5 seconds for MySQL to process...
timeout /t 5 /nobreak >nul

echo.
echo Step 5: Stopping MySQL process...
taskkill /F /IM mysqld.exe 2>nul

echo.
echo Step 6: Starting MySQL service normally...
net start MySQL81

echo.
echo Step 7: Cleaning up...
del C:\mysql-init.txt

echo.
echo ========================================
echo Password reset complete!
echo.
echo MySQL root password is now: root
echo.
echo Your .env file should have:
echo DB_PASSWORD=root
echo.
echo ========================================
pause

