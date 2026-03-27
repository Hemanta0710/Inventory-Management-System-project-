"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  sku: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  unitPrice: number;
  imageUrl?: string | null;
};

type LowStockAlert = {
  productId: number;
  sku: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  deficit: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
};

type SalesByProduct = {
  productId: number;
  sku: string;
  name: string;
  unitsSold: number;
  revenue: number;
};

type SalesReportRow = {
  label: string;
  orderCount: number;
  revenue: number;
  unitsSold: number;
};

type ReportPeriod = "daily" | "weekly" | "monthly";

type ProductDraft = {
  sku: string;
  name: string;
  quantity: number;
  reorderLevel: number;
  unitPrice: number;
  imageUrl: string;
};

type FeedbackTone = "neutral" | "success" | "error";
type ProductField = keyof ProductDraft;
type FieldErrors = Partial<Record<ProductField, string>>;

const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";

const initialDraft: ProductDraft = {
  sku: "",
  name: "",
  quantity: 10,
  reorderLevel: 5,
  unitPrice: 100,
  imageUrl: ""
};

const services = [
  {
    title: "Inventory Service",
    description: "Lists and stores products with stock levels.",
    endpoint: "/api/products"
  },
  {
    title: "Alert Service",
    description: "Shows products that are below reorder threshold.",
    endpoint: "/api/alerts/low-stock"
  },
  {
    title: "Cart Service",
    description: "Creates employee carts and reserves stock.",
    endpoint: "/api/carts"
  }
];

const validateProductDraft = (draft: ProductDraft): FieldErrors => {
  const errors: FieldErrors = {};

  if (draft.sku.trim().length === 0) {
    errors.sku = "SKU is required.";
  }
  if (draft.name.trim().length === 0) {
    errors.name = "Product name is required.";
  }
  if (!Number.isFinite(draft.quantity) || draft.quantity < 0) {
    errors.quantity = "Quantity must be 0 or higher.";
  }
  if (!Number.isFinite(draft.reorderLevel) || draft.reorderLevel < 1) {
    errors.reorderLevel = "Reorder level must be at least 1.";
  }
  if (!Number.isFinite(draft.unitPrice) || draft.unitPrice < 0) {
    errors.unitPrice = "Unit price must be 0 or higher.";
  }
  if (draft.imageUrl.trim().length > 0) {
    const normalized = draft.imageUrl.trim();
    const isHttpUrl = normalized.startsWith("http://") || normalized.startsWith("https://");
    const isLocalPath = normalized.startsWith("/");
    if (!isHttpUrl && !isLocalPath) {
      errors.imageUrl = "Image URL must start with http://, https://, or /.";
    }
  }

  return errors;
};

const extractServerError = async (response: Response): Promise<string> => {
  const fallback = `Request failed (${response.status}).`;

  try {
    const payload = await response.json();
    if (typeof payload?.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }
    if (typeof payload?.error === "string" && payload.error.trim().length > 0) {
      return payload.error;
    }
    return fallback;
  } catch {
    try {
      const text = await response.text();
      return text.trim().length > 0 ? text : fallback;
    } catch {
      return fallback;
    }
  }
};

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [lowStockAlerts, setLowStockAlerts] = useState<LowStockAlert[]>([]);
  const [salesByProduct, setSalesByProduct] = useState<SalesByProduct[]>([]);
  const [salesReportRows, setSalesReportRows] = useState<SalesReportRow[]>([]);
  const [selectedReportPeriod, setSelectedReportPeriod] = useState<ReportPeriod>("daily");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [savingProductId, setSavingProductId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackTone, setFeedbackTone] = useState<FeedbackTone>("neutral");
  const [draft, setDraft] = useState<ProductDraft>(initialDraft);
  const [addErrors, setAddErrors] = useState<FieldErrors>({});
  const [search, setSearch] = useState("");
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<ProductDraft>(initialDraft);
  const [editErrors, setEditErrors] = useState<FieldErrors>({});

  const totalStock = useMemo(
    () => products.reduce((sum, product) => sum + product.quantity, 0),
    [products]
  );
  const criticalCount = useMemo(
    () => lowStockAlerts.filter((alert) => alert.severity === "CRITICAL").length,
    [lowStockAlerts]
  );
  const highCount = useMemo(
    () => lowStockAlerts.filter((alert) => alert.severity === "HIGH").length,
    [lowStockAlerts]
  );
  const maxUnitsSold = useMemo(
    () => salesByProduct.reduce((max, row) => Math.max(max, row.unitsSold), 0),
    [salesByProduct]
  );
  const maxReportRevenue = useMemo(
    () => salesReportRows.reduce((max, row) => Math.max(max, Number(row.revenue)), 0),
    [salesReportRows]
  );
  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (term.length === 0) {
      return products;
    }

    return products.filter(
      (product) =>
        product.sku.toLowerCase().includes(term) ||
        product.name.toLowerCase().includes(term)
    );
  }, [products, search]);

  const loadDashboard = async () => {
    setBusy(true);

    try {
      const [productsResponse, alertsResponse, salesResponse, reportResponse] = await Promise.all([
        fetch(`${baseUrl}/api/products`, { cache: "no-store" }),
        fetch(`${baseUrl}/api/alerts/low-stock?limit=10`, { cache: "no-store" }),
        fetch(`${baseUrl}/api/analytics/sales-by-product?limit=8`, { cache: "no-store" }),
        fetch(`${baseUrl}/api/analytics/sales-report?period=${selectedReportPeriod}`, { cache: "no-store" })
      ]);

      const nextProducts = productsResponse.ok ? await productsResponse.json() : [];
      const nextAlerts = alertsResponse.ok ? await alertsResponse.json() : [];
      const nextSales = salesResponse.ok ? await salesResponse.json() : [];
      const nextReport = reportResponse.ok ? await reportResponse.json() : [];

      setProducts(nextProducts);
      setLowStockAlerts(nextAlerts);
      setSalesByProduct(nextSales);
      setSalesReportRows(nextReport);
      setFeedback("");
      setFeedbackTone("neutral");
    } catch {
      setFeedback("Could not load dashboard data. Please check backend service.");
      setFeedbackTone("error");
    } finally {
      setBusy(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, [selectedReportPeriod]);

  const addProduct = async (event: FormEvent) => {
    event.preventDefault();
    setFeedback("");
    setFeedbackTone("neutral");

    const validationErrors = validateProductDraft(draft);
    setAddErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setFeedback("Please fix highlighted product fields.");
      setFeedbackTone("error");
      return;
    }

    try {
      const response = await fetch(`${baseUrl}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft)
      });

      if (!response.ok) {
        const errorText = await extractServerError(response);
        setFeedback(`Failed to add product. ${errorText}`);
        setFeedbackTone("error");
        return;
      }

      setFeedback(`Product ${draft.name} added.`);
      setFeedbackTone("success");
      setDraft((previous) => ({ ...initialDraft, sku: previous.sku }));
      setAddErrors({});
      await loadDashboard();
    } catch {
      setFeedback("Failed to add product. Please try again.");
      setFeedbackTone("error");
    }
  };

  const beginEdit = (product: Product) => {
    setEditingProductId(product.id);
    setEditingDraft({
      sku: product.sku,
      name: product.name,
      quantity: product.quantity,
      reorderLevel: product.reorderLevel,
      unitPrice: product.unitPrice,
      imageUrl: product.imageUrl ?? ""
    });
    setEditErrors({});
  };

  const cancelEdit = () => {
    setEditingProductId(null);
    setEditingDraft(initialDraft);
    setEditErrors({});
  };

  const saveEdit = async (productId: number) => {
    const validationErrors = validateProductDraft(editingDraft);
    setEditErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setFeedback("Please fix highlighted edit fields.");
      setFeedbackTone("error");
      return;
    }

    setSavingProductId(productId);
    setFeedback("");
    setFeedbackTone("neutral");

    try {
      const response = await fetch(`${baseUrl}/api/products/${productId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingDraft)
      });

      if (!response.ok) {
        const errorText = await extractServerError(response);
        setFeedback(`Failed to update product. ${errorText}`);
        setFeedbackTone("error");
        return;
      }

      setFeedback(`Product ${editingDraft.name} updated.`);
      setFeedbackTone("success");
      cancelEdit();
      await loadDashboard();
    } catch {
      setFeedback("Failed to update product. Please try again.");
      setFeedbackTone("error");
    } finally {
      setSavingProductId(null);
    }
  };

  const deleteProduct = async (product: Product) => {
    const confirmed = window.confirm(`Delete ${product.name} (${product.sku})?`);
    if (!confirmed) {
      return;
    }

    setSavingProductId(product.id);
    setFeedback("");
    setFeedbackTone("neutral");

    try {
      const response = await fetch(`${baseUrl}/api/products/${product.id}`, {
        method: "DELETE"
      });

      if (!response.ok) {
        const errorText = await extractServerError(response);
        setFeedback(`Failed to delete product. ${errorText}`);
        setFeedbackTone("error");
        return;
      }

      setFeedback(`Product ${product.name} deleted.`);
      setFeedbackTone("success");
      if (editingProductId === product.id) {
        cancelEdit();
      }
      await loadDashboard();
    } catch {
      setFeedback("Failed to delete product. Please try again.");
      setFeedbackTone("error");
    } finally {
      setSavingProductId(null);
    }
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <main className="page">
      <section className="hero hero-home">
        <div>
          <p className="eyebrow">Operations Console</p>
          <h1>Inventory, Simplified</h1>
          <p className="hero-copy">Add products quickly, monitor stock alerts, and use service links from one screen.</p>
        </div>
        <div className="hero-actions">
          <a href="/cart" className="button-link primary">Open Employee Cart</a>
          <button className="button-link ghost" type="button" onClick={() => void loadDashboard()} disabled={busy}>
            {busy ? "Refreshing..." : "Refresh Data"}
          </button>
          <button className="button-link ghost" type="button" onClick={() => void logout()}>
            Logout
          </button>
        </div>
      </section>

      <section className="stats-grid" aria-label="Inventory overview metrics">
        <article className="stat-card">
          <p className="stat-label">Products</p>
          <p className="stat-value">{products.length}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Total Units in Stock</p>
          <p className="stat-value">{totalStock}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">Critical Alerts</p>
          <p className="stat-value">{criticalCount}</p>
        </article>
        <article className="stat-card">
          <p className="stat-label">High Alerts</p>
          <p className="stat-value">{highCount}</p>
        </article>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Sales Reports</h2>
          <p>Period summaries for daily, weekly, and monthly manager reporting.</p>
        </div>
        <div className="report-period-tabs">
          <button
            type="button"
            className={`small-btn ${selectedReportPeriod === "daily" ? "active" : "light"}`}
            onClick={() => setSelectedReportPeriod("daily")}
          >
            Daily
          </button>
          <button
            type="button"
            className={`small-btn ${selectedReportPeriod === "weekly" ? "active" : "light"}`}
            onClick={() => setSelectedReportPeriod("weekly")}
          >
            Weekly
          </button>
          <button
            type="button"
            className={`small-btn ${selectedReportPeriod === "monthly" ? "active" : "light"}`}
            onClick={() => setSelectedReportPeriod("monthly")}
          >
            Monthly
          </button>
        </div>
        {loading ? (
          <p className="empty">Loading report data...</p>
        ) : salesReportRows.length === 0 ? (
          <p className="empty">No completed checkout data yet.</p>
        ) : (
          <div className="sales-chart">
            {salesReportRows.map((row) => {
              const width = maxReportRevenue > 0 ? (Number(row.revenue) / maxReportRevenue) * 100 : 0;
              return (
                <article className="sales-row" key={row.label}>
                  <div className="sales-meta">
                    <p className="sales-title">{row.label}</p>
                    <p className="sales-subtitle">Orders: {row.orderCount} | Units: {row.unitsSold} | Revenue: {Number(row.revenue).toFixed(2)}</p>
                  </div>
                  <div className="sales-bar-track" aria-hidden="true">
                    <div className="sales-bar-fill" style={{ width: `${Math.max(width, 4)}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Sales by Product</h2>
          <p>Completed checkouts converted into product-level sales units and revenue.</p>
        </div>
        {loading ? (
          <p className="empty">Loading sales data...</p>
        ) : salesByProduct.length === 0 ? (
          <p className="empty">No reserved sales data yet. Reserve carts to populate this chart.</p>
        ) : (
          <div className="sales-chart">
            {salesByProduct.map((row) => {
              const width = maxUnitsSold > 0 ? (row.unitsSold / maxUnitsSold) * 100 : 0;
              return (
                <article className="sales-row" key={row.productId}>
                  <div className="sales-meta">
                    <p className="sales-title">{row.name}</p>
                    <p className="sales-subtitle">{row.sku} | Units: {row.unitsSold} | Revenue: {Number(row.revenue).toFixed(2)}</p>
                  </div>
                  <div className="sales-bar-track" aria-hidden="true">
                    <div className="sales-bar-fill" style={{ width: `${Math.max(width, 6)}%` }} />
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Quick Add Product</h2>
          <p>Minimal fields, one submit, instant refresh.</p>
        </div>
        <form className="simple-form" onSubmit={addProduct}>
          <input
            className={addErrors.sku ? "input-error" : ""}
            value={draft.sku}
            onChange={(event) => {
              setDraft((previous) => ({ ...previous, sku: event.target.value }));
              setAddErrors((previous) => ({ ...previous, sku: undefined }));
            }}
            placeholder="SKU (e.g. SKU-2001)"
            required
          />
          <input
            className={addErrors.name ? "input-error" : ""}
            value={draft.name}
            onChange={(event) => {
              setDraft((previous) => ({ ...previous, name: event.target.value }));
              setAddErrors((previous) => ({ ...previous, name: undefined }));
            }}
            placeholder="Product name"
            required
          />
          <input
            className={addErrors.quantity ? "input-error" : ""}
            type="number"
            min={0}
            value={draft.quantity}
            onChange={(event) => {
              setDraft((previous) => ({ ...previous, quantity: Number(event.target.value) }));
              setAddErrors((previous) => ({ ...previous, quantity: undefined }));
            }}
            required
          />
          <input
            className={addErrors.reorderLevel ? "input-error" : ""}
            type="number"
            min={1}
            value={draft.reorderLevel}
            onChange={(event) => {
              setDraft((previous) => ({ ...previous, reorderLevel: Number(event.target.value) }));
              setAddErrors((previous) => ({ ...previous, reorderLevel: undefined }));
            }}
            required
          />
          <input
            className={addErrors.unitPrice ? "input-error" : ""}
            type="number"
            min={0}
            step="0.01"
            value={draft.unitPrice}
            onChange={(event) => {
              setDraft((previous) => ({ ...previous, unitPrice: Number(event.target.value) }));
              setAddErrors((previous) => ({ ...previous, unitPrice: undefined }));
            }}
            required
          />
          <input
            className={addErrors.imageUrl ? "input-error" : ""}
            value={draft.imageUrl}
            onChange={(event) => {
              setDraft((previous) => ({ ...previous, imageUrl: event.target.value }));
              setAddErrors((previous) => ({ ...previous, imageUrl: undefined }));
            }}
            placeholder="Image URL (optional)"
          />
          <button type="submit" disabled={busy}>Add Product</button>
        </form>
        {Object.values(addErrors).filter(Boolean).length > 0 && (
          <p className="field-errors">{Object.values(addErrors).filter(Boolean).join(" ")}</p>
        )}
        <p className="form-hint">Order: SKU, Name, Quantity, Reorder Level, Unit Price, Image URL (optional).</p>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Services in This App</h2>
          <p>Core business services you can use now.</p>
        </div>
        <div className="services-grid">
          {services.map((service) => (
            <article className="service-card" key={service.endpoint}>
              <h3>{service.title}</h3>
              <p>{service.description}</p>
              <code>{service.endpoint}</code>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Live Product Ledger</h2>
          <p>Search, edit, and delete products inline.</p>
        </div>
        <div className="table-tools">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by SKU or product name"
            aria-label="Search products"
          />
        </div>
        {loading ? (
          <p className="empty">Loading products...</p>
        ) : filteredProducts.length === 0 ? (
          <p className="empty">No products yet. Create one from API and refresh this page.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Qty</th>
                  <th>Reorder Level</th>
                  <th>Unit Price</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const isEditing = editingProductId === product.id;
                  const isSaving = savingProductId === product.id;

                  return (
                    <tr key={product.id}>
                      <td>
                        {isEditing ? (
                          <input
                            className={editErrors.imageUrl ? "input-error" : ""}
                            value={editingDraft.imageUrl}
                            onChange={(event) => {
                              setEditingDraft((previous) => ({ ...previous, imageUrl: event.target.value }));
                              setEditErrors((previous) => ({ ...previous, imageUrl: undefined }));
                            }}
                            placeholder="https://example.com/item.jpg"
                          />
                        ) : product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={product.imageUrl} alt={product.name} width={48} height={48} style={{ borderRadius: 8, objectFit: "cover" }} />
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className={editErrors.sku ? "input-error" : ""}
                            value={editingDraft.sku}
                            onChange={(event) => {
                              setEditingDraft((previous) => ({ ...previous, sku: event.target.value }));
                              setEditErrors((previous) => ({ ...previous, sku: undefined }));
                            }}
                            required
                          />
                        ) : (
                          product.sku
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className={editErrors.name ? "input-error" : ""}
                            value={editingDraft.name}
                            onChange={(event) => {
                              setEditingDraft((previous) => ({ ...previous, name: event.target.value }));
                              setEditErrors((previous) => ({ ...previous, name: undefined }));
                            }}
                            required
                          />
                        ) : (
                          product.name
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className={editErrors.quantity ? "input-error" : ""}
                            type="number"
                            min={0}
                            value={editingDraft.quantity}
                            onChange={(event) => {
                              setEditingDraft((previous) => ({
                                ...previous,
                                quantity: Number(event.target.value)
                              }));
                              setEditErrors((previous) => ({ ...previous, quantity: undefined }));
                            }}
                            required
                          />
                        ) : (
                          product.quantity
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className={editErrors.reorderLevel ? "input-error" : ""}
                            type="number"
                            min={1}
                            value={editingDraft.reorderLevel}
                            onChange={(event) => {
                              setEditingDraft((previous) => ({
                                ...previous,
                                reorderLevel: Number(event.target.value)
                              }));
                              setEditErrors((previous) => ({ ...previous, reorderLevel: undefined }));
                            }}
                            required
                          />
                        ) : (
                          product.reorderLevel
                        )}
                      </td>
                      <td>
                        {isEditing ? (
                          <input
                            className={editErrors.unitPrice ? "input-error" : ""}
                            type="number"
                            min={0}
                            step="0.01"
                            value={editingDraft.unitPrice}
                            onChange={(event) => {
                              setEditingDraft((previous) => ({
                                ...previous,
                                unitPrice: Number(event.target.value)
                              }));
                              setEditErrors((previous) => ({ ...previous, unitPrice: undefined }));
                            }}
                            required
                          />
                        ) : (
                          product.unitPrice
                        )}
                      </td>
                      <td>
                        <div className="row-actions">
                          {isEditing ? (
                            <>
                              <button
                                className="small-btn"
                                type="button"
                                onClick={() => void saveEdit(product.id)}
                                disabled={isSaving}
                              >
                                {isSaving ? "Saving..." : "Save"}
                              </button>
                              <button className="small-btn light" type="button" onClick={cancelEdit} disabled={isSaving}>
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="small-btn light"
                                type="button"
                                onClick={() => beginEdit(product)}
                                disabled={savingProductId !== null}
                              >
                                Edit
                              </button>
                              <button
                                className="small-btn danger"
                                type="button"
                                onClick={() => void deleteProduct(product)}
                                disabled={savingProductId !== null}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                        {isEditing && Object.values(editErrors).filter(Boolean).length > 0 && (
                          <p className="row-errors">{Object.values(editErrors).filter(Boolean).join(" ")}</p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="stock-alerts" className="panel">
        <div className="panel-head">
          <h2>Low Stock Alerts</h2>
          <p>Prioritized by deficit and severity.</p>
        </div>
        {loading ? (
          <p className="empty">Loading alerts...</p>
        ) : lowStockAlerts.length === 0 ? (
          <p className="empty">No low-stock items right now.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Qty</th>
                  <th>Reorder</th>
                  <th>Deficit</th>
                  <th>Severity</th>
                </tr>
              </thead>
              <tbody>
                {lowStockAlerts.map((alert) => (
                  <tr key={alert.productId}>
                    <td>{alert.sku}</td>
                    <td>{alert.name}</td>
                    <td>{alert.quantity}</td>
                    <td>{alert.reorderLevel}</td>
                    <td>{alert.deficit}</td>
                    <td>
                      <span className={`badge ${alert.severity.toLowerCase()}`}>{alert.severity}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {feedback && (
        <section className={`panel panel-message ${feedbackTone}`}>
          <p>{feedback}</p>
        </section>
      )}
    </main>
  );
}
