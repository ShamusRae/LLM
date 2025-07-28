#!/usr/bin/env node
'use strict';

/**
 * Database Setup Script for Professional Consulting Platform
 * Initializes PostgreSQL schema and creates initial data
 */

const { Client } = require('pg');
const fs = require('fs').promises;
const path = require('path');

require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || process.env.USER,
  password: process.env.DB_PASSWORD || '',
  // Don't specify database initially - we need to create it
};

const dbName = process.env.DB_NAME || 'consulting_platform';

async function setupDatabase() {
  console.log('🚀 Setting up Professional Consulting Platform Database...\n');
  
  let client = null;
  
  try {
    // Connect to postgres database to create our target database
    client = new Client({
      ...dbConfig,
      database: 'postgres'
    });
    
    await client.connect();
    console.log('✅ Connected to PostgreSQL server');
    
    // Check if database exists, create if not
    const dbExistsResult = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName]
    );
    
    if (dbExistsResult.rows.length === 0) {
      console.log(`📦 Creating database: ${dbName}`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log('✅ Database created successfully');
    } else {
      console.log(`📦 Database ${dbName} already exists`);
    }
    
    await client.end();
    
    // Now connect to our target database
    client = new Client({
      ...dbConfig,
      database: dbName
    });
    
    await client.connect();
    console.log(`✅ Connected to ${dbName} database`);
    
    // Read and execute schema
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    console.log('📋 Loading database schema...');
    
    const schemaSql = await fs.readFile(schemaPath, 'utf8');
    
    // Execute schema in transaction
    await client.query('BEGIN');
    
    try {
      // Execute the entire schema as one statement to handle functions properly
      await client.query(schemaSql);
      
      await client.query('COMMIT');
      console.log('✅ Database schema applied successfully');
      
    } catch (schemaError) {
      await client.query('ROLLBACK');
      throw schemaError;
    }
    
    // Verify setup by checking tables
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    console.log('\n📊 Created tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  ✓ ${row.table_name}`);
    });
    
    // Create initial demo client if not exists
    const clientResult = await client.query(
      "SELECT id FROM clients WHERE email = 'demo@example.com'"
    );
    
    if (clientResult.rows.length === 0) {
      await client.query(`
        INSERT INTO clients (name, email, organization, tier) 
        VALUES ('Demo Client', 'demo@example.com', 'Demo Organization', 'premium')
      `);
      console.log('✅ Demo client created');
    }
    
    await client.end();
    
    console.log('\n🎉 Database setup completed successfully!');
    console.log('\n📝 Configuration:');
    console.log(`   Host: ${dbConfig.host}:${dbConfig.port}`);
    console.log(`   Database: ${dbName}`);
    console.log(`   User: ${dbConfig.user}`);
    console.log('\n🚀 Your professional consulting platform is ready!');
    
  } catch (error) {
    console.error('\n❌ Database setup failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Make sure PostgreSQL is running:');
      console.log('   macOS: brew services start postgresql');
      console.log('   Ubuntu: sudo systemctl start postgresql');
      console.log('   Windows: Start PostgreSQL service');
    } else if (error.code === '28P01') {
      console.log('\n💡 Authentication failed. Check your credentials:');
      console.log('   - Set DB_USER and DB_PASSWORD in .env file');
      console.log('   - Or configure PostgreSQL to trust local connections');
    }
    
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        // Ignore close errors
      }
    }
    
    process.exit(1);
  }
}

// Health check function
async function healthCheck() {
  const client = new Client({
    ...dbConfig,
    database: dbName
  });
  
  try {
    await client.connect();
    
    // Test basic functionality
    const result = await client.query('SELECT COUNT(*) as projects FROM consulting_projects');
    const projectCount = result.rows[0].projects;
    
    console.log('🏥 Database Health Check:');
    console.log(`   Status: ✅ Healthy`);
    console.log(`   Projects: ${projectCount}`);
    console.log(`   Connection: ✅ Active`);
    
    await client.end();
    return true;
    
  } catch (error) {
    console.log('🏥 Database Health Check:');
    console.log(`   Status: ❌ Error`);
    console.log(`   Error: ${error.message}`);
    
    if (client) {
      try {
        await client.end();
      } catch (closeError) {
        // Ignore
      }
    }
    
    return false;
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  switch (command) {
    case 'health':
      healthCheck().then(healthy => {
        process.exit(healthy ? 0 : 1);
      });
      break;
      
    case 'setup':
    default:
      setupDatabase();
      break;
  }
}

module.exports = { setupDatabase, healthCheck }; 