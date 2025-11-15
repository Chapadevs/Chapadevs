# Set MySQL Password

Run these commands in Command Prompt (as Administrator):

1. Navigate to MySQL bin folder:
```
cd "C:\Program Files\MySQL\MySQL Server 8.1\bin"
```

2. Connect to MySQL:
```
mysql -u root
```

3. If it connects, set password:
```sql
ALTER USER 'root'@'localhost' IDENTIFIED BY 'password123';
FLUSH PRIVILEGES;
exit;
```

4. Update your `.env` file:
```
DB_PASSWORD=password123
```

5. Restart the server:
```
npm run dev
```


