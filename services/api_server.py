"""
REST API сервер для Telegram Mini App AITU и админ-панели.
Работает внутри aiohttp и обслуживает запросы от WebApp и внешних интеграций.
"""

import json
import logging
from aiohttp import web
from datetime import date, datetime

from db.crud import (
    get_all_tournaments,
    get_tournament_by_id,
    upsert_tournament,
    delete_tournament,
    add_or_update_team,
    delete_team,
    get_system_stats,
    get_all_groups,
    get_lessons_for_day,
    get_replacements_for_date_and_group,
    get_group_replacements,
    get_all_active_replacements,
    add_replacement_record,
    add_replacement,
    delete_replacement_by_id,
    get_or_create_user,
    update_user_group,
    update_user_notifications,
    get_user_tasks,
    add_or_update_user_task,
    delete_user_task
)
from schedule_data import get_schedule_for_group, ALL_COLLEGE_GROUPS, GROUPS_BY_COURSE, get_course_from_group_name

logger = logging.getLogger(__name__)


@web.middleware
async def cors_middleware(request: web.Request, handler):
    """CORS middleware для поддержки кросс-доменных запросов от WebApp."""
    if request.method == "OPTIONS":
        response = web.Response(status=204)
    else:
        try:
            response = await handler(request)
        except web.HTTPException as ex:
            response = ex
        except Exception as e:
            logger.error(f"API Error handling {request.path}: {e}", exc_info=True)
            response = web.json_response({"error": str(e)}, status=500)

    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-Requested-With"
    return response


# --- Handlers ---

async def handle_health(request: web.Request):
    return web.json_response({
        "status": "ok",
        "service": "AITU College Schedule & Tournament API",
        "version": "v3.17",
        "timestamp": datetime.utcnow().isoformat()
    })


async def handle_stats(request: web.Request):
    stats = await get_system_stats()
    return web.json_response(stats)


async def handle_groups(request: web.Request):
    return web.json_response({
        "total": len(ALL_COLLEGE_GROUPS),
        "groups": ALL_COLLEGE_GROUPS,
        "by_course": GROUPS_BY_COURSE
    })


async def handle_schedule(request: web.Request):
    group = request.query.get("group", "9ПО-43к").strip()
    course = get_course_from_group_name(group)
    sched = get_schedule_for_group(group)
    serializable_sched = {str(d): pairs for d, pairs in sched.items()}

    # Активные замены для группы
    reps = await get_group_replacements(group)
    serializable_reps = []
    for r in reps:
        d_val = r.date.strftime("%Y-%m-%d") if hasattr(r.date, "strftime") else str(r.date)
        serializable_reps.append({
            "id": r.id,
            "date": d_val,
            "pair_num": r.pair_num,
            "action_type": r.action_type,
            "subject": r.subject,
            "room": r.room,
            "teacher": r.teacher,
            "raw_text": r.raw_text
        })

    return web.json_response({
        "group": group,
        "course": course,
        "days": serializable_sched,
        "replacements": serializable_reps
    })


async def handle_replacements_get(request: web.Request):
    group = request.query.get("group", "").strip()
    since_date_str = request.query.get("since", "").strip()
    since_date = date.today()
    if since_date_str:
        try:
            since_date = date.fromisoformat(since_date_str)
        except Exception:
            pass

    if group:
        reps = await get_group_replacements(group, since_date=since_date)
    else:
        reps = await get_all_active_replacements(since_date=since_date)

    result = []
    for r in reps:
        d_val = r.date.strftime("%Y-%m-%d") if hasattr(r.date, "strftime") else str(r.date)
        result.append({
            "id": r.id,
            "group": r.group_name or "ALL",
            "date": d_val,
            "pair_num": r.pair_num,
            "action_type": r.action_type,
            "subject": r.subject,
            "room": r.room,
            "teacher": r.teacher,
            "raw_text": r.raw_text,
            "created_by": r.created_by
        })
    return web.json_response({
        "group": group or "ALL",
        "total": len(result),
        "replacements": result
    })


async def handle_replacement_create(request: web.Request):
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)

    target_date_raw = data.get("date")
    if not target_date_raw:
        return web.json_response({"error": "Date required"}, status=400)

    try:
        d_obj = date.fromisoformat(str(target_date_raw))
    except Exception:
        d_obj = date.today()

    pair_num = int(data.get("pair_num", 1))
    action_type = data.get("action_type", "replace")
    subject = data.get("subject", "")
    room = data.get("room", "—")
    teacher = data.get("teacher", "—")
    raw_text = data.get("raw_text", "")
    group_name = data.get("group")
    created_by = int(data.get("created_by", 0))

    rep = await add_replacement_record(
        target_date=d_obj,
        pair_num=pair_num,
        action_type=action_type,
        subject=subject,
        room=room,
        teacher=teacher,
        raw_text=raw_text,
        group_name=group_name,
        created_by=created_by
    )

    d_val = rep.date.strftime("%Y-%m-%d") if hasattr(rep.date, "strftime") else str(rep.date)
    return web.json_response({
        "status": "saved",
        "replacement": {
            "id": rep.id,
            "date": d_val,
            "pair_num": rep.pair_num,
            "action_type": rep.action_type,
            "subject": rep.subject,
            "room": rep.room,
            "teacher": rep.teacher,
            "group": rep.group_name
        }
    })


async def handle_replacement_delete(request: web.Request):
    rep_id = request.match_info.get("id", "").strip()
    if not rep_id.isdigit():
        return web.json_response({"error": "Valid integer ID required"}, status=400)

    success = await delete_replacement_by_id(int(rep_id))
    if success:
        return web.json_response({"status": "deleted", "id": int(rep_id)})
    return web.json_response({"error": "Replacement not found"}, status=404)


async def handle_tasks_get(request: web.Request):
    user_id_str = request.query.get("user_id", "")
    if not user_id_str.isdigit():
        return web.json_response({"error": "Valid user_id required"}, status=400)

    tasks = await get_user_tasks(int(user_id_str))
    return web.json_response({
        "tasks": [
            {
                "id": t.id,
                "task_key": t.task_key,
                "text": t.text,
                "is_done": t.is_done,
                "created_at": t.created_at.isoformat() if t.created_at else ""
            }
            for t in tasks
        ]
    })


async def handle_task_save(request: web.Request):
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)

    user_id = data.get("user_id")
    task_key = data.get("task_key", "general")
    text = data.get("text", "")
    is_done = bool(data.get("is_done", False))
    task_id = data.get("id")

    if not user_id or not text.strip():
        return web.json_response({"error": "user_id and text required"}, status=400)

    t = await add_or_update_user_task(
        user_id=int(user_id),
        task_key=task_key,
        text=text.strip(),
        is_done=is_done,
        task_id=int(task_id) if task_id else None
    )

    return web.json_response({
        "status": "saved",
        "task": {
            "id": t.id,
            "task_key": t.task_key,
            "text": t.text,
            "is_done": t.is_done
        }
    })


async def handle_task_delete(request: web.Request):
    task_id = request.match_info.get("id", "").strip()
    user_id_str = request.query.get("user_id", "")
    if not task_id.isdigit() or not user_id_str.isdigit():
        return web.json_response({"error": "Valid integer task_id and user_id required"}, status=400)

    success = await delete_user_task(int(user_id_str), int(task_id))
    if success:
        return web.json_response({"status": "deleted", "id": int(task_id)})
    return web.json_response({"error": "Task not found"}, status=404)


async def handle_tournaments_list(request: web.Request):
    tournaments = await get_all_tournaments()
    return web.json_response({
        "tournaments": tournaments
    })


async def handle_tournament_save(request: web.Request):
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)
    
    if not data.get("id"):
        data["id"] = f"tourn_{int(datetime.utcnow().timestamp())}"
    
    success = await upsert_tournament(data)
    if success:
        return web.json_response({"status": "saved", "id": data.get("id"), "tournament": data})
    return web.json_response({"error": "Failed to save tournament"}, status=500)


async def handle_team_save(request: web.Request):
    tournament_id = request.match_info.get("id", "").strip()
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)

    if not data.get("id"):
        data["id"] = f"reg_{int(datetime.utcnow().timestamp())}"

    success = await add_or_update_team(tournament_id, data)
    if success:
        return web.json_response({"status": "saved", "team_id": data.get("id"), "team": data})
    return web.json_response({"error": "Failed to save team"}, status=500)


async def handle_tournament_get(request: web.Request):
    t_id = request.match_info.get("id", "").strip()
    tourn = await get_tournament_by_id(t_id)
    if not tourn:
        return web.json_response({"error": "Tournament not found"}, status=404)
    return web.json_response(tourn)


async def handle_tournament_delete(request: web.Request):
    t_id = request.match_info.get("id", "").strip()
    success = await delete_tournament(t_id)
    if success:
        return web.json_response({"status": "deleted", "id": t_id})
    return web.json_response({"error": "Tournament not found or could not be deleted"}, status=404)


async def handle_team_delete(request: web.Request):
    tournament_id = request.match_info.get("id", "").strip()
    team_id = request.match_info.get("team_id", "").strip()
    success = await delete_team(team_id, tournament_id=tournament_id)
    if success:
        return web.json_response({"status": "deleted", "team_id": team_id})
    return web.json_response({"error": "Team not found or could not be deleted"}, status=404)


async def handle_bracket_save(request: web.Request):
    tournament_id = request.match_info.get("id", "").strip()
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)
    
    bracket_data = data.get("bracketData") if "bracketData" in data else data
    success = await upsert_tournament({"id": tournament_id, "bracketData": bracket_data})
    if success:
        return web.json_response({"status": "saved", "id": tournament_id})
    return web.json_response({"error": "Failed to save bracket"}, status=500)


async def handle_profile_get(request: web.Request):
    user_id_str = request.query.get("user_id", "")
    if not user_id_str.isdigit():
        return web.json_response({"error": "Valid user_id required"}, status=400)
    
    user_id = int(user_id_str)
    user, _ = await get_or_create_user(user_id)
    return web.json_response({
        "user_id": user.user_id,
        "username": user.username,
        "full_name": user.full_name,
        "group": user.group_name or "9ПО-43к",
        "role": user.role,
        "remind_10min": user.remind_10min,
        "morning_alert": user.morning_alert,
        "five_min_breaks": user.five_min_breaks
    })


async def handle_profile_save(request: web.Request):
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)

    user_id = data.get("user_id")
    if not user_id:
        return web.json_response({"error": "user_id is required"}, status=400)

    user, _ = await get_or_create_user(
        int(user_id),
        username=data.get("username"),
        full_name=data.get("full_name", "")
    )
    if data.get("group"):
        await update_user_group(int(user_id), data["group"])
    if "remind_10min" in data or "morning_alert" in data or "five_min_breaks" in data:
        await update_user_notifications(
            int(user_id),
            remind_10min=data.get("remind_10min"),
            morning_alert=data.get("morning_alert"),
            five_min_breaks=data.get("five_min_breaks")
        )

    return web.json_response({"status": "updated", "user_id": user_id})


def setup_api_routes(app: web.Application):
    """Регистрирует все маршруты API на aiohttp Application."""
    app.middlewares.append(cors_middleware)
    
    # Public & Healthcheck
    app.router.add_get("/api/health", handle_health)
    app.router.add_get("/api/stats", handle_stats)
    app.router.add_get("/api/groups", handle_groups)
    app.router.add_get("/api/schedule", handle_schedule)

    # Tournaments & Teams
    app.router.add_get("/api/tournaments", handle_tournaments_list)
    app.router.add_post("/api/tournaments", handle_tournament_save)
    app.router.add_get("/api/tournaments/{id}", handle_tournament_get)
    app.router.add_delete("/api/tournaments/{id}", handle_tournament_delete)
    app.router.add_post("/api/tournaments/{id}/teams", handle_team_save)
    app.router.add_delete("/api/tournaments/{id}/teams/{team_id}", handle_team_delete)
    app.router.add_post("/api/tournaments/{id}/bracket", handle_bracket_save)

    # Replacements
    app.router.add_get("/api/replacements", handle_replacements_get)
    app.router.add_post("/api/replacements", handle_replacement_create)
    app.router.add_delete("/api/replacements/{id}", handle_replacement_delete)

    # User Tasks
    app.router.add_get("/api/tasks", handle_tasks_get)
    app.router.add_post("/api/tasks", handle_task_save)
    app.router.add_delete("/api/tasks/{id}", handle_task_delete)

    # User Profile
    app.router.add_get("/api/profile", handle_profile_get)
    app.router.add_post("/api/profile", handle_profile_save)

    logger.info("REST API маршруты успешно подключены к web-серверу.")
