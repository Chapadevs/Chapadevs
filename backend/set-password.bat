@echo off
echo Stopping MySQL service...
net stop MySQL81

echo Creating password reset file...
echo ALTER USER 'root'@'localhost' IDENTIFIED BY 'root'; > C:\mysql-init.txt
echo FLUSH PRIVILEGES; >> C:\mysql-init.txt

echo Starting MySQL with init file...
cd "C:\Program Files\MySQL\MySQL Server 8.1\bin"
start /B mysqld.exe --init-file=C:\mysql-init.txt

timeout /t 5 /nobreak >nul

echo Stopping MySQL...
taskkill /F /IM mysqld.exe >nul 2>&1

echo Starting MySQL service normally...
net start MySQL81

echo Cleaning up...
del C:\mysql-init.txt

echo.
echo Password has been set to: root
echo Update your .env file with: DB_PASSWORD=root
pause


