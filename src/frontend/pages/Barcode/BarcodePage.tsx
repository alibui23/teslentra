import { useRef, useState } from "react";
import type { FormEvent } from "react";
import Navbar from "../../components/Navbar.tsx";

export default function Barcode() {
  const [barcode, setBarcode] = useState("");
  const [submittedBarcode, setSubmittedBarcode] = useState("");
  const [message, setMessage] = useState(
    "Enter a barcode manually, then press Enter or click Submit Barcode"
  );

  const inputRef = useRef<HTMLInputElement>(null);

  function handleBarcode(rawBarcode: string) {
    const cleanBarcode = rawBarcode.trim();

    if (!cleanBarcode) {
      setMessage("Please enter a barcode first.");
      inputRef.current?.focus();
      return;
    }

    setSubmittedBarcode(cleanBarcode);
    setMessage(`Barcode captured: ${cleanBarcode}`);
    setBarcode("");

    // Put focus back on input for quick repeated entry/scanning
    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    handleBarcode(barcode);
  }

  function handleClear() {
    setBarcode("");
    setSubmittedBarcode("");
    setMessage(
      "Enter a barcode manually, then press Enter or click Submit Barcode."
    );
    inputRef.current?.focus();
  }

  return (
    <div className="barcode-layout">
      <Navbar />

      <main className="barcode-page container-fluid">
        <header className="barcode-header">
          <div>
            <h2>Scan Barcode</h2>
            <p className="barcode-description">
              Enter the barcode manually for now. Camera scanning will be added later
            </p>
          </div>
        </header>

        <section className="barcode-card card">
          <form className="barcode-form" onSubmit={handleSubmit}>
            <label htmlFor="barcode-input">Barcode</label>

            <div className="barcode-input-row">
              <input
                ref={inputRef}
                id="barcode-input"
                className="barcode-input"
                type="text"
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                placeholder="Enter or scan barcode"
                autoComplete="off"
                autoFocus
                spellCheck={false}
                aria-describedby="barcode-help" />

              <button className="barcode-submit-button" type="submit">
                Submit Barcode
              </button>
            </div>

            <p id="barcode-help" className="barcode-help">
              You can press Enter instead of clicking the button.
            </p>
          </form>

          <div className="barcode-status" role="status" aria-live="polite">
            <span className="barcode-status-label">Status</span>
            <p>{message}</p>
          </div>

          {submittedBarcode && (
            <div className="barcode-result">
              <div>
                <span className="barcode-result-label">Recent barcode</span>
                <strong>{submittedBarcode}</strong>
              </div>

              <button
                className="barcode-clear-button"
                type="button"
                onClick={handleClear} >
                Clear
              </button>
            </div>
          )}
        </section>

        <section className="camera-placeholder-card card">
          <div className="camera-placeholder-icon" aria-hidden="true"> ▣
          </div>

          <div>
            <h2> Camera scanning </h2>
            <p>
              Camera support will be added later. The future camera component
              can pass its detected value into the same barcode-handling logic.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
