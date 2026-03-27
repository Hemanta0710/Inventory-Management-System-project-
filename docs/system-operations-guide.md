# System Operations Guide

This guide shows how to add data, run sales flow, and manage reports.

## 1. Start the system

1. Start infrastructure from workspace root:
   - `docker compose up -d`
2. Start backend:
   - `cd backend`
   - `mvn spring-boot:run`
3. Start frontend:
   - `cd frontend`
   - `npm run dev`

## 2. Login

1. Open `http://localhost:3000/login`
2. Default credentials:
   - Manager: `admin` / `admin123` -> opens manager dashboard (`/`)
   - Employee: `employee` / `employee123` -> opens employee dashboard (`/cart`)
3. Optional env vars for custom credentials:
   - `IMS_MANAGER_USER`, `IMS_MANAGER_PASSWORD`
   - `IMS_EMPLOYEE_USER`, `IMS_EMPLOYEE_PASSWORD`

## 3. Add products (manager dashboard)

1. Open dashboard at `http://localhost:3000/`
2. In **Quick Add Product**, fill:
   - SKU
   - Product name
   - Quantity
   - Reorder level
   - Unit price
   - Image URL (optional, `http://`, `https://`, or local `/images/...`)
3. Click **Add Product**
4. Use **Live Product Ledger** to:
   - Search by SKU/name
   - Edit rows
   - Delete rows

## 4. Employee shopping and billing

1. Open employee workspace from dashboard (**Open Employee Cart**)
2. Create a cart with employee name
3. Click item pictures to select products
4. Set quantity and click **Add Item**
5. Click **Reserve Stock**
6. In **Checkout and Billing**:
   - Select payment method (Cash/Card/UPI)
   - Enter amount tendered
   - Click **Complete Payment**
7. System generates bill with:
   - Bill number
   - Item lines
   - Subtotal, tax, grand total
   - Paid amount and change

## 5. Manager reports

1. On dashboard, open **Sales Reports**
2. Switch report period:
   - Daily
   - Weekly
   - Monthly
3. Review:
   - Orders count
   - Units sold
   - Revenue trend bars
4. Use **Sales by Product** for product-level performance

## 6. Data management tips

1. Keep SKU unique and consistent (example: `RICE-5KG-001`)
2. Set reorder level based on expected demand
3. Use reserve + checkout flow to keep sales reports accurate
4. Review low stock alerts every day
5. Use weekly/monthly reports for procurement planning

## 7. Add new inventory item directly in database (PostgreSQL)

1. Open psql shell in the running database container:
    - `docker compose exec -it postgres psql -U postgres -d ims`
2. Insert a product row:

```sql
INSERT INTO products (sku, name, quantity, reorder_level, unit_price, image_url)
VALUES (
   'RICE-5KG-001',
   'Rice Bag 5kg',
   120,
   30,
   450.00,
   'https://images.unsplash.com/photo-1586201375761-83865001e31c'
);
```

3. Verify inserted data:

```sql
SELECT id, sku, name, quantity, reorder_level, unit_price, image_url
FROM products
ORDER BY id DESC
LIMIT 20;
```

4. If product already exists, update it:

```sql
UPDATE products
SET quantity = 200,
      reorder_level = 40,
      unit_price = 470.00,
      image_url = 'https://images.unsplash.com/photo-1586201375761-83865001e31c',
      updated_at = NOW()
WHERE sku = 'RICE-5KG-001';
```
