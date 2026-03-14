import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  busesTable,
  pmSchedulesTable,
  pmSchedulePartsTable,
  partsTable,
  serviceLogsTable,
  serviceLogPartsTable,
} from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

function derivePmLevel(name: string | null | undefined): string {
  if (!name) return "?";
  if (/cvor/i.test(name)) return "CVOR";
  const match = name.match(/^([A-D])\s/);
  return match ? match[1] : "?";
}

router.get("/service-logs", async (_req, res) => {
  const logs = await db
    .select()
    .from(serviceLogsTable)
    .orderBy(desc(serviceLogsTable.serviceDate), desc(serviceLogsTable.createdAt))
    .limit(100);

  const buses = await db.select().from(busesTable);
  const schedules = await db.select().from(pmSchedulesTable);
  const busMap = Object.fromEntries(buses.map((b) => [b.id, b]));
  const schedMap = Object.fromEntries(schedules.map((s) => [s.id, s]));

  const partsMap: Record<number, any[]> = {};
  for (const log of logs) {
    const lp = await db
      .select()
      .from(serviceLogPartsTable)
      .where(eq(serviceLogPartsTable.logId, log.id));
    partsMap[log.id] = lp.map((p) => ({
      ...p,
      quantityUsed: Number(p.quantityUsed),
      unitCost: Number(p.unitCost),
      lineCost: Number(p.lineCost),
    }));
  }

  res.json(
    logs.map((l) => {
      const bus = busMap[l.busId ?? -1];
      const sched = schedMap[l.pmScheduleId ?? -1];
      return {
        id: l.id,
        busId: l.busId,
        pmScheduleId: l.pmScheduleId,
        serviceDate: l.serviceDate,
        mechanicName: l.mechanicName,
        odometerAtService: l.odometerAtService,
        notes: l.notes,
        totalCost: Number(l.totalCost),
        createdAt: l.createdAt,
        busNumber: bus?.busNumber ?? "—",
        busModel: bus?.model ?? "",
        pmName: sched?.name ?? null,
        serviceLevel: derivePmLevel(sched?.name),
        parts: partsMap[l.id] || [],
      };
    })
  );
});

router.get("/service-logs/pm-parts/:pmScheduleId", async (req, res) => {
  const pmScheduleId = parseInt(req.params.pmScheduleId);
  if (isNaN(pmScheduleId)) return res.json([]);
  const parts = await db
    .select({
      partNumber: partsTable.partNumber,
      partName: partsTable.name,
      unitCost: partsTable.unitCost,
      unit: partsTable.unit,
      defaultQty: pmSchedulePartsTable.quantity,
    })
    .from(pmSchedulePartsTable)
    .leftJoin(partsTable, eq(pmSchedulePartsTable.partId, partsTable.id))
    .where(eq(pmSchedulePartsTable.pmScheduleId, pmScheduleId));
  res.json(
    parts.map((p) => ({
      ...p,
      unitCost: Number(p.unitCost),
    }))
  );
});

router.post("/service-logs", async (req, res) => {
  const { busId, pmScheduleId, serviceDate, mechanicName, odometerAtService, notes, parts } =
    req.body;

  const totalCost = (parts || []).reduce(
    (sum: number, p: any) => sum + p.quantityUsed * p.unitCost,
    0
  );

  const [log] = await db
    .insert(serviceLogsTable)
    .values({
      busId: busId || null,
      pmScheduleId: pmScheduleId || null,
      serviceDate,
      mechanicName,
      odometerAtService: odometerAtService || null,
      notes: notes || null,
      totalCost: totalCost.toFixed(2),
    })
    .returning();

  if (parts && parts.length > 0) {
    await db.insert(serviceLogPartsTable).values(
      parts.map((p: any) => ({
        logId: log.id,
        partNumber: p.partNumber,
        partName: p.partName,
        quantityUsed: p.quantityUsed.toString(),
        unitCost: p.unitCost.toString(),
        unit: p.unit || "ea",
        lineCost: (p.quantityUsed * p.unitCost).toFixed(2),
      }))
    );
  }

  if (busId && odometerAtService && serviceDate) {
    await db
      .update(busesTable)
      .set({ lastPmDate: serviceDate, lastPmOdometer: odometerAtService.toString() })
      .where(eq(busesTable.id, busId));
  }

  res.json({ success: true, logId: log.id });
});

export default router;
