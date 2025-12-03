import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  const vin = body?.vin?.toString() ?? "";
  const laborRateFromBody = Number(body?.laborRate);
  const laborRate =
    !isNaN(laborRateFromBody) && laborRateFromBody > 0
      ? laborRateFromBody
      : 165; // default fallback

  if (!vin || vin.length < 8) {
    return NextResponse.json(
      { error: "Invalid VIN. Must be at least 8 characters." },
      { status: 400 }
    );
  }

  // 🧠 Try to decode VIN using NHTSA public API.
  let vehicleDescription = `Mock Heavy-Duty Vehicle for VIN ${vin.slice(
    0,
    8
  )}...`;

  try {
    const res = await fetch(
      `https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValuesExtended/${encodeURIComponent(
        vin
      )}?format=json`,
      { cache: "no-store" }
    );

    if (res.ok) {
      const json = (await res.json()) as any;
      const row = json?.Results?.[0];

      const year = row?.ModelYear || "";
      const make = row?.Make || "";
      const model = row?.Model || "";
      const engine =
        row?.EngineModel ||
        row?.EngineConfiguration ||
        row?.EngineCylinders ||
        "";

      const pieces = [year, make, model].filter(Boolean).join(" ");
      const withEngine = engine ? `${pieces} (${engine})` : pieces;

      if (withEngine) {
        vehicleDescription = withEngine;
      }
    }
  } catch (e) {
    // If VIN decode fails, we just fall back to the mock description.
    console.error("VIN decode failed:", e);
  }

  // 🔧 For now, this is MOCK operation data.
  const baseRepairs = [
    {
      operation: "Aftertreatment DPF Cleaning",
      srtHours: 3.5,
      partsCost: 450,
    },
    {
      operation: "NOx Sensor Replacement",
      srtHours: 1.2,
      partsCost: 320,
    },
    {
      operation: "PM Service Level 2",
      srtHours: 2.0,
      partsCost: 280,
    },
  ];

  const repairs = baseRepairs.map((r) => {
    const laborCost = r.srtHours * laborRate;
    const totalCost = laborCost + r.partsCost;
    return {
      ...r,
      laborRate,
      laborCost,
      totalCost,
    };
  });

  const totals = repairs.reduce(
    (acc, r) => {
      acc.laborCost += r.laborCost;
      acc.partsCost += r.partsCost;
      acc.grandTotal += r.totalCost;
      return acc;
    },
    { laborCost: 0, partsCost: 0, grandTotal: 0 }
  );

  return NextResponse.json({
    vin,
    vehicle: vehicleDescription,
    repairs,
    totals,
  });
}
