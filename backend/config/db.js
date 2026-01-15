const mysql = require("mysql2");

const db = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "NewStrong@123", // <--- Keep your password here
  database: "EmployeeManagementDB", // <--- UPDATED NAME
});

console.log("🔌 Connected to EmployeeManagementDB");

module.exports = db.promise();

// Check the connection when the app starts
db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Database Connection Failed:", err.message);
  } else {
    console.log("✅ Connected to MySQL Database");
    connection.release(); // Release the connection back to the pool
  }
});

// Export as a promise-based pool so we can use 'await' in server.js
module.exports = db.promise();
