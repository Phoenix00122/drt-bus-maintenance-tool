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

function getPmLevel(name: string): string {
  if (/cvor/i.test(name)) return "CVOR";
  const m = name.match(/^([A-D])\s/);
  return m ? m[1] : "?";
}

const LEVEL_ORDER: Record<string, number> = { A: 1, B: 2, C: 3, D: 4, CVOR: 5 };

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
      unit: partsTable.unit,
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

    const busActivities: {
      pm: typeof pmSchedules[0];
      dueDate: Date;
      daysUntilDue: number;
      percentUsed: number;
    }[] = [];

    for (const pm of pmSchedules) {
      const intervalKm = pm.intervalKm ? Number(pm.intervalKm) : null;
      const intervalDays = pm.intervalDays ?? null;

      let dueDate: Date | null = null;
      let daysUntilDue = 0;
      let percentUsed = 0;

      if (intervalKm) {
        const kmSinceLastPm = currentOdometer - lastPmOdometer;
        const kmIntoCurrentInterval = kmSinceLastPm % intervalKm;
        const kmUntilDue = intervalKm - kmIntoCurrentInterval;
        percentUsed = Math.round((kmIntoCurrentInterval / intervalKm) * 100);
        daysUntilDue = Math.round(kmUntilDue / dailyDistance);
        dueDate = addDays(today, daysUntilDue);
      } else if (intervalDays) {
        const daysSinceLastPm = Math.floor(
          (today.getTime() - lastPmDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const daysIntoInterval = daysSinceLastPm % intervalDays;
        daysUntilDue = intervalDays - daysIntoInterval;
        percentUsed = Math.round((daysIntoInterval / intervalDays) * 100);
        dueDate = addDays(today, daysUntilDue);
      }

      if (dueDate && dueDate <= forecastEnd) {
        busActivities.push({ pm, dueDate, daysUntilDue, percentUsed });
      }
    }

    busActivities.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    // Bundling rules:
    // 1. Only combine services within BUNDLE_WINDOW_DAYS of the anchor service.
    // 2. A secondary service is only added to a bundle if it is >= PULL_FORWARD_MIN_PERCENT
    //    through its own interval — meaning the part genuinely needs replacement soon.
    //    Services that still have plenty of life left are NOT pulled forward.
    const BUNDLE_WINDOW_DAYS = 7;
    const PULL_FORWARD_MIN_PERCENT = 75;

    const grouped: typeof busActivities[] = [];
    for (const activity of busActivities) {
      let placed = false;
      for (const group of grouped) {
        const daysDiff = activity.daysUntilDue - group[0].daysUntilDue;
        if (daysDiff <= BUNDLE_WINDOW_DAYS && activity.percentUsed >= PULL_FORWARD_MIN_PERCENT) {
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

      // Identify the highest-level PM in the group; it supersedes lower levels
      // since higher PM schedules already include all lower-level parts.
      const sortedByLevel = [...group].sort(
        (a, b) =>
          (LEVEL_ORDER[getPmLevel(b.pm.name)] ?? 0) - (LEVEL_ORDER[getPmLevel(a.pm.name)] ?? 0)
      );
      const highestLevelPm = sortedByLevel[0];

      const highestLevelPartIds = new Set(
        pmParts.filter((p) => p.pmScheduleId === highestLevelPm.pm.id).map((p) => p.partId)
      );

      const bundleDate = group.reduce((earliest, g) =>
        g.daysUntilDue < earliest.daysUntilDue ? g : earliest
      ).dueDate;

      const activities = group.map((g) => g.pm.name);

      // Build parts list using MAX quantity per part — never sum duplicate parts
      // that appear in both a lower and higher PM level.
      const partMap = new Map<
        number,
        {
          partId: number;
          partName: string;
          partNumber: string;
          unit: string;
          quantity: number;
          unitCost: number;
          pulledForward: boolean;
          daysEarly: number;
        }
      >();
      let totalHours = 0;

      for (const { pm, daysUntilDue } of group) {
        totalHours += Number(pm.estimatedHours);
        const parts = pmParts.filter((p) => p.pmScheduleId === pm.id);
        const anchorDays = group[0].daysUntilDue;

        for (const p of parts) {
          if (!p.partId) continue;
          const unitCost = Number(p.unitCost ?? 0);
          const isInHighestLevel = highestLevelPartIds.has(p.partId);
          const daysEarly = isInHighestLevel ? 0 : Math.max(0, daysUntilDue - anchorDays);
          const existing = partMap.get(p.partId);

          if (existing) {
            // Take the MAXIMUM quantity — never accumulate duplicates across PM levels
            existing.quantity = Math.max(existing.quantity, p.quantity);
            // If this part is in the highest PM level it's not "pulled forward"
            if (isInHighestLevel) {
              existing.pulledForward = false;
              existing.daysEarly = 0;
            }
          } else {
            partMap.set(p.partId, {
              partId: p.partId,
              partName: p.partName ?? "",
              partNumber: p.partNumber ?? "",
              unit: p.unit ?? "each",
              quantity: p.quantity,
              unitCost,
              pulledForward: !isInHighestLevel,
              daysEarly,
            });
          }
        }
      }

      const partsArray = Array.from(partMap.values()).map((p) => ({
        ...p,
        totalCost: p.quantity * p.unitCost,
      }));

      // Separate genuinely-due parts from parts being pulled forward
      const dueParts = partsArray.filter((p) => !p.pulledForward);
      const pulledForwardParts = partsArray.filter((p) => p.pulledForward);

      const totalCost = partsArray.reduce((sum, p) => sum + p.totalCost, 0);
      const dueCost = dueParts.reduce((sum, p) => sum + p.totalCost, 0);
      const pulledCost = pulledForwardParts.reduce((sum, p) => sum + p.totalCost, 0);

      const laborSavingHours = group.length > 1 ? (group.length - 1) * 0.5 : 0;
      const laborRatePerHour = 95;
      const laborSavingDollars = laborSavingHours * laborRatePerHour;
      const netSavings = laborSavingDollars - pulledCost;

      const savingsNote =
        group.length > 1
          ? netSavings >= 0
            ? `Bundling saves ~$${netSavings.toFixed(0)} net (${laborSavingHours.toFixed(1)}h labor saved vs $${pulledCost.toFixed(0)} early parts)`
            : `Bundling saves ${laborSavingHours.toFixed(1)}h labor but costs $${Math.abs(netSavings).toFixed(0)} more in early parts — review before ordering`
          : null;

      bundles.push({
        bundleName:
          group.length > 1
            ? `Bundle: ${activities.slice(0, 2).join(" + ")}${activities.length > 2 ? ` +${activities.length - 2} more` : ""}`
            : activities[0],
        description: `${group.length} maintenance activit${group.length === 1 ? "y" : "ies"} for Bus #${bus.busNumber}`,
        activities,
        scheduledDate: formatDate(bundleDate),
        busId: bus.id,
        busNumber: bus.busNumber,
        // Only include parts that are genuinely due — pulled-forward parts shown separately
        parts: dueParts,
        pulledForwardParts,
        totalCost,
        dueCost,
        pulledCost,
        estimatedHours: totalHours - laborSavingHours,
        laborSavingHours,
        savingsNote,
        netSavings,
      });
    }
  }

  bundles.sort((a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime());
  res.json(bundles);
});

export default router;
