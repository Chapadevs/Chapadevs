# Set MySQL Password - Run as Administrator

## Method 1: Use the batch file (Easiest)

1. **Right-click** on `set-password.bat`
2. Select **"Run as administrator"**
3. Wait for it to complete
4. Update `.env` file: `DB_PASSWORD=root`

## Method 2: Manual steps

1. Open **Command Prompt as Administrator**

2. Stop MySQL:
   ```
   net stop MySQL81
   ```

3. Create password file:
   ```
   echo ALTER USER 'root'@'localhost' IDENTIFIED BY 'root'; > C:\mysql-init.txt
   echo FLUSH PRIVILEGES; >> C:\mysql-init.txt
   ```

4. Start MySQL with init file:
   ```
   cd "C:\Program Files\MySQL\MySQL Server 8.1\bin"
   start /B mysqld.exe --init-file=C:\mysql-init.txt
   ```

5. Wait 5 seconds, then stop it:
   ```
   taskkill /F /IM mysqld.exe
   ```

6. Start MySQL service:
   ```
   net start MySQL81
   ```

7. Delete the init file:
   ```
   del C:\mysql-init.txt
   ```

8. Update `.env`: `DB_PASSWORD=root`


