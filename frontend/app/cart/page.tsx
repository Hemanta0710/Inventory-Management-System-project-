"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";

type Product = {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  unitPrice: number;
  imageUrl?: string | null;
};

type CartItem = {
  id: number;
  productId: number;
  quantity: number;
  unitPrice: number;
};

type CartDetails = {
  cartId: number;
  employeeName: string;
  status: string;
  items: CartItem[];
  total: number;
};

type BillLine = {
  productId: number;
  sku: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

type BillResponse = {
  billNumber: string;
  cartId: number;
  employeeName: string;
  paymentMethod: string;
  lines: BillLine[];
  subtotal: number;
  tax: number;
  grandTotal: number;
  amountTendered: number;
  change: number;
  paidAt: string;
};

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
const productImageSources = [
  "/images/item-box.svg",
  "/images/item-can.svg",
  "/images/item-bag.svg",
  "/images/item-bottle.svg"
];

export default function CartPage() {
  const [employeeName, setEmployeeName] = useState("Employee 1");
  const [cart, setCart] = useState<CartDetails | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [message, setMessage] = useState<string>("");
  const [messageTone, setMessageTone] = useState<"neutral" | "success" | "error">("neutral");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [amountTendered, setAmountTendered] = useState<number>(0);
  const [bill, setBill] = useState<BillResponse | null>(null);

  useEffect(() => {
    void loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const response = await fetch(`${baseUrl}/api/products`);
      if (!response.ok) {
        setProducts([]);
        return;
      }

      const data = await response.json();
      setProducts(data);
      if (data.length > 0 && selectedProductId === 0) {
        setSelectedProductId(data[0].id);
      }
    } catch {
      setProducts([]);
    }
  };

  const createCart = async (event: FormEvent) => {
    event.preventDefault();
    setMessage("");
    setMessageTone("neutral");
    const response = await fetch(`${baseUrl}/api/carts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeName })
    });

    if (!response.ok) {
      setMessage("Failed to create cart.");
      setMessageTone("error");
      return;
    }

    const data = await response.json();
    setCart(data);
    setBill(null);
    await loadProducts();
    setMessage(`Cart #${data.cartId} created.`);
    setMessageTone("success");
  };

  const addItem = async (event: FormEvent) => {
    event.preventDefault();
    if (!cart || selectedProductId === 0) {
      return;
    }

    setMessage("");
    setMessageTone("neutral");
    const response = await fetch(`${baseUrl}/api/carts/${cart.cartId}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: selectedProductId, quantity })
    });

    if (!response.ok) {
      const text = await response.text();
      setMessage(`Failed to add item. ${text}`);
      setMessageTone("error");
      return;
    }

    const data = await response.json();
    setCart(data);
    setAmountTendered(Number(data.total));
    setMessage("Item added.");
    setMessageTone("success");
  };

  const reserveCart = async () => {
    if (!cart) {
      return;
    }

    setMessage("");
    setMessageTone("neutral");
    const response = await fetch(`${baseUrl}/api/carts/${cart.cartId}/reserve`, {
      method: "POST"
    });

    if (!response.ok) {
      const text = await response.text();
      setMessage(`Reserve failed. ${text}`);
      setMessageTone("error");
      return;
    }

    const data = await response.json();
    setCart(data);
    await loadProducts();
    setAmountTendered(Number((Number(data.total) * 1.1).toFixed(2)));
    setMessage("Cart reserved and stock updated.");
    setMessageTone("success");
  };

  const checkoutCart = async () => {
    if (!cart) {
      return;
    }

    setMessage("");
    setMessageTone("neutral");
    const response = await fetch(`${baseUrl}/api/carts/${cart.cartId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethod, amountTendered })
    });

    if (!response.ok) {
      const text = await response.text();
      setMessage(`Checkout failed. ${text}`);
      setMessageTone("error");
      return;
    }

    const data: BillResponse = await response.json();
    setBill(data);
    setCart((previous) => (previous ? { ...previous, status: "COMPLETED" } : previous));
    setMessage(`Payment successful. Bill ${data.billNumber} generated.`);
    setMessageTone("success");
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const productNameById = new Map(products.map((product) => [product.id, product.name]));
  const selectedProduct = products.find((product) => product.id === selectedProductId) ?? null;
  const totalItems = cart ? cart.items.reduce((sum, item) => sum + item.quantity, 0) : 0;

  const getProductImage = (product: Product) => {
    if (product.imageUrl && product.imageUrl.trim().length > 0) {
      return product.imageUrl;
    }
    const productId = product.id;
    const index = productId % productImageSources.length;
    return productImageSources[index];
  };

  return (
    <main className="page">
      <section className="hero hero-cart">
        <div className="hero-copy-wrap">
          <p className="eyebrow">Floor Operations</p>
          <h1>Employee Cart Workspace</h1>
          <p className="hero-copy">Create a cart, add stock items, and reserve inventory for pickup.</p>
          <div className="quick-guide">
            <span>1. Create Cart</span>
            <span>2. Add Items</span>
            <span>3. Reserve Stock</span>
          </div>
        </div>
        <div className="hero-actions">
          <a href="/" className="button-link ghost">Back to Dashboard</a>
          <button className="button-link ghost" type="button" onClick={() => void logout()}>
            Logout
          </button>
        </div>
      </section>

      <section className="panel employee-visual-panel">
        <div className="employee-visual-content">
          <div className="employee-visual-copy">
            <h2>Today on the Floor</h2>
            <p>Use this workstation to prepare customer pickups fast and avoid stock conflicts.</p>
            <div className="cart-kpi-grid">
              <article className="stat-card">
                <p className="stat-label">Cart Status</p>
                <p className="stat-value small">{cart ? cart.status : "No Cart"}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Items in Cart</p>
                <p className="stat-value small">{totalItems}</p>
              </article>
              <article className="stat-card">
                <p className="stat-label">Available Products</p>
                <p className="stat-value small">{products.length}</p>
              </article>
            </div>
          </div>
          <div className="employee-visual-media">
            <Image
              src="/images/employee-cart.svg"
              alt="Illustration of employee cart workflow"
              width={960}
              height={640}
              priority
            />
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Create Cart</h2>
          <p>Start a fresh cart for a store employee.</p>
        </div>
        <form className="form-row" onSubmit={createCart}>
          <input
            value={employeeName}
            onChange={(e) => setEmployeeName(e.target.value)}
            placeholder="Employee name"
            required
          />
          <button type="submit">Create</button>
        </form>
      </section>

      {cart && (
        <section className="panel">
          <div className="panel-head">
            <h2>Cart #{cart.cartId}</h2>
            <p>Status: <strong>{cart.status}</strong></p>
          </div>

          <div className="panel-head compact">
            <h3>Select Item by Picture</h3>
            <p>Tap a product card, set quantity, then add to cart.</p>
          </div>

          <div className="product-picker-grid" role="listbox" aria-label="Pick product">
            {products.map((product) => {
              const selected = selectedProductId === product.id;
              return (
                <button
                  key={product.id}
                  type="button"
                  className={`product-tile ${selected ? "selected" : ""}`}
                  onClick={() => setSelectedProductId(product.id)}
                  disabled={product.quantity === 0}
                >
                  <Image
                    src={getProductImage(product)}
                    alt={`${product.name} product image`}
                    width={420}
                    height={280}
                  />
                  <div className="product-tile-body">
                    <p className="product-tile-name">{product.name}</p>
                    <p className="product-tile-meta">{product.sku} | Stock: {product.quantity}</p>
                    <p className="product-tile-meta">Unit: {product.unitPrice}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <form className="form-row item-add-row" onSubmit={addItem}>
            <div className="selected-item-box">
              <p className="stat-label">Selected Item</p>
              <p>{selectedProduct ? `${selectedProduct.name} (${selectedProduct.sku})` : "Select an item card"}</p>
            </div>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              required
            />
            <div className="qty-stepper" aria-label="Quantity controls">
              <button type="button" className="small-btn light" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>-</button>
              <button type="button" className="small-btn light" onClick={() => setQuantity((q) => q + 1)}>+</button>
            </div>
            <button type="submit" disabled={products.length === 0 || selectedProductId === 0}>Add Item</button>
          </form>

          {cart.items.length === 0 ? (
            <p className="empty">No items added yet.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                  </tr>
                </thead>
                <tbody>
                  {cart.items.map((item) => (
                    <tr key={item.id}>
                      <td>{productNameById.get(item.productId) ?? `ID ${item.productId}`}</td>
                      <td>{item.quantity}</td>
                      <td>{item.unitPrice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p className="total-line"><strong>Total: </strong>{cart.total}</p>
          <button className="reserve-btn" type="button" onClick={reserveCart} disabled={cart.status !== "DRAFT"}>
            Reserve Stock
          </button>

          {cart.status === "RESERVED" && (
            <div className="payment-box">
              <div className="panel-head compact">
                <h3>Checkout and Billing</h3>
                <p>Take payment and generate final bill.</p>
              </div>
              <div className="payment-grid">
                <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="UPI">UPI</option>
                </select>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={amountTendered}
                  onChange={(event) => setAmountTendered(Number(event.target.value))}
                  placeholder="Amount tendered"
                />
                <button type="button" onClick={checkoutCart}>Complete Payment</button>
              </div>
            </div>
          )}

          {bill && (
            <div className="bill-panel">
              <div className="panel-head compact">
                <h3>Bill {bill.billNumber}</h3>
                <p>Paid at {new Date(bill.paidAt).toLocaleString()}</p>
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Qty</th>
                      <th>Unit</th>
                      <th>Line Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bill.lines.map((line) => (
                      <tr key={`${line.productId}-${line.sku}`}>
                        <td>{line.productName} ({line.sku})</td>
                        <td>{line.quantity}</td>
                        <td>{line.unitPrice}</td>
                        <td>{line.lineTotal}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="bill-total">Subtotal: {bill.subtotal}</p>
              <p className="bill-total">Tax: {bill.tax}</p>
              <p className="bill-total"><strong>Grand Total: {bill.grandTotal}</strong></p>
              <p className="bill-total">Paid: {bill.amountTendered} | Change: {bill.change}</p>
            </div>
          )}
        </section>
      )}

      {message && (
        <section className={`panel panel-message ${messageTone}`}>
          <p>{message}</p>
        </section>
      )}
    </main>
  );
}
