# Finance Data Processing & Access Control Dashboard — Backend

A production-ready REST API built with **Node.js**, **Express**, **MongoDB**, and **Mongoose ODM**. This system serves as the backend engine for a finance dashboard, managing users, roles, and financial transactions.

### Key Features
- **Authentication & RBAC:** Secure JWT-based login with distinct role-based permissions (`viewer`, `analyst`, `admin`).
- **Financial Records Management:** Full CRUD operations for tracking income and expenses with soft deletion.
- **Data Analytics:** Aggregated dashboard endpoints delivering monthly financial trends, category totals, and net balance summaries.
- **Security & Stability:** Equipped with rate limiting, input validation, and structured error handling.

---

## Tech Stack

- **Runtime:** Node.js ≥ 18
- **Framework:** Express 4
- **Database:** MongoDB
- **ODM:** Mongoose
- **Auth:** JWT + bcrypt

---

## Setup Instructions

### Prerequisites
- Node.js ≥ 18
- MongoDB server running locally or a MongoDB Atlas URI

### 1. Clone & Navigate
```bash
cd finance-backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
Create a `.env` file in the root directory:
```bash
# .env
MONGO_URI="mongodb://127.0.0.1:27017/finance_db"
JWT_SECRET="a_very_long_random_secret_at_least_32_characters"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
```

### 4. Start the Server
```bash
# Development
npm run dev

# Production
npm start
```

The server will start at: `http://localhost:5000`
