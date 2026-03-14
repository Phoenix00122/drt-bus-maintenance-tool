import { pgTable, serial, text, numeric, integer, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const busStatusEnum = ["active", "inactive", "maintenance"] as const;

export const busesTable = pgTable("buses", {
  id: serial("id").primaryKey(),
  busNumber: text("bus_number").notNull().unique(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  currentOdometer: numeric("current_odometer", { precision: 10, scale: 2 }).notNull(),
  monthlyDistance: numeric("monthly_distance", { precision: 10, scale: 2 }).notNull(),
  lastPmDate: date("last_pm_date").notNull(),
  lastPmOdometer: numeric("last_pm_odometer", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
});

export const insertBusSchema = createInsertSchema(busesTable).omit({ id: true });
export type InsertBus = z.infer<typeof insertBusSchema>;
export type Bus = typeof busesTable.$inferSelect;
