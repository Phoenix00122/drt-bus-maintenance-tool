import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { partsTable } from "@workspace/db";

const router: IRouter = Router();

router.get("/parts", async (_req, res) => {
  const parts = await db.select().from(partsTable).orderBy(partsTable.category, partsTable.name);
  const result = parts.map((p) => ({
    ...p,
    unitCost: Number(p.unitCost),
  }));
  res.json(result);
});

export default router;
