# 💰 Expense Sharing Backend

> **A sophisticated group expense management system** that intelligently tracks, calculates, and settles shared expenses among multiple users—just like Splitwise. Built with modern TypeScript, Node.js, and MongoDB for reliability, scalability, and maintainability.

---

## 🎯 Project Overview

This backend application empowers users to:

- **Collaborate** by creating groups with multiple members
- **Share Costs** through flexible expense splitting strategies
- **Track Debts** with automatic balance calculations
- **Settle Accounts** with partial or full payment support

### Core Philosophy

> _Keep it simple, keep it fair._ The system uses intelligent balance optimization to minimize the number of transactions needed to settle group expenses.

---

## 🚀 Key Features

| Feature                       | Description                                                         |
| ----------------------------- | ------------------------------------------------------------------- |
| 👥 **User Management**        | Create and manage group members with unique email identities        |
| 🏘️ **Group Organization**     | Organize expenses by groups, perfect for roommates, projects, trips |
| 💸 **Flexible Splitting**     | Support three powerful split types: Equal, Exact, Percent           |
| 📊 **Smart Balance Tracking** | Automatic net calculation: tracks exactly who owes whom             |
| ✅ **Settlement Options**     | Pay debts in full or partially with audit trail                     |
| 🔄 **Bidirectional Balances** | System intelligently resolves circular debts (A→B and B→A)          |

---

## 🏗️ Architecture & Design Patterns

### **Layered Monolithic Architecture**

```
┌─────────────────────────────────────────────────────┐
│                   API Routes Layer                   │
│  (users | groups | expenses | balances | settlements│
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│             Controllers Layer                         │
│  Request validation • Response formatting             │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│             Services Layer                           │
│  Business Logic • Data Orchestration                 │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│              Utils Layer                            │
│  Pure Functions (Split Calculations)                 │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│              Models Layer                           │
│  Mongoose Schemas • Data Validation                  │
└───────────────────┬─────────────────────────────────┘
                    │
┌───────────────────▼─────────────────────────────────┐
│            MongoDB Database                         │
│  (User | Group | Expense | Balance Collections)     │
└─────────────────────────────────────────────────────┘
```

### **Key Architectural Principles**

- ✅ **Separation of Concerns**: Each layer has a single responsibility
- ✅ **DRY (Don't Repeat Yourself)**: Shared logic in services and utils
- ✅ **Type Safety**: Full TypeScript with strict mode enabled
- ✅ **Stateless Design**: Scalable across multiple server instances
- ✅ **Database-Driven**: Single source of truth in MongoDB

---

## 📊 Data Flow Diagram

### **Adding an Expense: The Complete Flow**

```
CLIENT REQUEST
    │
    │ POST /expenses
    │ {groupId, title, paidBy, amount, participants, splitType, splits}
    │
    ▼
┌─────────────────────────────────────────┐
│ EXPENSE CONTROLLER                       │
│ • Validate request format                │
│ • Extract parameters                     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ EXPENSE SERVICE                          │
│                                          │
│ 1. VALIDATE GROUP                       │
│    └─→ Group.findById(groupId)          │
│        ✓ Ensure group exists            │
│                                          │
│ 2. VALIDATE PARTICIPANTS                │
│    └─→ Check all are group members      │
│        ✓ Prevent invalid additions      │
│                                          │
│ 3. CREATE EXPENSE RECORD                │
│    └─→ Expense.create(payload)          │
│        ✓ Store payment information      │
│                                          │
│ 4. CALCULATE SHARES                     │
│    └─→ calculateSplit(params)           │
│        ├─ Equal: divide by count        │
│        ├─ Exact: use exact amounts      │
│        └─ Percent: proportional split   │
│                                          │
│ 5. UPDATE BALANCES                      │
│    └─→ For each participant:            │
│        ├─ Calculate amount owed         │
│        └─ updateBalance()               │
│                                          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ SPLIT UTILITY                            │
│                                          │
│ EQUAL SPLIT:  $100 ÷ 4 people           │
│   └─→ [$25, $25, $25, $25]              │
│                                          │
│ EXACT SPLIT: Given exact amounts        │
│   └─→ Validate sum = total amount       │
│                                          │
│ PERCENT SPLIT: $100 with [40%, 60%]     │
│   └─→ [$40, $60] (auto-calculated)      │
│                                          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ BALANCE SERVICE                          │
│                                          │
│ For each participant owing money:       │
│                                          │
│ • SAME DIRECTION EXISTS?                │
│   (A→B already exists)                  │
│   └─→ ADD to existing balance           │
│                                          │
│ • REVERSE DIRECTION EXISTS?             │
│   (B→A exists, but A→B needed)          │
│   ├─ If B→A > amount owed              │
│   │  └─→ REDUCE B→A balance            │
│   ├─ If B→A < amount owed              │
│   │  └─→ DELETE B→A, CREATE A→B       │
│   └─ If B→A = amount owed              │
│      └─→ DELETE B→A balance            │
│                                          │
│ • NEITHER EXISTS?                       │
│   └─→ CREATE new balance record        │
│                                          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ MONGODB DATABASE                         │
│                                          │
│ Expense Collection:                     │
│   {_id, groupId, title, paidBy,        │
│    amount, participants, splitType}     │
│                                          │
│ Balance Collection (UPDATED):           │
│   {groupId, fromUser, toUser, amount}   │
│   ✓ Unique constraint: one per pair    │
│                                          │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│ API RESPONSE                            │
│                                          │
│ HTTP 201 Created                        │
│ {                                       │
│   _id: "...",                           │
│   groupId: "...",                       │
│   title: "Dinner",                      │
│   paidBy: "user1",                      │
│   amount: 100,                          │
│   splitType: "EQUAL",                   │
│   participants: [user1, user2, user3]   │
│ }                                       │
│                                          │
│ + Balance records updated in DB        │
└─────────────────────────────────────────┘
```

### **Settlement Flow: Paying Back Debt**

```
CLIENT REQUEST
    │
    │ POST /settlements
    │ {groupId, fromUser, toUser, amount}
    │
    ▼
┌──────────────────────────────┐
│ SETTLEMENT CONTROLLER        │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│ SETTLEMENT SERVICE           │
│                              │
│ 1. FIND BALANCE              │
│    └─→ Query:                │
│        {groupId, fromUser,   │
│         toUser}              │
│    ✓ Ensure debt exists      │
│                              │
│ 2. VALIDATE AMOUNT           │
│    └─→ amount ≤ balance      │
│        amount > 0            │
│                              │
│ 3. CHECK SETTLEMENT TYPE     │
│                              │
│    FULL PAYMENT?             │
│    └─→ amount = balance      │
│        DELETE balance        │
│        ✓ Debt cleared!       │
│                              │
│    PARTIAL PAYMENT?          │
│    └─→ amount < balance      │
│        UPDATE balance        │
│        amount = old - paid    │
│        ✓ Partial cleared     │
│                              │
└────────────┬─────────────────┘
             │
             ▼
┌──────────────────────────────┐
│ RESPONSE                     │
│                              │
│ Status 200 OK                │
│ Message: "Balance settled"   │
│ Remaining: 0 (or new amount) │
│                              │
└──────────────────────────────┘
```

---

## 💾 Data Model & Relationships

### **Entity-Relationship Diagram**

```
┌─────────────────┐
│      USER       │
├─────────────────┤
│ _id (PK)        │
│ name            │
│ email (unique)  │
│ createdAt       │
│ updatedAt       │
└────────┬────────┘
         │
         │ (members)
         │
         ▼
┌─────────────────┐
│     GROUP       │
├─────────────────┤
│ _id (PK)        │
│ groupName       │
│ members [User]  │◄─┐
│ createdAt       │  │
│ updatedAt       │  │
└────────┬────────┘  │
         │           │
         │ (owns)    │
         │           │
         ▼           │
┌──────────────────────────────┐
│       EXPENSE                │
├──────────────────────────────┤
│ _id (PK)                     │
│ groupId (ref→Group)          │
│ title                        │
│ paidBy (ref→User)            │
│ amount                       │
│ participants [User] ─────────┘
│ splitType (EQUAL|EXACT|PERCENT)
│ splits? (Map<userId, amount>)│
│ createdAt                    │
│ updatedAt                    │
└────────┬─────────────────────┘
         │
         │ (generates)
         │
         ▼
┌──────────────────────────────┐
│      BALANCE                 │
├──────────────────────────────┤
│ _id (PK)                     │
│ groupId (ref→Group)          │
│ fromUser (ref→User) *owes*   │
│ toUser (ref→User) *receives* │
│ amount                       │
│ createdAt                    │
│ updatedAt                    │
│                              │
│ UNIQUE: (groupId, fromUser,  │
│          toUser) per group   │
└──────────────────────────────┘

NOTES:
• One expense can have multiple participants
• One group can have multiple members
• Multiple expenses generate balance records
• Balances are optimized: A→B and B→A never coexist
```

---

## 📦 Tech Stack

| Component       | Technology          | Purpose                          |
| --------------- | ------------------- | -------------------------------- |
| **Runtime**     | Node.js             | JavaScript execution environment |
| **Framework**   | Express.js          | HTTP server & routing            |
| **Language**    | TypeScript          | Type-safe JavaScript development |
| **Database**    | MongoDB             | NoSQL document storage           |
| **ODM**         | Mongoose            | Schema validation & queries      |
| **Environment** | dotenv              | Configuration management         |
| **Development** | ts-node-dev         | TypeScript hot-reload dev server |
| **Build**       | TypeScript Compiler | Production bundling              |

---

## 🔌 API Endpoints Reference

### **Users Module**

- `POST /users` - Create a new user
- `GET /users` - List all users

### **Groups Module**

- `POST /groups` - Create a new group
- `POST /groups/:groupId/add-member` - Add member to group
- `GET /groups/:groupId` - Get group details with members

### **Expenses Module**

- `POST /expenses` - Add expense with flexible split options
- `GET /expenses/:groupId` - Get all expenses in a group

### **Balances Module**

- `GET /balances/:groupId` - Get current balances in group
  - Shows who owes whom and how much

### **Settlements Module**

- `POST /settlements` - Pay off a debt (full or partial)
  - Automatically optimizes circular debts
  - Supports partial payments

---

## 🎓 How Splitting Works

### **Three Smart Split Strategies**

#### **1️⃣ EQUAL Split**

Everyone pays an equal share.

**Example:** Pizza party costs $100 with 4 people

- Each person pays: $100 ÷ 4 = **$25**

#### **2️⃣ EXACT Split**

You specify the exact amount each person owes.

**Example:** $100 bill to split precisely

```json
{
  "splits": {
    "user1": 40,
    "user2": 35,
    "user3": 25
  }
}
```

**Total must equal the expense amount**

#### **3️⃣ PERCENT Split**

Everyone pays a percentage of the total.

**Example:** $100 with percentages [40%, 35%, 25%]

- User1: $100 × 40% = **$40**
- User2: $100 × 35% = **$35**
- User3: $100 × 25% = **$25**

---

## 🧮 Smart Balance Management

### **The Problem: Circular Debts**

Imagine this scenario:

- Alice paid $100, Bob owes Alice $100
- Bob paid $100, Alice owes Bob $100

### **Naive Approach (2 transactions needed)**

```
Alice → Bob: $100
Bob → Alice: $100
```

### **Smart Approach (transactions optimized!)**

```
Balances Cancel Out
Net Result: $0 owed both ways
```

### **How It Works**

The system automatically resolves circular debts:

1. **Direct Balance Exists?** → Update it
2. **Reverse Balance Exists?**
   - If reverse > new amount → Reduce reverse
   - If reverse < new amount → Delete reverse, create forward
   - If reverse = new amount → Delete reverse
3. **No Balance?** → Create new

**Result:** Minimum transactions needed to settle! 🎯

---

## 🚀 Getting Started

### **Prerequisites**

- Node.js (v14+)
- MongoDB instance or Atlas cluster
- npm or yarn

### **Installation**

```bash
# Clone repository
git clone <repo-url>
cd expense-sharing-backend

# Install dependencies
npm install

# Setup environment
# Create .env file
echo "MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/expense-db?retryWrites=true&w=majority" > .env
echo "PORT=5000" >> .env
```

### **Development**

```bash
# Start with hot reload
npm run dev

# Server runs on http://localhost:5000
# Health check: GET http://localhost:5000
```

### **Production**

```bash
# Build TypeScript
npm run build

# Start production server
npm start

# Runs from /dist/server.js
```

---

## 📊 Example Usage Workflow

### **Scenario: Trip Expense Splitting**

**1. Create Users**

```
POST /users
{
  "name": "Alice",
  "email": "alice@email.com"
}
```

**2. Create Group**

```
POST /groups
{
  "groupName": "Thailand Trip"
}
```

**3. Add Members**

```
POST /groups/:groupId/add-member
{
  "userId": "bob-id"
}
```

**4. Add Expense (Equal Split)**

```
POST /expenses
{
  "groupId": "group-123",
  "title": "Hotel",
  "paidBy": "alice-id",
  "amount": 300,
  "participants": ["alice-id", "bob-id", "charlie-id"],
  "splitType": "EQUAL"
}
```

Result: Each pays $100

- Bob owes Alice: $100
- Charlie owes Alice: $100

**5. Check Balances**

```
GET /balances/group-123
```

**6. Bob Settles**

```
POST /settlements
{
  "groupId": "group-123",
  "fromUser": "bob-id",
  "toUser": "alice-id",
  "amount": 100
}
```

✅ Bob's debt cleared!

---

## 🏛️ Code Structure Highlights

### **Models** (`/src/models/`)

- `User.ts` - User schema with email uniqueness
- `Group.ts` - Group with member references
- `Expense.ts` - Expense with flexible split storage
- `Balance.ts` - Debt tracking with unique index

### **Services** (`/src/services/`)

- `user.service.ts` - User CRUD operations
- `group.service.ts` - Group member management
- `expense.service.ts` - **Core logic**: expense creation + balance updates
- `balance.service.ts` - Balance retrieval with populated references
- `settlement.service.ts` - Debt payment with full/partial support

### **Controllers** (`/src/controllers/`)

- Validate incoming requests
- Call services
- Format responses

### **Routes** (`/src/routes/`)

- Define HTTP endpoints
- Map to controllers

### **Utils** (`/src/utils/`)

- `split.util.ts` - **Pure functions** for split calculations
  - Equal, Exact, Percent logic
  - No database calls (testable!)

### **Config** (`/src/config/`)

- `db.ts` - MongoDB connection

### **Types** (`/src/types/`)

- `enums.ts` - SplitType enum definition

---

## 🔐 Key Design Decisions

| Decision                             | Rationale                                           |
| ------------------------------------ | --------------------------------------------------- |
| **Unique Balance Index**             | Prevents duplicate debt records for same pair       |
| **Bidirectional Balance Resolution** | Optimizes settlements by canceling circular debts   |
| **Split Utility Functions**          | Pure, testable logic separated from database        |
| **Mongoose Schemas**                 | Type-safe models with validation at DB level        |
| **Service Layer**                    | Centralized business logic, easier to test/refactor |
| **TypeScript Strict Mode**           | Catch errors at compile time, safer code            |

---

## 🎯 Key Features of the Implementation

✨ **Elegant Balance Algorithm**

- Intelligently handles A→B and B→A scenarios
- Prevents redundant debt records
- Minimum transactions for settlement

✨ **Type Safety**

- Full TypeScript with strict checking
- Interface definitions for data contracts
- Compile-time error detection

✨ **Flexible Splitting**

- Three different split strategies
- Extensible design for new split types
- Accurate decimal calculations

✨ **Clean Architecture**

- Clear separation of concerns
- Each layer has single responsibility
- Easy to test and maintain

✨ **Scalable Design**

- Stateless services (no session affinity needed)
- Database-backed state (can run on multiple servers)
- Indexed MongoDB queries for performance

---

## 🚨 Error Handling

The system validates at multiple levels:

1. **Route Level** - Request format validation
2. **Controller Level** - Parameter extraction
3. **Service Level** - Business logic validation
   - Group exists?
   - User in group?
   - Amount valid?
   - Balance exists?
4. **Database Level** - Mongoose schema validation

---

## 📝 Database Indexes

```javascript
// Balance Collection - Unique constraint
{
  "groupId": 1,
  "fromUser": 1,
  "toUser": 1
}
// Ensures only ONE balance per (group, pair)
```

---

## 🧪 Testing the API

### **Health Check**

```bash
curl http://localhost:5000/
# Response: "Expense Sharing API is running 🚀"
```

### **Create User**

```bash
curl -X POST http://localhost:5000/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice","email":"alice@test.com"}'
```

### **Create Group**

```bash
curl -X POST http://localhost:5000/groups \
  -H "Content-Type: application/json" \
  -d '{"groupName":"Roommates"}'
```

---

---

## 📄 License

ISC

## 👨‍💻 Developer Notes

This implementation prioritizes:

- **Correctness** over micro-optimizations
- **Readability** for team collaboration
- **Maintainability** for future changes
- **Type Safety** for reliability

The codebase is structured to be easily extended with new features while maintaining the core integrity of the expense-sharing algorithm.

---

**Happy Expense Sharing! 💰✨**
