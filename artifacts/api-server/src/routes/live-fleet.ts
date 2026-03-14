import { Router, type IRouter } from "express";
import { createRequire } from "module";
import { db } from "@workspace/db";
import { busesTable } from "@workspace/db";

const require = createRequire(import.meta.url);
const GtfsRealtimeBindings = require("gtfs-realtime-bindings");

const router: IRouter = Router();

const GTFS_RT_URL = "https://drtonline.durhamregiontransit.com/gtfsrealtime/VehiclePositions";

const STATUS_MAP: Record<number, string> = {
  0: "INCOMING_AT",
  1: "STOPPED_AT",
  2: "IN_TRANSIT_TO",
};

router.get("/live-fleet", async (_req, res) => {
  try {
    // Fetch the GTFS-RT binary feed
    const response = await fetch(GTFS_RT_URL);
    if (!response.ok) {
      res.status(502).json({ error: "Failed to fetch DRT GTFS-RT feed" });
      return;
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    // Parse protobuf
    const feed = GtfsRealtimeBindings.transit_realtime.FeedMessage.decode(buffer);

    // Get all buses from our database for comparison
    const dbBuses = await db.select().from(busesTable);
    const dbBusMap = new Map(dbBuses.map((b) => [b.busNumber, b]));

    const vehicles = feed.entity
      .filter((entity: any) => entity.vehicle)
      .map((entity: any) => {
        const v = entity.vehicle;
        // vehicleLabel from protobuf may be empty; fall back to entity.id which IS the bus number
        const label = (v.vehicle?.label && v.vehicle.label !== "") ? v.vehicle.label : (entity.id ?? "");
        const dbBus = dbBusMap.get(label);

        return {
          vehicleId: entity.id,
          vehicleLabel: label,
          latitude: v.position?.latitude ?? null,
          longitude: v.position?.longitude ?? null,
          routeId: v.trip?.routeId ?? null,
          tripId: v.trip?.tripId ?? null,
          currentStatus: STATUS_MAP[v.currentStatus ?? -1] ?? null,
          timestamp: v.timestamp ? Number(v.timestamp) : null,
          inOurDatabase: !!dbBus,
          dbBusId: dbBus?.id ?? null,
        };
      })
      .sort((a: any, b: any) => a.vehicleLabel.localeCompare(b.vehicleLabel));

    const matchedInDb = vehicles.filter((v: any) => v.inOurDatabase).length;

    res.json({
      vehicles,
      totalLive: vehicles.length,
      matchedInDb,
      notInDb: vehicles.length - matchedInDb,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Live fleet error:", err);
    res.status(500).json({ error: "Failed to parse GTFS-RT feed" });
  }
});

export default router;
