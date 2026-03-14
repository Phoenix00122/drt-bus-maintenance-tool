import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { busesTable, pmSchedulesTable, pmSchedulePartsTable, partsTable } from "@workspace/db";
import { inArray, eq } from "drizzle-orm";
import { GenerateForecastBody } from "@workspace/api-zod";

const router: IRouter = Router();

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

router.post("/forecast", async (req, res) => {
  const body = GenerateForecastBody.parse(req.body);
  const { forecastMonths, busIds } = body;

  const forecastDays = forecastMonths * 30;
  const today = new Date();
  const forecastEnd = addDays(today, forecastDays);

  let buses = await db.select().from(busesTable).orderBy(busesTable.busNumber);
  if (busIds && busIds.length > 0) {
    buses = buses.filter((b) => busIds.includes(b.id));
  }

  const pmSchedules = await db.select().from(pmSchedulesTable);
  const pmParts = await db
    .select({
      pmScheduleId: pmSchedulePartsTable.pmScheduleId,
      partId: partsTable.id,
      partName: partsTable.name,
      partNumber: partsTable.partNumber,
      unitCost: partsTable.unitCost,
      unit: partsTable.unit,
      quantity: pmSchedulePartsTable.quantity,
    })
    .from(pmSchedulePartsTable)
    .leftJoin(partsTable, eq(pmSchedulePartsTable.partId, partsTable.id));

  const forecasts = buses.map((bus) => {
    const currentOdometer = Number(bus.currentOdometer);
    const monthlyDistance = Number(bus.monthlyDistance);
    const lastPmDate = new Date(bus.lastPmDate);
    const lastPmOdometer = Number(bus.lastPmOdometer);
    const dailyDistance = monthlyDistance / 30;

    const scheduledActivities = [];

    for (const pm of pmSchedules) {
      const parts = pmParts
        .filter((p) => p.pmScheduleId === pm.id)
        .map((p) => ({
          partId: p.partId ?? 0,
          partName: p.partName ?? "",
          partNumber: p.partNumber ?? "",
          quantity: p.quantity,
          unit: p.unit ?? "ea",
        }));

      const intervalKm = pm.intervalKm ? Number(pm.intervalKm) : null;
      const intervalDays = pm.intervalDays ?? null;

      // Calculate next due based on km interval
      if (intervalKm) {
        const kmSinceLastPm = currentOdometer - lastPmOdometer;
        const kmUntilDue = intervalKm - (kmSinceLastPm % intervalKm);
        const daysUntilDue = Math.round(kmUntilDue / dailyDistance);
        const dueDate = addDays(today, daysUntilDue);
        const dueOdometer = currentOdometer + kmUntilDue;

        if (dueDate <= forecastEnd) {
          const urgency = daysUntilDue <= 0 ? "overdue" : daysUntilDue <= 14 ? "urgent" : daysUntilDue <= 30 ? "upcoming" : "scheduled";
          scheduledActivities.push({
            pmScheduleId: pm.id,
            pmName: pm.name,
            category: pm.category,
            estimatedDueDate: formatDate(dueDate),
            estimatedDueOdometer: Math.round(dueOdometer),
            dueInDays: daysUntilDue,
            estimatedHours: Number(pm.estimatedHours),
            urgency,
            parts,
          });
        }
      }

      // Calculate next due based on day interval
      if (intervalDays && !intervalKm) {
        const daysSinceLastPm = Math.floor((today.getTime() - lastPmDate.getTime()) / (1000 * 60 * 60 * 24));
        const daysUntilDue = intervalDays - (daysSinceLastPm % intervalDays);
        const dueDate = addDays(today, daysUntilDue);
        const dueOdometer = currentOdometer + (daysUntilDue * dailyDistance);

        if (dueDate <= forecastEnd) {
          const urgency = daysUntilDue <= 0 ? "overdue" : daysUntilDue <= 14 ? "urgent" : daysUntilDue <= 30 ? "upcoming" : "scheduled";
          scheduledActivities.push({
            pmScheduleId: pm.id,
            pmName: pm.name,
            category: pm.category,
            estimatedDueDate: formatDate(dueDate),
            estimatedDueOdometer: Math.round(dueOdometer),
            dueInDays: daysUntilDue,
            estimatedHours: Number(pm.estimatedHours),
            urgency,
            parts,
          });
        }
      }
    }

    scheduledActivities.sort((a, b) => a.dueInDays - b.dueInDays);

    return {
      busId: bus.id,
      busNumber: bus.busNumber,
      busModel: `${bus.year} ${bus.model}`,
      scheduledActivities,
    };
  });

  // Build summary
  const allActivities = forecasts.flatMap((f) => f.scheduledActivities);
  const partsTotals = new Map<number, { partId: number; partName: string; partNumber: string; totalQuantity: number; totalCost: number; unitCost: number }>();

  for (const activity of allActivities) {
    for (const part of activity.parts) {
      const partCost = pmParts.find((p) => p.partId === part.partId);
      const unitCost = partCost ? Number(partCost.unitCost) : 0;
      const existing = partsTotals.get(part.partId);
      if (existing) {
        existing.totalQuantity += part.quantity;
        existing.totalCost += part.quantity * unitCost;
      } else {
        partsTotals.set(part.partId, {
          partId: part.partId,
          partName: part.partName,
          partNumber: part.partNumber,
          totalQuantity: part.quantity,
          totalCost: part.quantity * unitCost,
          unitCost,
        });
      }
    }
  }

  const topParts = Array.from(partsTotals.values())
    .sort((a, b) => b.totalQuantity - a.totalQuantity)
    .slice(0, 10);

  const totalPartsCost = topParts.reduce((sum, p) => sum + p.totalCost, 0);

  const summary = {
    totalActivities: allActivities.length,
    overdueCount: allActivities.filter((a) => a.urgency === "overdue").length,
    urgentCount: allActivities.filter((a) => a.urgency === "urgent").length,
    totalEstimatedHours: allActivities.reduce((sum, a) => sum + a.estimatedHours, 0),
    totalPartsCost,
    topPartsRequired: topParts,
  };

  res.json({ forecasts, summary });
});

export default router;
