# Inventory Management System Handbook

This document explains:
- What the system can do
- How the system works end to end
- How to add new APIs safely and quickly

## 1) What the system can do

### Core inventory
- Create products
- List products
- Update products
- Delete products
- Track stock quantity and reorder level

### Alerts
- Detect low stock items
- Show severity based on stock deficit

### Employee cart and checkout
- Create employee cart
- Add item to cart
- Reserve stock from inventory
- Complete checkout with payment method
- Generate bill with subtotal, tax, total, paid amount, and change

### Manager analytics
- Sales by product chart
- Sales reports by period:
  - Daily
  - Weekly
  - Monthly

### Authentication
- Login page with session cookie
- Protected manager and cart routes
- Logout

## 2) How everything works (end-to-end flow)

### Product lifecycle
1. Manager adds products from dashboard
2. Product data is stored in products table
3. Employee selects products in cart flow
4. Reserve step validates stock and deducts quantity
5. Checkout step marks cart completed and generates bill
6. Completed carts are used by report APIs

### Cart lifecycle
- DRAFT: cart is open, items can be added
- RESERVED: stock has been reserved
- COMPLETED: payment is done and bill generated

### Reporting lifecycle
- Report APIs use COMPLETED carts only
- Daily, weekly, monthly buckets are generated in backend
- Frontend reads report APIs and renders chart bars

## 3) Current API map

### Product APIs
- GET /api/products
- POST /api/products
- PUT /api/products/{productId}
- DELETE /api/products/{productId}

### Alert APIs
- GET /api/alerts/low-stock?limit=10

### Cart and payment APIs
- POST /api/carts
- GET /api/carts/{cartId}
- POST /api/carts/{cartId}/items
- POST /api/carts/{cartId}/reserve
- POST /api/carts/{cartId}/checkout

### Analytics APIs
- GET /api/analytics/sales-by-product?limit=8
- GET /api/analytics/sales-report?period=daily
- GET /api/analytics/sales-report?period=weekly
- GET /api/analytics/sales-report?period=monthly

## 4) How to add a new API in this project

Use this checklist every time.

### Step A: Decide API contract
- Endpoint path
- Method (GET, POST, PUT, DELETE)
- Request shape
- Response shape
- Validation rules

### Step B: Add service logic first
Location pattern:
- backend/src/main/java/com/inventory/ims/<domain>/<Domain>Service.java

What to do:
- Add a new service method for business logic
- Keep transactional rules here
- Throw clear errors for invalid states

### Step C: Add or update repository query
Location pattern:
- backend/src/main/java/com/inventory/ims/<domain>/<Domain>Repository.java

What to do:
- Add query methods needed by service
- Prefer focused methods over loading all rows

### Step D: Expose controller endpoint
Location pattern:
- backend/src/main/java/com/inventory/ims/<domain>/<Domain>Controller.java

What to do:
- Add endpoint annotation and method
- Use request records with validation annotations
- Call service method and return typed response

### Step E: Connect frontend
Location pattern:
- frontend/app/page.tsx or frontend/app/cart/page.tsx

What to do:
- Add fetch call
- Handle loading, success, and error states
- Update local UI state after response

### Step F: Validate and smoke test
- Check compile and editor errors
- Hit endpoint with real data
- Verify UI behavior for success and failure paths

## 5) Example pattern for adding API: "Cancel cart"

Goal:
- Add POST /api/carts/{cartId}/cancel

Implementation outline:
1. In CartService, add cancelCart(cartId)
   - Allow only DRAFT status
   - Set status to COMPLETED or a new CANCELED status if introduced
2. In CartController, add endpoint method
3. In frontend cart page, add Cancel button and call endpoint
4. Refresh cart state and show feedback message

## 6) Where to edit for each feature type

### New business rule
- Service class in backend domain package

### New DB query
- Repository interface for domain

### New endpoint
- Domain controller

### New dashboard widget
- frontend/app/page.tsx

### New employee workflow widget
- frontend/app/cart/page.tsx

### Shared styles
- frontend/app/globals.css

## 7) Common mistakes and how to avoid them

- Forgetting state transition checks
  - Always guard DRAFT, RESERVED, COMPLETED transitions in service

- Not validating request body
  - Add validation annotations and clear messages

- Using incomplete data for reports
  - Reports should use COMPLETED carts for true sales

- Frontend fetch without error handling
  - Always handle non-OK responses and show user-friendly feedback

## 8) Fast operating checklist (daily use)

1. Login
2. Add or update products
3. Employee creates carts and reserves stock
4. Employee completes checkout and bill
5. Manager checks daily report and sales-by-product
6. Manager reviews weekly or monthly trend before procurement

## 9) Recommended next improvements

- Add report export to CSV
- Add bill print and download PDF
- Add automated tests for checkout and reporting endpoints
