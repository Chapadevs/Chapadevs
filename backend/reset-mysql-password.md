# Reset MySQL Root Password

## Method 1: Using MySQL Installer (Easiest)

1. Open "MySQL Installer" from Start Menu
2. Click "Reconfigure" on MySQL Server
3. Go through setup and set a new root password
4. Update `.env` with that password

## Method 2: Skip Grant Tables (If Method 1 doesn't work)

1. Stop MySQL service:
   ```
   Stop-Service MySQL81
   ```

2. Create a text file `C:\mysql-init.txt` with:
   ```
   ALTER USER 'root'@'localhost' IDENTIFIED BY 'root';
   FLUSH PRIVILEGES;
   ```

3. Start MySQL with skip-grant:
   ```
   & "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysqld.exe" --init-file=C:\mysql-init.txt
   ```

4. Wait a few seconds, then stop it and start the service normally

5. Update `.env`:
   ```
   DB_PASSWORD=root
   ```


