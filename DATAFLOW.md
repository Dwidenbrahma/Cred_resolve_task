# 📊 Data Flow & Sequence Diagrams

This document contains detailed visual representations of how data flows through the system in different scenarios.

---

## Table of Contents

1. [Complete Expense Addition Flow](#complete-expense-addition-flow)
2. [Balance Settlement Flow](#balance-settlement-flow)
3. [Group Creation Flow](#group-creation-flow)
4. [Balance Retrieval Flow](#balance-retrieval-flow)
5. [Split Calculation Deep Dive](#split-calculation-deep-dive)

---

## Complete Expense Addition Flow

### Sequence Diagram: Adding an Expense

```
PARTICIPANT TIMELINE
═══════════════════════════════════════════════════════════════════

CLIENT                  EXPRESS              CONTROLLER           SERVICE
  │                       │                      │                  │
  │ POST /expenses        │                      │                  │
  │──────────────────────>│                      │                  │
  │                       │                      │                  │
  │                       │ Parse JSON          │                  │
  │                       │ Validate CORS       │                  │
  │                       │──────────────────>│ Extract body       │
  │                       │                      │                  │
  │                       │                      │ addExpense()     │
  │                       │                      │─────────────────>│
  │                       │                      │                  │
  │                       │                      │                  │ Group.findById()
  │                       │                      │                  │ ────> [Query DB]
  │                       │                      │                  │       ✓ Group found
  │                       │                      │                  │
  │                       │                      │                  │ Validate participants
  │                       │                      │                  │ ────> Check membership
  │                       │                      │                  │       ✓ All valid
  │                       │                      │                  │
  │                       │                      │                  │ Expense.create()
  │                       │                      │                  │ ────> [Insert DB]
  │                       │                      │                  │       ✓ Created
  │                       │                      │                  │
  │                       │                      │                  │ calculateSplit()
  │                       │                      │                  │ ────> [Util Function]
  │                       │                      │                  │       ✓ Splits {A:75, B:75}
  │                       │                      │                  │
  │                       │                      │                  │ updateBalance()
  │                       │                      │                  │ ────> [For each participant]
  │                       │                      │                  │       ├─ Check same dir
  │                       │                      │                  │       ├─ Check reverse
  │                       │                      │                  │       └─ Create/Update
  │                       │                      │                  │
  │                       │                      │ return expense   │
  │                       │                      │<─────────────────│
  │                       │ res.status(201)      │                  │
  │                       │ .json(expense)       │                  │
  │                       │<──────────────────────│                  │
  │ Response (201)        │                      │                  │
  │<──────────────────────│                      │                  │
  │                       │                      │                  │
```

### Data Transformation Through Layers

```
┌─ REQUEST DATA ──────────────────────────────────────────────┐
│                                                               │
│  {                                                            │
│    "groupId": "507f1f77bcf86cd799439011",                   │
│    "title": "Dinner",                                        │
│    "paidBy": "507f1f77bcf86cd799439012",                    │
│    "amount": 150,                                            │
│    "participants": [                                         │
│      "507f1f77bcf86cd799439012",  // Alice (paid)          │
│      "507f1f77bcf86cd799439013"   // Bob (participant)     │
│    ],                                                        │
│    "splitType": "EQUAL"                                     │
│  }                                                            │
│                                                               │
└─ ROUTE RECEIVES & DISPATCHES ──────────────────────────────┘
  │
  │ CONTROLLER EXTRACTS
  │
  ├─ Validates JSON structure
  ├─ Checks required fields
  └─ Calls service.addExpense()
  │
  ▼
┌─ SERVICE LAYER PROCESSING ──────────────────────────────────┐
│                                                               │
│  STEP 1: Fetch Group                                        │
│  ────────────────────                                        │
│  Query: Group.findById("507f1f77bcf86cd799439011")         │
│  Result: {                                                   │
│    _id: "507f1f77bcf86cd799439011",                        │
│    groupName: "Weekend Trip",                              │
│    members: [                                               │
│      "507f1f77bcf86cd799439012",  // Alice                │
│      "507f1f77bcf86cd799439013"   // Bob                  │
│    ]                                                         │
│  }                                                            │
│                                                               │
│  STEP 2: Validate Participants                             │
│  ──────────────────────────────                             │
│  Check: Is "507f1f77bcf86cd799439012" in group? ✓         │
│  Check: Is "507f1f77bcf86cd799439013" in group? ✓         │
│  All participants valid!                                    │
│                                                               │
│  STEP 3: Create Expense Document                           │
│  ────────────────────────────────                           │
│  Insert into Expenses collection:                           │
│  {                                                           │
│    _id: ObjectId("..."),                                    │
│    groupId: ObjectId("507f1f77bcf86cd799439011"),         │
│    title: "Dinner",                                         │
│    paidBy: ObjectId("507f1f77bcf86cd799439012"),          │
│    amount: 150,                                             │
│    participants: [                                          │
│      ObjectId("507f1f77bcf86cd799439012"),                │
│      ObjectId("507f1f77bcf86cd799439013")                 │
│    ],                                                        │
│    splitType: "EQUAL",                                     │
│    createdAt: 2024-01-15T10:30:00Z,                       │
│    updatedAt: 2024-01-15T10:30:00Z                        │
│  }                                                            │
│                                                               │
│  STEP 4: Calculate Split Amounts                           │
│  ────────────────────────────────                           │
│  Call: calculateSplit({                                     │
│    amount: 150,                                             │
│    participants: [                                          │
│      "507f1f77bcf86cd799439012",                          │
│      "507f1f77bcf86cd799439013"                           │
│    ],                                                        │
│    splitType: "EQUAL"                                      │
│  })                                                          │
│                                                               │
│  Returned Split Object:                                     │
│  {                                                           │
│    "507f1f77bcf86cd799439012": 75,   // Alice pays       │
│    "507f1f77bcf86cd799439013": 75    // Bob pays         │
│  }                                                            │
│                                                               │
│  STEP 5: Update Balances                                   │
│  ────────────────────────                                   │
│  For each participant (except paidBy):                      │
│                                                               │
│  Participant: Bob (507f1f77bcf86cd799439013)              │
│  Owed Amount: 75                                            │
│                                                               │
│  Balance Update Logic:                                      │
│  ├─ Query same direction: {                                │
│  │   groupId: 507f1f77bcf86cd799439011,                  │
│  │   fromUser: 507f1f77bcf86cd799439013,                │
│  │   toUser: 507f1f77bcf86cd799439012                   │
│  │ }                                                        │
│  │ → Not found                                             │
│  │                                                          │
│  ├─ Query reverse direction: {                             │
│  │   groupId: 507f1f77bcf86cd799439011,                  │
│  │   fromUser: 507f1f77bcf86cd799439012,                │
│  │   toUser: 507f1f77bcf86cd799439013                   │
│  │ }                                                        │
│  │ → Not found                                             │
│  │                                                          │
│  └─ Create new balance:                                    │
│      {                                                      │
│        _id: ObjectId("..."),                               │
│        groupId: ObjectId("507f1f77bcf86cd799439011"),     │
│        fromUser: ObjectId("507f1f77bcf86cd799439013"),   │
│        toUser: ObjectId("507f1f77bcf86cd799439012"),     │
│        amount: 75,                                         │
│        createdAt: 2024-01-15T10:30:00Z,                  │
│        updatedAt: 2024-01-15T10:30:00Z                   │
│      }                                                      │
│                                                               │
│  ✓ Balance Created: Bob → Alice: $75                       │
│                                                               │
└────────────────────────────────────────────────────────────┘
  │
  ▼
┌─ RESPONSE ──────────────────────────────────────────────────┐
│                                                               │
│  HTTP 201 Created                                           │
│  Content-Type: application/json                            │
│                                                               │
│  {                                                           │
│    "_id": "507f191e810c19729de860ea",                     │
│    "groupId": "507f1f77bcf86cd799439011",                 │
│    "title": "Dinner",                                      │
│    "paidBy": "507f1f77bcf86cd799439012",                 │
│    "amount": 150,                                          │
│    "participants": [                                       │
│      "507f1f77bcf86cd799439012",                         │
│      "507f1f77bcf86cd799439013"                          │
│    ],                                                       │
│    "splitType": "EQUAL",                                  │
│    "createdAt": "2024-01-15T10:30:00Z",                 │
│    "updatedAt": "2024-01-15T10:30:00Z"                  │
│  }                                                           │
│                                                               │
│  + Database State Updated:                                 │
│    ✓ Expense record created                               │
│    ✓ Balance record created                               │
│                                                               │
└────────────────────────────────────────────────────────────┘
```

---

## Balance Settlement Flow

### Scenario: Bob Pays Alice $75

```
REQUEST
───────────────────────────────────────────────────────────────
POST /settlements
{
  "groupId": "507f1f77bcf86cd799439011",
  "fromUser": "507f1f77bcf86cd799439013",  // Bob (owes)
  "toUser": "507f1f77bcf86cd799439012",    // Alice (receives)
  "amount": 75
}

PROCESSING
───────────────────────────────────────────────────────────────

SERVICE LOGIC:
==============

Step 1: Find Existing Balance
────────────────────────────
Query: {
  groupId: "507f1f77bcf86cd799439011",
  fromUser: "507f1f77bcf86cd799439013",
  toUser: "507f1f77bcf86cd799439012"
}

Found: {
  _id: "...",
  groupId: "507f1f77bcf86cd799439011",
  fromUser: "507f1f77bcf86cd799439013",
  toUser: "507f1f77bcf86cd799439012",
  amount: 75  ← Exactly what Bob owes!
}

Step 2: Validate Settlement Amount
──────────────────────────────────
✓ Balance exists: 75
✓ Settlement amount: 75
✓ 75 ≤ 75: Valid!
✓ 75 > 0: Valid!

Step 3: Determine Settlement Type
─────────────────────────────────
Amount (75) == Balance (75)?
→ YES: FULL SETTLEMENT

Step 4: Execute Full Settlement
───────────────────────────────
Action: Delete balance record
Result: Balance.deleteOne()

OUTCOME
───────────────────────────────────────────────────────────────
✓ Balance deleted from database
✓ Bob's debt to Alice: CLEARED
✓ Future balance queries show no debt between them

RESPONSE
───────────────────────────────────────────────────────────────
HTTP 200 OK
{
  "message": "Balance settled completely",
  "settledAmount": 75,
  "remaining": 0
}
```

### Partial Settlement Example

```
SCENARIO: Bob Pays Alice $50 (but owes $75)
────────────────────────────────────────────

Current Balance: Bob → Alice: $75

REQUEST
───────
POST /settlements
{
  "groupId": "507f1f77bcf86cd799439011",
  "fromUser": "507f1f77bcf86cd799439013",
  "toUser": "507f1f77bcf86cd799439012",
  "amount": 50
}

VALIDATION
──────────
✓ 50 ≤ 75: Valid!
✓ 50 > 0: Valid!

LOGIC
─────
Amount (50) == Balance (75)?
→ NO: PARTIAL SETTLEMENT

Action: Update balance record
balance.amount = 75 - 50 = 25
balance.save()

OUTCOME
───────
Balance: Bob → Alice: $25 (remaining)

RESPONSE
────────
HTTP 200 OK
{
  "message": "Balance settled partially",
  "settledAmount": 50,
  "remaining": 25
}
```

---

## Group Creation Flow

```
CLIENT REQUEST
───────────────────────────────────────────────────────────

POST /groups
{
  "groupName": "Weekend Trip"
}

│
▼

CONTROLLER
──────────
1. Extract groupName from body
2. Call groupService.createGroup()

│
▼

SERVICE
───────
1. Create group document:
   {
     _id: ObjectId(),
     groupName: "Weekend Trip",
     members: [],  // Empty initially
     createdAt: timestamp,
     updatedAt: timestamp
   }

2. Save to database:
   Group.create(payload)

3. Return created group

│
▼

DATABASE
────────
Inserted into Groups collection:
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "groupName": "Weekend Trip",
  "members": [],
  "createdAt": ISODate("2024-01-15T10:30:00Z"),
  "updatedAt": ISODate("2024-01-15T10:30:00Z")
}

│
▼

RESPONSE
────────
HTTP 201 Created
{
  "_id": "507f1f77bcf86cd799439011",
  "groupName": "Weekend Trip",
  "members": [],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}

NEXT STEP: Add members via /groups/:groupId/add-member
```

### Adding Members to Group

```
REQUEST
───────
POST /groups/507f1f77bcf86cd799439011/add-member
{
  "userId": "507f1f77bcf86cd799439012"  // Alice
}

│
▼

SERVICE PROCESSING
──────────────────

1. Validate group exists:
   Group.findById("507f1f77bcf86cd799439011")
   ✓ Found

2. Validate user exists:
   User.findById("507f1f77bcf86cd799439012")
   ✓ Found

3. Check if already member:
   "507f1f77bcf86cd799439012" in members?
   ✓ No (safe to add)

4. Add member:
   group.members.push(userId)
   group.save()

   Result: members = ["507f1f77bcf86cd799439012"]

│
▼

DATABASE
────────
Updated Groups collection:
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "groupName": "Weekend Trip",
  "members": [
    ObjectId("507f1f77bcf86cd799439012")  // Alice added
  ],
  "updatedAt": ISODate("2024-01-15T10:35:00Z")
}

│
▼

RESPONSE
────────
HTTP 200 OK
{
  "_id": "507f1f77bcf86cd799439011",
  "groupName": "Weekend Trip",
  "members": [
    "507f1f77bcf86cd799439012"
  ],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

---

## Balance Retrieval Flow

```
REQUEST
───────
GET /balances/507f1f77bcf86cd799439011

│
▼

SERVICE
───────
1. Query all balances for group:
   Balance.find({
     groupId: "507f1f77bcf86cd799439011"
   })

2. Populate user details:
   .populate("fromUser", "name")
   .populate("toUser", "name")

│
▼

DATABASE QUERY
──────────────
Found in Balances collection:
[
  {
    _id: "...",
    groupId: "507f1f77bcf86cd799439011",
    fromUser: "507f1f77bcf86cd799439013",  // → populate
    toUser: "507f1f77bcf86cd799439012",    // → populate
    amount: 75
  }
]

AFTER POPULATION:
[
  {
    _id: "...",
    groupId: "507f1f77bcf86cd799439011",
    fromUser: {
      _id: "507f1f77bcf86cd799439013",
      name: "Bob",
      email: "bob@example.com"
    },
    toUser: {
      _id: "507f1f77bcf86cd799439012",
      name: "Alice",
      email: "alice@example.com"
    },
    amount: 75
  }
]

│
▼

RESPONSE
────────
HTTP 200 OK
[
  {
    "_id": "507f191e810c19729de860eb",
    "groupId": "507f1f77bcf86cd799439011",
    "fromUser": {
      "_id": "507f1f77bcf86cd799439013",
      "name": "Bob"
    },
    "toUser": {
      "_id": "507f1f77bcf86cd799439012",
      "name": "Alice"
    },
    "amount": 75
  }
]

INTERPRETATION
───────────────
"Bob owes Alice $75"
```

---

## Split Calculation Deep Dive

### Equal Split Example

```
SCENARIO: $100 dinner split equally among 4 friends

INPUT
─────
{
  amount: 100,
  participants: ["user1", "user2", "user3", "user4"],
  splitType: "EQUAL",
  splits: undefined
}

PROCESSING
──────────

Function: equalSplit(amount, participants)

Step 1: Calculate share
share = amount / participants.length
share = 100 / 4
share = 25.00

Step 2: Round to 2 decimals
share = 25.00 (already precise)

Step 3: Build result object
result = {}
for each participant in ["user1", "user2", "user3", "user4"]:
  result[participant] = 25.00

OUTPUT
──────
{
  "user1": 25.00,
  "user2": 25.00,
  "user3": 25.00,
  "user4": 25.00
}

VERIFICATION
─────────────
Sum = 25 + 25 + 25 + 25 = 100 ✓
```

### Percent Split Example

```
SCENARIO: $1000 project cost split by percentages
- Alice: 50% (lead role)
- Bob: 30%
- Charlie: 20%

INPUT
─────
{
  amount: 1000,
  participants: ["alice", "bob", "charlie"],
  splitType: "PERCENT",
  splits: {
    "alice": 50,
    "bob": 30,
    "charlie": 20
  }
}

PROCESSING
──────────

Function: percentSplit(amount, splits)

Step 1: Calculate amount for each percentage
result = {}

alice = 1000 * (50 / 100) = 500.00
result["alice"] = 500.00

bob = 1000 * (30 / 100) = 300.00
result["bob"] = 300.00

charlie = 1000 * (20 / 100) = 200.00
result["charlie"] = 200.00

OUTPUT
──────
{
  "alice": 500.00,
  "bob": 300.00,
  "charlie": 200.00
}

VERIFICATION
─────────────
Sum = 500 + 300 + 200 = 1000 ✓
Percentages = 50% + 30% + 20% = 100% ✓
```

### Exact Split Example

```
SCENARIO: Bill split with exact amounts
- Alice: $60
- Bob: $50
- Charlie: $40
Total: $150

INPUT
─────
{
  amount: 150,
  participants: ["alice", "bob", "charlie"],
  splitType: "EXACT",
  splits: {
    "alice": 60,
    "bob": 50,
    "charlie": 40
  }
}

PROCESSING
──────────

Function: exactSplit(amount, splits)

Step 1: Validate sum equals amount
total = 60 + 50 + 40 = 150
if (total === 150) → ✓ Valid!

Step 2: Return splits as-is
return splits

OUTPUT
──────
{
  "alice": 60,
  "bob": 50,
  "charlie": 40
}

ERROR CASE
──────────
If input was:
{
  "alice": 70,  // Changed!
  "bob": 50,
  "charlie": 40
}

total = 70 + 50 + 40 = 160
if (160 !== 150) → ✗ ERROR!

Response:
{
  error: "Exact split must sum to amount (160 ≠ 150)"
}
```

---

## Complete Round-Trip Example

### Scenario: Trip Expenses Settlement

```
TIMELINE
═════════════════════════════════════════════════════════════════

Day 1: Alice Creates Group
──────────────────────────

Request:
POST /groups
{ "groupName": "Thailand Trip" }

Response:
{
  "_id": "group_123",
  "groupName": "Thailand Trip",
  "members": []
}

Day 1: Alice Adds Bob
─────────────────────

Request:
POST /groups/group_123/add-member
{ "userId": "alice_id" }  // Self
POST /groups/group_123/add-member
{ "userId": "bob_id" }

Database State:
Group {
  _id: "group_123",
  members: ["alice_id", "bob_id"]
}

Day 2: Alice Books Hotel ($300)
────────────────────────────────

Request:
POST /expenses
{
  "groupId": "group_123",
  "title": "Hotel",
  "paidBy": "alice_id",
  "amount": 300,
  "participants": ["alice_id", "bob_id"],
  "splitType": "EQUAL"
}

Processing:
├─ Create expense: Hotel, $300, Alice paid
├─ Calculate split: 300 / 2 = 150 each
└─ Update balance: Bob → Alice: $150

Database State:
Expense {
  _id: "exp_1",
  groupId: "group_123",
  title: "Hotel",
  paidBy: "alice_id",
  amount: 300,
  participants: ["alice_id", "bob_id"],
  splitType: "EQUAL"
}

Balance {
  _id: "bal_1",
  groupId: "group_123",
  fromUser: "bob_id",
  toUser: "alice_id",
  amount: 150
}

Day 3: Bob Books Activities ($200)
──────────────────────────────────

Request:
POST /expenses
{
  "groupId": "group_123",
  "title": "Activities",
  "paidBy": "bob_id",
  "amount": 200,
  "participants": ["alice_id", "bob_id"],
  "splitType": "EQUAL"
}

Processing:
├─ Create expense: Activities, $200, Bob paid
├─ Calculate split: 200 / 2 = 100 each
├─ Update balance: Alice → Bob: $100
│
│  (Bidirectional optimization happens!)
│  ├─ Does Bob → Alice already exist? YES (150)
│  ├─ Is it reverse to what we need (Alice → Bob)? YES
│  ├─ Update existing: 150 - 100 = 50
│  └─ Result: Bob → Alice: $50 (reduced)

Database State:
Balance {
  _id: "bal_1",
  groupId: "group_123",
  fromUser: "bob_id",
  toUser: "alice_id",
  amount: 50  // UPDATED from 150!
}

Day 4: Check Balances
─────────────────────

Request:
GET /balances/group_123

Response:
[
  {
    "_id": "bal_1",
    "groupId": "group_123",
    "fromUser": {
      "_id": "bob_id",
      "name": "Bob"
    },
    "toUser": {
      "_id": "alice_id",
      "name": "Alice"
    },
    "amount": 50
  }
]

Interpretation:
"Bob owes Alice $50"

Summary:
├─ Alice paid: $300 (owes $150)
├─ Bob paid: $200 (owes $100)
└─ Net: Bob owes Alice $50

Day 5: Bob Settles
──────────────────

Request:
POST /settlements
{
  "groupId": "group_123",
  "fromUser": "bob_id",
  "toUser": "alice_id",
  "amount": 50
}

Processing:
├─ Find balance: Bob → Alice: $50
├─ Amount = Balance (50 = 50)
└─ Action: Delete balance (full settlement)

Response:
{
  "message": "Balance settled completely",
  "settledAmount": 50,
  "remaining": 0
}

Final State:
- No balances remaining
- All debts settled! ✓
- Trip expenses divided fairly

═════════════════════════════════════════════════════════════════
```

---

## Key Insights from Data Flow

### Expense Creation Data Flow

1. **Request Validation** - Check JSON structure
2. **Group Verification** - Ensure group exists
3. **Participant Validation** - Verify membership
4. **Expense Recording** - Store expense permanently
5. **Split Calculation** - Pure function (no DB)
6. **Balance Optimization** - Smart debt resolution

### Error Handling Points

- Invalid group ID → 404
- Participant not in group → 422
- Invalid split data → 400
- Settlement exceeds balance → 422

### Database Consistency

- Expenses are immutable (store permanently)
- Balances are optimized (combine debts intelligently)
- Settlements remove or reduce balances
- Unique constraint ensures one balance per pair per group

---

**End of Data Flow Documentation**
