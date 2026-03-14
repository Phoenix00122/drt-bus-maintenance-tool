import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { pmSchedulesTable, pmSchedulePartsTable, partsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/pm-schedules", async (_req, res) => {
  const schedules = await db.select().from(pmSchedulesTable).orderBy(pmSchedulesTable.id);

  const scheduleParts = await db
    .select({
      pmScheduleId: pmSchedulePartsTable.pmScheduleId,
      partId: partsTable.id,
      partName: partsTable.name,
      partNumber: partsTable.partNumber,
      quantity: pmSchedulePartsTable.quantity,
    })
    .from(pmSchedulePartsTable)
    .leftJoin(partsTable, eq(pmSchedulePartsTable.partId, partsTable.id));

  const result = schedules.map((s) => ({
    ...s,
    intervalKm: s.intervalKm ? Number(s.intervalKm) : null,
    estimatedHours: Number(s.estimatedHours),
    parts: scheduleParts
      .filter((p) => p.pmScheduleId === s.id)
      .map((p) => ({
        partId: p.partId ?? 0,
        partName: p.partName ?? "",
        partNumber: p.partNumber ?? "",
        quantity: p.quantity,
      })),
  }));

  res.json(result);
});

export default router;
