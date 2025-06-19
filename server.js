const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
require('dotenv').config(); // โหลด environment variables

const app = express();
app.use(express.json());
app.use(cors());

// เชื่อมต่อ Neon Database
// ⚠️ สำคัญ: ใส่ password จริงของคุณแทน ****************
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_ce3w8DZkWdbr@ep-square-brook-a12j3hmy-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
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
  const { trip_day, place, time, description, latitude, longitude, cost } = req.body;

  console.log('📥 Received data:', req.body);
  try {
    const result = await pool.query(
      'INSERT INTO trip_activities (trip_day, place, time, description, latitude, longitude, cost) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
      [trip_day, place, time, description, latitude, longitude, cost || 0]
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
          'INSERT INTO trip_activities (trip_day, place, time, description, latitude, longitude, cost) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [
            `วันที่ ${day.day}`,
            activity.location || 'unknown',
            activity.time,
            activity.text,
            location.lat || null,
            location.lon || null,
            activity.cost || 0
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
  const { place, time, description, latitude, longitude, cost } = req.body;

  try {
    const result = await pool.query(
      'UPDATE trip_activities SET place = $1, time = $2, description = $3, latitude = $4, longitude = $5, cost = $6 WHERE id = $7 RETURNING *',
      [place, time, description, latitude, longitude, cost || 0, id]  // เปลี่ยนจาก $6 เป็น $7 สำหรับ id
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
      error: 'Error updating data',
      details: err.message
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
  // Tokyo Area
  narita: { name: "Narita Airport", lat: 35.772, lon: 140.3929 },
  haneda: { name: "Haneda Airport", lat: 35.5494, lon: 139.7798 },
  tokyo: { name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  shibuya: { name: "Shibuya", lat: 35.6598, lon: 139.7006 },
  shinjuku: { name: "Shinjuku", lat: 35.6938, lon: 139.7034 },
  ueno: { name: "Ueno", lat: 35.7138, lon: 139.7773 },
  asakusa: { name: "Asakusa", lat: 35.7148, lon: 139.7967 },
  skytree: { name: "Tokyo Skytree", lat: 35.7101, lon: 139.8107 },
  harajuku: { name: "Harajuku", lat: 35.6702, lon: 139.7026 },
  akihabara: { name: "Akihabara", lat: 35.6984, lon: 139.773 },
  ginza: { name: "Ginza", lat: 35.6717, lon: 139.765 },
  odaiba: { name: "Odaiba", lat: 35.6275, lon: 139.7768 },
  disney: { name: "Tokyo Disney Resort", lat: 35.6329, lon: 139.8804 },

  // Mt. Fuji Area
  fuji: { name: "Mount Fuji", lat: 35.3606, lon: 138.7274 },
  fujiq: { name: "Fuji-Q Highland", lat: 35.4884, lon: 138.7785 },
  kawaguchiko: { name: "Lake Kawaguchiko", lat: 35.5245, lon: 138.7554 },

  // Osaka Area
  osaka: { name: "Osaka", lat: 34.6937, lon: 135.5023 },
  dotonbori: { name: "Dotonbori", lat: 34.6685, lon: 135.5018 },
  osakacastle: { name: "Osaka Castle", lat: 34.6873, lon: 135.5262 },
  usj: { name: "Universal Studios Japan", lat: 34.6658, lon: 135.432 },
  shin_osaka: { name: "Shin-Osaka Station", lat: 34.7335, lon: 135.5005 },
  kansai: { name: "Kansai Airport", lat: 34.4347, lon: 135.244 },

  // Kyoto Area
  kyoto: { name: "Kyoto", lat: 35.0116, lon: 135.7681 },
  fushimi: { name: "Fushimi Inari Shrine", lat: 34.9671, lon: 135.7727 },
  kinkakuji: { name: "Kinkaku-ji (Golden Pavilion)", lat: 35.0394, lon: 135.7289 },
  arashiyama: { name: "Arashiyama Bamboo Grove", lat: 35.0094, lon: 135.6668 },

  // Nara
  nara: { name: "Nara", lat: 34.6851, lon: 135.8048 },
  nara_park: { name: "Nara Park", lat: 34.6851, lon: 135.8431 },

  // Hiroshima
  hiroshima: { name: "Hiroshima", lat: 34.3853, lon: 132.4553 },
  peacepark: { name: "Hiroshima Peace Memorial", lat: 34.3955, lon: 132.4536 },

  // Sapporo
  sapporo: { name: "Sapporo", lat: 43.0621, lon: 141.3544 },
  odori: { name: "Odori Park", lat: 43.0606, lon: 141.3448 },

  // Fukuoka
  fukuoka: { name: "Fukuoka", lat: 33.5902, lon: 130.4017 },

  // Nagoya
  nagoya: { name: "Nagoya", lat: 35.1815, lon: 136.9066 },

  // Yokohama
  yokohama: { name: "Yokohama", lat: 35.4437, lon: 139.638 },
  minatomirai: { name: "Minato Mirai", lat: 35.4575, lon: 139.6322 },
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
