import os
import math
import httpx
from datetime import date, timedelta, datetime
from fastapi import FastAPI, Request, Form, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from database import init_db, seed_db, get_db, get_dashboard_stats

BASE = os.path.dirname(__file__)

app = FastAPI(title="DRT Maintain — Python Edition")

templates = Jinja2Templates(directory=os.path.join(BASE, "templates"))
templates.env.filters["format_num"] = lambda v: f"{int(v):,}"
app.mount("/static", StaticFiles(directory=os.path.join(BASE, "static")), name="static")


@app.on_event("startup")
def startup():
    init_db()
    seed_db()


# ───────────────────────────────────────────────────────────
# Dashboard
# ───────────────────────────────────────────────────────────
@app.get("/", response_class=HTMLResponse)
def dashboard(request: Request):
    stats = get_dashboard_stats()
    with get_db() as conn:
        upcoming = conn.execute("""
            SELECT bus_number, model, current_odometer, monthly_distance, last_pm_odometer
            FROM buses WHERE status='active'
            ORDER BY (current_odometer - last_pm_odometer) DESC
            LIMIT 5
        """).fetchall()
        shop_buses = conn.execute("""
            SELECT bus_number, model, notes FROM buses WHERE status='maintenance' LIMIT 5
        """).fetchall()

    urgency_list = []
    for b in upcoming:
        km_since = b["current_odometer"] - b["last_pm_odometer"]
        pct = min(100, int(km_since / 10000 * 100))
        urgency_list.append({"bus": b["bus_number"], "model": b["model"], "pct": pct, "km": km_since})

    return templates.TemplateResponse("dashboard.html", {
        "request": request,
        "stats": stats,
        "urgency_list": urgency_list,
        "shop_buses": [dict(b) for b in shop_buses],
        "active_page": "dashboard",
    })


# ───────────────────────────────────────────────────────────
# Bus Fleet
# ───────────────────────────────────────────────────────────
def get_family(bus_number: str) -> str:
    try:
        n = int(bus_number)
    except ValueError:
        return "Other"
    if 8419 <= n <= 8473: return "New Flyer D40LF (84xx)"
    if 8501 <= n <= 8599: return "New Flyer Xcelsior (85xx)"
    if 8600 <= n <= 8699: return "New Flyer Xcelsior (86xx)"
    if 6100 <= n <= 6119: return "Nova Bus LFS (6100–6119)"
    if 6120 <= n <= 6129: return "Nova Bus HEV Hybrid"
    if 6130 <= n <= 6135: return "Nova LFSe BEB — Electric"
    if 6136 <= n <= 6157: return "Nova Bus LFS (6136–6157)"
    if 7100 <= n <= 7124: return "Nova Bus LFS (7100–7124)"
    if 9100 <= n <= 9107: return "Nova Bus LFS (9100–9107)"
    return "Other"


@app.get("/fleet", response_class=HTMLResponse)
def fleet_page(request: Request):
    return templates.TemplateResponse("fleet.html", {
        "request": request,
        "active_page": "fleet",
    })


@app.get("/fleet/table", response_class=HTMLResponse)
def fleet_table(request: Request, search: str = "", status: str = "all"):
    with get_db() as conn:
        q = "SELECT * FROM buses WHERE 1=1"
        params = []
        if search:
            q += " AND (bus_number LIKE ? OR model LIKE ?)"
            params += [f"%{search}%", f"%{search}%"]
        if status != "all":
            q += " AND status=?"
            params.append(status)
        q += " ORDER BY CAST(bus_number AS INTEGER)"
        buses = [dict(b) for b in conn.execute(q, params).fetchall()]

    families: dict[str, list] = {}
    for b in buses:
        fam = get_family(b["bus_number"])
        families.setdefault(fam, []).append(b)

    return templates.TemplateResponse("fragments/fleet_table.html", {
        "request": request,
        "families": families,
        "total": len(buses),
    })


@app.get("/fleet/stats", response_class=HTMLResponse)
def fleet_stats(request: Request):
    with get_db() as conn:
        active = conn.execute("SELECT COUNT(*) FROM buses WHERE status='active'").fetchone()[0]
        maint  = conn.execute("SELECT COUNT(*) FROM buses WHERE status='maintenance'").fetchone()[0]
        inact  = conn.execute("SELECT COUNT(*) FROM buses WHERE status='inactive'").fetchone()[0]
    return templates.TemplateResponse("fragments/fleet_stats.html", {
        "request": request, "active": active, "maint": maint, "inact": inact
    })


@app.get("/fleet/{bus_id}/edit-form", response_class=HTMLResponse)
def edit_bus_form(request: Request, bus_id: int):
    with get_db() as conn:
        bus = conn.execute("SELECT * FROM buses WHERE id=?", (bus_id,)).fetchone()
    if not bus:
        raise HTTPException(404)
    return templates.TemplateResponse("fragments/bus_form.html", {
        "request": request, "bus": dict(bus), "action": f"/fleet/{bus_id}/update"
    })


@app.get("/fleet/add-form", response_class=HTMLResponse)
def add_bus_form(request: Request):
    return templates.TemplateResponse("fragments/bus_form.html", {
        "request": request, "bus": None, "action": "/fleet/add"
    })


@app.post("/fleet/add", response_class=HTMLResponse)
def add_bus(
    request: Request,
    bus_number: str = Form(...),
    model: str = Form(...),
    year: int = Form(...),
    current_odometer: int = Form(...),
    monthly_distance: int = Form(...),
    last_pm_date: str = Form(...),
    last_pm_odometer: int = Form(...),
    status: str = Form("active"),
    notes: str = Form(""),
):
    with get_db() as conn:
        conn.execute(
            "INSERT INTO buses (bus_number,model,year,current_odometer,monthly_distance,last_pm_date,last_pm_odometer,status,notes) VALUES(?,?,?,?,?,?,?,?,?)",
            (bus_number, model, year, current_odometer, monthly_distance, last_pm_date, last_pm_odometer, status, notes)
        )
    return fleet_table(request)


@app.post("/fleet/{bus_id}/update", response_class=HTMLResponse)
def update_bus(
    request: Request,
    bus_id: int,
    bus_number: str = Form(...),
    model: str = Form(...),
    year: int = Form(...),
    current_odometer: int = Form(...),
    monthly_distance: int = Form(...),
    last_pm_date: str = Form(...),
    last_pm_odometer: int = Form(...),
    status: str = Form("active"),
    notes: str = Form(""),
):
    with get_db() as conn:
        conn.execute(
            "UPDATE buses SET bus_number=?,model=?,year=?,current_odometer=?,monthly_distance=?,last_pm_date=?,last_pm_odometer=?,status=?,notes=? WHERE id=?",
            (bus_number, model, year, current_odometer, monthly_distance, last_pm_date, last_pm_odometer, status, notes, bus_id)
        )
    return fleet_table(request)


@app.delete("/fleet/{bus_id}", response_class=HTMLResponse)
def delete_bus(request: Request, bus_id: int):
    with get_db() as conn:
        conn.execute("DELETE FROM buses WHERE id=?", (bus_id,))
    return fleet_table(request)


# ───────────────────────────────────────────────────────────
# PM Forecast
# ───────────────────────────────────────────────────────────
@app.get("/forecast", response_class=HTMLResponse)
def forecast_page(request: Request):
    return templates.TemplateResponse("forecast.html", {
        "request": request,
        "active_page": "forecast",
    })


@app.post("/forecast/generate", response_class=HTMLResponse)
def generate_forecast(request: Request, months: int = Form(6)):
    with get_db() as conn:
        buses = conn.execute("SELECT * FROM buses WHERE status='active'").fetchall()
        schedules = conn.execute("SELECT * FROM pm_schedules").fetchall()
        pm_parts_rows = conn.execute("""
            SELECT pp.pm_schedule_id, pp.quantity, p.part_number, p.part_name, p.unit_cost
            FROM pm_parts pp JOIN parts p ON pp.part_id = p.id
        """).fetchall()

    parts_by_pm: dict[int, list] = {}
    for r in pm_parts_rows:
        parts_by_pm.setdefault(r["pm_schedule_id"], []).append(dict(r))

    # Index schedules by service level for quick lookup
    sched_by_level = {s["service_level"]: s for s in schedules}

    today = date.today()
    horizon_days = months * 30

    # Service level hierarchy: at every 10k milestone, only do the highest applicable level.
    # Pattern repeats every 80k: A(10), B(20), A(30), C(40), A(50), B(60), A(70), D(80)
    def service_level_at(milestone_number: int) -> str:
        """Return the highest service level for a given 10k milestone count (1-based)."""
        if milestone_number % 8 == 0:
            return "D"
        if milestone_number % 4 == 0:
            return "C"
        if milestone_number % 2 == 0:
            return "B"
        return "A"

    BASE_INTERVAL = 10_000  # km — smallest service interval (A service)

    activities = []
    for bus in buses:
        odo       = bus["current_odometer"]
        mo_km     = bus["monthly_distance"] or 1
        last_odo  = bus["last_pm_odometer"]
        last_date = date.fromisoformat(bus["last_pm_date"]) if bus["last_pm_date"] else today

        km_since = max(0, odo - last_odo)

        # ── km-based services (A/B/C/D) ─────────────────────────────────────
        # Find how far we are into the current 10k window
        km_into_current = km_since % BASE_INTERVAL
        km_to_first     = BASE_INTERVAL - km_into_current  # km until next 10k milestone

        # How many complete 10k intervals have occurred since last PM?
        completed_intervals = km_since // BASE_INTERVAL

        milestone_offset = 0
        while True:
            km_ahead = km_to_first + milestone_offset * BASE_INTERVAL
            days_from_now = int(km_ahead / mo_km * 30)

            if days_from_now > horizon_days:
                break

            # The milestone number counts from the last full PM reset
            milestone_number = completed_intervals + 1 + milestone_offset
            level = service_level_at(milestone_number)

            sched = sched_by_level.get(level)
            if not sched:
                milestone_offset += 1
                continue

            due_date    = today + timedelta(days=days_from_now)
            due_in_days = days_from_now

            if due_in_days < 0:
                urgency = "overdue"
            elif due_in_days <= 30:
                urgency = "urgent"
            elif due_in_days <= 90:
                urgency = "upcoming"
            else:
                urgency = "scheduled"

            parts      = parts_by_pm.get(sched["id"], [])
            parts_cost = sum(p["unit_cost"] * p["quantity"] for p in parts)

            activities.append({
                "bus_number":   bus["bus_number"],
                "bus_model":    bus["model"],
                "pm_name":      sched["name"],
                "service_level": level,
                "due_date":     due_date.isoformat(),
                "due_in_days":  due_in_days,
                "urgency":      urgency,
                "est_hours":    sched["estimated_hours"],
                "parts":        parts,
                "parts_cost":   round(parts_cost, 2),
            })

            milestone_offset += 1

        # ── Annual CVOR inspection (calendar-based, always separate) ─────────
        cvor = sched_by_level.get("CVOR")
        if cvor:
            days_since_last = (today - last_date).days
            interval_days   = cvor["interval_days"] or 365
            days_to_cvor    = interval_days - (days_since_last % interval_days)

            if days_to_cvor <= horizon_days:
                due_date    = today + timedelta(days=days_to_cvor)
                due_in_days = days_to_cvor

                if due_in_days < 0:
                    cvor_urgency = "overdue"
                elif due_in_days <= 30:
                    cvor_urgency = "urgent"
                elif due_in_days <= 90:
                    cvor_urgency = "upcoming"
                else:
                    cvor_urgency = "scheduled"

                activities.append({
                    "bus_number":    bus["bus_number"],
                    "bus_model":     bus["model"],
                    "pm_name":       cvor["name"],
                    "service_level": "CVOR",
                    "due_date":      due_date.isoformat(),
                    "due_in_days":   due_in_days,
                    "urgency":       cvor_urgency,
                    "est_hours":     cvor["estimated_hours"],
                    "parts":         [],
                    "parts_cost":    0.0,
                })

    activities.sort(key=lambda a: a["due_in_days"])

    summary = {
        "total": len(activities),
        "overdue": sum(1 for a in activities if a["urgency"] == "overdue"),
        "urgent":  sum(1 for a in activities if a["urgency"] == "urgent"),
        "hours":   round(sum(a["est_hours"] for a in activities), 1),
        "cost":    round(sum(a["parts_cost"] for a in activities), 2),
    }

    return templates.TemplateResponse("fragments/forecast_table.html", {
        "request": request,
        "activities": activities,
        "summary": summary,
        "months": months,
    })


# ───────────────────────────────────────────────────────────
# Parts Inventory
# ───────────────────────────────────────────────────────────
@app.get("/parts", response_class=HTMLResponse)
def parts_page(request: Request):
    with get_db() as conn:
        parts = conn.execute("SELECT * FROM parts ORDER BY category, part_name").fetchall()
        parts = [dict(p) for p in parts]
    categories = sorted(set(p["category"] for p in parts))
    return templates.TemplateResponse("parts.html", {
        "request": request,
        "parts": parts,
        "categories": categories,
        "active_page": "parts",
    })


# ───────────────────────────────────────────────────────────
# Live Fleet (GTFS-RT)
# ───────────────────────────────────────────────────────────
GTFS_URL = "https://drtonline.durhamregiontransit.com/gtfsrealtime/VehiclePositions"


@app.get("/live", response_class=HTMLResponse)
def live_page(request: Request):
    return templates.TemplateResponse("live_fleet.html", {
        "request": request,
        "active_page": "live",
    })


@app.get("/live/data", response_class=HTMLResponse)
async def live_data(request: Request):
    vehicles = []
    error = None
    try:
        from google.transit import gtfs_realtime_pb2
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(GTFS_URL)
            resp.raise_for_status()
        feed = gtfs_realtime_pb2.FeedMessage()
        feed.ParseFromString(resp.content)

        with get_db() as conn:
            db_buses = {b["bus_number"] for b in conn.execute("SELECT bus_number FROM buses").fetchall()}

        for entity in feed.entity:
            v = entity.vehicle
            bus_id = entity.id or (v.vehicle.label if v.vehicle.label else None)
            if not bus_id:
                continue
            in_db = bus_id in db_buses
            vehicles.append({
                "id": bus_id,
                "lat": round(v.position.latitude, 5) if v.position.latitude else None,
                "lon": round(v.position.longitude, 5) if v.position.longitude else None,
                "route": v.trip.route_id or "—",
                "in_db": in_db,
                "speed": round(v.position.speed * 3.6) if v.position.speed else 0,
            })
        vehicles.sort(key=lambda v: v["id"])

    except Exception as e:
        error = str(e)

    return templates.TemplateResponse("fragments/live_table.html", {
        "request": request,
        "vehicles": vehicles,
        "error": error,
        "fetched_at": datetime.now().strftime("%H:%M:%S"),
        "total": len(vehicles),
        "matched": sum(1 for v in vehicles if v["in_db"]),
    })
