# 🏗️ Architecture & Design Documentation

## System Overview

This document provides a comprehensive deep-dive into the architecture, design patterns, and decision-making behind the Expense Sharing Backend system.

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Request-Response Flow](#request-response-flow)
3. [Core Algorithm: Balance Management](#core-algorithm-balance-management)
4. [Data Models & Relationships](#data-models--relationships)
5. [Design Patterns Used](#design-patterns-used)
6. [Code Organization](#code-organization)
7. [Scalability Considerations](#scalability-considerations)

---

## High-Level Architecture

### System Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Web/Mobile)                       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     HTTP/REST API Layer                          │
│  (Express.js with CORS & body-parser middleware)                │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Routes Layer                              │
│  /users | /groups | /expenses | /balances | /settlements        │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Controllers Layer                            │
│  • Request validation                                            │
│  • Parameter extraction                                          │
│  • Response formatting                                           │
│  (userController | groupController | expenseController | ...)   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Services Layer                              │
│  • Business Logic Execution                                      │
│  • Database Orchestration                                        │
│  • Error Handling                                                │
│  (userService | groupService | expenseService | balanceService) │
└───────────────────────────────┬─────────────────────────────────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                     │
          ▼                     ▼                     ▼
    ┌──────────┐         ┌───────────┐         ┌──────────────┐
    │ Utils    │         │ Models    │         │ Config       │
    │ Layer    │         │ Layer     │         │ Layer        │
    ├──────────┤         ├───────────┤         ├──────────────┤
    │Pure Fn   │         │Mongoose   │         │DB Connection │
    │No DB     │         │Schemas    │         │              │
    └────┬─────┘         └─────┬─────┘         └────┬─────────┘
         │                     │                    │
         └─────────────────────┼────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   MongoDB Database   │
                    ├──────────────────────┤
                    │ • Users Collection   │
                    │ • Groups Collection  │
                    │ • Expenses Collection│
                    │ • Balances Collection│
                    └──────────────────────┘
```

### Key Architectural Principles

| Principle                  | Implementation                       | Benefit                      |
| -------------------------- | ------------------------------------ | ---------------------------- |
| **Separation of Concerns** | Each layer has single responsibility | Easy to maintain & test      |
| **Dependency Injection**   | Services handle DB operations        | Decoupled code               |
| **Pure Functions**         | Utils layer has no side effects      | Testable & predictable       |
| **Type Safety**            | TypeScript strict mode               | Compile-time error detection |
| **Stateless Services**     | No session storage                   | Horizontally scalable        |
| **Database-Driven State**  | MongoDB as source of truth           | Consistent across instances  |

---

## Request-Response Flow

### Complete Lifecycle: Adding an Expense

```
1. CLIENT REQUEST
   ┌─────────────────────────────────────────────────┐
   │ POST /expenses                                  │
   │ Content-Type: application/json                 │
   │                                                 │
   │ {                                               │
   │   "groupId": "507f1f77bcf86cd799439011",       │
   │   "title": "Dinner at Restaurant",             │
   │   "paidBy": "507f1f77bcf86cd799439012",        │
   │   "amount": 150,                                │
   │   "participants": [                            │
   │     "507f1f77bcf86cd799439012",               │
   │     "507f1f77bcf86cd799439013"                │
   │   ],                                            │
   │   "splitType": "EQUAL"                         │
   │ }                                               │
   └────────────────┬────────────────────────────────┘
                    │ Express parses JSON
                    │ CORS validates origin
                    │ Body-parser extracts payload
                    ▼
2. ROUTE MAPPING
   ┌─────────────────────────────────────────────────┐
   │ Router matches: POST /expenses                  │
   │ Dispatches to: expenseController.addExpense     │
   └────────────────┬────────────────────────────────┘
                    │
                    ▼
3. CONTROLLER LAYER
   ┌─────────────────────────────────────────────────┐
   │ expenseController.addExpense(req, res)          │
   │                                                 │
   │ ✓ Extracts body: req.body                      │
   │ ✓ Calls service layer                          │
   │ ✓ Handles potential errors                     │
   │ ✓ Formats response                             │
   └────────────────┬────────────────────────────────┘
                    │
                    ▼
4. SERVICE LAYER (Core Business Logic)
   ┌─────────────────────────────────────────────────┐
   │ expenseService.addExpense(data)                │
   │                                                 │
   │ STEP A: Validation                            │
   │ └─→ Group.findById(groupId)                    │
   │     ✓ Verify group exists                      │
   │     ✓ Retrieve member list                     │
   │                                                 │
   │ STEP B: Participant Validation                 │
   │ └─→ Check if all participants in group        │
   │     ✓ Validate paidBy is in group             │
   │     ✓ Throw error if invalid                   │
   │                                                 │
   │ STEP C: Create Expense Record                  │
   │ └─→ Expense.create({...payload})              │
   │     ✓ Store in expenses collection             │
   │     ✓ Get back created expense with _id        │
   │                                                 │
   │ STEP D: Calculate Splits                       │
   │ └─→ calculateSplit(config)  [Utils]           │
   │     Input: {amount, participants,              │
   │             splitType, splits?}                │
   │     Returns: {                                 │
   │       "userId1": 75,                           │
   │       "userId2": 75                            │
   │     }                                           │
   │                                                 │
   │ STEP E: Update Balances                        │
   │ └─→ For each participant:                      │
   │     if participant != paidBy:                  │
   │       updateBalance(groupId,                   │
   │                    participant,                │
   │                    paidBy,                     │
   │                    shareAmount)                │
   │                                                 │
   └────────────────┬────────────────────────────────┘
                    │
                    ▼
5. UTILS LAYER (Pure Functions)
   ┌─────────────────────────────────────────────────┐
   │ calculateSplit(config)                         │
   │                                                 │
   │ Input: amount=150, participants=[A,B],         │
   │        splitType="EQUAL"                       │
   │                                                 │
   │ Process:                                       │
   │ ├─ Switch on splitType                        │
   │ ├─ EQUAL: amount / participants.length        │
   │ │  = 150 / 2 = 75                             │
   │ └─ Return: {"A": 75, "B": 75}                 │
   │                                                 │
   │ NO DATABASE CALLS (Pure Function!)            │
   │ ✓ Testable in isolation                       │
   │ ✓ No external dependencies                    │
   │ ✓ Deterministic output                        │
   │                                                 │
   └────────────────┬────────────────────────────────┘
                    │
                    ▼
6. BALANCE UPDATE LOGIC (Bidirectional Optimization)
   ┌─────────────────────────────────────────────────┐
   │ updateBalance(groupId, fromUser,               │
   │               toUser, amount)                  │
   │                                                 │
   │ SCENARIO: fromUser (B) owes toUser (A): $75   │
   │                                                 │
   │ ╔═══════════════════════════════════════════╗ │
   │ ║ CHECK 1: Does same direction exist? (B→A) ║ │
   │ ║ Query: {groupId, fromUser: B, toUser: A}  ║ │
   │ ╚═══════════════════════════════════════════╝ │
   │ YES → ADD to existing:                        │
   │       existing.amount += 75                   │
   │       save()                                   │
   │                                                 │
   │ NO → Check reverse direction                  │
   │                                                 │
   │ ╔═══════════════════════════════════════════╗ │
   │ ║ CHECK 2: Does reverse direction exist?   ║ │
   │ ║ Query: {groupId, fromUser: A, toUser: B} ║ │
   │ ╚═══════════════════════════════════════════╝ │
   │ YES → Smart Resolution:                       │
   │       IF reverse.amount > 75:                 │
   │         reverse.amount -= 75                  │
   │         save()                                │
   │       ELSE IF reverse.amount < 75:            │
   │         delete reverse                        │
   │         create new (B→A: 75 - existing)      │
   │       ELSE (equal):                           │
   │         delete reverse                        │
   │                                                 │
   │ NO → Create new balance                       │
   │      Balance.create({                         │
   │        groupId, fromUser: B,                  │
   │        toUser: A, amount: 75                  │
   │      })                                        │
   │                                                 │
   │ RESULT: Minimum transactions needed!         │
   │                                                 │
   └────────────────┬────────────────────────────────┘
                    │
                    ▼
7. DATABASE OPERATIONS
   ┌─────────────────────────────────────────────────┐
   │ MongoDB Transactions                           │
   │                                                 │
   │ • Expense.create({...})                       │
   │ • Balance.findOne({...}) - check existence    │
   │ • Balance.updateOne({...}) - update amount    │
   │ • Balance.create({...}) - new balance         │
   │                                                 │
   │ Each operation:                                │
   │ ✓ Validated by Mongoose schema               │
   │ ✓ Indexed for fast queries                    │
   │ ✓ Atomic operations (MongoDB guarantee)       │
   │                                                 │
   └────────────────┬────────────────────────────────┘
                    │
                    ▼
8. RESPONSE FORMATTING
   ┌─────────────────────────────────────────────────┐
   │ expenseController formats response             │
   │                                                 │
   │ HTTP 201 Created                              │
   │ Content-Type: application/json                │
   │                                                 │
   │ {                                               │
   │   "_id": "507f191e810c19729de860ea",         │
   │   "groupId": "507f1f77bcf86cd799439011",     │
   │   "title": "Dinner at Restaurant",            │
   │   "paidBy": "507f1f77bcf86cd799439012",      │
   │   "amount": 150,                               │
   │   "participants": [...],                       │
   │   "splitType": "EQUAL",                       │
   │   "createdAt": "2024-01-15T10:30:00Z",      │
   │   "updatedAt": "2024-01-15T10:30:00Z"       │
   │ }                                               │
   │                                                 │
   │ Backend also updated:                         │
   │ ✓ Balances collection modified                │
   │ ✓ Database reflects new debts                 │
   │                                                 │
   └────────────────┬────────────────────────────────┘
                    │
                    ▼
9. CLIENT RECEIVES RESPONSE
   ┌─────────────────────────────────────────────────┐
   │ Client gets success response                   │
   │ Can now query /balances/:groupId to see        │
   │ updated debt information                       │
   └─────────────────────────────────────────────────┘
```

---

## Core Algorithm: Balance Management

### The Smart Bidirectional Balance Resolution

This is the **most important algorithm** in the system.

#### Problem Statement

In a group, multiple users may have circular debts:

- Alice paid $100 → Bob owes Alice $100 (A→B: 100)
- Bob paid $100 → Alice owes Bob $100 (B→A: 100)

**Naive Solution:** Keep both records (2 debts to settle)
**Smart Solution:** Cancel them out (0 debts!)

#### Algorithm Implementation

```typescript
async updateBalance(
  groupId: string,
  fromUser: string,    // who owes
  toUser: string,      // who receives payment
  amount: number       // amount owed
) {
  // Step 1: Check if same direction balance already exists
  const sameDirection = await Balance.findOne({
    groupId,
    fromUser,
    toUser
  });

  if (sameDirection) {
    // Simply add to existing debt
    sameDirection.amount += amount;
    await sameDirection.save();
    return;
  }

  // Step 2: Check if reverse direction exists
  const reverseDirection = await Balance.findOne({
    groupId,
    fromUser: toUser,    // Note: reversed!
    toUser: fromUser
  });

  if (reverseDirection) {
    // Smart resolution based on amounts

    if (reverseDirection.amount > amount) {
      // Reverse debt larger than new debt
      // Reduce reverse debt
      // Example: B→A: 100, need A→B: 60
      // Result: B→A: 40
      reverseDirection.amount -= amount;
      await reverseDirection.save();

    } else if (reverseDirection.amount < amount) {
      // Reverse debt smaller than new debt
      // Delete reverse, create forward
      // Example: B→A: 40, need A→B: 60
      // Result: A→B: 20
      await reverseDirection.deleteOne();
      await Balance.create({
        groupId,
        fromUser,
        toUser,
        amount: amount - reverseDirection.amount
      });

    } else {
      // Reverse debt equals new debt
      // Perfect cancellation!
      // Example: B→A: 60, need A→B: 60
      // Result: (nothing)
      await reverseDirection.deleteOne();
    }
    return;
  }

  // Step 3: Neither exists - create new balance
  await Balance.create({
    groupId,
    fromUser,
    toUser,
    amount
  });
}
```

#### Visual Examples

**Scenario 1: Same Direction Accumulation**

```
Initial State:
  A → B: 50

New Expense: B pays 30, A owes
Action: A → B: 30

Result:
  A → B: 80  (accumulated)
```

**Scenario 2: Reverse Direction Exists (Larger)**

```
Initial State:
  B → A: 100  (B owes A)

New Expense: A pays 60, B owes
Action: B → A: 60

Since reverse (100) > new (60):
  B → A: 40  (reduced)

Net Effect: B still owes A, just less!
```

**Scenario 3: Reverse Direction Exists (Smaller)**

```
Initial State:
  B → A: 40  (B owes A)

New Expense: A pays 100, B owes
Action: B → A: 100

Since reverse (40) < new (100):
  Delete B → A
  Create A → B: 60

Net Effect: A now owes B!
```

**Scenario 4: Perfect Cancellation**

```
Initial State:
  B → A: 75  (B owes A)

New Expense: A pays 75, B owes
Action: B → A: 75

Since reverse (75) = new (75):
  Delete B → A
  (no new balance created)

Net Effect: All debts settled! 🎉
```

#### Time & Space Complexity

```
Time Complexity:  O(1)
- Fixed number of database lookups (3 queries max)
- No loops or recursion

Space Complexity: O(1)
- Constant memory regardless of group size
- No temporary collections needed
```

#### Why This Design?

✅ **Optimal Settlement Path**: Minimizes number of transactions
✅ **Scalable**: Doesn't require full graph traversal
✅ **Transparent**: Easy to understand and debug
✅ **Consistent**: One balance per (group, user pair)
✅ **Efficient**: O(1) operations

---

## Data Models & Relationships

### Entity Relationship Diagram (ERD)

```
┌──────────────────┐
│      USER        │
├──────────────────┤
│ _id (ObjectId)   │ ◄─┐
│ name (String)    │   │
│ email (String)   │   │ (many-to-many)
│ createdAt        │   │
│ updatedAt        │   │
└────────┬─────────┘   │
         │ (references)│
         └─────────────┘
                ▲
                │
┌───────────────┴──────────────┐
│                              │
▼                              ▼
┌──────────────────────┐  ┌──────────────────────┐
│      GROUP           │  │      EXPENSE         │
├──────────────────────┤  ├──────────────────────┤
│ _id (ObjectId)       │  │ _id (ObjectId)       │
│ groupName (String)   │  │ groupId (ref→Group)  │
│ members (User)       │  │ title (String)       │
│ createdAt            │  │ paidBy (ref→User)    │
│ updatedAt            │  │ amount (Number)      │
└──────────┬───────────┘  │ participants [User]  │
           │              │ splitType (String)   │
           │              │ splits? (Map)        │
           │              │ createdAt            │
           │              │ updatedAt            │
           │              └──────────┬───────────┘
           │                         │
           └─────────────────────────┼─────────────┐
                                     │             │
                      ┌──────────────┘             │
                      │                           │
                      ▼                           ▼
        ┌──────────────────────────────────────────────┐
        │           BALANCE                            │
        ├──────────────────────────────────────────────┤
        │ _id (ObjectId)                               │
        │ groupId (ref→Group)                          │
        │ fromUser (ref→User) *who owes*              │
        │ toUser (ref→User) *who receives*            │
        │ amount (Number)                              │
        │ createdAt                                    │
        │ updatedAt                                    │
        │                                              │
        │ UNIQUE INDEX:                                │
        │ (groupId, fromUser, toUser)                  │
        │ → One balance per (group, user pair)        │
        └──────────────────────────────────────────────┘

KEY RELATIONSHIPS:
• 1 User : Many Expenses (as paidBy)
• 1 User : Many Expenses (as participant)
• 1 Group : Many Expenses
• 1 Group : Many Balances
• Balances track debt flow: fromUser → toUser
```

### Schema Definitions

#### User Schema

```typescript
{
  name: String (required),
  email: String (required, unique),
  timestamps: true  // createdAt, updatedAt
}
```

#### Group Schema

```typescript
{
  groupName: String (required),
  members: Array<ObjectId> (references User),
  timestamps: true
}
```

#### Expense Schema

```typescript
{
  groupId: ObjectId (ref: Group, required),
  title: String (required),
  paidBy: ObjectId (ref: User, required),
  amount: Number (required),
  participants: Array<ObjectId> (ref: User, required),
  splitType: String (enum: [EQUAL, EXACT, PERCENT], required),
  splits?: Map<String, Number>,  // For EXACT and PERCENT
  timestamps: true
}
```

#### Balance Schema

```typescript
{
  groupId: ObjectId (ref: Group, required),
  fromUser: ObjectId (ref: User, required),
  toUser: ObjectId (ref: User, required),
  amount: Number (required),
  timestamps: true,

  // Unique constraint
  unique: (groupId, fromUser, toUser)
}
```

---

## Design Patterns Used

### 1. **Layered Architecture Pattern**

**What it is:** Vertical separation of concerns into layers

- Presentation (Routes)
- Application (Controllers)
- Business Logic (Services)
- Persistence (Models)

**Benefits:**

- Easy to test each layer independently
- Change in one layer doesn't affect others
- Clear responsibility boundaries

### 2. **Service Layer Pattern**

**What it is:** Centralized business logic in services

```
Controller → Service → Model
```

**Why used:**

- Controllers stay thin (HTTP concerns only)
- Services contain reusable logic
- Easy to test without HTTP/DB

### 3. **Dependency Injection (Implicit)**

**What it is:** Services receive dependencies via parameters

```typescript
// Not injecting DB client into service
// Service calls Model directly
const group = await Group.findById(groupId);
```

**Benefits:**

- Loose coupling
- Testable with mocks
- Clear data flow

### 4. **Repository Pattern (via Mongoose)**

**What it is:** Models act as repositories

```typescript
// Abstraction over direct DB access
const user = await User.findById(id);
const updated = await Expense.create(data);
```

**Benefits:**

- Consistent data access
- Schema validation at DB level
- Type-safe operations

### 5. **Pure Function Pattern (Utils)**

**What it is:** Functions with no side effects

```typescript
export const calculateSplit = ({ amount, participants, splitType, splits }) => {
  // No database calls
  // No external state
  // Always same output for same input
  return { [userId]: share };
};
```

**Benefits:**

- Testable in isolation
- Deterministic
- No hidden dependencies

### 6. **Factory Pattern (Mongoose Models)**

**What it is:** Models create documents

```typescript
const expense = await Expense.create(data); // Creates new document
const balance = await Balance.create(data); // Creates new document
```

**Benefits:**

- Centralized object creation
- Schema validation during creation
- Automatic timestamps

### 7. **Strategy Pattern (Split Types)**

**What it is:** Different algorithms selected at runtime

```typescript
switch (splitType) {
  case SplitType.EQUAL:
    return equalSplit(amount, participants);
  case SplitType.EXACT:
    return exactSplit(amount, splits);
  case SplitType.PERCENT:
    return percentSplit(amount, splits);
}
```

**Benefits:**

- Easy to add new split types
- Clean separation of algorithms
- Encapsulated logic

### 8. **Optimization Algorithm (Balance Resolution)**

**What it is:** Smart algorithm to minimize transactions
**Pattern:** Greedy optimization with constant time

**Benefits:**

- Minimum settlement transactions
- Scalable (O(1) per expense)
- User-friendly (less payments needed)

---

## Code Organization

### Directory Structure

```
src/
├── app.ts                 # Express app configuration
├── server.ts              # Entry point, DB connection
│
├── config/
│   └── db.ts             # MongoDB connection setup
│
├── routes/
│   ├── user.routes.ts
│   ├── group.routes.ts
│   ├── expense.routes.ts
│   ├── balance.routes.ts
│   └── settlement.routes.ts
│
├── controllers/
│   ├── user.controller.ts
│   ├── group.controller.ts
│   ├── expense.controller.ts
│   ├── balance.controller.ts
│   └── settlement.controller.ts
│
├── services/
│   ├── user.service.ts
│   ├── group.service.ts
│   ├── expense.service.ts     ★ CORE LOGIC
│   ├── balance.service.ts
│   └── settlement.service.ts
│
├── models/
│   ├── User.ts
│   ├── Group.ts
│   ├── Expense.ts
│   └── Balance.ts
│
├── utils/
│   └── split.util.ts          ★ PURE FUNCTIONS
│
└── types/
    └── enums.ts
```

### Module Responsibilities

| Module          | Responsibility | Example                        |
| --------------- | -------------- | ------------------------------ |
| **Routes**      | URL mapping    | `POST /expenses` → controller  |
| **Controllers** | HTTP handling  | Validate request, call service |
| **Services**    | Business logic | Add expense, update balances   |
| **Models**      | Data schema    | User, Group, Expense, Balance  |
| **Utils**       | Pure functions | Calculate splits               |
| **Config**      | Setup          | Database connection            |
| **Types**       | Definitions    | SplitType enum                 |

---

## Scalability Considerations

### Current Architecture (Monolithic)

**Strengths:**

- Simple to understand and deploy
- Low operational overhead
- Shared database (consistent data)

**Limitations:**

- All code runs in single process
- Shared resource pool
- Vertical scaling limited

### Horizontal Scalability

**Current Design Support:**
✅ **Stateless Services** - Can run multiple instances
✅ **Database-Backed State** - No in-memory state
✅ **Independent Requests** - No session affinity needed

```
                    ┌──────────────┐
                    │ Load Balancer│
                    └───┬──────┬───┘
                        │      │
        ┌───────────────┤      ├────────────────┐
        │               │      │                │
        ▼               ▼      ▼                ▼
    ┌────────┐      ┌────────┐      ┌────────┐
    │Server 1│      │Server 2│  ... │Server N│
    └───┬────┘      └───┬────┘      └───┬────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
                        ▼
                ┌───────────────────┐
                │  MongoDB Cluster  │
                │   (Single Source  │
                │    of Truth)      │
                └───────────────────┘
```

### Performance Optimization Opportunities

**Current:**

- Basic mongoose queries without aggregation

**Future Improvements:**

- MongoDB aggregation pipeline for analytics
- Caching layer (Redis) for frequently accessed data
- Database indexing on frequently queried fields
- Query optimization with projections
- Connection pooling optimization

### Database Indexing Strategy

```javascript
// Existing unique index
Balance: { groupId: 1, fromUser: 1, toUser: 1 }

// Recommended additional indexes
User: { email: 1 }  // Fast lookup by email
Group: { createdAt: -1 }  // Sort groups by creation
Expense: { groupId: 1, createdAt: -1 }  // Find expenses per group
Expense: { paidBy: 1 }  // Find expenses by payer
Balance: { groupId: 1, fromUser: 1 }  // Find user's outgoing debts
Balance: { groupId: 1, toUser: 1 }  // Find user's incoming debts
```

### Monitoring & Observability

**Current:** Console logging

**Production Enhancements:**

- Structured logging (Winston, Pino)
- Error tracking (Sentry)
- Performance monitoring (New Relic, DataDog)
- Health check endpoints
- Request/response logging
- Database query performance tracking

### Deployment Considerations

**Docker Containerization:**

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

**Environment Variables:**

```
NODE_ENV=production
MONGO_URI=mongodb+srv://...
PORT=5000
LOG_LEVEL=info
```

---

## Summary

### Architectural Strengths

1. **Type Safety** - Full TypeScript with strict mode
2. **Clean Separation** - Layered architecture
3. **Smart Algorithm** - Optimized balance management
4. **Testability** - Pure functions and service layer
5. **Scalability** - Stateless design with DB persistence
6. **Maintainability** - Clear code organization

### Core Innovation

The **bidirectional balance resolution algorithm** is the heart of this system. It elegantly solves the circular debt problem in O(1) time, making the system efficient and user-friendly.

### Future Vision

This architecture can be extended with:

- Authentication & authorization
- Real-time updates (WebSockets)
- Advanced analytics (aggregation pipelines)
- Mobile app backend optimization
- Multi-currency support
- Recurring expenses

The modular design ensures these features can be added without disrupting the core functionality.

---

**Last Updated:** 2024-12-24  
**Architecture Version:** 1.0
