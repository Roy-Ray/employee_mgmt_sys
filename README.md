# 🏢 Employee Management System (SaaS)

A full-stack, cloud-based Employee Management System designed to easily manage employee records, track details, and streamline HR operations. The application provides a user-friendly dashboard for performing essential administrative tasks efficiently.

## 🚀 Live Demo
**Access the deployed application here:** [Live Deployment on Render](https://library-management-full-stack-9s36.onrender.com/)

---

## ✨ Features
* **Interactive Dashboard:** A clean and responsive UI to view employee statistics and data.
* **CRUD Operations:** Easily Add, View, Update, and Delete employee records.
* **File Uploads:** Securely upload and store employee files or profile pictures (handled via the `uploads` directory).
* **Cloud Database:** Reliable and fast data storage powered by a managed MySQL database on **Aiven Cloud**.
* **Fully Deployed:** Application seamlessly hosted on **Render** for high availability.

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

