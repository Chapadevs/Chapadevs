// Quick script to test common MySQL passwords
import mysql from 'mysql2/promise'

const passwords = ['', 'root', 'password', '123456', 'admin']

for (const pwd of passwords) {
  try {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: pwd
    })
    console.log(`✅ SUCCESS! Password is: "${pwd || '(empty)'}"`)
    await connection.end()
    process.exit(0)
  } catch (error) {
    console.log(`❌ Not "${pwd || '(empty)'}"`)
  }
}

console.log('\n❌ None of the common passwords worked.')
console.log('You need to reset the password.')


