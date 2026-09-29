# Purple Yam Automated Inventory Management System (AIMS)

> **Purple Yam AIMS** is a web-based inventory management system developed for **Purple Yam**, a multi-branch bakery business. The system centralizes inventory monitoring, stock movement, production, transfers, replenishment alerts, reporting, user management, and audit history across the business's commissary and branch locations.

**Project:** Purple Yam Automated Inventory Management System (AIMS)  
**Implementation:** Version 1.0  
**Repository:** [jannahnah/purple-yam-aims](https://github.com/jannahnah/purple-yam-aims)  
**Current status:** Active development  
**Primary deployment:** Vercel  
**Primary database:** PostgreSQL

---

## 1. Project Overview

Purple Yam AIMS was designed to replace fragmented or manually maintained inventory processes with a centralized, role-aware, auditable web application.

The system is intended for a business structure with a **main/commissary location** and multiple branches:

- **Butuan/Main Branch (Commissary)**
- **Libertad**
- **Cabadbaran**
- **San Francisco**

The application provides one operational source of inventory information while preserving branch-level responsibilities and access.

### Main goals

1. Centralize inventory data across all Purple Yam locations.
2. Track stock quantities and stock movements accurately.
3. Support production and finished-product inventory.
4. Record transfers between locations.
5. Identify items that reach or fall below configured thresholds.
6. Provide role-based dashboards and actions.
7. Preserve transaction and audit history for accountability.
8. Make inventory information easier to review for daily operations and management decisions.
9. Support future expansion without replacing the underlying architecture.

---

## 2. Business Context

Purple Yam handles different categories of inventory that move through the business in different ways.

### Inventory sources

**Commissary-supplied items**
- Materials prepared or supplied by the main/commissary location.
- Examples include dry and wet premixes.

**Branch-sourced items**
- Materials independently sourced or maintained by branches.
- Examples include milk, eggs, cornstarch, cream cheese, and packaging.

**Finished products**
- Products produced for sale and tracked as finished inventory.
- Finished products may have size classifications such as Small, Round, Medium, and Large.

### Operational model

The system recognizes that not every inventory item follows the same replenishment process. Replenishment and pickup quantities are therefore treated as business rules rather than arbitrary application defaults.

Actual operational quantities are intended to come from approved business records and audited inventory workflows instead of being fabricated by database seed data.

---

## 3. System Users and Roles

Purple Yam AIMS uses role-based access control with three primary roles:

| Role | Primary responsibility |
|---|---|
| **Owner** | Business-wide oversight, branch monitoring, user management, inventory visibility, reports, and administrative controls |
| **Branch Manager** | Manage and monitor inventory and operations for an assigned branch |
| **Cashier / Staff** | Perform permitted day-to-day inventory and transaction activities within assigned access |

Users are associated with the Purple Yam business and may be assigned to a specific branch.

The underlying data model also supports:
- Active/inactive user status
- Required password change state
- Last-login tracking
- User audit history
- Performed-by relationships for accountability

---

## 4. Core System Modules

### Authentication and Access
- User authentication
- Role-aware access
- Branch-aware access
- Password management foundation
- Required password-change handling for configured users
- Session/account controls

### Dashboard
Dashboards provide summarized operational information appropriate to the logged-in role.

Typical dashboard information includes:
- Total items
- Low-stock items
- Out-of-stock items
- Active reorder alerts
- Recent branch activity
- Inventory summaries
- Production-related information
- Branch-level or business-level inventory visibility

### Inventory
The inventory module provides:
- Current inventory by branch
- Item creation and maintenance
- Item source classification
- Inventory quantity adjustments
- Inventory history
- Branch stock tracking
- Active/inactive item handling
- Inventory categories and units
- Pagination and responsive views for large inventories

Inventory changes preserve a clear quantity history:

**Previous Quantity -> Change / Adjustment -> New Quantity**

This makes stock movement easier to audit than showing only the final quantity.

### Sales
Sales transactions reduce inventory according to recorded sales activity and remain part of the transaction history.

### Production
Production records support finished-product workflows and can connect finished products with ingredient requirements through production recipes.

### Transfers
The system supports stock movement between branches through paired transfer transactions:
- `TRANSFER_OUT`
- `TRANSFER_IN`

Transfers can be associated using a shared transfer identifier and may reference the destination/source branch.

### Replenishment / Reorder Alerts
The system can flag inventory that reaches a configured minimum threshold.

Alerts include:
- Pending status
- Resolved status
- Branch association
- Item association
- Created/updated timestamps

### Reports
Reports provide management and operational visibility into inventory activity and business records.

The reporting layer is designed to build from the same transactional source of truth used by inventory operations.

### User Management
Administrative user management includes:
- User creation
- Role assignment
- Branch assignment
- Active/inactive status
- Account details
- User audit history

### Audit and Transaction History
The system records operational history for traceability.

Inventory transaction records can contain:
- Transaction type
- Branch
- Item
- Quantity change
- Previous quantity
- New quantity
- User responsible
- Transfer identifier
- Related branch
- Timestamp

The system also contains dedicated audit logging for item and user changes.

### Account Settings
Account-related functions are separated from operational inventory management to keep administrative and business workflows organized.

---

## 5. Technical Architecture

Purple Yam AIMS follows a modern full-stack web architecture built around the Next.js application framework.

### Frontend
- **Next.js 16**
- **React 19**
- **TypeScript 5.9**
- **Tailwind CSS 4**
- Responsive UI for desktop and mobile layouts
- Reusable application components
- Role-specific dashboards and workflows

The application uses a structured `src/app` and `src/components` organization, with shared application logic under `src/lib`.

### Backend / Application Layer
The system uses Next.js application capabilities for server-side application behavior and API-style interactions.

Business operations are connected to the PostgreSQL database through Prisma.

### ORM / Data Access
- **Prisma**
- Prisma Client
- Prisma migrations
- Prisma seed workflow

Prisma provides typed access to the application data model and maintains schema evolution through versioned migrations.

### Database
- **PostgreSQL**
- Database connection through the `DATABASE_URL` environment variable

The database is designed around relational entities for users, branches, business records, items, stock, transactions, recipes, alerts, and audit logs.

### Styling / Build
- Tailwind CSS 4
- PostCSS
- ESLint
- TypeScript strict checking

### Spreadsheet Import
The project includes **SheetJS/XLSX** support for spreadsheet-based inventory import workflows.

The inventory import process is intended to:
- Recognize approved branch sheets
- Map branch records to the system's branch structure
- Use approved physical-count fields as inventory quantities
- Reject unknown items rather than silently creating invalid inventory records

---

## 6. Database Design

The Prisma schema currently includes the following main models.

### Business
Represents the business organization and provides a parent relationship for branches, items, and users.

### User
Stores:
- Username
- Name
- Email
- Password hash
- Role
- Status
- Branch assignment
- Business assignment
- Password-change requirement
- Last-login timestamp

### Branch
Stores:
- Branch name
- Location
- Commissary designation
- Business relationship

### Item
Stores:
- Item name
- Source type
- Category
- Finished-product size
- Unit
- Minimum threshold
- Active/inactive status
- Business relationship

### BranchStock
Stores current quantity for an item at a specific branch. Each branch/item combination is unique.

### ProductionRecipe
Maps ingredients to finished products and stores the required ingredient quantity.

### StockTransaction
Represents inventory movement such as:
- Sale
- Production
- Stock receipt
- Adjustment
- Transfer in
- Transfer out

It also preserves previous and new quantity values for better traceability.

### ReorderAlert
Represents threshold-based inventory alerts.

### UserAuditLog
Records changes performed on user accounts, including previous/current values where applicable.

### ItemAuditLog
Records changes to item master data and identifies the user who performed the change.

---

## 7. Inventory Transaction Model

Purple Yam AIMS treats inventory as an auditable sequence of state changes rather than a single editable number.

```text
Previous Quantity
        +
   Quantity Delta
        =
   New Quantity
```

Example:

```text
Previous Quantity: 25
Adjustment:        -3
New Quantity:      22
```

This model makes it possible to determine:
- What changed
- How much changed
- Who performed it
- When it happened
- What the quantity was before the action
- What the quantity became after the action

This is especially important for manual adjustments, sales, production, stock receipts, and transfers.

---

## 8. Development Methodology and Planning Approach

The Purple Yam AIMS project follows the **Agile Software Development Methodology**, using an **iterative and incremental development approach**.

The project is not based on a strict Waterfall process because requirements, design, implementation, testing, and refinement are not performed as one-way sequential phases. Instead, the system is developed progressively, with completed features being reviewed, tested, corrected, and improved as development continues.

The project also does **not** claim strict Scrum implementation. While Agile principles guide the development process, the team does not rely on formal Scrum requirements such as fixed sprint cycles, defined Scrum roles, daily Scrum meetings, sprint reviews, or sprint retrospectives.

### Why Agile fits the project

The development process involves repeated cycles of:

1. **Requirements Analysis** — Identify the business need and understand the relevant PRD requirements.
2. **Planning** — Determine the feature, data, UI, and technical changes required.
3. **Design** — Plan the database structure, application flow, and user interface.
4. **Implementation** — Develop the backend logic, database changes, APIs, and UI.
5. **Testing** — Verify functionality, data behavior, permissions, and responsive layouts.
6. **Evaluation and Feedback** — Review the implemented feature against the intended workflow and visual reference.
7. **Refinement** — Correct issues, improve usability, and adjust the implementation when requirements or findings require changes.
8. **Integration and Deployment** — Commit changes through Git, integrate completed work, and verify the deployed application.

This cycle is repeated for different system modules rather than completing the entire system in one uninterrupted sequence.

### Iterative and incremental development

The system is developed **incrementally**, with functionality added module by module, such as:

- Authentication and role-aware access
- Dashboard functionality
- Inventory management
- Inventory transaction history
- Sales
- Production
- Transfers
- Reorder alerts
- Reports
- User management
- Audit logging
- Responsive desktop and mobile interfaces

Each increment can be tested and refined before additional functionality is built around it.

The approach also allows feedback from development and system evaluation to influence subsequent iterations. For example, inventory history requirements led to clearer **Previous Quantity -> Change / Adjustment -> New Quantity** information, while responsive testing led to refinements in dashboard cards, spacing, controls, and mobile layouts.

### Source of truth

The **FINAL_Purple_Yam_AIMS_Technical_PRD.docx (v1.0, September 2026)** is the primary technical source of truth for the system.

The PRD governs:

- Business rules
- Roles and permissions
- Backend behavior
- Data model
- Acceptance criteria
- Operational workflows

The Figma prototype is used as a **UI and visual reference**. It does not override the approved backend behavior, business rules, permissions, data model, or acceptance criteria defined by the PRD.

### Methodology summary

In capstone documentation, the methodology can be described as:

> **Agile Software Development Methodology using an iterative and incremental development approach.**

This description reflects the actual development process without incorrectly labeling the project as a formal Scrum implementation.

---

## 9. Git and Team Development

The repository is maintained in GitHub and uses feature-based development.

### General workflow

```text
main
 |
 +-- feature/<work-item>
 |
 +-- feature/<work-item>
```

Typical development steps:

```bash
git pull
git checkout -b feature/<name>

# implement and test changes

git add .
git commit -m "Describe the change"
git push -u origin feature/<name>
```

Changes can then be reviewed and merged into the main branch.

### Repository
- GitHub: `https://github.com/jannahnah/purple-yam-aims`
- Default branch: `main`

---

## 10. Local Development Setup

### Requirements
- Node.js
- npm
- PostgreSQL
- Git
- A code editor such as VS Code

### Install dependencies

```bash
npm install
```

### Configure environment variables

Create an environment file containing the PostgreSQL connection string:

```env
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
```

Do not commit database credentials or other secrets to GitHub.

### Prisma setup

Validate the Prisma schema:

```bash
npx prisma validate
```

Apply database migrations:

```bash
npx prisma migrate dev
```

Generate Prisma Client:

```bash
npx prisma generate
```

Seed/bootstrap configured reference data when needed:

```bash
npx prisma db seed
```

The current seed strategy intentionally avoids inventing operational inventory quantities and is designed to preserve existing operational records when the default data already exists.

### Start the development server

```bash
npm run dev
```

Open `http://localhost:3000`.

### Build for production

```bash
npm run build
npm run start
```

### Lint

```bash
npm run lint
```

---

## 11. Deployment

Purple Yam AIMS is designed for deployment on **Vercel**.

The deployment model is:

```text
GitHub Repository
       |
       v
   Vercel Build
       |
       v
 Next.js Application
       |
       v
 PostgreSQL Database
```

The production application uses environment variables configured in the hosting environment rather than storing secrets in the repository.

The current public deployment used during development/testing is:

**https://purple-yam-aims.vercel.app/**

---

## 12. Responsive Design

The application is being designed for both desktop and mobile use.

### Desktop priorities
- Efficient multi-column dashboards
- Branch-level inventory tables
- Management summaries
- Reports
- Administrative workflows

### Mobile priorities
- Compact dashboard summary cards
- Responsive navigation
- Smaller action controls
- Readable inventory tables
- Touch-friendly controls
- Preservation of information hierarchy without excessive spacing

Responsive UI changes should improve presentation without changing the underlying PRD-defined behavior.

---

## 13. Security and Data Integrity

Security and integrity are treated as application requirements, not optional UI features.

Current design considerations include:
- Password hashing
- Role-based authorization
- Branch-based user assignment
- User status controls
- Audit logging
- Transaction history
- Explicit item status
- Referential relationships between operational records
- Database migrations for controlled schema evolution
- Environment-based database credentials

Operational quantities should be changed through controlled workflows so that the corresponding transaction history remains available.

---

## 14. Data Initialization and Inventory Import

The system distinguishes between **reference/master data** and **operational inventory data**.

### Reference/master data
- Business
- Branches
- Users
- Item definitions
- Categories
- Units

### Operational data
- Current branch stock
- Sales
- Production
- Transfers
- Adjustments
- Stock receipts
- Reorder alerts

The seed process creates or updates safe default/reference records but intentionally does not fabricate real inventory quantities.

Actual physical inventory is expected to enter through the appropriate inventory/import workflow.

---

## 15. Current Data Model Enumerations

### User roles
```text
OWNER
BRANCH_MANAGER
CASHIER
```

### Item source types
```text
COMMISSARY_SUPPLIED
BRANCH_SOURCED
FINISHED_PRODUCT
```

### Item categories
```text
RAW_MATERIAL
PACKAGING
```

### Finished-product sizes
```text
SMALL
ROUND
MEDIUM
LARGE
```

### Transaction types
```text
SALE
PRODUCTION
STOCK_RECEIPT
ADJUSTMENT
TRANSFER_IN
TRANSFER_OUT
```

### Alert status
```text
PENDING
RESOLVED
```

### User status
```text
ACTIVE
INACTIVE
```

---

## 16. Project Structure

The repository follows a Next.js application structure centered on the `src` directory.

A simplified view:

```text
purple-yam-aims/
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── purple-yam-logo.jpg
│   ├── purple-yam-favicon.svg
│   └── ...
├── src/
│   ├── app/
│   ├── components/
│   └── lib/
├── package.json
├── next.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── README.md
```

---

## 17. Technology Stack

| Layer | Technology |
|---|---|
| Application Framework | Next.js 16 |
| UI Library | React 19 |
| Language | TypeScript 5.9 |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication Support | bcryptjs + application auth layer |
| Spreadsheet Processing | SheetJS / XLSX |
| Linting | ESLint 9 |
| Build / Hosting | Vercel |
| Source Control | Git + GitHub |
| Development Environment | VS Code |

---

## 18. Design and UX Principles

### Clarity
Information should be understandable at a glance, especially inventory quantities and alerts.

### Traceability
Inventory changes should remain connected to the responsible user and transaction.

### Role awareness
Users should see and perform actions appropriate to their responsibilities.

### Consistency
Common controls, statuses, terminology, and data presentations should behave consistently throughout the application.

### Responsive usability
The interface must remain functional and readable across desktop and smartphone layouts.

### Business-rule alignment
The UI and backend should represent the actual Purple Yam workflow rather than introduce assumptions that are not supported by the approved requirements.

---

## 19. Current Development Focus

The project is currently in active implementation and refinement.

Recent development areas include:
- Responsive dashboard layouts
- Compact mobile summary cards
- Desktop spacing and balance
- Inventory interface improvements
- Inventory pagination
- Transaction quantity history
- Audit logging
- Finished-product sizing
- Item active/inactive state
- Branch and transfer workflows
- Reorder alert behavior
- Deployment configuration and verification

Features that are intentionally deferred should be reintroduced only when their requirements and implementation scope are ready.

---

## 20. Future Development Areas

Potential future work includes:
- Additional reporting and export capabilities
- More complete production workflow configuration
- Expanded inventory reconciliation tooling
- Improved notification mechanisms
- Additional account recovery features
- Broader analytics and management reporting
- More comprehensive automated testing
- Further performance and accessibility improvements
- Production hardening and operational monitoring

Future changes should continue to follow the PRD and existing business rules unless those requirements are deliberately revised.

---

## 21. Project Philosophy

Purple Yam AIMS is more than a collection of inventory screens. The system is being built as an operational platform where:

```text
Business Process
      ↓
System Requirement
      ↓
Data Model
      ↓
Application Logic
      ↓
User Interface
      ↓
Audited Operational Record
```

The goal is to make the system dependable enough that inventory information can be traced from a real business activity to the resulting database record and user action.

---

## 22. Project Status

**Status: Active Development**

The repository contains an implemented Next.js/React application, Prisma/PostgreSQL data model, migrations, seed/bootstrap logic, role-aware business structures, inventory transaction history, transfer support, reorder alerts, and audit logging.

The application is being continuously refined toward the final implementation defined by the technical PRD.

---

## 23. Documentation References

Primary project references should be maintained alongside the implementation:

- **Final Technical PRD:** `FINAL_Purple_Yam_AIMS_Technical_PRD.docx`
- **UI / visual reference:** Figma prototype
- **Source code:** this repository
- **Database definition:** `prisma/schema.prisma`
- **Database history:** `prisma/migrations/`
- **Reference data initialization:** `prisma/seed.ts`

When documentation, prototype visuals, and implementation appear to conflict, the approved technical requirements and business rules take precedence for system behavior.

---

## 24. License / Academic Project Note

Purple Yam AIMS is a capstone project developed for the Purple Yam business context. Its implementation, business rules, data structures, and documentation are intended for the project's authorized development and evaluation purposes.

---

**Purple Yam AIMS — Automated Inventory Management System**  
*Centralized inventory. Traceable transactions. Branch-aware operations.*