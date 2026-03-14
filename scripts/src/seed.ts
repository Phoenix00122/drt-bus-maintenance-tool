/**
 * DRT Maintenance Seed — Real fleet and parts data from DRT hackathon files
 *
 * Sources:
 *  - Maintenance_2026_Hackathon_file_descriptions.xlsx  (HotList schema)
 *  - NEW_PM_Service-_Fluid_and_Filter_Requirements_June_19,_2025.xlsx
 *
 * PM Service Levels (DRT standard):
 *  A Service — 10,000 km  : oil + oil filter + spinner + fuel filters + coolant filter
 *  B Service — 20,000 km  : A + air filter + brake clip + barium grease
 *  C Service — 40,000 km  : A + B + hydraulic filter + crankcase + transmission filter
 *  D Service — 80,000 km  : A + B + C + dryer/desiccant + webasto + DEF filter
 *
 * Bus families (real DRT bus number ranges):
 *  New Flyer D40LF       8419–8473
 *  New Flyer Xcelsior XD 8501–8547
 *  New Flyer Xcelsior XD 8601–8626
 *  Nova Bus LFS          8551–8589
 *  Nova Bus LFS          6100–6119  (diesel)
 *  Nova Bus HEV Hybrid   6120–6129
 *  Nova LFSe BEB         6130–6135  (battery electric — most fluids N/R)
 *  Nova Bus LFS          6136–6157
 *  Nova Bus LFS          7100–7124
 *  Nova Bus LFS          9100–9107
 */

import { db } from "@workspace/db";
import {
  busesTable,
  partsTable,
  pmSchedulesTable,
  pmSchedulePartsTable,
} from "@workspace/db";

async function seed() {
  console.log("Clearing existing data...");

  // Clear in FK-safe order
  await db.delete(pmSchedulePartsTable);
  await db.delete(pmSchedulesTable);
  await db.delete(partsTable);
  await db.delete(busesTable);

  // ─────────────────────────────────────────────────────────────
  // PARTS — Real DRT part numbers from PM Service Requirements
  // ─────────────────────────────────────────────────────────────
  console.log("Seeding parts...");

  const parts = await db
    .insert(partsTable)
    .values([
      // ── OIL FILTERS ─────────────────────────────────────────
      {
        name: "Oil Filter (Fleetguard LF9009)",
        partNumber: "LFP3000XL",
        category: "filters",
        unitCost: "42.00",
        unit: "each",
        supplier: "Fleetguard",
        stockLevel: 120,
      },
      {
        name: "Oil Filter — Nova HEV (Fleetguard LF3654)",
        partNumber: "3937736",
        category: "filters",
        unitCost: "38.50",
        unit: "each",
        supplier: "Fleetguard",
        stockLevel: 30,
      },

      // ── ENGINE OIL ──────────────────────────────────────────
      {
        name: "Engine Oil 15W-40 CK-4 (Bulk)",
        partNumber: "15W40-BULK",
        category: "fluids",
        unitCost: "3.20",
        unit: "litre",
        supplier: "Petro-Canada",
        stockLevel: 2000,
      },

      // ── KLEENSOIL / SPINNER CARTRIDGE ────────────────────────
      {
        name: "KleenOil Spinner Cartridge (HDFC1878KF50)",
        partNumber: "6359175",
        category: "filters",
        unitCost: "68.00",
        unit: "each",
        supplier: "KleenOil",
        stockLevel: 100,
      },

      // ── AIR FILTERS ─────────────────────────────────────────
      {
        name: "Air Filter — New Flyer D40LF (LAF2100)",
        partNumber: "LAF2100",
        category: "filters",
        unitCost: "74.00",
        unit: "each",
        supplier: "Baldwin Filters",
        stockLevel: 25,
      },
      {
        name: "Air Filter — Nova Bus LFS (LAF1878)",
        partNumber: "LAF1878",
        category: "filters",
        unitCost: "82.00",
        unit: "each",
        supplier: "Baldwin Filters",
        stockLevel: 60,
      },
      {
        name: "Air Filter — Xcelsior (AF27876)",
        partNumber: "6389969",
        category: "filters",
        unitCost: "89.50",
        unit: "each",
        supplier: "Fleetguard",
        stockLevel: 40,
      },
      {
        name: "Secondary Air Filter — Xcelsior (477007)",
        partNumber: "477007",
        category: "filters",
        unitCost: "56.00",
        unit: "each",
        supplier: "Knecht-Mahle",
        stockLevel: 40,
      },

      // ── FUEL FILTERS ────────────────────────────────────────
      {
        name: "Fuel Filter Primary — Diesel (Fleetguard FS1003)",
        partNumber: "FS1065FLG",
        category: "filters",
        unitCost: "54.00",
        unit: "each",
        supplier: "Fleetguard",
        stockLevel: 80,
      },
      {
        name: "Fuel Filter Primary — Nova HEV (FS20121NN)",
        partNumber: "FS20121NN",
        category: "filters",
        unitCost: "61.00",
        unit: "each",
        supplier: "Fleetguard",
        stockLevel: 40,
      },
      {
        name: "Fuel Filter Secondary — NF/older Nova (FF5636FLG)",
        partNumber: "FF5636FLG",
        category: "filters",
        unitCost: "48.00",
        unit: "each",
        supplier: "Fleetguard",
        stockLevel: 40,
      },
      {
        name: "Fuel Filter Secondary — Nova LFS diesel (FF63008)",
        partNumber: "FF63008",
        category: "filters",
        unitCost: "51.00",
        unit: "each",
        supplier: "Fleetguard",
        stockLevel: 60,
      },
      {
        name: "Fuel Filter Secondary — Nova HEV (FF63041NN)",
        partNumber: "FF63041NN",
        category: "filters",
        unitCost: "58.00",
        unit: "each",
        supplier: "Fleetguard",
        stockLevel: 30,
      },

      // ── COOLANT FILTER ──────────────────────────────────────
      {
        name: "Coolant Filter (Fleetguard WF2074)",
        partNumber: "LFW4074",
        category: "filters",
        unitCost: "22.50",
        unit: "each",
        supplier: "Fleetguard",
        stockLevel: 90,
      },

      // ── BRAKE TREADLE CLIP ──────────────────────────────────
      {
        name: "Brake Treadle Clip — New Flyer/Xcelsior",
        partNumber: "6351580",
        category: "brakes",
        unitCost: "12.75",
        unit: "each",
        supplier: "DRT Stores",
        stockLevel: 150,
      },

      // ── BARIUM GREASE ────────────────────────────────────────
      {
        name: "Barium Grease (NF/Xcelsior)",
        partNumber: "246671",
        category: "fluids",
        unitCost: "34.00",
        unit: "cartridge",
        supplier: "DRT Stores",
        stockLevel: 100,
      },

      // ── HYDRAULIC FILTERS ────────────────────────────────────
      {
        name: "Hydraulic Filter — New Flyer D40LF",
        partNumber: "275163",
        category: "filters",
        unitCost: "88.00",
        unit: "each",
        supplier: "Parker Hannifin",
        stockLevel: 20,
      },
      {
        name: "Hydraulic Filter — Xcelsior (P550637/6334006)",
        partNumber: "6334006",
        category: "filters",
        unitCost: "95.00",
        unit: "each",
        supplier: "Donaldson",
        stockLevel: 30,
      },
      {
        name: "Hydraulic Filter — Nova Bus LFS (N8900761)",
        partNumber: "N8900761",
        category: "filters",
        unitCost: "98.00",
        unit: "each",
        supplier: "Nova Bus",
        stockLevel: 35,
      },

      // ── CRANKCASE FILTERS ────────────────────────────────────
      {
        name: "Crankcase Filter — New Flyer D40LF (3964093)",
        partNumber: "3964093",
        category: "filters",
        unitCost: "72.00",
        unit: "each",
        supplier: "Fleetguard",
        stockLevel: 15,
      },
      {
        name: "Crankcase Filter — Xcelsior/Nova (CV50603)",
        partNumber: "CV50603",
        category: "filters",
        unitCost: "76.00",
        unit: "each",
        supplier: "Cummins/Fleetguard",
        stockLevel: 40,
      },

      // ── AIR DRYER / DESICCANT ────────────────────────────────
      {
        name: "Air Dryer Cartridge — New Flyer D40LF (6313239)",
        partNumber: "6313239",
        category: "filters",
        unitCost: "115.00",
        unit: "each",
        supplier: "Haldex",
        stockLevel: 15,
      },
      {
        name: "Desiccant Dryer Cartridge — Xcelsior/Nova (471-78964)",
        partNumber: "47178964",
        category: "filters",
        unitCost: "128.00",
        unit: "each",
        supplier: "Knorr-Bremse",
        stockLevel: 30,
      },

      // ── TRANSMISSION FILTERS ─────────────────────────────────
      {
        name: "Transmission Filter — NF D40LF Voith (59.3355.10)",
        partNumber: "59.3355.10",
        category: "filters",
        unitCost: "145.00",
        unit: "each",
        supplier: "Voith",
        stockLevel: 10,
      },
      {
        name: "Transmission Filter — Xcelsior Voith (151.000.88710)",
        partNumber: "151.000.88710",
        category: "filters",
        unitCost: "162.00",
        unit: "each",
        supplier: "Voith",
        stockLevel: 20,
      },
      {
        name: "Transmission Filter — Allison (25940493)",
        partNumber: "25940493",
        category: "filters",
        unitCost: "175.00",
        unit: "each",
        supplier: "Allison Transmission",
        stockLevel: 15,
      },
      {
        name: "Transmission Filter Internal — Allison (29544785)",
        partNumber: "29544785",
        category: "filters",
        unitCost: "88.00",
        unit: "each",
        supplier: "Allison Transmission",
        stockLevel: 15,
      },
      {
        name: "Transmission Filter — Nova ZF (0501.216.503)",
        partNumber: "0501.216.503",
        category: "filters",
        unitCost: "158.00",
        unit: "each",
        supplier: "ZF",
        stockLevel: 30,
      },
      {
        name: "Transmission Filter — Nova HEV/BEB ZF (LF3338)",
        partNumber: "LF3338",
        category: "filters",
        unitCost: "142.00",
        unit: "each",
        supplier: "ZF",
        stockLevel: 15,
      },

      // ── TRANSMISSION FLUID ───────────────────────────────────
      {
        name: "Transmission Fluid — Synthetic (Trans Synd)",
        partNumber: "TRANS-SYND",
        category: "fluids",
        unitCost: "8.50",
        unit: "litre",
        supplier: "Castrol",
        stockLevel: 500,
      },

      // ── WEBASTO / AUXILIARY HEATER ───────────────────────────
      {
        name: "Webasto Fuel Cartridge (50900001A)",
        partNumber: "50900001A",
        category: "filters",
        unitCost: "38.00",
        unit: "each",
        supplier: "Webasto",
        stockLevel: 80,
      },

      // ── DEF FILTER ───────────────────────────────────────────
      {
        name: "DEF (SCR) Filter (6392223)",
        partNumber: "6392223",
        category: "filters",
        unitCost: "45.00",
        unit: "each",
        supplier: "Fleetguard",
        stockLevel: 60,
      },

      // ── SAFETY / INSPECTION ──────────────────────────────────
      {
        name: "Safety Triangle Kit",
        partNumber: "SAF-TRI-KIT",
        category: "safety",
        unitCost: "35.00",
        unit: "kit",
        supplier: "Cortina",
        stockLevel: 30,
      },
      {
        name: "Fire Extinguisher (5lb ABC)",
        partNumber: "SAF-EXT-5LB",
        category: "safety",
        unitCost: "85.00",
        unit: "each",
        supplier: "Amerex",
        stockLevel: 20,
      },
    ])
    .returning();

  console.log(`Inserted ${parts.length} parts`);

  const allParts = await db.select().from(partsTable);
  const partMap = new Map(allParts.map((p) => [p.partNumber, p.id]));

  // ─────────────────────────────────────────────────────────────
  // PM SCHEDULES — A, B, C, D service levels (DRT standard)
  // ─────────────────────────────────────────────────────────────
  console.log("Seeding PM schedules...");

  const pmSchedules = await db
    .insert(pmSchedulesTable)
    .values([
      {
        name: "A Service — Oil, Filters & Fluids",
        description:
          "Oil & filter change, KleenOil spinner, fuel filters (primary + secondary), coolant filter. Based on HotList PM frequency. Applies to all diesel buses.",
        intervalKm: "10000",
        intervalDays: null,
        category: "engine",
        estimatedHours: "2.0",
      },
      {
        name: "B Service — Air & Brake (Includes A)",
        description:
          "Includes full A Service plus air filter replacement, brake treadle clip, and barium grease application. Performed every 20,000 km.",
        intervalKm: "20000",
        intervalDays: null,
        category: "filters",
        estimatedHours: "3.5",
      },
      {
        name: "C Service — Hydraulic & Crankcase (Includes A & B)",
        description:
          "Includes full A and B Service plus hydraulic filter, crankcase breather filter, and transmission filter change.",
        intervalKm: "40000",
        intervalDays: null,
        category: "transmission",
        estimatedHours: "5.0",
      },
      {
        name: "D Service — Full Major (Includes A, B & C)",
        description:
          "Full major service. Includes A, B, and C services plus air dryer/desiccant cartridge, Webasto fuel cartridge, and DEF (SCR) filter. Annual-equivalent for high-mileage buses.",
        intervalKm: "80000",
        intervalDays: null,
        category: "engine",
        estimatedHours: "8.0",
      },
      {
        name: "Annual Safety Inspection (CVOR)",
        description:
          "Ontario CVOR-required annual safety inspection. Includes all lights, brakes, steering, tires, and emergency equipment check.",
        intervalKm: null,
        intervalDays: 365,
        category: "safety",
        estimatedHours: "4.0",
      },
    ])
    .returning();

  console.log(`Inserted ${pmSchedules.length} PM schedules`);

  const allPmSchedules = await db.select().from(pmSchedulesTable);
  const pmMap = new Map(allPmSchedules.map((s) => [s.name, s.id]));

  // ─────────────────────────────────────────────────────────────
  // PM SCHEDULE PARTS — mapped from the Excel requirements sheet
  // ─────────────────────────────────────────────────────────────
  const pmPartValues: { pmScheduleId: number; partId: number; quantity: number }[] = [];

  const add = (pmName: string, partNumber: string, qty: number) => {
    const pmId = pmMap.get(pmName);
    const partId = partMap.get(partNumber);
    if (pmId && partId) {
      pmPartValues.push({ pmScheduleId: pmId, partId, quantity: qty });
    } else {
      console.warn(`  WARN: missing ${pmId ? "part" : "pm"} for "${pmName}" / "${partNumber}"`);
    }
  };

  // ── A SERVICE (10,000 km) ─────────────────────────────────
  // Oil filter (use standard diesel filter; HEV variant noted in bus notes)
  add("A Service — Oil, Filters & Fluids", "LFP3000XL", 1);
  // Engine oil — 25 litres typical (Nova/NF diesel) or 19.7 (HEV)
  add("A Service — Oil, Filters & Fluids", "15W40-BULK", 25);
  // KleenOil spinner cartridge (all buses)
  add("A Service — Oil, Filters & Fluids", "6359175", 1);
  // Fuel filter primary (standard diesel)
  add("A Service — Oil, Filters & Fluids", "FS1065FLG", 1);
  // Fuel filter secondary (standard)
  add("A Service — Oil, Filters & Fluids", "FF63008", 1);
  // Coolant filter
  add("A Service — Oil, Filters & Fluids", "LFW4074", 1);
  // Webasto cartridge (all buses with auxiliary heater)
  add("A Service — Oil, Filters & Fluids", "50900001A", 1);

  // ── B SERVICE (20,000 km, includes A) ────────────────────
  // All A Service parts
  add("B Service — Air & Brake (Includes A)", "LFP3000XL", 1);
  add("B Service — Air & Brake (Includes A)", "15W40-BULK", 25);
  add("B Service — Air & Brake (Includes A)", "6359175", 1);
  add("B Service — Air & Brake (Includes A)", "FS1065FLG", 1);
  add("B Service — Air & Brake (Includes A)", "FF63008", 1);
  add("B Service — Air & Brake (Includes A)", "LFW4074", 1);
  add("B Service — Air & Brake (Includes A)", "50900001A", 1);
  // B additions: air filter (Nova primary), brake clip, barium grease
  add("B Service — Air & Brake (Includes A)", "LAF1878", 1);
  add("B Service — Air & Brake (Includes A)", "6351580", 1);
  add("B Service — Air & Brake (Includes A)", "246671", 1);

  // ── C SERVICE (40,000 km, includes A & B) ────────────────
  // All A Service parts
  add("C Service — Hydraulic & Crankcase (Includes A & B)", "LFP3000XL", 1);
  add("C Service — Hydraulic & Crankcase (Includes A & B)", "15W40-BULK", 25);
  add("C Service — Hydraulic & Crankcase (Includes A & B)", "6359175", 1);
  add("C Service — Hydraulic & Crankcase (Includes A & B)", "FS1065FLG", 1);
  add("C Service — Hydraulic & Crankcase (Includes A & B)", "FF63008", 1);
  add("C Service — Hydraulic & Crankcase (Includes A & B)", "LFW4074", 1);
  add("C Service — Hydraulic & Crankcase (Includes A & B)", "50900001A", 1);
  // All B additions
  add("C Service — Hydraulic & Crankcase (Includes A & B)", "LAF1878", 1);
  add("C Service — Hydraulic & Crankcase (Includes A & B)", "6351580", 1);
  add("C Service — Hydraulic & Crankcase (Includes A & B)", "246671", 1);
  // C additions: hydraulic filter, crankcase, transmission filter (ZF Nova)
  add("C Service — Hydraulic & Crankcase (Includes A & B)", "N8900761", 1);
  add("C Service — Hydraulic & Crankcase (Includes A & B)", "CV50603", 1);
  add("C Service — Hydraulic & Crankcase (Includes A & B)", "0501.216.503", 1);
  // Trans fluid (24 litres Nova ZF)
  add("C Service — Hydraulic & Crankcase (Includes A & B)", "TRANS-SYND", 24);

  // ── D SERVICE (80,000 km, includes A, B & C) ─────────────
  // All A Service parts
  add("D Service — Full Major (Includes A, B & C)", "LFP3000XL", 1);
  add("D Service — Full Major (Includes A, B & C)", "15W40-BULK", 25);
  add("D Service — Full Major (Includes A, B & C)", "6359175", 1);
  add("D Service — Full Major (Includes A, B & C)", "FS1065FLG", 1);
  add("D Service — Full Major (Includes A, B & C)", "FF63008", 1);
  add("D Service — Full Major (Includes A, B & C)", "LFW4074", 1);
  add("D Service — Full Major (Includes A, B & C)", "50900001A", 1);
  // All B additions
  add("D Service — Full Major (Includes A, B & C)", "LAF1878", 1);
  add("D Service — Full Major (Includes A, B & C)", "6351580", 1);
  add("D Service — Full Major (Includes A, B & C)", "246671", 1);
  // All C additions
  add("D Service — Full Major (Includes A, B & C)", "N8900761", 1);
  add("D Service — Full Major (Includes A, B & C)", "CV50603", 1);
  add("D Service — Full Major (Includes A, B & C)", "0501.216.503", 1);
  add("D Service — Full Major (Includes A, B & C)", "TRANS-SYND", 24);
  // D additions: desiccant dryer (x2), DEF filter
  add("D Service — Full Major (Includes A, B & C)", "47178964", 2);
  add("D Service — Full Major (Includes A, B & C)", "6392223", 1);

  // ── CVOR SAFETY INSPECTION ───────────────────────────────
  add("Annual Safety Inspection (CVOR)", "SAF-TRI-KIT", 1);
  add("Annual Safety Inspection (CVOR)", "SAF-EXT-5LB", 1);

  if (pmPartValues.length > 0) {
    await db.insert(pmSchedulePartsTable).values(pmPartValues).onConflictDoNothing();
    console.log(`Inserted ${pmPartValues.length} PM schedule parts`);
  }

  // ─────────────────────────────────────────────────────────────
  // BUSES — Representative sample from each real DRT fleet family
  // Numbers and models from PM Service Requirements spreadsheet
  // ─────────────────────────────────────────────────────────────
  console.log("Seeding buses...");

  const busValues = [
    // ── New Flyer D40LF — 8431-8473 (2008-2010, Voith trans, 25L oil) ──
    { busNumber: "8442", model: "New Flyer D40LF", year: 2008, currentOdometer: "612000", monthlyDistance: "6800", lastPmDate: "2025-11-20", lastPmOdometer: "601000", status: "active", notes: "Route 407 | Voith trans | 25L 15W40" },
    { busNumber: "8455", model: "New Flyer D40LF", year: 2009, currentOdometer: "589000", monthlyDistance: "6500", lastPmDate: "2025-12-05", lastPmOdometer: "576000", status: "active", notes: "Route 221 | Voith trans | 25L 15W40" },
    { busNumber: "8469", model: "New Flyer D40LF", year: 2010, currentOdometer: "542000", monthlyDistance: "7000", lastPmDate: "2026-01-08", lastPmOdometer: "530000", status: "maintenance", notes: "In shop — crankcase breather replacement" },

    // ── New Flyer Xcelsior XD40 — 8501-8533 (2011-2013, Voith, 25L oil) ──
    { busNumber: "8509", model: "New Flyer Xcelsior XD40", year: 2011, currentOdometer: "498000", monthlyDistance: "7200", lastPmDate: "2026-01-15", lastPmOdometer: "486000", status: "active", notes: "Route 215 | Voith 151.000.88710 | Air Filter 6389969" },
    { busNumber: "8515", model: "New Flyer Xcelsior XD40", year: 2012, currentOdometer: "465000", monthlyDistance: "7500", lastPmDate: "2026-01-22", lastPmOdometer: "452000", status: "active", notes: "Route 916 | Voith | Air Filter 6389969" },
    { busNumber: "8523", model: "New Flyer Xcelsior XD40", year: 2012, currentOdometer: "472000", monthlyDistance: "7300", lastPmDate: "2026-02-01", lastPmOdometer: "460000", status: "active", notes: "Route 223 | Voith | 6389969 air filter" },

    // ── New Flyer Xcelsior XDE40 — 8519-8522 (Allison trans) ──
    { busNumber: "8519", model: "New Flyer Xcelsior XDE40", year: 2013, currentOdometer: "421000", monthlyDistance: "7800", lastPmDate: "2026-02-10", lastPmOdometer: "408000", status: "active", notes: "Route 910 | Allison 25940493 trans | 28L oil" },
    { busNumber: "8522", model: "New Flyer Xcelsior XDE40", year: 2013, currentOdometer: "415000", monthlyDistance: "7600", lastPmDate: "2026-02-14", lastPmOdometer: "402000", status: "active", notes: "Route 916 | Allison trans | 28L oil" },

    // ── New Flyer Xcelsior — 8536-8543 (Allison trans) ──
    { busNumber: "8539", model: "New Flyer Xcelsior XD40", year: 2013, currentOdometer: "398000", monthlyDistance: "7800", lastPmDate: "2026-02-18", lastPmOdometer: "386000", status: "active", notes: "Route 501 | Allison trans | FF63008 fuel filter" },
    { busNumber: "8540", model: "New Flyer Xcelsior XD40", year: 2013, currentOdometer: "402000", monthlyDistance: "7700", lastPmDate: "2026-02-20", lastPmOdometer: "390000", status: "active", notes: "Route 922 | Allison trans | FF63008" },

    // ── New Flyer Xcelsior — 8544-8547 (Voith) ──
    { busNumber: "8544", model: "New Flyer Xcelsior XD40", year: 2014, currentOdometer: "375000", monthlyDistance: "8000", lastPmDate: "2026-02-22", lastPmOdometer: "363000", status: "active", notes: "Route 301 | Voith | FF63008" },

    // ── New Flyer Xcelsior — 8601-8626 (2015-2016, Voith, FF5636FLG) ──
    { busNumber: "8604", model: "New Flyer Xcelsior XD40", year: 2015, currentOdometer: "352000", monthlyDistance: "8200", lastPmDate: "2026-01-28", lastPmOdometer: "340000", status: "active", notes: "Route 224 | Voith 151.000.88710 | FF5636FLG" },
    { busNumber: "8610", model: "New Flyer Xcelsior XD40", year: 2015, currentOdometer: "344000", monthlyDistance: "8400", lastPmDate: "2026-02-05", lastPmOdometer: "331000", status: "active", notes: "Route 302 | Voith | FF5636FLG fuel filter" },
    { busNumber: "8623", model: "New Flyer Xcelsior XD40", year: 2016, currentOdometer: "318000", monthlyDistance: "8600", lastPmDate: "2026-02-12", lastPmOdometer: "304000", status: "active", notes: "Route 920 | Voith | FF5636FLG" },

    // ── Nova Bus LFS — 8551-8589 (2012-2014, ZF trans, 24L oil) ──
    { busNumber: "8558", model: "Nova Bus LFS", year: 2012, currentOdometer: "441000", monthlyDistance: "7000", lastPmDate: "2026-01-10", lastPmOdometer: "428000", status: "active", notes: "Route 215 | ZF 0501.216.503 | LAF1878 air filter" },
    { busNumber: "8571", model: "Nova Bus LFS", year: 2013, currentOdometer: "418000", monthlyDistance: "7200", lastPmDate: "2026-01-25", lastPmOdometer: "405000", status: "active", notes: "Route 407 | ZF trans | N8900761 hyd filter" },
    { busNumber: "8582", model: "Nova Bus LFS", year: 2014, currentOdometer: "390000", monthlyDistance: "7500", lastPmDate: "2026-02-08", lastPmOdometer: "376000", status: "maintenance", notes: "Transmission fluid leak — ZF service" },

    // ── Nova Bus LFS — 6100-6119 (2018-2019, ZF, BAE traction note) ──
    { busNumber: "6100", model: "Nova Bus LFS", year: 2018, currentOdometer: "198000", monthlyDistance: "9000", lastPmDate: "2026-02-01", lastPmOdometer: "189000", status: "active", notes: "Route 916 | ZF 0501.216.503 | FF63008 | 25.6L 15W40" },
    { busNumber: "6101", model: "Nova Bus LFS", year: 2018, currentOdometer: "195000", monthlyDistance: "9100", lastPmDate: "2026-02-03", lastPmOdometer: "186000", status: "active", notes: "Route 224 | ZF trans | FF63008 | LAF1878" },
    { busNumber: "6104", model: "Nova Bus LFS", year: 2018, currentOdometer: "192000", monthlyDistance: "8900", lastPmDate: "2026-02-05", lastPmOdometer: "183000", status: "active", notes: "Route 302 | ZF | FF63008 | N8900761 hyd filter" },
    { busNumber: "6106", model: "Nova Bus LFS", year: 2019, currentOdometer: "176000", monthlyDistance: "9200", lastPmDate: "2026-02-10", lastPmOdometer: "167000", status: "active", notes: "Route 901 | ZF trans | 25.6L 15W40" },
    { busNumber: "6112", model: "Nova Bus LFS", year: 2019, currentOdometer: "168000", monthlyDistance: "9300", lastPmDate: "2026-02-15", lastPmOdometer: "159000", status: "active", notes: "Route 403 | ZF | LAF1878 air filter" },

    // ── Nova Bus HEV Hybrid — 6120-6129 (2019-2020, ZF LF3338, 19.7L) ──
    { busNumber: "6121", model: "Nova Bus HEV", year: 2019, currentOdometer: "145000", monthlyDistance: "9500", lastPmDate: "2026-02-18", lastPmOdometer: "135000", status: "active", notes: "Route 910 | BAE Hybrid | ZF LF3338 | 3937736 oil filter | 19.7L" },
    { busNumber: "6125", model: "Nova Bus HEV", year: 2020, currentOdometer: "132000", monthlyDistance: "9400", lastPmDate: "2026-02-20", lastPmOdometer: "122000", status: "active", notes: "Route 916 | BAE Hybrid | LF3338 trans | FS20121NN fuel filter" },
    { busNumber: "6128", model: "Nova Bus HEV", year: 2020, currentOdometer: "128000", monthlyDistance: "9200", lastPmDate: "2026-02-22", lastPmOdometer: "119000", status: "active", notes: "Route 222 | Hybrid — NO CRANKCASE FILTER | FF63041NN" },

    // ── Nova LFSe BEB — 6130-6135 (Battery Electric, most fluids N/R) ──
    { busNumber: "6131", model: "Nova LFSe BEB", year: 2021, currentOdometer: "98000", monthlyDistance: "9800", lastPmDate: "2026-02-25", lastPmOdometer: "88000", status: "active", notes: "Route 915 | Battery Electric — no engine oil/fuel filters | ZF LF3338 only" },
    { busNumber: "6133", model: "Nova LFSe BEB", year: 2021, currentOdometer: "95000", monthlyDistance: "9700", lastPmDate: "2026-02-26", lastPmOdometer: "85000", status: "active", notes: "Route 916 | Battery Electric | Fluids: N/R | ZF trans" },

    // ── Nova Bus LFS — 6136-6157 (2021-2022, similar to 6100 range) ──
    { busNumber: "6140", model: "Nova Bus LFS", year: 2021, currentOdometer: "88000", monthlyDistance: "9200", lastPmDate: "2026-03-01", lastPmOdometer: "79000", status: "active", notes: "Route 407 | ZF 0501.216.503 | FF63008 | 25.6L 15W40" },
    { busNumber: "6148", model: "Nova Bus LFS", year: 2021, currentOdometer: "84000", monthlyDistance: "9400", lastPmDate: "2026-03-02", lastPmOdometer: "75000", status: "active", notes: "Route 302 | ZF trans | LAF1878 | N8900761" },
    { busNumber: "6156", model: "Nova Bus LFS", year: 2022, currentOdometer: "72000", monthlyDistance: "9600", lastPmDate: "2026-03-04", lastPmOdometer: "62000", status: "active", notes: "Route 224 | ZF | FF63008 fuel filter" },

    // ── Nova Bus LFS — 7100-7103 (2023, ZF 0501.216.503) ──
    { busNumber: "7100", model: "Nova Bus LFS", year: 2023, currentOdometer: "52000", monthlyDistance: "9500", lastPmDate: "2026-02-28", lastPmOdometer: "42000", status: "active", notes: "Route 403 | ZF 0501.216.503 | FS1065FLG | 25.6L 15W40" },
    { busNumber: "7101", model: "Nova Bus LFS", year: 2023, currentOdometer: "49000", monthlyDistance: "9600", lastPmDate: "2026-03-01", lastPmOdometer: "39000", status: "active", notes: "Route 216 | ZF trans | FF63008 | LAF1878" },

    // ── Nova Bus LFS — 7104-7124 (2024, ZF, FS20121NN fuel filter) ──
    { busNumber: "7109", model: "Nova Bus LFS", year: 2024, currentOdometer: "28000", monthlyDistance: "9800", lastPmDate: "2026-03-05", lastPmOdometer: "18000", status: "active", notes: "Route 921 | NEW — FS20121NN fuel filter | FF63041NN | ZF" },
    { busNumber: "7114", model: "Nova Bus LFS", year: 2024, currentOdometer: "25000", monthlyDistance: "9700", lastPmDate: "2026-03-06", lastPmOdometer: "15000", status: "active", notes: "Route 910 | NEW — 2024 delivery | ZF LF3338 | 24L" },
    { busNumber: "7119", model: "Nova Bus LFS", year: 2024, currentOdometer: "22000", monthlyDistance: "9900", lastPmDate: "2026-03-08", lastPmOdometer: "12000", status: "active", notes: "Route 916 | NEW — 2024 | FF63041NN | NO CRANKCASE" },
    { busNumber: "7123", model: "Nova Bus LFS", year: 2024, currentOdometer: "18000", monthlyDistance: "9600", lastPmDate: "2026-03-09", lastPmOdometer: "8000", status: "active", notes: "Route 223 | NEW — 2024 delivery | ZF trans" },

    // ── Nova Bus LFS — 9100-9107 (older Nova, ZF, FS1065FLG) ──
    { busNumber: "9102", model: "Nova Bus LFS", year: 2016, currentOdometer: "298000", monthlyDistance: "7800", lastPmDate: "2026-01-12", lastPmOdometer: "285000", status: "active", notes: "Route 215 | ZF 0501.216.503 | FS1065FLG | CV50603 crankcase" },
    { busNumber: "9106", model: "Nova Bus LFS", year: 2016, currentOdometer: "312000", monthlyDistance: "7500", lastPmDate: "2025-12-20", lastPmOdometer: "298000", status: "maintenance", notes: "Air system — dryer cartridge replacement in progress" },
    { busNumber: "9107", model: "Nova Bus LFS", year: 2016, currentOdometer: "305000", monthlyDistance: "7700", lastPmDate: "2026-01-18", lastPmOdometer: "292000", status: "active", notes: "Route 301 | ZF | FS20121NN (newer fuel filter spec)" },
  ];

  const buses = await db
    .insert(busesTable)
    .values(busValues)
    .returning();

  console.log(`Inserted ${buses.length} buses`);
  console.log("Seeding complete!");
}

seed().catch(console.error).finally(() => process.exit(0));
