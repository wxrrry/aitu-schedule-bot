#!/usr/bin/env bash
# ==============================================================================
# AITU Schedule Bot - Automated Database Backup & Retention Policy (14 Days)
# ==============================================================================
set -euo pipefail

BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BASE_DIR}/backups"
TIMESTAMP="$(date +"%Y%m%d_%H%M%S")"
RETENTION_DAYS=14
LOG_FILE="${BACKUP_DIR}/backup.log"

mkdir -p "${BACKUP_DIR}"

log() {
    local msg="[$(date +"%Y-%m-%d %H:%M:%S")] $1"
    echo "${msg}"
    echo "${msg}" >> "${LOG_FILE}"
}

log "Starting daily database backup process..."

# 1. Резервное копирование PostgreSQL (Docker aitu-postgres)
if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^aitu-postgres$"; then
    PG_BACKUP_FILE="${BACKUP_DIR}/aitu_postgres_${TIMESTAMP}.sql.gz"
    log "Dumping PostgreSQL database 'aitu_schedule' from container 'aitu-postgres'..."
    if docker exec -t aitu-postgres pg_dump -U aitu aitu_schedule | gzip > "${PG_BACKUP_FILE}"; then
        PG_SIZE="$(du -h "${PG_BACKUP_FILE}" | cut -f1)"
        log "PostgreSQL backup successfully created: ${PG_BACKUP_FILE} (${PG_SIZE})"
    else
        log "WARNING: PostgreSQL dump failed!"
    fi
else
    log "Docker container 'aitu-postgres' not active, skipping PostgreSQL dump."
fi

# 2. Резервное копирование SQLite (локальный файл базы)
SQLITE_DB="${BASE_DIR}/schedule_bot.db"
if [[ -f "${SQLITE_DB}" ]]; then
    SQLITE_BACKUP_FILE="${BACKUP_DIR}/schedule_bot_${TIMESTAMP}.db"
    log "Backing up SQLite database ${SQLITE_DB}..."
    if command -v sqlite3 >/dev/null 2>&1; then
        sqlite3 "${SQLITE_DB}" ".backup '${SQLITE_BACKUP_FILE}'"
    else
        cp "${SQLITE_DB}" "${SQLITE_BACKUP_FILE}"
    fi
    SQLITE_SIZE="$(du -h "${SQLITE_BACKUP_FILE}" | cut -f1)"
    log "SQLite backup successfully created: ${SQLITE_BACKUP_FILE} (${SQLITE_SIZE})"
fi

# 3. Ротация и удаление резервных копий старше 14 дней
log "Applying 14-day retention rotation policy..."
DELETED_COUNT=0
while IFS= read -r old_file; do
    if [[ -n "${old_file}" ]]; then
        rm -f "${old_file}"
        log "Removed expired backup: ${old_file}"
        DELETED_COUNT=$((DELETED_COUNT + 1))
    fi
done < <(find "${BACKUP_DIR}" -type f \( -name "*.sql.gz" -o -name "*.db" \) -mtime +${RETENTION_DAYS} 2>/dev/null || true)

log "Backup cycle completed successfully. Expired files purged: ${DELETED_COUNT}."
