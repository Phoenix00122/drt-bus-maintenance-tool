import { pgTable, serial, text, numeric, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const pmSchedulesTable = pgTable("pm_schedules", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  intervalKm: numeric("interval_km", { precision: 10, scale: 2 }),
  intervalDays: integer("interval_days"),
  category: text("category").notNull(),
  estimatedHours: numeric("estimated_hours", { precision: 5, scale: 2 }).notNull(),
});

export const pmSchedulePartsTable = pgTable("pm_schedule_parts", {
  id: serial("id").primaryKey(),
  pmScheduleId: integer("pm_schedule_id").notNull().references(() => pmSchedulesTable.id),
  partId: integer("part_id").notNull(),
  quantity: integer("quantity").notNull().default(1),
});

export const insertPmScheduleSchema = createInsertSchema(pmSchedulesTable).omit({ id: true });
export type InsertPmSchedule = z.infer<typeof insertPmScheduleSchema>;
export type PmSchedule = typeof pmSchedulesTable.$inferSelect;

export const insertPmSchedulePartSchema = createInsertSchema(pmSchedulePartsTable).omit({ id: true });
export type InsertPmSchedulePart = z.infer<typeof insertPmSchedulePartSchema>;
