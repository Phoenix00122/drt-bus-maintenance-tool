import { pgTable, serial, text, numeric, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const partCategoryEnum = pgEnum("part_category", [
  "engine", "transmission", "brakes", "tires", "electrical", "body", "hvac", "safety", "fluids", "filters"
]);

export const partsTable = pgTable("parts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  partNumber: text("part_number").notNull().unique(),
  category: text("category").notNull(),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull(),
  unit: text("unit").notNull().default("each"),
  supplier: text("supplier"),
  stockLevel: integer("stock_level").notNull().default(0),
});

export const insertPartSchema = createInsertSchema(partsTable).omit({ id: true });
export type InsertPart = z.infer<typeof insertPartSchema>;
export type Part = typeof partsTable.$inferSelect;
