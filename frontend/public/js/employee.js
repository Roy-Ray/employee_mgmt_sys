// 1. SECURITY CHECK & INITIALIZATION
const user = JSON.parse(localStorage.getItem("user"));
if (!user || user.role !== "Employee") {
  window.location.href = "index.html";
} else {
  // Set basic dashboard info
  document.getElementById("userName").innerText = user.name;
  document.getElementById("userDesg").innerText = user.designation;
}

// ==============================================
// 2. NAVIGATION (Sidebar Highlight Fix)
// ==============================================
function showSection(sectionId) {
  // A. Hide all content sections
  ["dashboard", "profile", "leaves", "salary", "settings"].forEach((id) => {
    const el = document.getElementById(id + "-section");
    if (el) el.classList.add("d-none");
  });

  // B. Show the selected section
  const activeSection = document.getElementById(sectionId + "-section");
  if (activeSection) activeSection.classList.remove("d-none");

  // C. Update Sidebar Highlight (The Fix)   // 1. Remove 'active' class from ALL sidebar links
  document.querySelectorAll('.sidebar a').forEach(link => {
    link.classList.remove('active');
  });

  // 2. Add 'active' class to the SPECIFIC link that was clicked
  // We find the link by looking for the one with the matching onclick function
  const activeLink = document.querySelector(`.sidebar a[onclick="showSection('${sectionId}')"]`);
  if (activeLink) {
    activeLink.classList.add('active');
  }

  // D. Load Data specific to the section
  if (sectionId === "profile") loadMyProfile();
  if (sectionId === "leaves") loadMyLeaves();
  if (sectionId === "salary") loadMySalary();
}

// ==============================================
// 3. PROFILE LOGIC (With Image Upload)
// ==============================================
async function loadMyProfile() {
  try {
    const res = await fetch(`/api/my-profile/${user.user_id}`);
    const data = await res.json();

    // Update Text Fields
    document.getElementById("p_name").innerText = data.name;
    document.getElementById("p_role").innerText = data.role;
    document.getElementById("p_email").innerText = data.email;
    document.getElementById("p_desg").innerText = data.designation;
    document.getElementById("p_join").innerText = new Date(
      data.joined_date
    ).toLocaleDateString();

    // Update Profile Picture
    const imgElement = document.getElementById("profile_img");
    if (data.profile_pic) {
      imgElement.src = `/uploads/${data.profile_pic}?t=${new Date().getTime()}`;
    } else {
      imgElement.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    }

  } catch (err) {
    console.error("Profile load failed", err);
  }
}

async function uploadProfilePic() {
    const fileInput = document.getElementById("fileInput");
    const file = fileInput.files[0];
    
    if (!file) return;

    const formData = new FormData();
    formData.append("user_id", user.user_id);
    formData.append("profile_pic", file);

    try {
        const imgElement = document.getElementById("profile_img");
        imgElement.style.opacity = "0.5"; // Visual feedback

        const res = await fetch("/api/upload-profile-pic", {
            method: "POST",
            body: formData 
        });

        if (res.ok) {
            alert("✅ Profile Picture Updated!");
            loadMyProfile(); 
        } else {
            alert("❌ Upload failed");
        }
    } catch (err) {
        console.error(err);
        alert("Server Error during upload");
    } finally {
        document.getElementById("profile_img").style.opacity = "1";
    }
}

// ==============================================
// 4. ATTENDANCE LOGIC
// ==============================================
async function checkAttendanceStatus() {
  const btn = document.getElementById("clockInBtn");
  const statusText = document.getElementById("todayStatus");
  const timeText = document.getElementById("clockTime");

  try {
    const res = await fetch(`/api/attendance/status/${user.user_id}`);
    const data = await res.json();

    if (data.status === "clocked_in") {
      statusText.innerText = "Present";
      statusText.classList.replace("text-primary", "text-success");
      timeText.innerText = "In: " + data.startTime;

      btn.innerText = "🛑 Clock Out";
      btn.classList.remove("btn-light", "text-success"); 
      btn.classList.add("btn-danger", "text-white");     
      btn.onclick = clockOut;
      btn.disabled = false;
    } else if (data.status === "day_complete") {
      statusText.innerText = "Day Complete";
      statusText.classList.replace("text-primary", "text-secondary");
      timeText.innerText = "Out: " + data.endTime;

      btn.innerText = "✅ Done for Today";
      btn.classList.remove("btn-light", "text-success", "btn-danger");
      btn.classList.add("btn-success", "text-white");
      btn.onclick = null;
      btn.disabled = true;
    }
  } catch (err) {
    console.error("Status check failed", err);
  }
}

async function markAttendance() {
  const btn = document.getElementById("clockInBtn");
  btn.disabled = true;
  btn.innerText = "Marking...";

  try {
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.user_id, status: "Present" }),
    });

    const data = await res.json();

    if (res.ok) {
      document.getElementById("todayStatus").innerText = "Present";
      document.getElementById("todayStatus").classList.replace("text-primary", "text-success");
      // Format time to HH:MM
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
      document.getElementById("clockTime").innerText = "In: " + timeStr;

      btn.innerText = "🛑 Clock Out";
      btn.classList.remove("btn-light", "text-success");
      btn.classList.add("btn-danger", "text-white");
      btn.onclick = clockOut;
      btn.disabled = false;
    } else {
      alert("⚠️ " + data.message);
      checkAttendanceStatus();
    }
  } catch (err) {
    alert("Server Error");
    btn.disabled = false;
    btn.innerText = "🕒 Clock In Now";
  }
}

async function clockOut() {
  const btn = document.getElementById("clockInBtn");
  btn.disabled = true;

  try {
    const res = await fetch("/api/clock-out", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.user_id }),
    });

    const data = await res.json();

    if (res.ok) {
      alert(`✅ Clocked Out Successfully!\nOvertime: ${data.overtime} Hours`);
      btn.innerText = "✅ Done for Today";
      btn.classList.replace("btn-danger", "btn-success");
      btn.onclick = null;
      document.getElementById("todayStatus").innerText = "Day Complete";
    }
  } catch (err) {
    alert("Error clocking out");
    btn.disabled = false;
  }
}

// ==============================================
// 5. LEAVE LOGIC
// ==============================================
async function loadLeaveBalance() {
  try {
    const res = await fetch(`/api/leave-balance/${user.user_id}`);
    const data = await res.json();

    document.getElementById("bal_casual").innerText = data.Casual;
    document.getElementById("bal_sick").innerText = data.Sick;
    document.getElementById("bal_paid").innerText = data.Paid;
  } catch (err) {
    console.error("Error loading balance:", err);
  }
}

async function loadMyLeaves() {
  try {
    const res = await fetch(`/api/my-leaves/${user.user_id}`);
    const data = await res.json();
    const tbody = document.getElementById("myLeaveTable");
    tbody.innerHTML = "";

    data.forEach((row) => {
      let badge =
        row.status === "Approved" ? "bg-success" :
        row.status === "Rejected" ? "bg-danger" : "bg-warning";
        
      tbody.innerHTML += `
        <tr>
            <td>${new Date(row.start_date).toLocaleDateString()} - ${new Date(row.end_date).toLocaleDateString()}</td>
            <td>${row.leave_type}</td>
            <td>${row.reason}</td>
            <td><span class="badge ${badge}">${row.status}</span></td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

document.getElementById("leaveForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const payload = {
      user_id: user.user_id,
      leave_type: document.getElementById("l_type").value,
      start_date: document.getElementById("l_start").value,
      end_date: document.getElementById("l_end").value,
      reason: document.getElementById("l_reason").value,
    };

    const res = await fetch("/api/apply-leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      alert("✅ Leave Applied Successfully!");
      document.getElementById("leaveForm").reset();
      loadMyLeaves();
      loadLeaveBalance(); // Update balance immediately
    }
});

// ==============================================
// 6. SALARY LOGIC
// ==============================================
async function loadMySalary() {
  try {
    const res = await fetch(`/api/my-payroll/${user.user_id}`);
    const data = await res.json();
    const tbody = document.getElementById("mySalaryTable");
    tbody.innerHTML = "";

    data.forEach((row) => {
      tbody.innerHTML += `
        <tr>
            <td class="ps-4 fw-bold">${row.month}</td>
            <td>₹${row.base_salary}</td>
            <td class="text-success fw-bold">+₹${row.bonus}</td> 
            <td class="text-danger fw-bold">-₹${row.deductions}</td> 
            <td class="fw-bold">₹${row.net_salary}</td>
            <td><span class="badge bg-success">Paid</span></td>
        </tr>
      `;
    });
  } catch (err) {
    console.error(err);
  }
}

// ==============================================
// 7. PASSWORD CHANGE & LOGOUT
// ==============================================
document.getElementById("passwordForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const newPass = document.getElementById("new_pass").value;

    const res = await fetch("/api/change-password", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.user_id, new_password: newPass }),
    });

    if (res.ok) {
      alert("✅ Password Changed Successfully");
      document.getElementById("passwordForm").reset();
    }
});

function logout() {
  document.getElementById("logoutOverlay").classList.remove("d-none");
  localStorage.clear();
  setTimeout(() => {
    window.location.href = "index.html";
  }, 800);
}

// INITIALIZE
checkAttendanceStatus();
loadLeaveBalance();