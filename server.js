const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config(); // โหลด environment variables

const app = express();


app.use(express.json());
app.use(cors({
  origin: '*', // ในการใช้งานจริงควรระบุ domain ที่แน่นอน
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

// Health check endpoint สำหรับ Render
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Japan Trip API is running! 🇯🇵',
    timestamp: new Date().toISOString(),
    endpoints: {
      'GET /': 'Health check',
      'GET /api/activities': 'Get all activities',
      'POST /api/activities': 'Create new activity',
      'POST /api/trip/save-all': 'Save all trip data',
      'GET /api/activities/day/:day': 'Get activities by day',
      'PUT /api/activities/:id': 'Update activity',
      'DELETE /api/activities/:id': 'Delete activity',
      'DELETE /api/activities/clear-all': 'Clear all data'
    }
  });
});

// เชื่อมต่อ Neon Database
// ⚠️ สำคัญ: ใส่ password จริงของคุณแทน ****************
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ce3w8DZkWdbr@ep-square-brook-a12j3hmy-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ตรวจสอบการเชื่อมต่อ database
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
  } else {
    console.log('✅ Connected to Neon database successfully');
    release();
  }
});

// สร้างตารางถ้ายังไม่มี
async function createTableIfNotExists() {
  try {
    await pool.query(`
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
    console.log('✅ Table trip_activities is ready');
  } catch (err) {
    console.error('Error creating table:', err);
  }
}

createTableIfNotExists();

// บันทึกกิจกรรมเดี่ยว
app.post('/api/activities', async (req, res) => {
  const { trip_day, place, time, description, latitude, longitude } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO trip_activities (trip_day, place, time, description, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [trip_day, place, time, description, latitude, longitude]
    );
    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: 'บันทึกกิจกรรมเรียบร้อย'
    });
  } catch (err) {
    console.error('Error saving activity:', err);
    res.status(500).json({
      success: false,
      error: 'Error saving data',
      details: err.message
    });
  }
});

// บันทึกข้อมูลทั้งหมดของ Trip
app.post('/api/trip/save-all', async (req, res) => {
  const { tripData } = req.body;

  try {
    // ลบข้อมูลเก่าก่อน (optional - ถ้าต้องการ overwrite)
    // await pool.query('DELETE FROM trip_activities');

    // บันทึกข้อมูลใหม่
    const insertPromises = [];
    
    for (const day of tripData) {
      for (const activity of day.activities) {
        const location = locationDatabase[activity.location] || {};
        const promise = pool.query(
          'INSERT INTO trip_activities (trip_day, place, time, description, latitude, longitude) VALUES ($1, $2, $3, $4, $5, $6)',
          [
            `วันที่ ${day.day}`,
            activity.location || 'unknown',
            activity.time,
            activity.text,
            location.lat || null,
            location.lon || null
          ]
        );
        insertPromises.push(promise);
      }
    }

    await Promise.all(insertPromises);
    
    res.status(201).json({
      success: true,
      message: 'บันทึกข้อมูลทั้งหมดเรียบร้อย',
      count: insertPromises.length
    });
  } catch (err) {
    console.error('Error saving trip data:', err);
    res.status(500).json({
      success: false,
      error: 'Error saving trip data',
      details: err.message
    });
  }
});

// ดึงข้อมูลกิจกรรมทั้งหมด
app.get('/api/activities', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM trip_activities ORDER BY id');
    res.json({
      success: true,
      data: result.rows,
      count: result.rowCount
    });
  } catch (err) {
    console.error('Error fetching activities:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching data'
    });
  }
});

// ดึงข้อมูลกิจกรรมตามวัน
app.get('/api/activities/day/:day', async (req, res) => {
  const { day } = req.params;
  
  try {
    const result = await pool.query(
      'SELECT * FROM trip_activities WHERE trip_day = $1 ORDER BY time',
      [`วันที่ ${day}`]
    );
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    console.error('Error fetching activities by day:', err);
    res.status(500).json({
      success: false,
      error: 'Error fetching data'
    });
  }
});

// อัปเดตกิจกรรม
app.put('/api/activities/:id', async (req, res) => {
  const { id } = req.params;
  const { place, time, description, latitude, longitude } = req.body;

  try {
    const result = await pool.query(
      'UPDATE trip_activities SET place = $1, time = $2, description = $3, latitude = $4, longitude = $5 WHERE id = $6 RETURNING *',
      [place, time, description, latitude, longitude, id]
    );
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    res.json({
      success: true,
      data: result.rows[0],
      message: 'อัปเดตกิจกรรมเรียบร้อย'
    });
  } catch (err) {
    console.error('Error updating activity:', err);
    res.status(500).json({
      success: false,
      error: 'Error updating data'
    });
  }
});

// ลบกิจกรรม
app.delete('/api/activities/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query('DELETE FROM trip_activities WHERE id = $1', [id]);
    
    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: 'Activity not found'
      });
    }
    
    res.json({
      success: true,
      message: 'ลบกิจกรรมเรียบร้อย'
    });
  } catch (err) {
    console.error('Error deleting activity:', err);
    res.status(500).json({
      success: false,
      error: 'Error deleting data'
    });
  }
});

// ล้างข้อมูลทั้งหมด
app.delete('/api/activities/clear-all', async (req, res) => {
  try {
    await pool.query('DELETE FROM trip_activities');
    res.json({
      success: true,
      message: 'ล้างข้อมูลทั้งหมดเรียบร้อย'
    });
  } catch (err) {
    console.error('Error clearing all data:', err);
    res.status(500).json({
      success: false,
      error: 'Error clearing data'
    });
  }
});
app.delete('/api/activities', async (req, res) => {
  try {
    await pool.query('TRUNCATE TABLE trip_activities');
    res.status(200).json({ message: 'All activities cleared' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error truncating table');
  }
});

// Location database for coordinates lookup
const locationDatabase = {
  'narita': { lat: 35.772, lon: 140.3929 },
  'shibuya': { lat: 35.6598, lon: 139.7006 },
  'asakusa': { lat: 35.7148, lon: 139.7967 },
  'skytree': { lat: 35.7101, lon: 139.8107 },
  'harajuku': { lat: 35.6702, lon: 139.7026 },
  'fuji': { lat: 35.3606, lon: 138.7274 },
  'fujiq': { lat: 35.4884, lon: 138.7785 },
  'osaka': { lat: 34.6937, lon: 135.5023 },
  'osakacastle': { lat: 34.6873, lon: 135.5262 },
  'dotonbori': { lat: 34.6685, lon: 135.5018 },
  'disney': { lat: 35.6329, lon: 139.8804 },
  'usj': { lat: 34.6658, lon: 135.432 },
  'kansai': { lat: 34.4347, lon: 135.244 },
  'tokyo': { lat: 35.6762, lon: 139.6503 }
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ API server running on port ${PORT}`);
  console.log(`📍 API endpoints:`);
  console.log(`   POST   /api/activities - บันทึกกิจกรรมเดี่ยว`);
  console.log(`   POST   /api/trip/save-all - บันทึกข้อมูลทั้งหมด`);
  console.log(`   GET    /api/activities - ดึงข้อมูลทั้งหมด`);
  console.log(`   GET    /api/activities/day/:day - ดึงข้อมูลตามวัน`);
  console.log(`   PUT    /api/activities/:id - อัปเดตกิจกรรม`);
  console.log(`   DELETE /api/activities/:id - ลบกิจกรรม`);
  console.log(`   DELETE /api/activities/clear-all - ล้างข้อมูลทั้งหมด`);
});
