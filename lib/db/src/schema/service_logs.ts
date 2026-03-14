import { pgTable, serial, text, numeric, integer, timestamp } from "drizzle-orm/pg-core";

export const serviceLogsTable = pgTable("service_logs", {
  id: serial("id").primaryKey(),
  busId: integer("bus_id"),
  pmScheduleId: integer("pm_schedule_id"),
  serviceDate: text("service_date").notNull(),
  mechanicName: text("mechanic_name").notNull(),
  odometerAtService: integer("odometer_at_service"),
  notes: text("notes"),
  totalCost: numeric("total_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceLogPartsTable = pgTable("service_log_parts", {
  id: serial("id").primaryKey(),
  logId: integer("log_id").notNull(),
  partNumber: text("part_number").notNull(),
  partName: text("part_name").notNull(),
  quantityUsed: numeric("quantity_used", { precision: 10, scale: 2 }).notNull().default("1"),
  unitCost: numeric("unit_cost", { precision: 10, scale: 2 }).notNull().default("0"),
  unit: text("unit").notNull().default("ea"),
  lineCost: numeric("line_cost", { precision: 10, scale: 2 }).notNull().default("0"),
});

export type ServiceLog = typeof serviceLogsTable.$inferSelect;
export type ServiceLogPart = typeof serviceLogPartsTable.$inferSelect;
