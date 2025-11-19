import { Client } from 'pg';

async function runSQL(sqlCommand: string) {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('✓ Connected to Supabase database');
    
    const result = await client.query(sqlCommand);
    
    console.log('\n📊 Query Result:');
    console.log('─────────────────────────────────────');
    
    if (result.command === 'SELECT' && result.rows.length > 0) {
      console.log(`Found ${result.rows.length} row(s):\n`);
      console.table(result.rows);
    } else if (result.command === 'INSERT' || result.command === 'UPDATE' || result.command === 'DELETE') {
      console.log(`${result.command} successful. ${result.rowCount} row(s) affected.`);
      if (result.rows.length > 0) {
        console.log('\nReturned data:');
        console.table(result.rows);
      }
    } else {
      console.log('Command executed successfully.');
      if (result.rows.length > 0) {
        console.table(result.rows);
      }
      console.log(`Rows affected: ${result.rowCount || 0}`);
    }
    
  } catch (error: any) {
    console.error('\n❌ SQL Error:');
    console.error('─────────────────────────────────────');
    console.error('Message:', error.message);
    if (error.detail) console.error('Detail:', error.detail);
    if (error.hint) console.error('Hint:', error.hint);
    if (error.position) console.error('Position:', error.position);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Get SQL command from command line arguments
const sqlCommand = process.argv.slice(2).join(' ');

if (!sqlCommand) {
  console.error('Usage: npm run sql "YOUR SQL COMMAND HERE"');
  console.error('\nExamples:');
  console.error('  npm run sql "SELECT * FROM users LIMIT 5"');
  console.error('  npm run sql "SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\'"');
  console.error('  npm run sql "INSERT INTO users (email, name) VALUES (\'test@example.com\', \'Test User\') RETURNING *"');
  process.exit(1);
}

runSQL(sqlCommand);
