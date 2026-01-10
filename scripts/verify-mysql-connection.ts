import 'dotenv/config'
import { queryMySQL, closeMySQLPool, testMySQLConnection } from '@/lib/mysql-source-client'
import { getMySQLPool } from '@/lib/mysql-source-client'

interface TableInfo {
  table_name: string
  table_rows: number
}

interface SampleLead {
  id: number
  Patient_Name: string
  Lead_Date: Date | string
  BDM?: string
  Status?: string
}

/**
 * Verify MySQL connection and permissions
 */
async function verifyMySQLConnection() {
  console.log('='.repeat(60))
  console.log('MySQL Connection Verification Script')
  console.log('='.repeat(60))
  console.log()

  // Check environment variable
  const connectionUrl = process.env.MYSQL_SOURCE_URL
  if (!connectionUrl) {
    console.error('❌ ERROR: MYSQL_SOURCE_URL environment variable is not set')
    console.log('\nPlease add to your .env file:')
    console.log('MYSQL_SOURCE_URL="mysql://lead_reader:password@kundkundtc.in:3306/kundkun_mediendcrm"')
    process.exit(1)
  }

  console.log('✓ MYSQL_SOURCE_URL environment variable found')
  
  // Parse and display connection info (mask password)
  try {
    // Try URL parsing first
    try {
      const url = new URL(connectionUrl.replace(/^mysql:/, 'http:'))
      console.log(`  Host: ${url.hostname}`)
      console.log(`  Port: ${url.port || '3306 (default)'}`)
      console.log(`  Database: ${url.pathname.replace(/^\//, '').split('?')[0]}`)
      console.log(`  User: ${url.username ? decodeURIComponent(url.username) : 'not specified'}`)
      console.log(`  Password: ${url.password ? '*'.repeat(Math.min(url.password.length, 12)) : 'not specified'} (hidden)`)
    } catch {
      // Fallback to regex
      const urlPattern = /^mysql:\/\/([^:@]+)(?::([^@]+))?@([^:/]+)(?::(\d+))?\/([^?]+)/
      const match = connectionUrl.match(urlPattern)
      
      if (match) {
        const [, user, , host, port, database] = match
        console.log(`  Host: ${host}`)
        console.log(`  Port: ${port || '3306 (default)'}`)
        console.log(`  Database: ${database}`)
        console.log(`  User: ${user ? decodeURIComponent(user) : 'not specified'}`)
        console.log(`  Password: ${'*'.repeat(8)} (hidden)`)
      } else {
        console.warn('⚠ WARNING: Could not parse connection URL format')
        console.log('  Expected format: mysql://user:password@host:port/database')
        console.log(`  Actual URL (first 80 chars): ${connectionUrl.substring(0, 80)}...`)
      }
    }
  } catch (error) {
    console.warn('⚠ Could not parse connection URL:', error)
  }

  console.log()

  // Test basic connection
  console.log('1. Testing MySQL connection...')
  try {
    const isConnected = await testMySQLConnection()
    if (isConnected) {
      console.log('   ✓ Connection successful!\n')
    } else {
      console.error('   ❌ Connection failed!\n')
      process.exit(1)
    }
  } catch (error) {
    console.error('   ❌ Connection error:', error instanceof Error ? error.message : error)
    console.log()
    process.exit(1)
  }

  // Extract database name from connection URL (handle query parameters and URL encoding)
  let currentDb: string | null = null
  
  try {
    // Try URL parsing first
    const url = new URL(connectionUrl.replace(/^mysql:/, 'http:'))
    currentDb = url.pathname.replace(/^\//, '').split('?')[0]
    if (currentDb) {
      currentDb = decodeURIComponent(currentDb)
    }
  } catch {
    // Fallback to regex
    const dbMatch = connectionUrl.match(/\/\/(?:[^:@]+)(?::[^@]+)?@(?:[^:/]+)(?::\d+)?\/([^?]+)/)
    currentDb = dbMatch ? decodeURIComponent(dbMatch[1]) : null
  }
  
  if (!currentDb) {
    console.error('❌ ERROR: Could not extract database name from connection URL')
    console.error(`   URL format: ${connectionUrl.substring(0, 100)}...`)
    process.exit(1)
  }

  // Check database and tables exist
  console.log('2. Verifying database and tables...')
  try {
    const pool = getMySQLPool()
    
    // Check if we can query information_schema
    const databases = await queryMySQL<{ Database: string }>(
      'SHOW DATABASES'
    )
    
    const dbExists = databases.some(db => db.Database === currentDb)
    
    if (dbExists) {
      console.log(`   ✓ Database '${currentDb}' exists`)
    } else {
      console.error(`   ❌ Database '${currentDb}' not found!`)
      console.log(`   Available databases: ${databases.map(d => d.Database).join(', ')}`)
      await closeMySQLPool()
      process.exit(1)
    }

    // Check required tables exist
    const tables = await queryMySQL<TableInfo>(
      `SELECT table_name, table_rows 
       FROM information_schema.tables 
       WHERE table_schema = ? 
       AND table_name IN ('lead', 'lead_remarks')`,
      [currentDb]
    )

    const tableNames = tables.map(t => t.table_name)
    const requiredTables = ['lead', 'lead_remarks']
    
    for (const tableName of requiredTables) {
      if (tableNames.includes(tableName)) {
        const tableInfo = tables.find(t => t.table_name === tableName)
        const rowCount = tableInfo?.table_rows || 0
        console.log(`   ✓ Table '${tableName}' exists (approx. ${rowCount.toLocaleString()} rows)`)
      } else {
        console.error(`   ❌ Table '${tableName}' not found!`)
      }
    }

    if (!tableNames.includes('lead') || !tableNames.includes('lead_remarks')) {
      await closeMySQLPool()
      process.exit(1)
    }

    console.log()
  } catch (error) {
    console.error('   ❌ Error checking tables:', error instanceof Error ? error.message : error)
    console.log()
    await closeMySQLPool()
    process.exit(1)
  }

  // Test SELECT permissions on lead table
  console.log('3. Testing SELECT permissions on lead table...')
  try {
    const leadCount = await queryMySQL<{ count: number }>(
      'SELECT COUNT(*) as count FROM lead'
    )
    
    const totalLeads = leadCount[0]?.count || 0
    console.log(`   ✓ SELECT permission granted`)
    console.log(`   ✓ Total leads in database: ${totalLeads.toLocaleString()}`)
    console.log()
  } catch (error) {
    console.error('   ❌ SELECT permission denied or error:', error instanceof Error ? error.message : error)
    console.log('   Make sure the MySQL user has SELECT permission on the lead table')
    console.log()
    await closeMySQLPool()
    process.exit(1)
  }

  // Test SELECT permissions on lead_remarks table
  console.log('4. Testing SELECT permissions on lead_remarks table...')
  try {
    const remarksCount = await queryMySQL<{ count: number }>(
      'SELECT COUNT(*) as count FROM lead_remarks'
    )
    
    const totalRemarks = remarksCount[0]?.count || 0
    console.log(`   ✓ SELECT permission granted`)
    console.log(`   ✓ Total remarks in database: ${totalRemarks.toLocaleString()}`)
    console.log()
  } catch (error) {
    console.error('   ❌ SELECT permission denied or error:', error instanceof Error ? error.message : error)
    console.log('   Make sure the MySQL user has SELECT permission on the lead_remarks table')
    console.log()
    await closeMySQLPool()
    process.exit(1)
  }

  // Show sample data
  console.log('5. Fetching sample data...')
  try {
    const sampleLeads = await queryMySQL<SampleLead>(
      `SELECT id, Patient_Name, Lead_Date, BDM, Status 
       FROM lead 
       ORDER BY Lead_Date DESC 
       LIMIT 5`
    )

    if (sampleLeads.length > 0) {
      console.log(`   ✓ Retrieved ${sampleLeads.length} sample leads:`)
      console.log()
      sampleLeads.forEach((lead, index) => {
        console.log(`   [${index + 1}] Lead ID: ${lead.id}`)
        console.log(`       Patient: ${lead.Patient_Name || 'N/A'}`)
        console.log(`       Date: ${lead.Lead_Date ? new Date(lead.Lead_Date).toISOString().split('T')[0] : 'N/A'}`)
        console.log(`       BDM: ${lead.BDM || 'N/A'}`)
        console.log(`       Status: ${lead.Status || 'N/A'}`)
        console.log()
      })
    } else {
      console.log('   ⚠ No leads found in database')
      console.log()
    }
  } catch (error) {
    console.error('   ❌ Error fetching sample data:', error instanceof Error ? error.message : error)
    console.log()
  }

  // Test date-based query (used in sync)
  console.log('6. Testing date-based query (used in sync)...')
  try {
    const testDate = new Date('2024-12-31T00:00:00Z')
    const dateCount = await queryMySQL<{ count: number }>(
      `SELECT COUNT(*) as count 
       FROM lead 
       WHERE Lead_Date >= ?`,
      [testDate]
    )
    
    const leadsFromDate = dateCount[0]?.count || 0
    console.log(`   ✓ Date-based query works`)
    console.log(`   ✓ Leads from ${testDate.toISOString().split('T')[0]}: ${leadsFromDate.toLocaleString()}`)
    console.log()
  } catch (error) {
    console.error('   ❌ Error with date-based query:', error instanceof Error ? error.message : error)
    console.log()
  }

  // Test field structure
  console.log('7. Verifying required fields in lead table...')
  try {
    const columns = await queryMySQL<{ Field: string; Type: string; Null: string }>(
      `SELECT Field, Type, \`Null\` 
       FROM information_schema.columns 
       WHERE table_schema = ? 
       AND table_name = 'lead'`,
      [currentDb]
    )

    const requiredFields = [
      'id',
      'Patient_Name',
      'Patient_Number',
      'Lead_Date',
      'BDM',
      'Status',
      'Circle',
    ]

    const columnNames = columns.map(c => c.Field)
    let allFieldsExist = true

    for (const field of requiredFields) {
      if (columnNames.includes(field)) {
        console.log(`   ✓ Field '${field}' exists`)
      } else {
        console.error(`   ❌ Required field '${field}' not found!`)
        allFieldsExist = false
      }
    }

    if (allFieldsExist) {
      console.log(`   ✓ All required fields present (total: ${columns.length} columns)`)
    } else {
      console.error('   ❌ Some required fields are missing!')
    }

    console.log()
  } catch (error) {
    console.error('   ❌ Error checking table structure:', error instanceof Error ? error.message : error)
    console.log()
  }

  // Summary
  console.log('='.repeat(60))
  console.log('✓ Verification Complete!')
  console.log('='.repeat(60))
  console.log()
  console.log('Your MySQL connection is properly configured and ready for syncing.')
  console.log()
  console.log('Next steps:')
  console.log('  1. Run historic sync: npm run sync:historic:leads')
  console.log('  2. Or run incremental sync: npm run sync:leads')
  console.log()

  await closeMySQLPool()
  process.exit(0)
}

// Run verification
verifyMySQLConnection().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
