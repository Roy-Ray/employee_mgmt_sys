let currentRole = '';

function showLogin(role) {
    currentRole = role;
    document.getElementById('loginSection').classList.remove('d-none');
    document.getElementById('loginTitle').innerText = role + " Login";
}

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert("Please fill in all fields");
        return;
    }

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role: currentRole })
        });

        const data = await res.json();
        
        if (data.success) {
            localStorage.setItem('user', JSON.stringify(data.user));
            
            if (data.user.role === 'Admin') {
                window.location.href = 'admin_dashboard.html';
            } else {
                window.location.href = 'emp_dashboard.html';
            }
        } else {
            alert(data.message || 'Invalid Credentials');
        }
    } catch (err) {
        console.error(err);
        alert('Server connection failed');
    }
}