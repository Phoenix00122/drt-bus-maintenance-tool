import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { busesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateBusBody,
  UpdateBusBody,
  UpdateBusParams,
  DeleteBusParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/buses", async (_req, res) => {
  const buses = await db.select().from(busesTable).orderBy(busesTable.busNumber);
  res.json(buses);
});

router.post("/buses", async (req, res) => {
  const body = CreateBusBody.parse(req.body);
  const [bus] = await db.insert(busesTable).values(body).returning();
  res.status(201).json(bus);
});

router.put("/buses/:id", async (req, res) => {
  const { id } = UpdateBusParams.parse(req.params);
  const body = UpdateBusBody.parse(req.body);
  const [bus] = await db.update(busesTable).set(body).where(eq(busesTable.id, id)).returning();
  if (!bus) {
    res.status(404).json({ error: "Bus not found" });
    return;
  }
  res.json(bus);
});

router.delete("/buses/:id", async (req, res) => {
  const { id } = DeleteBusParams.parse(req.params);
  await db.delete(busesTable).where(eq(busesTable.id, id));
  res.status(204).end();
});

export default router;
