#!/usr/bin/env bash
# ==============================================================================
# Скрипт безопасного создания и активации Swap (файла подкачки 2 ГБ) на VPS
# ==============================================================================
set -e

SWAP_SIZE="2G"
SWAP_FILE="/swapfile"

echo "🔍 Проверка существующего Swap на сервере..."
if [ $(swapon --show | wc -l) -gt 1 ]; then
    echo "✅ Swap уже подключен и активен:"
    swapon --show
    free -h
    exit 0
fi

echo "⚙️ Создание файла подкачки ${SWAP_SIZE} в ${SWAP_FILE}..."
if command -v fallocate >/dev/null 2>&1; then
    fallocate -l "$SWAP_SIZE" "$SWAP_FILE" || dd if=/dev/zero of="$SWAP_FILE" bs=1M count=2048 status=progress
else
    dd if=/dev/zero of="$SWAP_FILE" bs=1M count=2048 status=progress
fi

echo "🔒 Установка безопасных прав (600)..."
chmod 600 "$SWAP_FILE"

echo "📦 Инициализация Swap структуры..."
mkswap "$SWAP_FILE"

echo "⚡️ Включение Swap..."
swapon "$SWAP_FILE"

echo "📝 Добавление в /etc/fstab для автозапуска при перезагрузке..."
if ! grep -q "$SWAP_FILE" /etc/fstab; then
    echo "$SWAP_FILE none swap sw 0 0" >> /etc/fstab
fi

echo "🚀 Настройка оптимальных параметров ядра (swappiness=20)..."
sysctl -w vm.swappiness=20 || true
sysctl -w vm.vfs_cache_pressure=50 || true

mkdir -p /etc/sysctl.d
cat << 'EOF' > /etc/sysctl.d/99-swap.conf
vm.swappiness=20
vm.vfs_cache_pressure=50
EOF

echo ""
echo "====================================================="
echo "   ✅ Swap 2 ГБ успешно создан, настроен и активен!  "
echo "====================================================="
swapon --show
free -h
