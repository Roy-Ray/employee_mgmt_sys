// 1. SECURITY CHECK
const user = JSON.parse(localStorage.getItem("user"));
if (!user || user.role !== "Admin") {
  window.location.href = "index.html";
}

// 2. LOGOUT
function logout() {
  document.getElementById("logoutOverlay").classList.remove("d-none");
  localStorage.clear();
  setTimeout(() => {
    window.location.href = "index.html";
  }, 800);
}

// 3. NAVIGATION (Tabs) - UPDATED WITH SIDEBAR FIX
function showSection(sectionId) {
  // 1. Hide all content sections
  [
    "analytics",
    "employees",
    "attendance",
    "leaves",
    "payroll",
    "settings",
  ].forEach((id) =>
    document.getElementById(id + "-section").classList.add("d-none")
  );

  // 2. Show selected content section
  document.getElementById(sectionId + "-section").classList.remove("d-none");

  // 3. UPDATE SIDEBAR HIGHLIGHT (The Fix)
  // Remove 'active' class from all sidebar links
  document.querySelectorAll(".sidebar a").forEach((link) => {
    link.classList.remove("active");
  });

  // Add 'active' class to the clicked link
  const activeLink = document.querySelector(
    `.sidebar a[onclick="showSection('${sectionId}')"]`
  );
  if (activeLink) {
    activeLink.classList.add("active");
  }

  // 4. Set Title
  const titles = {
    analytics: "Company Overview",
    employees: "Employee Management",
    attendance: "Attendance Logs",
    leaves: "Leave Management",
    payroll: "Payroll & Salary",
    settings: "System Settings",
  };
  document.getElementById("pageTitle").innerText = titles[sectionId];

  // 5. Load Data based on section
  if (sectionId === "analytics") loadAnalytics();
  if (sectionId === "attendance") loadAttendanceLogs();
  if (sectionId === "leaves") loadLeaveRequests();
  if (sectionId === "payroll") {
    loadPayrollHistory();
    loadEmployeeDropdown();
  }
  if (sectionId === "settings") loadSalaryStructures();
}

// =========================================================
// 4. EMPLOYEE MANAGEMENT
// =========================================================
async function loadEmployees() {
  try {
    const res = await fetch("/api/employees");
    const data = await res.json();
    const tbody = document.getElementById("adminEmpTable");
    tbody.innerHTML = "";

    data.forEach((u) => {
      // Role Badge
      let roleBadge =
        u.role === "Admin"
          ? '<span class="badge bg-danger-subtle text-danger border border-danger">Admin</span>'
          : '<span class="badge bg-info-subtle text-info border border-info">Employee</span>';

      // Status Badge
      let statusBadge =
        u.status === "Inactive"
          ? '<span class="badge bg-danger">Inactive</span>'
          : '<span class="badge bg-success">Active</span>';

      // Format Date
      const joinDate = u.joined_date
        ? new Date(u.joined_date).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "-";

      // Action Button
      let actionBtn = "";
      if (u.user_id === user.user_id) {
        actionBtn = '<span class="badge bg-secondary">You</span>';
      } else {
        actionBtn = `<button class="btn btn-sm btn-outline-primary" onclick="openEditModal(${u.user_id})"><i class="fas fa-edit"></i> Edit</button>`;
      }

      tbody.innerHTML += `
        <tr>
            <td class="ps-4 fw-bold text-muted">#${u.user_id}</td> 
            <td>
                <div>
                    <div class="fw-bold text-dark">${u.name}</div>
                    <small class="text-muted" style="font-size: 0.85rem;">${u.email}</small>
                </div>
            </td>
            <td><span class="text-secondary">${joinDate}</span></td> 
            <td class="fw-medium">${u.designation}</td>
            <td>${roleBadge}</td>
            <td>${statusBadge}</td>
            <td class="text-end pe-4">${actionBtn}</td>
        </tr>`;
    });
  } catch (err) {
    console.error("Error loading employees:", err);
  }
}

// Edit Modal Logic
async function openEditModal(id) {
  try {
    const res = await fetch(`/api/employees/${id}`);
    const user = await res.json();

    document.getElementById("e_user_id").value = user.user_id;
    document.getElementById("e_name").value = user.name;
    document.getElementById("e_email").value = user.email;
    document.getElementById("e_desg").value = user.designation;
    document.getElementById("e_role").value = user.role;

    const statusSelect = document.getElementById("e_status");
    if (statusSelect) {
      statusSelect.value = user.status || "Active";
    }

    const modal = new bootstrap.Modal(document.getElementById("editEmpModal"));
    modal.show();
  } catch (err) {
    alert("Error fetching user data");
  }
}

document
  .getElementById("adminEditForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const id = document.getElementById("e_user_id").value;
    const statusSelect = document.getElementById("e_status");
    const statusValue = statusSelect ? statusSelect.value : "Active";

    const payload = {
      name: document.getElementById("e_name").value,
      email: document.getElementById("e_email").value,
      designation: document.getElementById("e_desg").value,
      role: document.getElementById("e_role").value,
      status: statusValue,
    };

    try {
      const res = await fetch(`/api/employees/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("✅ Employee Updated");
        loadEmployees();
        const modal = bootstrap.Modal.getInstance(
          document.getElementById("editEmpModal")
        );
        modal.hide();
      }
    } catch (err) {
      alert("Server Error");
    }
  });

document
  .getElementById("adminAddForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const name = document.getElementById("a_name").value;
    const email = document.getElementById("a_email").value;
    const password = document.getElementById("a_password").value;
    const designation = document.getElementById("a_desg").value;
    const role = document.getElementById("a_role").value;

    await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        password,
        designation,
        role,
        company_id: 1,
      }),
    });
    alert("User Added");
    loadEmployees();
    const modal = bootstrap.Modal.getInstance(
      document.getElementById("addEmpModal")
    );
    modal.hide();
  });

loadEmployees();

// =========================================================
// 5. ATTENDANCE & LEAVES
// =========================================================
async function loadAttendanceLogs() {
  try {
    const res = await fetch("/api/attendance-all");
    const data = await res.json();
    const tbody = document.getElementById("attendanceTable");
    tbody.innerHTML = "";

    data.forEach((row) => {
      const dateObj = new Date(row.date).toLocaleDateString();
      const clockOut = row.clock_out_time
        ? row.clock_out_time
        : '<span class="text-warning">Working...</span>';

      let otContent = '<span class="text-muted">-</span>';

      if (row.overtime_hours > 0) {
        if (row.user_id === user.user_id) {
          otContent = `<span class="text-danger fw-bold">${row.overtime_hours} hrs (Self)</span>`;
        } else {
          if (
            row.overtime_status === "Pending" ||
            row.overtime_status === null
          ) {
            otContent = `
                <div class="d-flex align-items-center gap-2">
                    <span class="fw-bold text-danger">${row.overtime_hours} hrs</span>
                    <div class="btn-group btn-group-sm">
                    <button class="btn btn-outline-success" onclick="reviewOvertime(${row.attendance_id}, 'Approved')">✓</button>
                    <button class="btn btn-outline-danger" onclick="reviewOvertime(${row.attendance_id}, 'Rejected')">✗</button>
                    </div>
                </div>`;
          } else if (row.overtime_status === "Approved") {
            otContent = `<span class="badge bg-success">${row.overtime_hours} hrs Approved</span>`;
          } else {
            otContent = `<span class="badge bg-secondary text-decoration-line-through">${row.overtime_hours} hrs Rejected</span>`;
          }
        }
      }

      tbody.innerHTML += `
        <tr>
            <td>
                <div class="fw-bold">${row.name}</div>
                <small class="text-muted">${row.email}</small>
            </td>
            <td><div class="fw-bold">${row.clock_in_time} - ${clockOut}</div><small class="text-muted">${dateObj}</small></td>
            <td><span class="badge bg-success">${row.status}</span></td>
            <td>${otContent}</td>
        </tr>`;
    });
  } catch (err) {
    console.error(err);
  }
}

async function reviewOvertime(id, status) {
  if (!confirm(`Mark as ${status}?`)) return;
  await fetch("/api/attendance/overtime", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ attendance_id: id, status }),
  });
  loadAttendanceLogs();
}

async function loadLeaveRequests() {
  const res = await fetch("/api/leaves");
  const data = await res.json();
  const tbody = document.getElementById("leaveTable");
  tbody.innerHTML = "";

  data.forEach((row) => {
    let actions = '<span class="text-muted">Closed</span>';
    if (row.status === "Pending") {
      if (row.user_id === user.user_id) {
        actions = '<span class="text-muted">Self Request</span>';
      } else {
        actions = `
            <button class="btn btn-sm btn-success me-1" onclick="updateLeave(${row.leave_id}, 'Approved')">✔</button>
            <button class="btn btn-sm btn-danger" onclick="updateLeave(${row.leave_id}, 'Rejected')">✖</button>`;
      }
    }
    tbody.innerHTML += `
        <tr>
            <td><div class="fw-bold">${row.name}</div></td>
            <td>${new Date(row.start_date).toLocaleDateString()} - ${new Date(
      row.end_date
    ).toLocaleDateString()}</td>
            <td><div class="fw-bold">${row.leave_type}</div><small>${
      row.reason
    }</small></td>
            <td><span class="badge ${
              row.status === "Approved" ? "bg-success" : "bg-warning"
            }">${row.status}</span></td>
            <td>${actions}</td>
        </tr>`;
  });
}

async function updateLeave(id, status) {
  if (!confirm(`${status} this leave?`)) return;
  await fetch(`/api/leaves/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  loadLeaveRequests();
}

// =========================================================
// 6. SALARY SETTINGS LOGIC
// =========================================================
async function loadSalaryStructures() {
  try {
    const res = await fetch("/api/salary-structures");
    const data = await res.json();
    const tbody = document.getElementById("structureTable");
    tbody.innerHTML = "";
    data.forEach((row) => {
      tbody.innerHTML += `
            <tr>
                <td class="fw-bold">${row.designation}</td>
                <td>₹${row.base_salary}</td>
                <td>${row.tax_percentage}%</td>
                <td>₹${row.ot_rate_per_hour}/hr</td>
            </tr>`;
    });
  } catch (err) {
    console.error("Error loading structures");
  }
}

document
  .getElementById("salaryStructureForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      designation: document.getElementById("set_desg").value,
      base_salary: document.getElementById("set_base").value,
      tax_percentage: document.getElementById("set_tax").value,
      ot_rate: document.getElementById("set_ot").value,
    };

    await fetch("/api/salary-structures", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    alert("Rule Saved!");
    document.getElementById("salaryStructureForm").reset();
    loadSalaryStructures();
  });

// =========================================================
// 7. AUTOMATED PAYROLL LOGIC
// =========================================================
async function loadPayrollHistory() {
  const res = await fetch("/api/payroll");
  const data = await res.json();
  const tbody = document.getElementById("payrollTable");
  tbody.innerHTML = "";
  data.forEach((row) => {
    tbody.innerHTML += `
        <tr>
            <td><div class="fw-bold">${row.name}</div><small class="text-muted">${row.email}</small></td>
            <td>${row.month}</td>
            <td>₹${row.base_salary}</td>
            <td><span class="text-success">+${row.bonus}</span> / <span class="text-danger">-${row.deductions}</span></td>
            <td class="fw-bold">₹${row.net_salary}</td>
            <td><span class="badge bg-success">Paid</span></td>
        </tr>`;
  });
}

async function loadEmployeeDropdown() {
  const res = await fetch("/api/employees");
  const users = await res.json();
  const select = document.getElementById("p_employee");
  select.innerHTML = '<option value="">-- Select Employee --</option>';
  users.forEach((u) => {
    if (u.user_id !== user.user_id) {
      select.innerHTML += `<option value="${u.user_id}">${u.name} (${u.designation})</option>`;
    }
  });
}

// THE SMART CALCULATION FUNCTION
async function calculateAutoPayroll() {
  const userId = document.getElementById("p_employee").value;
  const month = document.getElementById("p_month").value;

  if (!userId || !month) return;

  try {
    const res = await fetch(
      `/api/payroll-context?user_id=${userId}&month=${month}`
    );
    if (!res.ok) throw new Error("Fetch failed");
    const data = await res.json();

    document.getElementById("view_ot_hours").innerText = data.ot_hours;
    document.getElementById("view_ot_rate").innerText = "₹" + data.ot_rate;
    document.getElementById("view_leaves").innerText = data.leaves_taken;

    // --- CALCULATIONS ---
    const base = parseFloat(data.base_salary);
    const otAmount = parseFloat(data.ot_hours) * parseFloat(data.ot_rate);
    const taxAmount = (base * parseFloat(data.tax_percent)) / 100;
    const net = base + otAmount - taxAmount;

    // --- FILL UI ---
    document.getElementById("p_base").value = base.toFixed(2);
    document.getElementById("p_bonus").value = otAmount.toFixed(2);
    document.getElementById("p_deduction").value = taxAmount.toFixed(2);
    document.getElementById(
      "tax_hint"
    ).innerText = `${data.tax_percent}% Tax Applied`;

    document.getElementById("view_net_pay").innerText =
      "₹" + net.toLocaleString();
  } catch (err) {
    console.error(err);
    document.getElementById("p_base").value = 0;
    alert(
      "⚠️ No Salary Structure found for this role. Go to Settings to define it."
    );
  }
}

document
  .getElementById("payrollForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const payload = {
      user_id: document.getElementById("p_employee").value,
      month: document.getElementById("p_month").value,
      base_salary: document.getElementById("p_base").value,
      bonus: document.getElementById("p_bonus").value,
      deductions: document.getElementById("p_deduction").value,
    };

    try {
      const res = await fetch("/api/payroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        alert("✅ Salary Generated Successfully!");
        loadPayrollHistory();
        document.getElementById("payrollForm").reset();
        document.getElementById("view_net_pay").innerText = "₹0";
        document.getElementById("view_ot_hours").innerText = "0";
        document.getElementById("view_leaves").innerText = "0";

        const modal = bootstrap.Modal.getInstance(
          document.getElementById("payrollModal")
        );
        modal.hide();
      } else {
        alert("❌ Failed to generate payroll");
      }
    } catch (err) {
      alert("Server Error");
    }
  });

// Analytics
async function loadAnalytics() {
  try {
    const res = await fetch("/api/analytics");
    const data = await res.json();
    document.getElementById("stat_total_emp").innerText = data.totalEmployees;
    document.getElementById("stat_present").innerText = data.presentToday;
    document.getElementById("stat_leaves").innerText = data.totalLeaves;
    document.getElementById("stat_payroll").innerText =
      "₹" + data.totalPayroll.toLocaleString();
  } catch (err) {
    console.error(err);
  }
}

// Initial Load
showSection("analytics");
