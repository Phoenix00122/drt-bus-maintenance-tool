import sqlite3
import os
from contextlib import contextmanager
from datetime import date, timedelta
import random

DB_PATH = os.path.join(os.path.dirname(__file__), "drt.db")


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS buses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bus_number TEXT NOT NULL UNIQUE,
                model TEXT NOT NULL,
                year INTEGER NOT NULL,
                current_odometer INTEGER NOT NULL DEFAULT 0,
                monthly_distance INTEGER NOT NULL DEFAULT 9000,
                last_pm_date TEXT,
                last_pm_odometer INTEGER NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'active',
                notes TEXT
            );

            CREATE TABLE IF NOT EXISTS parts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                part_number TEXT NOT NULL UNIQUE,
                part_name TEXT NOT NULL,
                category TEXT NOT NULL,
                unit_cost REAL NOT NULL DEFAULT 0,
                stock_quantity INTEGER NOT NULL DEFAULT 0,
                min_stock INTEGER NOT NULL DEFAULT 5,
                unit TEXT NOT NULL DEFAULT 'ea'
            );

            CREATE TABLE IF NOT EXISTS pm_schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                service_level TEXT NOT NULL,
                interval_km INTEGER,
                interval_days INTEGER,
                estimated_hours REAL NOT NULL DEFAULT 2.0,
                description TEXT
            );

            CREATE TABLE IF NOT EXISTS pm_parts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                pm_schedule_id INTEGER NOT NULL REFERENCES pm_schedules(id),
                part_id INTEGER NOT NULL REFERENCES parts(id),
                quantity INTEGER NOT NULL DEFAULT 1,
                applies_to_model TEXT
            );
        """)


def seed_db():
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) FROM buses").fetchone()[0]
        if count > 0:
            return

        parts_data = [
            ("LFP3000XL",    "Engine Oil Filter",          "Oil System",    18.50, 80, 20, "ea"),
            ("6359175",      "KleenOil Bypass Filter",     "Oil System",    42.00, 40, 10, "ea"),
            ("LAF2100",      "Air Filter Primary",         "Air System",    65.00, 40, 10, "ea"),
            ("LAF1878",      "Air Filter Secondary",       "Air System",    48.00, 40, 10, "ea"),
            ("6389969",      "Air Filter Element (Nova)",  "Air System",    72.00, 30, 8,  "ea"),
            ("FS1065FLG",    "Fuel Filter Primary",        "Fuel System",   28.00, 50, 15, "ea"),
            ("FF63008",      "Fuel Filter Secondary",      "Fuel System",   22.00, 50, 15, "ea"),
            ("FF5636FLG",    "Fuel Filter (Nova)",         "Fuel System",   31.00, 40, 10, "ea"),
            ("LFW4074",      "Coolant Filter",             "Cooling",       19.00, 60, 15, "ea"),
            ("6351580",      "Brake Slack Adjuster Clip",  "Brakes",         4.50, 200, 50, "ea"),
            ("246671",       "Barium Grease Cartridge",    "Lubrication",   12.00, 100, 25, "ea"),
            ("50900001A",    "Webasto Coolant Heater Filter","Heating",      38.00, 30, 8,  "ea"),
            ("6392223",      "DEF Filter",                 "Emissions",     24.00, 45, 12, "ea"),
            ("PF7977",       "Hydraulic Filter",           "Hydraulic",     55.00, 25, 6,  "ea"),
            ("LF9070",       "Crankcase Breather Filter",  "Engine",        42.00, 30, 8,  "ea"),
            ("TF1292",       "Transmission Filter Kit",    "Drivetrain",    89.00, 20, 5,  "ea"),
            ("6389720",      "Air Dryer Cartridge",        "Air System",   110.00, 20, 5,  "ea"),
            ("ENG-OIL-15W40","Engine Oil 15W-40 CK-4",      "Fluids",        14.50, 500, 100, "L"),
            ("TRANS-OIL",    "Transmission Fluid",         "Fluids",        18.00, 200, 40, "L"),
            ("COOLANT-EG",   "Extended-Life Coolant",      "Fluids",        12.00, 300, 60, "L"),
            ("DIFF-OIL",     "Differential Oil",           "Fluids",        16.00, 100, 20, "L"),
            ("HYDRAULIC-OIL","Hydraulic Oil",              "Fluids",        19.00, 80, 15, "L"),
        ]
        conn.executemany(
            "INSERT INTO parts (part_number, part_name, category, unit_cost, stock_quantity, min_stock, unit) VALUES (?,?,?,?,?,?,?)",
            parts_data
        )

        pm_data = [
            ("A Service – 10,000 km",  "A",  10000, None,  2.5,  "Oil filter, KleenOil, coolant filter, grease, brake check"),
            ("B Service – 20,000 km",  "B",  20000, None,  4.0,  "A + air filters, fuel filters, brake clips"),
            ("C Service – 40,000 km",  "C",  40000, None,  6.5,  "B + hydraulic filter, crankcase filter, trans filter, Webasto"),
            ("D Service – 80,000 km",  "D",  80000, None,  10.0, "C + air dryer, DEF filter, major fluid flush"),
            ("CVOR Annual Inspection", "CVOR", None, 365, 3.0,  "Annual roadworthiness inspection"),
        ]
        conn.executemany(
            "INSERT INTO pm_schedules (name, service_level, interval_km, interval_days, estimated_hours, description) VALUES (?,?,?,?,?,?)",
            pm_data
        )

        pm_a_id = conn.execute("SELECT id FROM pm_schedules WHERE service_level='A'").fetchone()[0]
        pm_b_id = conn.execute("SELECT id FROM pm_schedules WHERE service_level='B'").fetchone()[0]
        pm_c_id = conn.execute("SELECT id FROM pm_schedules WHERE service_level='C'").fetchone()[0]
        pm_d_id = conn.execute("SELECT id FROM pm_schedules WHERE service_level='D'").fetchone()[0]

        def part_id(pnum):
            row = conn.execute("SELECT id FROM parts WHERE part_number=?", (pnum,)).fetchone()
            return row[0] if row else None

        pm_parts = [
            (pm_a_id, "LFP3000XL", 1, None),
            (pm_a_id, "6359175",   1, None),
            (pm_a_id, "LFW4074",   1, None),
            (pm_a_id, "246671",    4, None),
            (pm_a_id, "ENG-OIL-15W40", 25, None),
            (pm_b_id, "LFP3000XL", 1, None),
            (pm_b_id, "LAF2100",   1, None),
            (pm_b_id, "LAF1878",   1, None),
            (pm_b_id, "FS1065FLG", 1, None),
            (pm_b_id, "FF63008",   1, None),
            (pm_b_id, "LFW4074",   1, None),
            (pm_b_id, "6351580",   6, None),
            (pm_b_id, "246671",    4, None),
            (pm_b_id, "ENG-OIL-15W40", 25, None),
            (pm_c_id, "LFP3000XL", 1, None),
            (pm_c_id, "LAF2100",   1, None),
            (pm_c_id, "LAF1878",   1, None),
            (pm_c_id, "FS1065FLG", 1, None),
            (pm_c_id, "FF63008",   1, None),
            (pm_c_id, "LFW4074",   1, None),
            (pm_c_id, "PF7977",    1, None),
            (pm_c_id, "LF9070",    1, None),
            (pm_c_id, "TF1292",    1, None),
            (pm_c_id, "50900001A", 1, None),
            (pm_c_id, "6351580",   6, None),
            (pm_c_id, "246671",    6, None),
            (pm_c_id, "ENG-OIL-15W40", 25, None),
            (pm_c_id, "TRANS-OIL", 8, None),
            (pm_c_id, "HYDRAULIC-OIL", 6, None),
            (pm_d_id, "LFP3000XL", 1, None),
            (pm_d_id, "LAF2100",   1, None),
            (pm_d_id, "LAF1878",   1, None),
            (pm_d_id, "FS1065FLG", 1, None),
            (pm_d_id, "FF63008",   1, None),
            (pm_d_id, "LFW4074",   1, None),
            (pm_d_id, "PF7977",    1, None),
            (pm_d_id, "LF9070",    1, None),
            (pm_d_id, "TF1292",    1, None),
            (pm_d_id, "50900001A", 1, None),
            (pm_d_id, "6392223",   1, None),
            (pm_d_id, "6389720",   1, None),
            (pm_d_id, "6351580",   6, None),
            (pm_d_id, "246671",    8, None),
            (pm_d_id, "ENG-OIL-15W40", 25, None),
            (pm_d_id, "TRANS-OIL", 8, None),
            (pm_d_id, "HYDRAULIC-OIL", 6, None),
            (pm_d_id, "COOLANT-EG", 40, None),
            (pm_d_id, "DIFF-OIL", 6, None),
        ]

        for pm_id, pnum, qty, model in pm_parts:
            pid = part_id(pnum)
            if pid:
                conn.execute(
                    "INSERT INTO pm_parts (pm_schedule_id, part_id, quantity, applies_to_model) VALUES (?,?,?,?)",
                    (pm_id, pid, qty, model)
                )

        today = date.today()
        bus_families = [
            ("84", "New Flyer D40LF",       range(8442, 8474, 4), 2007, 2011, 580000, 700000, 6500,  7500),
            ("85", "New Flyer Xcelsior XD40",range(8501, 8550, 3), 2010, 2014, 380000, 510000, 7200,  8200),
            ("86", "New Flyer Xcelsior XD40",range(8601, 8627, 4), 2015, 2018, 220000, 350000, 8500,  9500),
            ("61", "Nova Bus LFS",           range(6100, 6120, 3), 2017, 2019, 195000, 280000, 9000,  9800),
            ("62", "Nova Bus HEV Hybrid",    range(6120, 6130, 2), 2018, 2020, 180000, 250000, 9200,  10000),
            ("63", "Nova LFSe BEB Electric", range(6130, 6136, 1), 2021, 2023, 80000,  140000, 9500,  10500),
            ("64", "Nova Bus LFS",           range(6136, 6158, 3), 2019, 2021, 155000, 220000, 9000,  9800),
            ("71", "Nova Bus LFS",           range(7100, 7125, 3), 2020, 2022, 130000, 190000, 9200,  10000),
            ("91", "Nova Bus LFS",           range(9100, 9108, 2), 2022, 2024, 60000,  110000, 9500,  10200),
        ]

        buses = []
        routes = ["Route 215", "Route 221", "Route 301", "Route 407", "Route 410",
                  "Route 501", "Route 910", "Route 916", "Route 922", "Route 223"]
        random.seed(42)

        for _, model, num_range, yr_min, yr_max, odo_min, odo_max, mo_min, mo_max in bus_families:
            for num in num_range:
                yr = random.randint(yr_min, yr_max)
                odo = random.randint(odo_min, odo_max)
                mo = random.randint(mo_min, mo_max)
                last_pm_odo = odo - random.randint(1000, 9500)
                days_ago = random.randint(10, 120)
                last_pm_date = (today - timedelta(days=days_ago)).isoformat()
                status = "maintenance" if random.random() < 0.08 else "active"
                note = random.choice(routes) if status == "active" else f"In shop — {random.choice(['brake', 'engine', 'cooling'])} issue"
                buses.append((
                    str(num), model, yr, odo, mo,
                    last_pm_date, max(0, last_pm_odo),
                    status, note
                ))

        conn.executemany(
            """INSERT INTO buses
               (bus_number, model, year, current_odometer, monthly_distance,
                last_pm_date, last_pm_odometer, status, notes)
               VALUES (?,?,?,?,?,?,?,?,?)""",
            buses
        )


def get_dashboard_stats():
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM buses").fetchone()[0]
        active = conn.execute("SELECT COUNT(*) FROM buses WHERE status='active'").fetchone()[0]
        maintenance = conn.execute("SELECT COUNT(*) FROM buses WHERE status='maintenance'").fetchone()[0]
        parts_count = conn.execute("SELECT COUNT(*) FROM parts").fetchone()[0]
        low_stock = conn.execute("SELECT COUNT(*) FROM parts WHERE stock_quantity < min_stock").fetchone()[0]
        return {
            "total_buses": total,
            "active_buses": active,
            "in_shop": maintenance,
            "parts_count": parts_count,
            "low_stock": low_stock,
        }
