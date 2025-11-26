// Script per testare la connessione al database MySQL
// Esegui con: node test-db-connection.js

const mysql = require('mysql2/promise');
require('dotenv').config();

// Colori per output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testConnection() {
  log('cyan', '\n========================================');
  log('cyan', 'Testing MySQL Database Connection');
  log('cyan', '========================================\n');

  // Parse DATABASE_URL
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    log('red', '❌ ERROR: DATABASE_URL not found in .env file!');
    log('yellow', '\nPlease create a .env file with:');
    log('blue', 'DATABASE_URL="mysql://username:password@localhost:3306/planora_db"');
    process.exit(1);
  }

  log('blue', `Database URL: ${dbUrl.replace(/:[^:@]+@/, ':****@')}`);

  // Extract connection details
  let user, password, host, port, database;

  try {
    const regex = /mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)/;
    const match = dbUrl.match(regex);

    if (!match) {
      throw new Error('Invalid DATABASE_URL format');
    }

    [, user, password, host, port, database] = match;

    log('blue', `\nConnection Details:`);
    log('blue', `  Host: ${host}`);
    log('blue', `  Port: ${port}`);
    log('blue', `  User: ${user}`);
    log('blue', `  Password: ${password ? '****' : '(empty)'}`);
    log('blue', `  Database: ${database}\n`);
  } catch (error) {
    log('red', `❌ ERROR: Invalid DATABASE_URL format!`);
    log('yellow', '\nExpected format:');
    log('blue', 'DATABASE_URL="mysql://username:password@localhost:3306/planora_db"');
    log('red', `\nError: ${error.message}`);
    process.exit(1);
  }

  // Test connection
  let connection;

  try {
    log('yellow', '[1/5] Connecting to MySQL server...');

    connection = await mysql.createConnection({
      host,
      port: parseInt(port),
      user,
      password: password || undefined,
    });

    log('green', '✅ Connected to MySQL server!\n');

    // Test database
    log('yellow', '[2/5] Checking if database exists...');

    const [databases] = await connection.query('SHOW DATABASES');
    const dbExists = databases.some(db => Object.values(db)[0] === database);

    if (dbExists) {
      log('green', `✅ Database '${database}' exists!\n`);
    } else {
      log('red', `❌ Database '${database}' does NOT exist!`);
      log('yellow', '\nPlease create it in phpMyAdmin or run:');
      log('blue', `CREATE DATABASE ${database} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
      await connection.end();
      process.exit(1);
    }

    // Select database
    log('yellow', '[3/5] Selecting database...');
    await connection.query(`USE ${database}`);
    log('green', `✅ Database '${database}' selected!\n`);

    // Check tables
    log('yellow', '[4/5] Checking tables...');
    const [tables] = await connection.query('SHOW TABLES');

    if (tables.length === 0) {
      log('yellow', '⚠️  No tables found in database.');
      log('yellow', '   Run Prisma migrations to create tables:');
      log('blue', '   npx prisma migrate deploy\n');
    } else {
      log('green', `✅ Found ${tables.length} table(s) in database:`);
      tables.forEach(table => {
        log('cyan', `   - ${Object.values(table)[0]}`);
      });
      console.log();
    }

    // Test a simple query
    log('yellow', '[5/5] Testing a simple query...');
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    log('green', `✅ Query executed successfully! Result: ${rows[0].result}\n`);

    // Success summary
    log('green', '========================================');
    log('green', '✅ ALL TESTS PASSED!');
    log('green', '========================================');
    log('cyan', '\nYour MySQL connection is working correctly.');

    if (tables.length === 0) {
      log('yellow', '\nNext step: Run Prisma migrations');
      log('blue', '  npx prisma generate');
      log('blue', '  npx prisma migrate deploy');
    } else {
      log('green', '\nYou are ready to start the backend!');
      log('blue', '  npm run dev  (development)');
      log('blue', '  pm2 start dist/index.js --name planora-api  (production)');
    }

    await connection.end();
    log('blue', '\nConnection closed.\n');

  } catch (error) {
    log('red', '\n❌ ERROR: Connection failed!');
    log('red', `\nError: ${error.message}`);

    // Common errors
    if (error.code === 'ECONNREFUSED') {
      log('yellow', '\nPossible causes:');
      log('yellow', '  - MySQL server is not running');
      log('yellow', '  - Wrong host or port');
      log('yellow', '  - Firewall blocking connection');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      log('yellow', '\nPossible causes:');
      log('yellow', '  - Wrong username or password');
      log('yellow', '  - User does not have access to the database');
    } else if (error.code === 'ENOTFOUND') {
      log('yellow', '\nPossible causes:');
      log('yellow', '  - Wrong hostname');
    }

    log('yellow', '\nTroubleshooting:');
    log('blue', '  1. Check if MySQL is running (XAMPP Control Panel)');
    log('blue', '  2. Verify credentials in .env file');
    log('blue', '  3. Test MySQL connection manually:');
    log('cyan', `     mysql -u ${user} -p -h ${host} ${database}`);

    if (connection) {
      await connection.end();
    }

    process.exit(1);
  }
}

// Run test
testConnection().catch(err => {
  log('red', `\nUnexpected error: ${err.message}`);
  process.exit(1);
});
