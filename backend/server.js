require("dotenv").config(); // <--- 1. NEW: Load env variables (Must be at the very top)
const cron = require("node-cron");
const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const db = require("./config/db");

const app = express();

// 2. CRITICAL FIX: Use the system port OR 3000
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());
// --- MIDDLEWARE ---
app.use(cors());
app.use(bodyParser.json());

// =============================================================
// 0. STATIC FILES CONFIGURATION (IMAGES & FRONTEND)
// =============================================================

// A. Configure Uploads Folder (For Profile Pics)
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
  console.log("📂 Created 'uploads' folder.");
}
// Serve images publicly at http://localhost:3000/uploads/...
app.use("/uploads", express.static(uploadDir));

// B. Configure Frontend Folder
const frontendPath = path.join(__dirname, "../frontend/public");
console.log("📂 Server is serving frontend from:", frontendPath);
app.use(express.static(frontendPath));

// C. Root Route
app.get("/", (req, res) => {
  res.sendFile(path.join(frontendPath, "index.html"));
});

// HEALTH CHECK ENDPOINT
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// DIAGNOSTIC ENDPOINT - Check database connectivity
app.get("/api/diagnostic", async (req, res) => {
  try {
    const tables = [
      "Users",
      "Attendance",
      "LeaveRequests",
      "Payroll",
      "SalaryStructure",
    ];

    const results = {};

    for (let table of tables) {
      try {
        const [rows] = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
        results[table] = { exists: true, count: rows[0].count };
      } catch (err) {
        results[table] = { exists: false, error: err.message };
      }
    }

    res.json({
      status: "Server Running",
      database: results,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// 1. FILE UPLOAD CONFIGURATION (MULTER)
// =============================================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Rename file to: user_ID_timestamp.jpg to avoid conflicts
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      "user_" +
        req.body.user_id +
        "_" +
        uniqueSuffix +
        path.extname(file.originalname)
    );
  },
});

const upload = multer({ storage: storage });

// API: Upload Profile Picture
app.post(
  "/api/upload-profile-pic",
  upload.single("profile_pic"),
  async (req, res) => {
    const userId = req.body.user_id;
    const filename = req.file ? req.file.filename : null;

    if (!filename) return res.status(400).json({ message: "No file uploaded" });

    try {
      // Save filename to database
      const sql = "UPDATE Users SET profile_pic = ? WHERE user_id = ?";
      await db.query(sql, [filename, userId]);

      res.json({ message: "Profile Picture Updated", filename: filename });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
);

// =============================================================
// 2. AUTHENTICATION API
// =============================================================
app.post("/api/login", async (req, res) => {
  const { email, password, role } = req.body;
  try {
    const sql =
      "SELECT * FROM Users WHERE email = ? AND password = ? AND role = ?";
    const [rows] = await db.query(sql, [email, password, role]);

    if (rows.length > 0) {
      const user = rows[0];
      if (user.status === "Inactive") {
        return res
          .status(403)
          .json({
            success: false,
            message: "Account Deactivated. Contact Admin.",
          });
      }
      res.json({ success: true, user: user });
    } else {
      res.status(401).json({ success: false, message: "Invalid Credentials" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// 3. ADMIN API (Employees)
// =============================================================
app.get("/api/employees", async (req, res) => {
  try {
    const sql = "SELECT * FROM Users ORDER BY user_id DESC";
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/employees", async (req, res) => {
  const { name, email, password, designation, role, company_id } = req.body;
  try {
    const safeCompanyId = company_id || 1;
    const sql =
      "INSERT INTO Users (company_id, name, email, password, role, designation) VALUES (?, ?, ?, ?, ?, ?)";
    await db.query(sql, [
      safeCompanyId,
      name,
      email,
      password,
      role,
      designation,
    ]);
    res.json({ message: "User Created Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/employees/:id", async (req, res) => {
  try {
    const sql = "SELECT * FROM Users WHERE user_id = ?";
    const [rows] = await db.query(sql, [req.params.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/employees/:id", async (req, res) => {
  const { name, email, designation, role, status } = req.body;
  try {
    const sql =
      "UPDATE Users SET name=?, email=?, designation=?, role=?, status=COALESCE(?, status) WHERE user_id=?";
    await db.query(sql, [
      name,
      email,
      designation,
      role,
      status || null,
      req.params.id,
    ]);
    res.json({ message: "User Updated Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// 4. ATTENDANCE API
// =============================================================
app.get("/api/attendance/status/:id", async (req, res) => {
  try {
    const sql =
      "SELECT DATE_FORMAT(clock_in_time, '%H:%i:%s') as clock_in_time, DATE_FORMAT(clock_out_time, '%H:%i:%s') as clock_out_time FROM Attendance WHERE user_id = ? AND date = CURDATE()";
    const [rows] = await db.query(sql, [req.params.id]);

    if (rows.length === 0) {
      res.json({ status: "not_marked" });
    } else if (rows[0].clock_out_time === null) {
      res.json({ status: "clocked_in", startTime: rows[0].clock_in_time });
    } else {
      res.json({
        status: "day_complete",
        startTime: rows[0].clock_in_time,
        endTime: rows[0].clock_out_time,
      });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/attendance", async (req, res) => {
  const { user_id, status } = req.body;
  try {
    const checkSql =
      "SELECT * FROM Attendance WHERE user_id = ? AND date = CURDATE()";
    const [existing] = await db.query(checkSql, [user_id]);

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ message: "You have already clocked in today!" });
    }
    const sql =
      "INSERT INTO Attendance (user_id, date, clock_in_time, status) VALUES (?, CURDATE(), DATE_FORMAT(NOW(), '%H:%i:%s'), ?)";
    await db.query(sql, [user_id, status]);
    res.json({ message: "Attendance Marked" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/clock-out", async (req, res) => {
  const { user_id } = req.body;
  try {
    const now = new Date();
    let overtime = 0;
    const standardEnd = new Date();
    standardEnd.setHours(17, 0, 0); // 5:00 PM

    if (now > standardEnd) {
      const diffMs = now - standardEnd;
      overtime = (diffMs / (1000 * 60 * 60)).toFixed(2);
    }

    const sql = `UPDATE Attendance SET clock_out_time = DATE_FORMAT(NOW(), '%H:%i:%s'), overtime_hours = ?, status = 'Present', overtime_status = 'Pending' WHERE user_id = ? AND date = CURDATE()`;
    await db.query(sql, [overtime, user_id]);
    res.json({ message: "Clocked Out", overtime });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/attendance/overtime", async (req, res) => {
  const { attendance_id, status } = req.body;
  try {
    await db.query(
      "UPDATE Attendance SET overtime_status = ? WHERE attendance_id = ?",
      [status, attendance_id]
    );
    res.json({ message: `Overtime ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/attendance-all", async (req, res) => {
  try {
    const sql = `SELECT a.attendance_id, a.user_id, a.date, DATE_FORMAT(a.clock_in_time, '%H:%i:%s') as clock_in_time, DATE_FORMAT(a.clock_out_time, '%H:%i:%s') as clock_out_time, a.overtime_hours, a.overtime_status, a.status, u.name, u.email FROM Attendance a JOIN Users u ON a.user_id = u.user_id ORDER BY a.date DESC, a.clock_in_time DESC`;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// 5. LEAVE MANAGEMENT API
// =============================================================
app.get("/api/leaves", async (req, res) => {
  try {
    const sql = `SELECT l.*, u.name, u.email, u.user_id FROM LeaveRequests l JOIN Users u ON l.user_id = u.user_id ORDER BY l.status = 'Pending' DESC, l.start_date DESC`;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/leaves/:id", async (req, res) => {
  const { status } = req.body;
  try {
    const sql = "UPDATE LeaveRequests SET status = ? WHERE leave_id = ?";
    await db.query(sql, [status, req.params.id]);
    res.json({ message: `Leave request ${status}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/leave-balance/:id", async (req, res) => {
  try {
    const userId = req.params.id;
    const year = new Date().getFullYear();
    const totalLeaves = { Casual: 12, Sick: 5, Paid: 15 };

    const sql = `SELECT leave_type, SUM(DATEDIFF(end_date, start_date) + 1) as days_used FROM LeaveRequests WHERE user_id = ? AND status = 'Approved' AND YEAR(start_date) = ? GROUP BY leave_type`;
    const [rows] = await db.query(sql, [userId, year]);

    let balance = { ...totalLeaves };
    rows.forEach((row) => {
      if (balance[row.leave_type] !== undefined) {
        balance[row.leave_type] -= row.days_used;
      }
    });
    res.json(balance);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// 6. PAYROLL & ANALYTICS API
// =============================================================
app.get("/api/payroll", async (req, res) => {
  try {
    const sql = `SELECT p.*, u.name, u.email FROM Payroll p JOIN Users u ON p.user_id = u.user_id ORDER BY p.generated_on DESC`;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/payroll-stats", async (req, res) => {
  const { user_id, month } = req.query;
  try {
    const otSql = `SELECT SUM(overtime_hours) as total_overtime FROM Attendance WHERE user_id = ? AND date LIKE ? AND overtime_status = 'Approved'`;
    const [otRows] = await db.query(otSql, [user_id, `${month}%`]);

    const leaveSql = `SELECT SUM(DATEDIFF(end_date, start_date) + 1) as total_leaves FROM LeaveRequests WHERE user_id = ? AND status = 'Approved' AND start_date LIKE ?`;
    const [leaveRows] = await db.query(leaveSql, [user_id, `${month}%`]);

    res.json({
      overtime: otRows[0].total_overtime || 0,
      leaves: leaveRows[0].total_leaves || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payroll", async (req, res) => {
  const { user_id, month, base_salary, bonus, deductions } = req.body;
  const net_salary =
    parseFloat(base_salary) + parseFloat(bonus) - parseFloat(deductions);
  try {
    const sql = `INSERT INTO Payroll (user_id, month, base_salary, bonus, deductions, net_salary) VALUES (?, ?, ?, ?, ?, ?)`;
    await db.query(sql, [
      user_id,
      month,
      base_salary,
      bonus,
      deductions,
      net_salary,
    ]);
    res.json({ message: "Payroll Generated Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/analytics", async (req, res) => {
  try {
    console.log("📊 Loading analytics data...");

    let totalEmployees = 0;
    let presentToday = 0;
    let totalLeaves = 0;
    let totalPayroll = 0;

    // Try to fetch employee count (all employees, not just active)
    try {
      const [empRows] = await db.query(
        "SELECT COUNT(*) as count FROM Users WHERE role = ?",
        ["Employee"]
      );
      totalEmployees = parseInt(empRows?.[0]?.count) || 0;
      console.log("✓ Total Employees:", totalEmployees);
    } catch (empErr) {
      console.warn("⚠️ Could not fetch employee count:", empErr.message);
      totalEmployees = 0;
    }

    // Try to fetch present today count
    try {
      const [attRows] = await db.query(
        "SELECT COUNT(DISTINCT user_id) as count FROM Attendance WHERE DATE(date) = CURDATE() AND clock_in_time IS NOT NULL"
      );
      presentToday = parseInt(attRows?.[0]?.count) || 0;
      console.log("✓ Present Today:", presentToday);
    } catch (attErr) {
      console.warn("⚠️ Could not fetch attendance count:", attErr.message);
      presentToday = 0;
    }

    // Try to fetch approved leaves count (total number of approved leave requests)
    try {
      const [leaveRows] = await db.query(
        "SELECT COUNT(*) as count FROM LeaveRequests WHERE status = ?",
        ["Approved"]
      );
      totalLeaves = parseInt(leaveRows?.[0]?.count) || 0;
      console.log("✓ Approved Leaves Count:", totalLeaves);
    } catch (leaveErr) {
      console.warn("⚠️ Could not fetch leave count:", leaveErr.message);
      totalLeaves = 0;
    }

    // Try to fetch total payroll (sum of all net salaries)
    try {
      const [payRows] = await db.query(
        "SELECT SUM(net_salary) as total FROM Payroll"
      );
      totalPayroll = parseFloat(payRows?.[0]?.total) || 0;
      console.log("✓ Total Payroll:", totalPayroll);
    } catch (payErr) {
      console.warn("⚠️ Could not fetch payroll data:", payErr.message);
      totalPayroll = 0;
    }

    const analyticsData = {
      totalEmployees: totalEmployees,
      presentToday: presentToday,
      totalLeaves: totalLeaves,
      totalPayroll: totalPayroll,
    };

    console.log("✅ Analytics data prepared:", analyticsData);
    res.json(analyticsData);
  } catch (err) {
    console.error("❌ Analytics Error:", err);
    res.status(500).json({
      error: err.message,
      totalEmployees: 0,
      presentToday: 0,
      totalLeaves: 0,
      totalPayroll: 0,
    });
  }
});

// =============================================================
// 7. EMPLOYEE SELF-SERVICE API
// =============================================================
app.get("/api/my-profile/:id", async (req, res) => {
  try {
    // Include profile_pic in the response
    const [rows] = await db.query(
      "SELECT name, email, role, designation, joined_date, profile_pic FROM Users WHERE user_id = ?",
      [req.params.id]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/my-leaves/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM LeaveRequests WHERE user_id = ? ORDER BY start_date DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/apply-leave", async (req, res) => {
  const { user_id, leave_type, start_date, end_date, reason } = req.body;
  try {
    const sql =
      "INSERT INTO LeaveRequests (user_id, leave_type, start_date, end_date, reason) VALUES (?, ?, ?, ?, ?)";
    await db.query(sql, [user_id, leave_type, start_date, end_date, reason]);
    res.json({ message: "Leave Request Submitted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/my-payroll/:id", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM Payroll WHERE user_id = ? ORDER BY generated_on DESC",
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/change-password", async (req, res) => {
  const { user_id, new_password } = req.body;
  try {
    await db.query("UPDATE Users SET password = ? WHERE user_id = ?", [
      new_password,
      user_id,
    ]);
    res.json({ message: "Password Updated Successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// 8. SALARY STRUCTURES (SETTINGS)
// =============================================================
app.get("/api/salary-structures", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM SalaryStructure");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/salary-structures", async (req, res) => {
  const { designation, base_salary, tax_percentage, ot_rate } = req.body;
  try {
    const sql = `INSERT INTO SalaryStructure (designation, base_salary, tax_percentage, ot_rate_per_hour) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE base_salary=?, tax_percentage=?, ot_rate_per_hour=?`;
    await db.query(sql, [
      designation,
      base_salary,
      tax_percentage,
      ot_rate,
      base_salary,
      tax_percentage,
      ot_rate,
    ]);
    res.json({ message: "Structure Saved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/payroll-context", async (req, res) => {
  const { user_id, month } = req.query;
  try {
    const userSql = `SELECT u.designation, s.base_salary, s.tax_percentage, s.ot_rate_per_hour FROM Users u LEFT JOIN SalaryStructure s ON u.designation = s.designation WHERE u.user_id = ?`;
    const [userRows] = await db.query(userSql, [user_id]);
    if (userRows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const structure = userRows[0];
    const [year, monthNum] = month.split("-");

    const otSql = `SELECT SUM(overtime_hours) as total_ot FROM Attendance WHERE user_id = ? AND MONTH(date) = ? AND YEAR(date) = ? AND overtime_status = 'Approved'`;
    const [otRows] = await db.query(otSql, [user_id, monthNum, year]);

    const leaveSql = `SELECT SUM(DATEDIFF(end_date, start_date) + 1) as days_taken FROM LeaveRequests WHERE user_id = ? AND status = 'Approved' AND (MONTH(start_date) = ? OR MONTH(end_date) = ?) AND YEAR(start_date) = ?`;
    const [leaveRows] = await db.query(leaveSql, [
      user_id,
      monthNum,
      monthNum,
      year,
    ]);

    res.json({
      base_salary: structure.base_salary || 0,
      tax_percent: structure.tax_percentage || 0,
      ot_rate: structure.ot_rate_per_hour || 0,
      ot_hours: otRows[0].total_ot || 0,
      leaves_taken: leaveRows[0].days_taken || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// 9. CRON JOBS
// =============================================================
cron.schedule("59 23 * * *", async () => {
  console.log("🔄 Running Auto Clock-Out Job...");
  try {
    const sql = `UPDATE Attendance SET clock_out_time = '17:00:00', overtime_hours = 0 WHERE date = CURDATE() AND clock_out_time IS NULL`;
    const [result] = await db.query(sql);
    console.log(`✅ Auto-closed ${result.affectedRows} attendance records.`);
  } catch (err) {
    console.error("❌ Auto Clock-Out Failed:", err);
  }
});

// START SERVER
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
