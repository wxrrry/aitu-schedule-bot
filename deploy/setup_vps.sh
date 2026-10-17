#!/usr/bin/env bash
# ==============================================================================
# Скрипт автоматической установки и запуска AITU Schedule Bot на VPS (Ubuntu/Debian)
# ==============================================================================
set -e

# Цвета для красивого вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}   🎓 Установка AITU Schedule Bot на VPS (Ubuntu/Debian)   ${NC}"
echo -e "${BLUE}=====================================================${NC}"

# Проверка прав root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Пожалуйста, запустите скрипт от root (или используйте sudo bash deploy/setup_vps.sh)${NC}"
    exit 1
fi

INSTALL_DIR="/opt/aitu-schedule-bot"
REPO_URL="https://github.com/wxrrry/aitu-schedule-bot.git"

echo -e "\n${YELLOW}1. Обновление пакетов и установка зависимостей...${NC}"
apt-get update -y
apt-get install -y python3 python3-venv python3-pip git curl htop

echo -e "\n${YELLOW}2. Настройка рабочей директории: ${INSTALL_DIR}...${NC}"
if [ -d "$INSTALL_DIR/.git" ]; then
    echo -e "${GREEN}Репозиторий уже существует. Обновляем кодовую базу...${NC}"
    cd "$INSTALL_DIR"
    git fetch origin main
    git reset --hard origin/main
else
    echo -e "${GREEN}Клонируем репозиторий в ${INSTALL_DIR}...${NC}"
    mkdir -p "$INSTALL_DIR"
    git clone "$REPO_URL" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

echo -e "\n${YELLOW}3. Создание виртуального окружения (venv)...${NC}"
if [ ! -d "$INSTALL_DIR/venv" ]; then
    python3 -m venv "$INSTALL_DIR/venv"
fi

echo -e "\n${YELLOW}4. Установка Python зависимостей...${NC}"
"$INSTALL_DIR/venv/bin/pip" install --upgrade pip
"$INSTALL_DIR/venv/bin/pip" install -r "$INSTALL_DIR/requirements.txt"

echo -e "\n${YELLOW}5. Проверка файла конфигурации .env...${NC}"
if [ ! -f "$INSTALL_DIR/.env" ]; then
    cp "$INSTALL_DIR/.env.example" "$INSTALL_DIR/.env"
    echo -e "${YELLOW}⚠️ Файл .env был создан из шаблона!${NC}"
    echo -e "${YELLOW}ОБЯЗАТЕЛЬНО укажите ваш BOT_TOKEN и CHAT_ID в файле ${INSTALL_DIR}/.env${NC}"
    echo -e "${YELLOW}Команда: nano ${INSTALL_DIR}/.env${NC}"
fi

echo -e "\n${YELLOW}6. Установка Systemd службы aitu-bot.service...${NC}"
cp "$INSTALL_DIR/deploy/aitu-bot.service" /etc/systemd/system/aitu-bot.service
systemctl daemon-reload
systemctl enable aitu-bot.service

# Создаем скрипт быстрого ручного обновления
cat << 'EOF' > "$INSTALL_DIR/deploy/update.sh"
#!/usr/bin/env bash
set -e
echo "🔄 Обновление бота из Git..."
cd /opt/aitu-schedule-bot
git fetch origin main
git reset --hard origin/main
./venv/bin/pip install -r requirements.txt --quiet
systemctl restart aitu-bot
echo "✅ Бот успешно обновлен и перезапущен!"
systemctl status aitu-bot --no-pager
EOF
chmod +x "$INSTALL_DIR/deploy/update.sh"

echo -e "\n${YELLOW}7. Запуск службы aitu-bot...${NC}"
systemctl restart aitu-bot.service
sleep 2

if systemctl is-active --quiet aitu-bot.service; then
    echo -e "\n${GREEN}=====================================================${NC}"
    echo -e "${GREEN}   ✅ Бот успешно запущен и работает в фоне!       ${NC}"
    echo -e "${GREEN}=====================================================${NC}"
else
    echo -e "\n${YELLOW}⚠️ Служба запущена, но проверьте токен в .env файле:${NC}"
    echo -e "1) Откройте: nano ${INSTALL_DIR}/.env"
    echo -e "2) Вставьте BOT_TOKEN от @BotFather"
    echo -e "3) Перезапустите: systemctl restart aitu-bot"
fi

echo -e "\n${BLUE}Полезные команды для управления на сервере:${NC}"
echo -e "  Статус:        ${GREEN}systemctl status aitu-bot${NC}"
echo -e "  Логи онлайн:   ${GREEN}journalctl -u aitu-bot -f${NC}"
echo -e "  Перезапуск:    ${GREEN}systemctl restart aitu-bot${NC}"
echo -e "  Обновить код:  ${GREEN}/opt/aitu-schedule-bot/deploy/update.sh${NC}"
