import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import Navbar from "../../components/Navbar.tsx";
import {
  emptyForm
} from "./Purchases.model.ts";
import type {
  Purchase,
  PurchaseForm
} from "./Purchases.model.ts";

export default function Purchases() {
  const [form, setForm] = useState<PurchaseForm>(emptyForm);
  const [message, setMessage] = useState("");
  const [showOnOrderOnly, setShowOnOrderOnly] = useState(false);

  const [purchases, setPurchases] = useState<Purchase[]>([
    {
      id: 1,
      partNumber: "TS-9001",
      vendor: "Test Equipment Supplier",
      poNumber: "PO-1048",
      quantity: 2,
      unitCost: 429.5,
      orderDate: "2026-08-01",
      receiveDate: "",
      invoiceNumber: "",
    },
  ]);

  const visiblePurchases = useMemo(() => {
    if (!showOnOrderOnly) {
      return purchases;
    }

    return purchases.filter((purchase) => !purchase.receiveDate);
  }, [purchases, showOnOrderOnly]);

  function updateField(
    field: keyof PurchaseForm,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    const quantity = Number(form.quantity);
    const unitCost = Number(form.unitCost);

    if (!form.partNumber.trim()) {
      setMessage("Part number is required.");
      return;
    }

    if (!form.vendor.trim()) {
      setMessage("Vendor is required.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setMessage("Quantity must be a whole number greater than zero.");
      return;
    }

    if (!Number.isFinite(unitCost) || unitCost < 0) {
      setMessage("Unit cost must be zero or greater.");
      return;
    }

    if (!form.orderDate) {
      setMessage("Order date is required.");
      return;
    }

    const newPurchase: Purchase = {
      id: Date.now(),
      partNumber: form.partNumber.trim(),
      vendor: form.vendor.trim(),
      poNumber: form.poNumber.trim(),
      quantity,
      unitCost,
      orderDate: form.orderDate,
      receiveDate: form.receiveDate,
      invoiceNumber: form.invoiceNumber.trim(),
    };

    setPurchases((current) => [newPurchase, ...current]);
    setForm(emptyForm);

    setMessage(
      form.receiveDate
        ? "Purchase recorded as received."
        : "Purchase recorded and is currently on order."
    );
  }

  function formatMoney(value: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  }

  return (
    <div className="purchases-layout">
      <Navbar />

      <main className="purchases-page container-fluid">
        <header className="purchases-header">
          <div>
            <h2>Purchases</h2>
            <p>
              Record purchase history and keep track of parts that
              have been ordered but not yet received
            </p>
          </div>
        </header>

        <section className="purchase-card card">
          <div className="purchase-card-heading">
            <div>
              <h2>Record Purchase</h2>
              <p>
                PO number, receive date, and invoice number are optional.
              </p>
            </div>
          </div>

          <form className="purchase-form" onSubmit={handleSubmit}>
            <div className="purchase-form-grid">
              <div className="form-field">
                <label htmlFor="part-number">Part number</label>
                <input
                  id="part-number"
                  value={form.partNumber}
                  onChange={(event) =>
                    updateField("partNumber", event.target.value)
                  }
                  placeholder="e.g. TS-9001"
                  autoComplete="off" />
              </div>

              <div className="form-field">
                <label htmlFor="vendor">Vendor</label>
                <input
                  id="vendor"
                  value={form.vendor}
                  onChange={(event) =>
                    updateField("vendor", event.target.value)
                  }
                  placeholder="Vendor name"
                  autoComplete="organization" />
              </div>

              <div className="form-field">
                <label htmlFor="po-number">
                  PO number <span>Optional</span>
                </label>
                <input
                  id="po-number"
                  value={form.poNumber}
                  onChange={(event) =>
                    updateField("poNumber", event.target.value)
                  }
                  placeholder="e.g. PO-1048" />
              </div>

              <div className="form-field">
                <label htmlFor="quantity">Quantity</label>
                <input
                  id="quantity"
                  type="number"
                  min="1"
                  step="1"
                  value={form.quantity}
                  onChange={(event) =>
                    updateField("quantity", event.target.value)
                  } />
              </div>

              <div className="form-field">
                <label htmlFor="unit-cost">Unit cost</label>

                <div className="money-input">
                  <span aria-hidden="true">$</span>
                  <input
                    id="unit-cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.unitCost}
                    onChange={(event) =>
                      updateField("unitCost", event.target.value)
                    }
                    placeholder="0.00" />
                </div>
              </div>

              <div className="form-field">
                <label htmlFor="order-date">Order date</label>
                <input
                  id="order-date"
                  type="date"
                  value={form.orderDate}
                  onChange={(event) =>
                    updateField("orderDate", event.target.value)
                  } />
              </div>

              <div className="form-field">
                <label htmlFor="receive-date">
                  Receive date <span>Optional</span>
                </label>
                <input
                  id="receive-date"
                  type="date"
                  value={form.receiveDate}
                  onChange={(event) =>
                    updateField("receiveDate", event.target.value)
                  } />
              </div>

              <div className="form-field">
                <label htmlFor="invoice-number">
                  Invoice number <span>Optional</span>
                </label>
                <input
                  id="invoice-number"
                  value={form.invoiceNumber}
                  onChange={(event) =>
                    updateField("invoiceNumber", event.target.value)
                  }
                  placeholder="e.g. INV-8824" />
              </div>
            </div>

            {message && (
              <div
                className="purchase-message"
                role="status"
                aria-live="polite" >
                {message}
              </div>
            )}

            <div className="purchase-form-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={() => {
                  setForm(emptyForm);
                  setMessage("");
                }}
              > Clear
              </button>

              <button className="primary-button" type="submit">
                Save Purchase
              </button>
            </div>
          </form>
        </section>

        <section className="purchase-card card">
          <div className="purchase-list-heading">
            <div>
              <h2>Purchase History</h2>
              <p>{visiblePurchases.length} purchase rows</p>
            </div>

            <label className="on-order-toggle">
              <input
                type="checkbox"
                checked={showOnOrderOnly}
                onChange={(event) =>
                  setShowOnOrderOnly(event.target.checked)
                } />
              <span>On order only</span>
            </label>
          </div>

          <div className="purchase-table-wrapper">
            <table className="purchase-table table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Part</th>
                  <th>Vendor</th>
                  <th>PO</th>
                  <th>Qty</th>
                  <th>Unit Cost</th>
                  <th>Order Date</th>
                  <th>Received</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {visiblePurchases.length === 0 ? (
                  <tr>
                    <td className="empty-table" colSpan={8}>
                      No purchases match this view.
                    </td>
                  </tr>
                ) : (
                  visiblePurchases.map((purchase) => (
                    <tr key={purchase.id}>
                      <td className="part-number-cell">
                        {purchase.partNumber}
                      </td>
                      <td>{purchase.vendor}</td>
                      <td>{purchase.poNumber || "-"}</td>
                      <td>{purchase.quantity}</td>
                      <td>{formatMoney(purchase.unitCost)}</td>
                      <td>{purchase.orderDate}</td>
                      <td>{purchase.receiveDate || "-"}</td>
                      <td>
                        <span
                          className={
                            purchase.receiveDate
                              ? "status-badge status-badge--received"
                              : "status-badge status-badge--open"
                          } >
                          {purchase.receiveDate
                            ? "Received"
                            : "On order"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="purchase-note">
          <strong>Later:</strong> when receiving an asset-tracked part,
          this page can prompt for serial numbers before saving the receipt.
          That workflow should ultimately be completed by the backend in one
          transaction so a failed serial number does not create partial assets.
        </section>
      </main>
    </div>
  );
}
