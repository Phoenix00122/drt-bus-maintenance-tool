import { db } from "@workspace/db";
import {
  busesTable,
  partsTable,
  pmSchedulesTable,
  pmSchedulePartsTable,
} from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  // Seed parts (typical transit bus parts)
  const parts = await db
    .insert(partsTable)
    .values([
      { name: "Engine Oil (15W-40)", partNumber: "OIL-15W40-5L", category: "fluids", unitCost: "28.50", unit: "5L jug", supplier: "Petro-Canada", stockLevel: 50 },
      { name: "Oil Filter", partNumber: "FIL-OIL-BUS", category: "filters", unitCost: "18.75", unit: "each", supplier: "Fleetguard", stockLevel: 80 },
      { name: "Air Filter (Primary)", partNumber: "FIL-AIR-PRI", category: "filters", unitCost: "62.00", unit: "each", supplier: "Donaldson", stockLevel: 30 },
      { name: "Air Filter (Safety)", partNumber: "FIL-AIR-SAF", category: "filters", unitCost: "34.50", unit: "each", supplier: "Donaldson", stockLevel: 30 },
      { name: "Fuel Filter", partNumber: "FIL-FUEL-BUS", category: "filters", unitCost: "45.00", unit: "each", supplier: "Fleetguard", stockLevel: 40 },
      { name: "Coolant (50/50 Pre-mix)", partNumber: "COOL-5050-20L", category: "fluids", unitCost: "55.00", unit: "20L jug", supplier: "Shell", stockLevel: 25 },
      { name: "Front Brake Pad Set", partNumber: "BRK-PAD-FRT", category: "brakes", unitCost: "185.00", unit: "set", supplier: "Bendix", stockLevel: 20 },
      { name: "Rear Brake Pad Set", partNumber: "BRK-PAD-RR", category: "brakes", unitCost: "195.00", unit: "set", supplier: "Bendix", stockLevel: 20 },
      { name: "Brake Drum (Front)", partNumber: "BRK-DRM-FRT", category: "brakes", unitCost: "280.00", unit: "each", supplier: "Haldex", stockLevel: 10 },
      { name: "Brake Drum (Rear)", partNumber: "BRK-DRM-RR", category: "brakes", unitCost: "295.00", unit: "each", supplier: "Haldex", stockLevel: 10 },
      { name: "Transmission Fluid (ATF)", partNumber: "FLU-ATF-20L", category: "fluids", unitCost: "120.00", unit: "20L jug", supplier: "Shell", stockLevel: 15 },
      { name: "Transmission Filter Kit", partNumber: "FIL-TRANS-KIT", category: "filters", unitCost: "95.00", unit: "kit", supplier: "Allison", stockLevel: 12 },
      { name: "Drive Belt Set", partNumber: "BLT-DRIVE-SET", category: "engine", unitCost: "145.00", unit: "set", supplier: "Gates", stockLevel: 15 },
      { name: "Serpentine Belt", partNumber: "BLT-SERP-BUS", category: "engine", unitCost: "78.00", unit: "each", supplier: "Gates", stockLevel: 20 },
      { name: "Wiper Blades (pair)", partNumber: "WPR-BLD-PAIR", category: "body", unitCost: "55.00", unit: "pair", supplier: "Anco", stockLevel: 40 },
      { name: "HVAC Filter", partNumber: "FIL-HVAC-BUS", category: "hvac", unitCost: "42.00", unit: "each", supplier: "Mann", stockLevel: 35 },
      { name: "Tire (295/80R22.5)", partNumber: "TIRE-29580R225", category: "tires", unitCost: "520.00", unit: "each", supplier: "Michelin", stockLevel: 16 },
      { name: "Wheel Stud Kit", partNumber: "WHL-STUD-KIT", category: "tires", unitCost: "65.00", unit: "kit", supplier: "Dorman", stockLevel: 20 },
      { name: "Safety Triangle Kit", partNumber: "SAF-TRI-KIT", category: "safety", unitCost: "35.00", unit: "kit", supplier: "Cortina", stockLevel: 30 },
      { name: "Fire Extinguisher (5lb)", partNumber: "SAF-EXT-5LB", category: "safety", unitCost: "85.00", unit: "each", supplier: "Amerex", stockLevel: 20 },
      { name: "Differential Fluid (80W-90)", partNumber: "FLU-DIFF-80W90", category: "fluids", unitCost: "48.00", unit: "4L jug", supplier: "Shell", stockLevel: 20 },
      { name: "Power Steering Fluid", partNumber: "FLU-PS-1L", category: "fluids", unitCost: "22.00", unit: "1L bottle", supplier: "Shell", stockLevel: 25 },
      { name: "Coolant Hose (Upper)", partNumber: "HSE-COOL-UPR", category: "engine", unitCost: "95.00", unit: "each", supplier: "Gates", stockLevel: 8 },
      { name: "Coolant Hose (Lower)", partNumber: "HSE-COOL-LWR", category: "engine", unitCost: "88.00", unit: "each", supplier: "Gates", stockLevel: 8 },
    ])
    .onConflictDoNothing()
    .returning();

  console.log(`Inserted ${parts.length} parts`);

  // Build a map from partNumber to id for easy lookup
  const allParts = await db.select().from(partsTable);
  const partMap = new Map(allParts.map((p) => [p.partNumber, p.id]));

  // Seed PM schedules
  const pmScheduleValues = [
    {
      name: "Engine Oil & Filter Change",
      description: "Change engine oil and replace oil filter. Check fluid levels.",
      intervalKm: "15000",
      intervalDays: null,
      category: "engine",
      estimatedHours: "1.5",
    },
    {
      name: "Air Filter Inspection & Replacement",
      description: "Inspect and replace primary and safety air filters as needed.",
      intervalKm: "30000",
      intervalDays: null,
      category: "filters",
      estimatedHours: "1.0",
    },
    {
      name: "Fuel Filter Replacement",
      description: "Replace fuel filter(s) to maintain fuel system efficiency.",
      intervalKm: "30000",
      intervalDays: null,
      category: "filters",
      estimatedHours: "1.0",
    },
    {
      name: "Brake Inspection & Adjustment",
      description: "Inspect brake pads, drums, rotors, lines. Adjust as needed.",
      intervalKm: "20000",
      intervalDays: null,
      category: "brakes",
      estimatedHours: "2.5",
    },
    {
      name: "Transmission Service",
      description: "Change transmission fluid and filter. Inspect for leaks.",
      intervalKm: "80000",
      intervalDays: null,
      category: "transmission",
      estimatedHours: "3.0",
    },
    {
      name: "Cooling System Service",
      description: "Flush and replace coolant. Inspect hoses, thermostat, and water pump.",
      intervalKm: null,
      intervalDays: 365,
      category: "engine",
      estimatedHours: "2.0",
    },
    {
      name: "Drive Belt Inspection & Replacement",
      description: "Inspect and replace drive belts and serpentine belt.",
      intervalKm: "60000",
      intervalDays: null,
      category: "engine",
      estimatedHours: "1.5",
    },
    {
      name: "HVAC System Service",
      description: "Service HVAC system, replace cabin filter, inspect A/C components.",
      intervalKm: null,
      intervalDays: 180,
      category: "hvac",
      estimatedHours: "2.0",
    },
    {
      name: "Safety Inspection (CVOR)",
      description: "Annual vehicle safety inspection per Ontario CVOR requirements.",
      intervalKm: null,
      intervalDays: 365,
      category: "safety",
      estimatedHours: "4.0",
    },
    {
      name: "Tire Rotation & Inspection",
      description: "Rotate tires, inspect tread depth and condition, check wheel torque.",
      intervalKm: "20000",
      intervalDays: null,
      category: "tires",
      estimatedHours: "2.0",
    },
    {
      name: "Differential Service",
      description: "Change differential fluid and inspect for leaks.",
      intervalKm: "60000",
      intervalDays: null,
      category: "transmission",
      estimatedHours: "1.5",
    },
    {
      name: "Wiper Blade Replacement",
      description: "Replace front and rear wiper blades. Inspect washer fluid system.",
      intervalKm: null,
      intervalDays: 180,
      category: "body",
      estimatedHours: "0.5",
    },
  ];

  const pmSchedules = await db
    .insert(pmSchedulesTable)
    .values(pmScheduleValues)
    .onConflictDoNothing()
    .returning();

  console.log(`Inserted ${pmSchedules.length} PM schedules`);

  // Map PM schedule names to IDs
  const allPmSchedules = await db.select().from(pmSchedulesTable);
  const pmMap = new Map(allPmSchedules.map((s) => [s.name, s.id]));

  // Seed PM schedule parts
  const pmPartValues: { pmScheduleId: number; partId: number; quantity: number }[] = [];

  const addPmPart = (pmName: string, partNumber: string, quantity: number) => {
    const pmId = pmMap.get(pmName);
    const partId = partMap.get(partNumber);
    if (pmId && partId) {
      pmPartValues.push({ pmScheduleId: pmId, partId, quantity });
    }
  };

  // Oil change parts
  addPmPart("Engine Oil & Filter Change", "OIL-15W40-5L", 3);
  addPmPart("Engine Oil & Filter Change", "FIL-OIL-BUS", 1);

  // Air filter
  addPmPart("Air Filter Inspection & Replacement", "FIL-AIR-PRI", 1);
  addPmPart("Air Filter Inspection & Replacement", "FIL-AIR-SAF", 1);

  // Fuel filter
  addPmPart("Fuel Filter Replacement", "FIL-FUEL-BUS", 1);

  // Brake inspection
  addPmPart("Brake Inspection & Adjustment", "BRK-PAD-FRT", 1);
  addPmPart("Brake Inspection & Adjustment", "BRK-PAD-RR", 1);

  // Transmission service
  addPmPart("Transmission Service", "FLU-ATF-20L", 1);
  addPmPart("Transmission Service", "FIL-TRANS-KIT", 1);

  // Cooling system
  addPmPart("Cooling System Service", "COOL-5050-20L", 1);
  addPmPart("Cooling System Service", "HSE-COOL-UPR", 1);
  addPmPart("Cooling System Service", "HSE-COOL-LWR", 1);

  // Drive belts
  addPmPart("Drive Belt Inspection & Replacement", "BLT-DRIVE-SET", 1);
  addPmPart("Drive Belt Inspection & Replacement", "BLT-SERP-BUS", 1);

  // HVAC
  addPmPart("HVAC System Service", "FIL-HVAC-BUS", 1);

  // Safety inspection
  addPmPart("Safety Inspection (CVOR)", "SAF-TRI-KIT", 1);
  addPmPart("Safety Inspection (CVOR)", "SAF-EXT-5LB", 1);

  // Tire rotation
  addPmPart("Tire Rotation & Inspection", "WHL-STUD-KIT", 1);

  // Differential
  addPmPart("Differential Service", "FLU-DIFF-80W90", 2);

  // Wiper blades
  addPmPart("Wiper Blade Replacement", "WPR-BLD-PAIR", 1);

  if (pmPartValues.length > 0) {
    await db.insert(pmSchedulePartsTable).values(pmPartValues).onConflictDoNothing();
    console.log(`Inserted ${pmPartValues.length} PM schedule parts`);
  }

  // Seed buses (realistic DRT fleet)
  const busValues = [
    { busNumber: "9001", model: "New Flyer XD40", year: 2019, currentOdometer: "245000", monthlyDistance: "8500", lastPmDate: "2026-01-15", lastPmOdometer: "236000", status: "active", notes: "Route 223" },
    { busNumber: "9002", model: "New Flyer XD40", year: 2019, currentOdometer: "251000", monthlyDistance: "8800", lastPmDate: "2026-01-20", lastPmOdometer: "243000", status: "active", notes: "Route 216" },
    { busNumber: "9003", model: "New Flyer XD40", year: 2020, currentOdometer: "198000", monthlyDistance: "9000", lastPmDate: "2026-02-01", lastPmOdometer: "190000", status: "active", notes: "Route 407" },
    { busNumber: "9012", model: "Nova Bus LFS", year: 2018, currentOdometer: "312000", monthlyDistance: "7500", lastPmDate: "2025-12-10", lastPmOdometer: "298000", status: "active", notes: "Route 915" },
    { busNumber: "9013", model: "Nova Bus LFS", year: 2018, currentOdometer: "325000", monthlyDistance: "7800", lastPmDate: "2025-11-25", lastPmOdometer: "310000", status: "active", notes: "Route 920" },
    { busNumber: "9025", model: "Prevost H3-45", year: 2021, currentOdometer: "145000", monthlyDistance: "6500", lastPmDate: "2026-02-10", lastPmOdometer: "139000", status: "active", notes: "Express Route" },
    { busNumber: "9030", model: "New Flyer XDE40", year: 2022, currentOdometer: "98000", monthlyDistance: "9200", lastPmDate: "2026-02-20", lastPmOdometer: "91000", status: "active", notes: "Route 221" },
    { busNumber: "9031", model: "New Flyer XDE40", year: 2022, currentOdometer: "102000", monthlyDistance: "8900", lastPmDate: "2026-02-18", lastPmOdometer: "94000", status: "active", notes: "Route 225" },
    { busNumber: "9045", model: "Nova Bus LFS HEV", year: 2023, currentOdometer: "52000", monthlyDistance: "9500", lastPmDate: "2026-02-25", lastPmOdometer: "43000", status: "active", notes: "Hybrid - Route 910" },
    { busNumber: "8901", model: "New Flyer D40LF", year: 2015, currentOdometer: "485000", monthlyDistance: "6000", lastPmDate: "2025-10-01", lastPmOdometer: "465000", status: "maintenance", notes: "In shop for engine overhaul" },
  ];

  const buses = await db
    .insert(busesTable)
    .values(busValues)
    .onConflictDoNothing()
    .returning();

  console.log(`Inserted ${buses.length} buses`);
  console.log("Seeding complete!");
}

seed().catch(console.error).finally(() => process.exit(0));
