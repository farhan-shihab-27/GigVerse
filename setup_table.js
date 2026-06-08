const pool = require('./database/db');
const fs = require('fs');
const path = require('path');

async function createTable() {
    try {
        console.log('⏳ Creating Reports table...');
        
        // migrate_reports.sql ফাইলটা রিড করছে
        const sql = fs.readFileSync(path.join(__dirname, 'database', 'migrate_reports.sql'), 'utf8');
        
        // ডাটাবেসে টেবিল বানাচ্ছে
        await pool.query(sql);
        
        console.log('✅ Success! Reports table created successfully in your database!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error creating table:', err.message);
        process.exit(1);
    }
}

createTable();