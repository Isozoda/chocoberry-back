# Choco Berry Business API v2.0

Production-ready NestJS backend for **CHOCO BERRY** — a strawberry dessert business in Dushanbe, Tajikistan.

## Stack

- **Runtime**: Node.js 20 LTS
- **Framework**: NestJS 10
- **Database**: PostgreSQL 16
- **ORM**: Prisma 5
- **Auth**: JWT Bearer
- **Docs**: Swagger at `/api/docs`
- **Money**: decimal.js (never float)

---

## Quick Start (Local)

### 1. Prerequisites

Install PostgreSQL 16 and create the database:

```sql
CREATE DATABASE chocoberry;
```

Or run via Docker (recommended):

```bash
docker run -d \
  --name chocoberry-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=chocoberry \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Install & Migrate

```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
```

### 3. Run

```bash
npm run build
npm run start:prod
# OR dev mode:
npm run start:dev
```

API: http://localhost:3000  
Swagger: http://localhost:3000/api/docs

---

## Docker Compose (Full Stack)

```bash
docker-compose up -d
```

This starts PostgreSQL + the API together. Migrations run automatically.

---

## Environment Variables (.env)

```env
NODE_ENV="development"
PORT=3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chocoberry"
JWT_SECRET="chocoberry_super_secret_change_in_prod_2026"
JWT_EXPIRES_IN="7d"
DEFAULT_CURRENCY="TJS"
DEFAULT_LANGUAGE="tg"
BONUS_PERCENT_DEFAULT="2.0"
ALLOWED_ORIGINS="http://localhost:3000,http://localhost:5173"
```

---

## API Endpoints (all under `/api/v1`)

All endpoints (except register/login) require `Authorization: Bearer <token>`

### Auth
| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Register user |
| POST | /auth/login | Login, get JWT |
| GET | /auth/me | Current user |

### Business
| Method | Path | Description |
|--------|------|-------------|
| POST | /business/setup | Seed all defaults |
| GET | /business/profile | Business profile |
| PATCH | /business/profile | Update profile |
| GET | /business/dashboard | Today's summary |

### Suppliers
| Method | Path | Description |
|--------|------|-------------|
| GET | /suppliers | List suppliers |
| POST | /suppliers | Create supplier |
| POST | /suppliers/:id/purchase | Buy (box→kg auto, cup forecast) |
| GET | /suppliers/:id/purchases | Purchase history |
| GET | /suppliers/:id/price-history | Price history |
| GET | /suppliers/breakdown | By-supplier totals |

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | /products | List products |
| POST | /products | Create product |
| POST | /products/:id/recipe | Set BOM |
| GET | /products/:id/margin | Margin analysis |

### Inventory
| Method | Path | Description |
|--------|------|-------------|
| GET | /inventory | List items |
| POST | /inventory/:id/stock-in | Add stock |
| POST | /inventory/:id/cleaning | Raw→cleaned with loss |
| POST | /inventory/:id/waste | Write-off |
| GET | /inventory/alerts/low-stock | Low stock alerts |
| GET | /inventory/valuation | Total value |

### Sales (POS)
| Method | Path | Description |
|--------|------|-------------|
| POST | /sales | Create sale (auto-deducts BOM) |
| GET | /sales | List sales |
| PATCH | /sales/:id/void | Void sale |
| GET | /sales/stats/today | Today stats |
| GET | /sales/stats/top-products | Best sellers |
| GET | /sales/stats/hot-hours | Hourly heatmap |

### Expenses
| Method | Path | Description |
|--------|------|-------------|
| GET | /expenses | List expenses |
| POST | /expenses | Create expense |
| GET | /expenses/breakdown | By type |

### Employees
| Method | Path | Description |
|--------|------|-------------|
| GET | /employees | List employees |
| POST | /employees | Create employee |
| POST | /employees/:id/pay | Pay (salary/advance/bonus) |
| POST | /employees/:id/fine | Add fine |
| POST | /employees/payroll/calculate-month | Monthly payroll |
| GET | /employees/:id/payroll/:month | Employee payroll |

### Cashbox
| Method | Path | Description |
|--------|------|-------------|
| GET | /cashbox | Current balances |
| POST | /cashbox/in | Cash in |
| POST | /cashbox/out | Cash out |
| GET | /cashbox/report/today | Today cashbox report |

### Funds
| Method | Path | Description |
|--------|------|-------------|
| GET | /funds | List funds |
| POST | /funds/:id/deposit | Deposit |
| POST | /funds/:id/withdraw | Withdraw |

### Daily Report
| Method | Path | Description |
|--------|------|-------------|
| POST | /daily-report | Create report |
| GET | /daily-report/today | Today (auto-computed) |
| POST | /daily-report/:id/finalize | Lock report |

### Reports & Analytics
| Method | Path | Description |
|--------|------|-------------|
| GET | /reports/profit | P&L |
| GET | /reports/cogs | Cost of Goods Sold |
| GET | /reports/monthly | Monthly report |
| GET | /reports/hot-hours | Heatmap |
| GET | /reports/export/excel | Excel download |
| GET | /reports/export/pdf | PDF download |

---

## Top 10 Endpoint Examples (curl)

> Replace `TOKEN` with the JWT from login. Replace UUIDs with actual IDs from your data.

### 1. Register Owner

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@chocoberry.tj",
    "name": "Ман Раисҳо",
    "password": "SecurePass123!",
    "role": "OWNER"
  }'
```

### 2. Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@chocoberry.tj",
    "password": "SecurePass123!"
  }'
# Response includes: { "data": { "accessToken": "eyJ..." } }
```

### 3. Setup Business (seeds ALL defaults)

```bash
curl -X POST http://localhost:3000/api/v1/business/setup \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Choco Berry",
    "type": "FOOD",
    "address": "Dushanbe, Tajikistan"
  }'
# Creates: suppliers, inventory items, products+recipes, employees, funds, cashbox
```

### 4. Buy 120kg Strawberry from Supplier

```bash
# First get supplier ID from GET /suppliers, then:
curl -X POST http://localhost:3000/api/v1/suppliers/SUPPLIER_UUID/purchase \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "inventoryItemId": "STRAWBERRY_ITEM_UUID",
    "quantity": 120,
    "unit": "KG",
    "pricePerUnit": 50,
    "notes": "Аки Талабшоҳ — утренняя партия"
  }'
# Auto: updates inventory, saves price history, forecasts cups, creates expense
```

### 5. Clean 120kg Raw Strawberry → 100kg Cleaned

```bash
curl -X POST http://localhost:3000/api/v1/inventory/STRAWBERRY_ITEM_UUID/cleaning \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "rawQuantity": 120,
    "actualCleanedQuantity": 100,
    "notes": "Morning cleaning batch"
  }'
# Returns: { raw: 120, cleaned: 100, loss: 20, lossPct: 16.67 }
```

### 6. Create Sale — 2x Cup 0.3 Pure Strawberry (MIXED payment)

```bash
curl -X POST http://localhost:3000/api/v1/sales \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "items": [
      { "productId": "CUP_03_PURE_UUID", "quantity": 2 },
      { "productId": "CUP_04_DOUBLE_UUID", "quantity": 1 }
    ],
    "paymentMethod": "MIXED",
    "cashAmount": 75,
    "cardAmount": 35,
    "discount": 0
  }'
# Auto: deducts strawberry/chocolate/cups from inventory atomically
```

### 7. Record Daily Report (01.05.2026)

```bash
curl -X POST http://localhost:3000/api/v1/daily-report \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "date": "2026-05-01",
    "totalSales": 26257,
    "cashSales": 20785,
    "cardSales": 5472,
    "extraIncome": 1300,
    "operationalExp": 455,
    "consumablesExp": 3300,
    "suppliers": [
      { "name": "Клубника", "amount": 5700 },
      { "name": "Шоколад", "amount": 5800 }
    ],
    "draws": [
      { "ownerName": "Ман", "amount": 500 },
      { "ownerName": "Дилшод", "amount": 500 },
      { "ownerName": "Саф", "amount": 250 }
    ],
    "remaining": 8450,
    "notes": "Good day, weather was nice"
  }'
```

### 8. Get P&L Report for May 2026

```bash
curl "http://localhost:3000/api/v1/reports/profit?from=2026-05-01&to=2026-05-31" \
  -H "Authorization: Bearer TOKEN"
```

### 9. Calculate Monthly Payroll (apply immediately)

```bash
curl -X POST http://localhost:3000/api/v1/employees/payroll/calculate-month \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "month": "2026-05",
    "applyImmediately": true
  }'
# Auto: base + bonus(2% of sales) - fines - advances = finalSalary
```

### 10. Export Excel Report

```bash
curl "http://localhost:3000/api/v1/reports/export/excel?from=2026-05-01&to=2026-05-31" \
  -H "Authorization: Bearer TOKEN" \
  -o chocoberry-may-2026.xlsx
```

---

## Business Logic Summary

| Rule | Implementation |
|------|---------------|
| Money | `Decimal.js` — never `number`/`float` for TJS |
| All DB writes | `prisma.$transaction()` — atomic |
| Stock floor | `ConflictException` if stock < 0 |
| Sale BOM | Auto-deducts every ingredient on sale |
| Supplier purchase | Auto: avgCost recalc, price history, cup forecast |
| Cleaning | OUT(raw) + IN(cleaned) = loss tracked |
| Payroll | base + bonus% of monthSales − fines − advances |
| Charity | MAX(0, income − expenses − remaining) |
| MIXED payment | cashAmount + cardAmount must equal total |

---

## Project Structure

```
src/
├── main.ts                    # Bootstrap, Swagger, CORS, global pipes
├── app.module.ts              # Root module
├── prisma/prisma.service.ts   # DB client
├── config/configuration.ts   # Typed env config
├── common/                    # Guards, filters, interceptors, utils
└── modules/
    ├── auth/                  # JWT auth
    ├── business/              # Setup + dashboard
    ├── suppliers/             # Purchases + price history + forecast
    ├── products/              # BOM recipes
    ├── inventory/             # Stock + cleaning + waste
    ├── sales/                 # POS + auto-deduction
    ├── expenses/              # All expense types
    ├── employees/             # Payroll + fines + shifts
    ├── cashbox/               # Cash register
    ├── funds/                 # Charity, reserve, renovation
    ├── daily-report/          # Daily P&L summary
    └── reports/               # Analytics + Excel/PDF export
```
