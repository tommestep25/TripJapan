const { Pool } = require('pg');

// ใช้ connection string จากภาพของคุณ
const connectionString = 'postgresql://neondb_owner:npg_ce3w8DZkWdbr@ep-square-brook-a12j3hmy-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
  try {
    console.log('🔄 กำลังเชื่อมต่อฐานข้อมูล...');
    
    // ทดสอบการเชื่อมต่อ
    const client = await pool.connect();
    
    // สร้างตาราง
    await client.query(`
      CREATE TABLE IF NOT EXISTS trip_activities (
        id SERIAL PRIMARY KEY,
        trip_day TEXT NOT NULL,
        place TEXT NOT NULL,
        time TEXT NOT NULL,
        description TEXT,
        latitude DOUBLE PRECISION,
        longitude DOUBLE PRECISION,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `);
    console.log('✅ สร้างตารางสำเร็จ');
    
    // ตรวจสอบตาราง
    const result = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'trip_activities'
    `);
    
    console.log('\n📋 โครงสร้างตาราง trip_activities:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });
    
    // เพิ่มข้อมูลทดสอบ (optional)
    const testData = await client.query(`
      INSERT INTO trip_activities (trip_day, place, time, description, latitude, longitude)
      VALUES ('วันที่ 1', 'tokyo', '09:00', 'ทดสอบระบบ', 35.6762, 139.6503)
      RETURNING *
    `);
    console.log('\n✅ เพิ่มข้อมูลทดสอบสำเร็จ:', testData.rows[0]);
    
    // ดึงข้อมูลทั้งหมด
    const allData = await client.query('SELECT * FROM trip_activities');
    console.log(`\n📊 จำนวนข้อมูลในตาราง: ${allData.rowCount} แถว`);
    
    client.release();
    console.log('\n✅ Setup เสร็จสมบูรณ์!');
    
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด:', error.message);
    console.error('รายละเอียด:', error);
  } finally {
    await pool.end();
  }
}

// รันฟังก์ชัน
setupDatabase();