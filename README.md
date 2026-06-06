# 🏢 Employee Management System (SaaS)

A full-stack, cloud-based Employee Management System designed to easily manage employee records, track details, and streamline HR operations. The application provides a user-friendly dashboard for performing essential administrative tasks efficiently.

## 🚀 Live Demo
**Access the deployed application here:** [Live Deployment on Render](https://employee-mgmt-sys-1.onrender.com/)

#
to log in the system use this id and password in the admin panel :
ID : admin@smart.com  
Password :123
to log in the system use this id and password in the Employee panel :
ID : sourav@smart.com
Password :12345

---

## ✨ Features

* **Interactive Dashboard:** A clean, responsive, and intuitive user interface designed for real-time visualization of employee statistics and organizational data.
* **Complete Employee Management (CRUD):** Streamlined administrative controls to seamlessly add, view, update, and delete employee records.
* **Secure File Handling:** Robust functionality for uploading and managing employee assets, such as profile pictures and essential documents.
* **Cloud-Powered Database:** Ensures fast, reliable, and secure data storage utilizing a managed **MySQL** database hosted on **Aiven Cloud**.
* **Seamless Deployment:** Fully hosted and live on **Render**, ensuring high availability and reliable access to the application.

---

## 🛠️ Tech Stack

**Frontend:**
* HTML5
* CSS3
* JavaScript (Vanilla)

**Backend:**
* Node.js
* Express.js

**Database & Cloud:**
* **MySQL** (Database)
* **Aiven Cloud** (Managed Cloud Database Hosting)
* **Render** (Application Hosting/Deployment)

---

## 🚀 Getting Started

Follow these steps to set up and run the project locally.

### 1. Clone the Repository

```bash
git clone https://github.com/Roy-Ray/employee_mgmt_sys.git
cd employee_mgmt_sys
```

### 2. Install Dependencies

Navigate to the project directory and install the required packages:

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory and add the following configuration:

```env
PORT=3000

DB_HOST=your-aiven-cloud-host-url
DB_USER=your-database-username
DB_PASSWORD=your-database-password
DB_NAME=your-database-name
DB_PORT=your-database-port
```

### 4. Start the Application

Run the application using one of the following commands:

```bash
npm start
```

or, if you are using Nodemon:

```bash
npm run dev
```
or,

```bash
cd backend
node server.js
```

### 5. Access the Application

Once the server starts successfully, open your browser and navigate to:

```text
http://localhost:3000
```

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

If you would like to contribute:

1. Fork the repository.
2. Create a new feature branch.
3. Commit your changes.
4. Push the branch to your fork.
5. Open a Pull Request.

Feel free to open an issue for bug reports, feature requests, or suggestions.

---

## 📧 Contact

For any queries or feedback, please feel free to reach out through GitHub or create an issue in this repository.







## 📂 Project Structure

```text
employee_mgmt_sys/
├── backend─|--config/db.js    # Express.js server, API routes, and database configuration
├── frontend/public/    # HTML, CSS, and Client-side JavaScript files
├── uploads/            # Directory for storing user-uploaded files/images
├── package.json        # Node.js dependencies and scripts
└── server.js / app.js  # Main entry point for the backend (inside backend/)

