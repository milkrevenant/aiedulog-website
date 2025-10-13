#!/usr/bin/env node
/**
 * RDS Connection Test Script
 */

require('dotenv').config({ path: '.env.migration' });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.RDS_HOST,
  port: parseInt(process.env.RDS_PORT || '5432'),
  database: process.env.RDS_DATABASE,
  user: process.env.RDS_USERNAME,
  password: process.env.RDS_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  console.log('='.repeat(70));
  console.log('RDS Connection Test');
  console.log('='.repeat(70));
  console.log(`Host: ${process.env.RDS_HOST}`);
  console.log(`Database: ${process.env.RDS_DATABASE}`);
  console.log(`User: ${process.env.RDS_USERNAME}`);
  console.log('');

  try {
    console.log('Connecting to RDS...');
    const client = await pool.connect();
    console.log('✓ Connection successful!\n');

    // Test query
    const result = await client.query('SELECT version()');
    console.log('PostgreSQL Version:');
    console.log(result.rows[0].version);
    console.log('');

    // Check existing databases
    const dbResult = await client.query(
      "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname"
    );
    console.log('Available Databases:');
    dbResult.rows.forEach(row => console.log(`  - ${row.datname}`));
    console.log('');

    // Check if aiedulog database exists
    const aiedulogExists = dbResult.rows.some(row => row.datname === 'aiedulog');
    if (!aiedulogExists) {
      console.log('⚠️  "aiedulog" database does not exist.');
      console.log('   Creating "aiedulog" database...');
      await client.query('CREATE DATABASE aiedulog');
      console.log('✓ Database "aiedulog" created successfully!\n');
    } else {
      console.log('✓ Database "aiedulog" already exists\n');
    }

    client.release();

    console.log('='.repeat(70));
    console.log('✓ RDS is ready for migration!');
    console.log('='.repeat(70));

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('✗ Connection failed:');
    console.error(error.message);
    console.log('');
    console.log('Troubleshooting:');
    console.log('  1. Check security group allows your IP');
    console.log('  2. Verify RDS_PASSWORD is correct');
    console.log('  3. Ensure RDS instance is "available"');
    await pool.end();
    process.exit(1);
  }
}

testConnection();
