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
    add_or_update_team,
    get_system_stats,
    get_all_groups,
    get_lessons_for_day,
    get_replacements_for_date_and_group,
    add_replacement,
    get_or_create_user,
    update_user_group,
    update_user_notifications
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
        "version": "v3.16",
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
    # Преобразуем целочисленные ключи дней для JSON
    serializable_sched = {str(d): pairs for d, pairs in sched.items()}
    return web.json_response({
        "group": group,
        "course": course,
        "days": serializable_sched
    })


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
    
    success = await upsert_tournament(data)
    if success:
        return web.json_response({"status": "saved", "id": data.get("id")})
    return web.json_response({"error": "Failed to save tournament"}, status=500)


async def handle_team_save(request: web.Request):
    tournament_id = request.match_info.get("id", "").strip()
    try:
        data = await request.json()
    except Exception:
        return web.json_response({"error": "Invalid JSON"}, status=400)

    success = await add_or_update_team(tournament_id, data)
    if success:
        return web.json_response({"status": "saved", "team_id": data.get("id")})
    return web.json_response({"error": "Failed to save team"}, status=500)


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
    app.router.add_post("/api/tournaments/{id}/teams", handle_team_save)

    # User Profile
    app.router.add_get("/api/profile", handle_profile_get)
    app.router.add_post("/api/profile", handle_profile_save)

    logger.info("REST API маршруты успешно подключены к web-серверу.")
