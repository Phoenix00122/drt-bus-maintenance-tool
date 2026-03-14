import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { busesTable, pmSchedulesTable, pmSchedulePartsTable, partsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

router.get("/parts-bundles", async (req, res) => {
  const months = req.query["months"] ? Number(req.query["months"]) : 3;
  const busIdParam = req.query["busId"] ? Number(req.query["busId"]) : null;

  const forecastDays = months * 30;
  const today = new Date();
  const forecastEnd = addDays(today, forecastDays);

  let buses = await db.select().from(busesTable).where(eq(busesTable.status, "active")).orderBy(busesTable.busNumber);
  if (busIdParam) {
    buses = buses.filter((b) => b.id === busIdParam);
  }

  const pmSchedules = await db.select().from(pmSchedulesTable);
  const pmParts = await db
    .select({
      pmScheduleId: pmSchedulePartsTable.pmScheduleId,
      partId: partsTable.id,
      partName: partsTable.name,
      partNumber: partsTable.partNumber,
      unitCost: partsTable.unitCost,
      quantity: pmSchedulePartsTable.quantity,
    })
    .from(pmSchedulePartsTable)
    .leftJoin(partsTable, eq(pmSchedulePartsTable.partId, partsTable.id));

  const bundles = [];

  for (const bus of buses) {
    const currentOdometer = Number(bus.currentOdometer);
    const monthlyDistance = Number(bus.monthlyDistance);
    const lastPmDate = new Date(bus.lastPmDate);
    const lastPmOdometer = Number(bus.lastPmOdometer);
    const dailyDistance = monthlyDistance / 30;

    const busActivities: { pm: typeof pmSchedules[0]; dueDate: Date; daysUntilDue: number }[] = [];

    for (const pm of pmSchedules) {
      const intervalKm = pm.intervalKm ? Number(pm.intervalKm) : null;
      const intervalDays = pm.intervalDays ?? null;

      let dueDate: Date | null = null;
      let daysUntilDue = 0;

      if (intervalKm) {
        const kmSinceLastPm = currentOdometer - lastPmOdometer;
        const kmUntilDue = intervalKm - (kmSinceLastPm % intervalKm);
        daysUntilDue = Math.round(kmUntilDue / dailyDistance);
        dueDate = addDays(today, daysUntilDue);
      } else if (intervalDays) {
        const daysSinceLastPm = Math.floor((today.getTime() - lastPmDate.getTime()) / (1000 * 60 * 60 * 24));
        daysUntilDue = intervalDays - (daysSinceLastPm % intervalDays);
        dueDate = addDays(today, daysUntilDue);
      }

      if (dueDate && dueDate <= forecastEnd) {
        busActivities.push({ pm, dueDate, daysUntilDue });
      }
    }

    // Group activities within 7 days of each other into bundles
    busActivities.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    const grouped: typeof busActivities[] = [];
    for (const activity of busActivities) {
      let placed = false;
      for (const group of grouped) {
        const firstDate = group[0].dueDate;
        const daysDiff = Math.abs(activity.daysUntilDue - group[0].daysUntilDue);
        if (daysDiff <= 14) {
          group.push(activity);
          placed = true;
          break;
        }
      }
      if (!placed) {
        grouped.push([activity]);
      }
    }

    for (const group of grouped) {
      if (group.length < 1) continue;

      const bundleDate = group[0].dueDate;
      const activities = group.map((g) => g.pm.name);

      // Collect all parts for this bundle
      const partMap = new Map<number, { partId: number; partName: string; partNumber: string; quantity: number; unitCost: number }>();
      let totalHours = 0;

      for (const { pm } of group) {
        totalHours += Number(pm.estimatedHours);
        const parts = pmParts.filter((p) => p.pmScheduleId === pm.id);
        for (const p of parts) {
          if (!p.partId) continue;
          const unitCost = Number(p.unitCost ?? 0);
          const existing = partMap.get(p.partId);
          if (existing) {
            existing.quantity += p.quantity;
          } else {
            partMap.set(p.partId, {
              partId: p.partId,
              partName: p.partName ?? "",
              partNumber: p.partNumber ?? "",
              quantity: p.quantity,
              unitCost,
            });
          }
        }
      }

      const parts = Array.from(partMap.values()).map((p) => ({
        ...p,
        totalCost: p.quantity * p.unitCost,
      }));

      const totalCost = parts.reduce((sum, p) => sum + p.totalCost, 0);

      // Labor saving: bundling saves ~30min per extra activity
      const laborSavings = group.length > 1 ? (group.length - 1) * 0.5 : 0;
      const savingsNote = group.length > 1
        ? `Bundling ${group.length} activities saves ~${laborSavings.toFixed(1)}h of labor`
        : null;

      bundles.push({
        bundleName: group.length > 1
          ? `Bundle: ${activities.slice(0, 2).join(" + ")}${activities.length > 2 ? ` +${activities.length - 2} more` : ""}`
          : activities[0],
        description: `${group.length} maintenance activities for Bus #${bus.busNumber}`,
        activities,
        scheduledDate: formatDate(bundleDate),
        busId: bus.id,
        busNumber: bus.busNumber,
        parts,
        totalCost,
        estimatedHours: totalHours - laborSavings,
        savingsNote,
      });
    }
  }

  bundles.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  res.json(bundles);
});

export default router;
