# Finance Data Processing & Access Control Dashboard — Backend

A production-ready REST API built with **Node.js**, **Express**, **PostgreSQL**, and **Prisma ORM**. This system serves as the backend engine for a finance dashboard, managing users, roles, and financial transactions.

### Key Features
- **Authentication & RBAC:** Secure JWT-based login with distinct role-based permissions (`viewer`, `analyst`, `admin`).
- **Financial Records Management:** Full CRUD operations for tracking income and expenses with soft deletion.
- **Data Analytics:** Aggregated dashboard endpoints delivering monthly financial trends, category totals, and net balance summaries.
- **Security & Stability:** Equipped with rate limiting, input validation, and structured error handling.

---

## Tech Stack

- **Runtime:** Node.js ≥ 18
- **Framework:** Express 4
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** JWT + bcrypt

---

## Setup Instructions

### Prerequisites
- Node.js ≥ 18
- PostgreSQL server running locally (or a cloud PostgreSQL URL)

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
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/finance_db?schema=public"
JWT_SECRET="a_very_long_random_secret_at_least_32_characters"
JWT_EXPIRES_IN="7d"
PORT=5000
NODE_ENV=development
```

### 4. Create the Database
*(Using psql, pgAdmin, or your preferred SQL client)*
```sql
CREATE DATABASE finance_db;
```

### 5. Run Prisma Migrations
Syncs the database schema and creates necessary models:
```bash
npx prisma migrate dev --name init
```

### 6. Generate Prisma Client
```bash
npx prisma generate
```

### 7. Start the Server
```bash
# Development
npm run dev

# Production
npm start
```

The server will start at: `http://localhost:5000`
