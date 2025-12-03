"use client";

import { useState, useMemo } from "react";

type RepairLine = {
  operation: string;
  srtHours: number;
  laborRate: number;
  laborCost: number;
  partsCost: number;
  totalCost: number;
};

type QuoteResponse = {
  vin: string;
  vehicle: string;
  repairs: RepairLine[];
  totals: {
    laborCost: number;
    partsCost: number;
    grandTotal: number;
  };
};

export default function Home() {
  // Shop / quote level info
  const [shopName, setShopName] = useState("VINQuoter Demo Shop");
  const [quoteNumber, setQuoteNumber] = useState("");

  // Form inputs
  const [vin, setVin] = useState("");
  const [laborRate, setLaborRate] = useState<number>(165);
  const [customerName, setCustomerName] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [partsMarkupPercent, setPartsMarkupPercent] = useState<number>(0);
  const [marginPercent, setMarginPercent] = useState<number>(0);

  // App state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [editableRepairs, setEditableRepairs] = useState<RepairLine[]>([]);

  async function handleGetQuote() {
    setError(null);
    setQuote(null);
    setEditableRepairs([]);

    if (!vin || vin.trim().length < 8) {
      setError("Please enter a valid VIN (at least 8 characters).");
      return;
    }

    if (!laborRate || laborRate <= 0) {
      setError("Please enter a valid labor rate greater than 0.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vin, laborRate }),
      });

      if (!res.ok) {
        throw new Error("Failed to fetch quote.");
      }

      const data = (await res.json()) as QuoteResponse;
      setQuote(data);
      setEditableRepairs(data.repairs);
    } catch (err) {
      console.error(err);
      setError("Something went wrong while generating the quote.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setVin("");
    setLaborRate(165);
    setCustomerName("");
    setUnitNumber("");
    setNotes("");
    setPartsMarkupPercent(0);
    setMarginPercent(0);
    setQuoteNumber("");
    setQuote(null);
    setEditableRepairs([]);
    setError(null);
  }

  function handleRepairChange(
    index: number,
    field: "operation" | "srtHours" | "partsCost",
    value: string
  ) {
    setEditableRepairs((prev) => {
      const next = [...prev];
      const line = { ...next[index] };

      if (field === "operation") {
        line.operation = value;
      } else if (field === "srtHours") {
        const num = Number(value);
        line.srtHours = isNaN(num) ? 0 : num;
      } else if (field === "partsCost") {
        const num = Number(value);
        line.partsCost = isNaN(num) ? 0 : num;
      }

      line.laborCost = line.srtHours * line.laborRate;
      line.totalCost = line.laborCost + line.partsCost;

      next[index] = line;
      return next;
    });
  }

  function handleAddLine() {
    setEditableRepairs((prev) => [
      ...prev,
      {
        operation: "Custom Operation",
        srtHours: 1,
        laborRate,
        laborCost: laborRate * 1,
        partsCost: 0,
        totalCost: laborRate * 1,
      },
    ]);
  }

  function handleRemoveLine(index: number) {
    setEditableRepairs((prev) => prev.filter((_, i) => i !== index));
  }

  const computedTotals = useMemo(() => {
    if (!editableRepairs.length) {
      return {
        laborCost: 0,
        partsCost: 0,
        partsWithMarkup: 0,
        baseGrandTotal: 0,
        finalGrandTotal: 0,
      };
    }

    const base = editableRepairs.reduce(
      (acc, r) => {
        acc.laborCost += r.laborCost;
        acc.partsCost += r.partsCost;
        return acc;
      },
      { laborCost: 0, partsCost: 0 }
    );

    const partsWithMarkup =
      base.partsCost * (1 + (partsMarkupPercent || 0) / 100);
    const baseGrandTotal = base.laborCost + partsWithMarkup;
    const finalGrandTotal =
      baseGrandTotal * (1 + (marginPercent || 0) / 100);

    return {
      laborCost: base.laborCost,
      partsCost: base.partsCost,
      partsWithMarkup,
      baseGrandTotal,
      finalGrandTotal,
    };
  }, [editableRepairs, partsMarkupPercent, marginPercent]);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-6">
      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-4xl print:shadow-none print:rounded-none print:p-4">
        {/* Header */}
        <div className="flex justify-between items-start gap-4 mb-6 print:flex-row print:items-start">
          <div>
            <h1 className="text-3xl font-bold mb-1">
              {shopName || "Shop Name"}
            </h1>
            <p className="text-gray-600 text-sm">
              Powered by VINQuoter.ai – Heavy-duty VIN-based quoting
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 print:items-end">
            <div className="text-sm">
              <span className="font-semibold">Quote #:</span>{" "}
              {quoteNumber || <span className="text-gray-400">N/A</span>}
            </div>
            <button
              onClick={() => window.print()}
              className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-900 print:hidden"
            >
              Print / Save as PDF
            </button>
            <button
              onClick={handleReset}
              className="text-xs text-gray-500 underline mt-1 print:hidden"
            >
              Reset form
            </button>
          </div>
        </div>

        {/* Shop & quote inputs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 print:hidden">
          <div className="md:col-span-2">
            <label className="block mb-2 font-medium">Shop Name</label>
            <input
              type="text"
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">Quote #</label>
            <input
              type="text"
              value={quoteNumber}
              onChange={(e) => setQuoteNumber(e.target.value)}
              placeholder="e.g. Q-1027"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <p className="text-gray-600 mb-4 text-sm print:hidden">
          Enter a VIN and shop labor rate to generate mock repair operations,
          SRTs, and cost breakdowns. (Real data will come later.)
        </p>

        {/* VIN + labor */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block mb-2 font-medium">VIN</label>
            <input
              type="text"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              placeholder="Enter VIN..."
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">Labor Rate ($/hr)</label>
            <input
              type="number"
              value={laborRate}
              onChange={(e) => setLaborRate(Number(e.target.value))}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={0}
            />
          </div>
        </div>

        {/* Customer / unit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2 font-medium">Customer Name</label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="e.g. ABC Logistics"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block mb-2 font-medium">Unit / Truck #</label>
            <input
              type="text"
              value={unitNumber}
              onChange={(e) => setUnitNumber(e.target.value)}
              placeholder="e.g. Truck 1027"
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div className="mb-4">
          <label className="block mb-2 font-medium">Internal Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special instructions, symptoms, or notes for the tech..."
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
          />
        </div>

        {/* Markup / margin */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block mb-2 font-medium">Parts Markup (%)</label>
            <input
              type="number"
              value={partsMarkupPercent}
              onChange={(e) => setPartsMarkupPercent(Number(e.target.value))}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min={0}
            />
          </div>
          <div>
            <label className="block mb-2 font-medium">
              Additional Margin (%)
            </label>
            <input
              type="number"
              value={marginPercent}
              onChange={(e) => setMarginPercent(Number(e.target.value))}
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3 mb-4 print:hidden">
          <button
            onClick={handleGetQuote}
            disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white p-3 rounded-lg font-semibold"
          >
            {loading ? "Generating quote..." : "Get Repair Quote"}
          </button>
        </div>

        {!quote && !loading && (
          <p className="text-gray-500 text-sm text-center">
            Example: paste any VIN-like string to test, e.g.{" "}
            <span className="font-mono">1HTMKADN43H561234</span>
          </p>
        )}

        {/* Quote summary */}
        {quote && (
          <div className="mt-6 border-t pt-4">
            <h2 className="text-2xl font-semibold mb-2">Quote Summary</h2>

            <div className="text-sm text-gray-700 mb-3 space-y-1">
              <p>
                <span className="font-semibold">Customer:</span>{" "}
                {customerName || <span className="text-gray-400">N/A</span>}
              </p>
              <p>
                <span className="font-semibold">Unit / Truck #:</span>{" "}
                {unitNumber || <span className="text-gray-400">N/A</span>}
              </p>
              <p className="text-gray-600">
                VIN: <span className="font-mono">{quote.vin}</span>
              </p>
            </div>

            <p className="mb-4 font-medium">{quote.vehicle}</p>

            {notes && (
              <div className="mb-4 text-sm bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="font-semibold mb-1">Internal Notes</div>
                <div className="whitespace-pre-wrap">{notes}</div>
              </div>
            )}

            {/* Line items */}
            <div className="flex justify-between items-center mb-2 print:hidden">
              <h3 className="font-semibold">Line Items</h3>
              <button
                onClick={handleAddLine}
                className="text-sm bg-green-600 text-white px-3 py-1 rounded-lg hover:bg-green-700"
              >
                + Add Line Item
              </button>
            </div>

            <div className="space-y-3 mb-4">
              {editableRepairs.map((r, idx) => (
                <div
                  key={idx}
                  className="border rounded-lg p-3 bg-gray-50 text-sm"
                >
                  <div className="flex justify-between items-start gap-2">
                    <input
                      type="text"
                      value={r.operation}
                      onChange={(e) =>
                        handleRepairChange(idx, "operation", e.target.value)
                      }
                      className="w-full mb-2 p-2 border rounded-md text-sm"
                    />
                    <button
                      onClick={() => handleRemoveLine(idx)}
                      className="text-xs text-red-600 hover:underline print:hidden"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        SRT Hours
                      </div>
                      <input
                        type="number"
                        value={r.srtHours}
                        onChange={(e) =>
                          handleRepairChange(idx, "srtHours", e.target.value)
                        }
                        className="w-full p-2 border rounded-md text-sm"
                        min={0}
                        step={0.1}
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        Labor Rate
                      </div>
                      <div className="p-2 border rounded-md bg-gray-100">
                        ${r.laborRate.toFixed(2)}/hr
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        Parts Cost
                      </div>
                      <input
                        type="number"
                        value={r.partsCost}
                        onChange={(e) =>
                          handleRepairChange(idx, "partsCost", e.target.value)
                        }
                        className="w-full p-2 border rounded-md text-sm"
                        min={0}
                        step={1}
                      />
                    </div>

                    <div>
                      <div className="text-xs text-gray-500 mb-1">
                        Line Total
                      </div>
                      <div className="p-2 border rounded-md bg-gray-100">
                        ${r.totalCost.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {!editableRepairs.length && (
                <p className="text-sm text-gray-500">
                  No line items loaded. Click &ldquo;Get Repair Quote&rdquo; to
                  generate mock operations.
                </p>
              )}
            </div>

            {/* Totals */}
            <div className="bg-blue-50 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span>Base Labor Total:</span>
                <span>${computedTotals.laborCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Base Parts Total:</span>
                <span>${computedTotals.partsCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  Parts with Markup ({partsMarkupPercent || 0}%):
                </span>
                <span>${computedTotals.partsWithMarkup.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Subtotal (Labor + Marked-up Parts):</span>
                <span>${computedTotals.baseGrandTotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Additional Margin ({marginPercent || 0}%):</span>
                <span>
                  $
                  {(
                    computedTotals.finalGrandTotal -
                    computedTotals.baseGrandTotal
                  ).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between font-semibold text-lg">
                <span>Final Quote Total:</span>
                <span>${computedTotals.finalGrandTotal.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
