# School Equipment Borrowing System — Backend

The REST API of the School Equipment Borrowing System, a final project for
CTADWEBL (Advanced Web Programming), National University Clark, A.Y. 2026-2027.

The frontend (React) lives in the `frontend` folder, which is pushed to its own repository: `equipment-borrowing-client`.

## Group members

| Name | Role | GitHub |
|---|---|---|
| _Member 1_ | _e.g. Borrowings and status rules_ | _@username_ |
| _Member 2_ | _e.g. Equipment and availability_ | _@username_ |
| _Member 3_ | _e.g. Borrowers, fines, statistics_ | _@username_ |

## Concept

A school equipment room lends items to students and faculty. Instead of a paper
logbook, this system records every borrowing and **computes** what the logbook
cannot: how many units are available, when each item is due, which items are
overdue, and how much a late return costs.

The inventory has two types of items:

- **Non-consumable** items are borrowed and returned (ruler, calculator, projector).
  They have a due date and an overdue fee.
- **Consumable** items are issued and used up (paper, glue, tape). They reduce the
  stock and raise a low-stock warning.

## What data it processes

| Processing | How it is computed |
|---|---|
| Availability | total quantity − units held by approved or released borrowings |
| Due date | borrow date + the category's loan days (doubled for faculty) |
| Overdue fee | days late × daily fee × quantity, capped at the replacement cost |
| Status rules | pending → approved → released → returned (or issued, for consumables) |
| Borrower standing | blocked when inactive, with unpaid fines, or with an overdue item |
| Low stock | consumables at or below their reorder level |
| Statistics | counts, on-time return rate, average loan length, rankings, fine totals |

## Technologies

Node.js, Express, MongoDB Atlas, Mongoose, dotenv, cors.

## Project structure

The backend follows the same layout as the class activity.

```
app.js               entry point: configuration, mounting, and starting the server
config/db.js         database connection
controllers/         the logic of every endpoint, one file per resource
middleware/          logger, 404 catch-all, error handler
models/              Category, Equipment, Borrower, Borrowing, Fine
routes/              the URLs, one express.Router() file per resource
scripts/seed.js      loads sample data
utils/rules.js       all business rules in one place
utils/dates.js       due date and days-overdue helpers
utils/httpError.js   creates an error with a status code
```

A request travels in this order: `app.js` → `routes/` → `controllers/` → `models/` → MongoDB.

## Setup

1. Install the packages:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in your values.
3. Load the sample data:
   ```bash
   npm run seed
   ```
4. Start the server:
   ```bash
   npm run dev
   ```
   The API runs at `http://localhost:5000`.

## Environment variables

| Variable | Purpose | Example |
|---|---|---|
| `PORT` | Port the server listens on | `5000` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://user:pass@cluster.mongodb.net/equipment-borrowing` |
| `CLIENT_URL` | Frontend addresses allowed by CORS, separated by commas, or `*` for any | `*` |

## Testing on a phone

The phone and the laptop must be on the same Wi-Fi.

1. In `.env`, keep `CLIENT_URL=*` so the phone's address is allowed.
2. Start the frontend. Its terminal prints a **Network** address such as `http://192.168.1.5:5173`.
3. Open that address in the phone's browser.

If the page loads but shows "Cannot reach the server", allow Node.js through the
laptop's firewall (Windows asks for this the first time the server starts).

## API documentation

Base URL: `http://localhost:5000/api`. Errors always look like `{ "message": "..." }`.

There are **31 endpoints**. Those marked ⚙ perform processing beyond plain CRUD.

### Categories

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/categories` | List all categories | — | `200` `[{ "_id": "...", "name": "Electronics", "maxLoanDays": 2, "dailyFee": 20 }]` |
| GET | `/categories/:id` | Get one category | — | `200` `{ "_id": "...", "name": "Electronics" }` |
| POST | `/categories` | Create a category | `{ "name": "Laboratory Tools", "maxLoanDays": 2, "dailyFee": 10 }` | `201` the created category |
| PUT | `/categories/:id` | Update a category | `{ "dailyFee": 15 }` | `200` the updated category |
| DELETE | `/categories/:id` | Delete a category (blocked while it has equipment) | — | `200` `{ "message": "Category deleted" }` |

### Equipment

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET ⚙ | `/equipment?category=&type=&condition=&search=&sort=` | List with multi-criteria search, filtering, and sorting; adds computed `available` | `?type=consumable&sort=-available` | `200` `[{ "name": "Masking Tape", "totalQuantity": 15, "held": 2, "available": 13, "lowStock": false }]` |
| GET ⚙ | `/equipment/low-stock` | Consumables at or below the reorder level | — | `200` `[{ "name": "Glue Stick", "totalQuantity": 6, "reorderLevel": 10, "shortBy": 4, "outOfStock": false }]` |
| GET | `/equipment/:id` | Get one item | — | `200` `{ "name": "Scientific Calculator", "available": 9 }` |
| GET ⚙ | `/equipment/:id/availability?quantity=` | Check whether a quantity can be borrowed now | `?quantity=3` | `200` `{ "total": 10, "held": 1, "available": 9, "requested": 3, "canBorrow": true, "reason": "Available" }` |
| POST | `/equipment` | Create an item | `{ "name": "Stapler", "category": "<id>", "type": "non-consumable", "totalQuantity": 5 }` | `201` the created item |
| PUT | `/equipment/:id` | Update an item (quantity cannot go below held units) | `{ "totalQuantity": 12 }` | `200` the updated item |
| DELETE | `/equipment/:id` | Delete an item (blocked while it has active borrowings) | — | `200` `{ "message": "Equipment deleted" }` |

### Borrowers

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/borrowers?search=` | List borrowers | `?search=maria` | `200` `[{ "studentNumber": "2023-100101", "name": "Maria Santos", "type": "student" }]` |
| GET | `/borrowers/:id` | Get one borrower | — | `200` the borrower |
| GET ⚙ | `/borrowers/:id/standing` | Active loans, unpaid fines, and blocked flag | — | `200` `{ "activeLoans": 1, "overdueItems": 1, "unpaidTotal": 60, "blocked": true, "reasons": ["Has unpaid fines of PHP 60"] }` |
| POST | `/borrowers` | Create a borrower | `{ "studentNumber": "2024-100200", "name": "Ana Cruz", "email": "ana@example.edu" }` | `201` the created borrower |
| PUT | `/borrowers/:id` | Update a borrower | `{ "status": "inactive" }` | `200` the updated borrower |
| DELETE | `/borrowers/:id` | Delete a borrower (blocked with active borrowings or unpaid fines) | — | `200` `{ "message": "Borrower deleted" }` |

### Borrowings

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/borrowings?status=&borrower=&equipment=` | List borrowings, with computed `daysOverdue` | `?status=pending` | `200` `[{ "quantity": 2, "status": "pending", "daysOverdue": 0 }]` |
| GET ⚙ | `/borrowings/overdue` | Released items past due, with days late and running fee | — | `200` `[{ "quantity": 2, "daysOverdue": 3, "dailyFee": 15, "runningFee": 90 }]` |
| GET | `/borrowings/:id` | Get one borrowing | — | `200` the borrowing |
| POST ⚙ | `/borrowings` | Create a request: checks standing and availability, computes the due date | `{ "equipment": "<id>", "borrower": "<id>", "quantity": 2, "purpose": "Quiz" }` | `201` `{ "status": "pending", "dueDate": "2026-10-08T15:59:59.999Z" }` or `400` `{ "message": "Only 1 unit(s) of LCD Projector available" }` |
| PUT | `/borrowings/:id` | Edit quantity or purpose (pending only) | `{ "quantity": 1 }` | `200` the updated borrowing |
| PATCH ⚙ | `/borrowings/:id/status` | Rule-based status change; creates a fine on a late return | `{ "status": "returned" }` | `200` `{ "message": "Borrowing returned", "borrowing": {...}, "fine": { "daysOverdue": 3, "amount": 90 } }` or `400` `{ "message": "Cannot change status from pending to returned. Allowed: approved or cancelled" }` |
| DELETE | `/borrowings/:id` | Delete a borrowing (blocked while approved or released) | — | `200` `{ "message": "Borrowing deleted" }` |

### Fines

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET | `/fines?status=&borrower=` | List fines | `?status=unpaid` | `200` `[{ "daysOverdue": 3, "amount": 60, "status": "unpaid" }]` |
| GET | `/fines/:id` | Get one fine | — | `200` the fine |
| POST | `/fines` | Create a fine manually | `{ "borrowing": "<id>", "borrower": "<id>", "daysOverdue": 1, "amount": 20 }` | `201` the created fine |
| PUT | `/fines/:id` | Update a fine or mark it paid (a paid fine is final) | `{ "status": "paid" }` | `200` `{ "status": "paid", "paidAt": "2026-10-06T04:09:27.970Z" }` |
| DELETE | `/fines/:id` | Delete a fine | — | `200` `{ "message": "Fine deleted" }` |

### Statistics

| Method | Path | Purpose | Sample request | Sample response |
|---|---|---|---|---|
| GET ⚙ | `/statistics` | Totals, status distribution, on-time rate, average loan length, most borrowed, fine totals | — | `200` `{ "totals": {...}, "byStatus": {...}, "returns": { "onTimeRate": 60 }, "mostBorrowed": [...], "fines": { "collected": 30, "unpaid": 60 } }` |

### Status codes

| Code | When |
|---|---|
| 200 | Successful read, update, or delete |
| 201 | A record was created |
| 400 | Validation failed, an ID is malformed, or a business rule was broken |
| 404 | The record or the route does not exist |
| 500 | An unexpected server error |

## Features

- Five related collections with validation rules and timestamps
- Availability checking that prevents over-borrowing, re-checked on approval
- Server-computed due dates, with a longer loan period for faculty
- Rule-based status changes with no skipping and no going back
- Automatic fines on late returns, capped at the replacement cost
- Separate handling of consumable and non-consumable items
- Guards against deleting records that are still in use
- Request logger, JSON 404 catch-all, and a central error handler
- Seed script with sample data for the demonstration

## Known limitations

- There is no login, so anyone who can open the system can approve requests.
- Availability is computed for the present moment; future reservations by date are not supported.
- Fines are recorded as paid or unpaid only; there is no payment processing.
- The due date is counted from the request date, not from the release date.
