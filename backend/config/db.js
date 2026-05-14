require('dotenv').config();
const mysql = require("mysql2");

const db = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'NewStrong@123',
  database: process.env.DB_NAME || 'employeemanagementdb',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // 👇 THIS IS THE FIX FOR AIVEN/RENDER
  ssl: {
    rejectUnauthorized: false
  }
});

// Test the connection when the app starts
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database Connection Failed:", err.message);
  } else {
    console.log("✅ Connected to Cloud Database successfully!");
    connection.release();
  }
});

module.exports = db.promise();