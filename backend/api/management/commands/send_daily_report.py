"""
Ежедневный отчёт по отелю в Telegram.

Запуск:
    python manage.py send_daily_report

Cron (23:00 по серверному времени):
    0 23 * * * /path/to/venv/bin/python /path/to/backend/manage.py send_daily_report
"""
import json
import logging
import urllib.request
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import Sum

from api.models import Hotel, HotelSettings, Room, Stay, Payment, Expense, Withdrawal

logger = logging.getLogger(__name__)

CATEGORY_LABELS = {
    'SALARY': 'Зарплата',
    'INVENTORY': 'Инвентарь',
    'UTILITIES': 'Коммунальные',
    'REPAIR': 'Ремонт',
    'MARKETING': 'Маркетинг',
    'OTHER': 'Прочее',
}


def _send_telegram(group_id, text):
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
    if not token or not group_id:
        return False
    url = f'https://api.telegram.org/bot{token}/sendMessage'
    payload = json.dumps({'chat_id': group_id, 'text': text}).encode('utf-8')
    req = urllib.request.Request(
        url, data=payload, headers={'Content-Type': 'application/json'}
    )
    try:
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception as exc:
        logger.warning('Telegram send failed for group %s: %s', group_id, exc)
        return False


def build_report(hotel, today_start_utc, today_end_utc, today_label):
    """Собирает текст отчёта для одного отеля."""

    # ── Заезды сегодня ────────────────────────────────────────────────────────
    checkins_today = Stay.objects.filter(
        hotel=hotel,
        check_in_date__gte=today_start_utc,
        check_in_date__lt=today_end_utc,
        status__in=['CHECKED_IN', 'CHECKED_OUT'],
    ).count()

    # ── Выезды сегодня ────────────────────────────────────────────────────────
    checkouts_today = Stay.objects.filter(
        hotel=hotel,
        check_out_date__gte=today_start_utc,
        check_out_date__lt=today_end_utc,
        status='CHECKED_OUT',
    ).count()

    # ── Приход сегодня по методам ─────────────────────────────────────────────
    payments_today = Payment.objects.filter(
        hotel=hotel,
        paid_at__gte=today_start_utc,
        paid_at__lt=today_end_utc,
    )

    income_by_method = {}
    income_total = 0
    for p in payments_today:
        income_by_method[p.method] = income_by_method.get(p.method, 0) + float(p.amount)
        income_total += float(p.amount)

    # ── Расходы сегодня по категориям ─────────────────────────────────────────
    expenses_today = Expense.objects.filter(
        hotel=hotel,
        spent_at__gte=today_start_utc,
        spent_at__lt=today_end_utc,
    )

    expenses_by_category = {}
    expenses_total = 0
    for e in expenses_today:
        label = CATEGORY_LABELS.get(e.category, e.category)
        expenses_by_category[label] = expenses_by_category.get(label, 0) + float(e.amount)
        expenses_total += float(e.amount)

    # ── Текущая занятость ─────────────────────────────────────────────────────
    total_rooms = Room.objects.filter(hotel=hotel, active=True).count()
    occupied_rooms = Stay.objects.filter(hotel=hotel, status='CHECKED_IN').count()
    free_rooms = max(total_rooms - occupied_rooms, 0)

    # ── Сборка текста ─────────────────────────────────────────────────────────
    lines = [
        f'📊 Отчёт за {today_label}',
        f'🏨 {hotel.name}',
        '',
        '🛎 Движение за день:',
        f'  Заездов: {checkins_today}',
        f'  Выездов: {checkouts_today}',
        '',
        '💰 Приход за день:',
    ]

    if income_by_method:
        for label, amount in income_by_method.items():
            lines.append(f'  {label}: {amount:,.0f}')
        lines.append(f'  Итого: {income_total:,.0f}')
    else:
        lines.append('  Платежей не было')

    lines += ['', '💸 Расходы за день:']
    if expenses_by_category:
        for label, amount in expenses_by_category.items():
            lines.append(f'  {label}: {amount:,.0f}')
        lines.append(f'  Итого: {expenses_total:,.0f}')
    else:
        lines.append('  Расходов не было')

    # ── Снятия за день ────────────────────────────────────────────────────────
    withdrawals_today = Withdrawal.objects.filter(
        hotel=hotel,
        withdrawn_at__gte=today_start_utc,
        withdrawn_at__lt=today_end_utc,
    )
    withdrawals_by_method = {}
    withdrawals_total = 0
    for w in withdrawals_today:
        withdrawals_by_method[w.method] = withdrawals_by_method.get(w.method, 0) + float(w.amount)
        withdrawals_total += float(w.amount)

    profit = income_total - expenses_total
    lines += ['', f'📈 Прибыль за день: {profit:,.0f}']

    if withdrawals_by_method:
        lines += ['', '💵 Снятия за день:']
        for label, amount in withdrawals_by_method.items():
            lines.append(f'  {label}: {amount:,.0f}')
        lines.append(f'  Итого: {withdrawals_total:,.0f}')
        lines.append(f'  Остаток: {profit - withdrawals_total:,.0f}')

    lines += [
        '',
        '🏠 Занятость номеров:',
        f'  Занято: {occupied_rooms} из {total_rooms}',
        f'  Свободно: {free_rooms}',
    ]

    return '\n'.join(lines)


class Command(BaseCommand):
    help = 'Отправляет ежедневный отчёт в Telegram для каждого отеля'

    def handle(self, *args, **options):
        hotel_settings = HotelSettings.objects.exclude(telegram_group_id='')

        if not hotel_settings.exists():
            self.stdout.write('Нет отелей с настроенным Telegram.')
            return

        sent = 0
        for hs in hotel_settings:
            try:
                hotel = Hotel.objects.get(id=hs.hotel_id)
            except Hotel.DoesNotExist:
                continue

            tz = ZoneInfo(hotel.timezone or 'UTC')
            now_local = datetime.now(tz)
            today_start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
            today_end_local = today_start_local + timedelta(days=1)

            today_start_utc = today_start_local.astimezone(timezone.utc)
            today_end_utc = today_end_local.astimezone(timezone.utc)

            today_label = today_start_local.strftime('%d.%m.%Y')

            text = build_report(hotel, today_start_utc, today_end_utc, today_label)

            if _send_telegram(hs.telegram_group_id, text):
                sent += 1
                self.stdout.write(f'✓ Отправлено для {hotel.name}')
            else:
                self.stdout.write(f'✗ Ошибка для {hotel.name}')

        self.stdout.write(f'Готово. Отправлено: {sent}/{hotel_settings.count()}')
