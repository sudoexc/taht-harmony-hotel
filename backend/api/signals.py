import json
import logging
import urllib.request
import urllib.error

from django.conf import settings
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

from .models import Expense, Payment, Transfer, HotelSettings, Profile, Stay

logger = logging.getLogger(__name__)

CATEGORY_LABELS = {
    'SALARY': 'Зарплата',
    'UTILITIES': 'Коммунальные',
    'FOOD': 'Питание',
    'REPAIR': 'Ремонт',
    'CLEANING': 'Уборка',
    'OTHER': 'Прочее',
}

METHOD_LABELS = {
    'CASH': 'Наличные',
    'CARD': 'Карта',
    'TRANSFER': 'Перевод',
    'OTHER': 'Прочее',
}


def _send_telegram(group_id, text):
    token = getattr(settings, 'TELEGRAM_BOT_TOKEN', '')
    if not token or not group_id:
        return
    url = f'https://api.telegram.org/bot{token}/sendMessage'
    payload = json.dumps({'chat_id': group_id, 'text': text}).encode('utf-8')
    req = urllib.request.Request(
        url, data=payload, headers={'Content-Type': 'application/json'}
    )
    try:
        urllib.request.urlopen(req, timeout=5)
    except Exception as exc:
        logger.warning('Telegram notification failed: %s', exc)


def _get_group_id(hotel_id):
    try:
        hs = HotelSettings.objects.get(hotel_id=hotel_id)
        return hs.telegram_group_id or None
    except HotelSettings.DoesNotExist:
        return None


def _fmt_method(method, custom_label=None):
    if custom_label:
        return custom_label
    return METHOD_LABELS.get(method, method)


def _fmt_category(category):
    return CATEGORY_LABELS.get(category, category)


def _employee_name(user_id):
    if not user_id:
        return None
    try:
        return Profile.objects.get(id=user_id).full_name
    except Profile.DoesNotExist:
        return None


def _guest_name(stay_id):
    try:
        return Stay.objects.get(id=stay_id).guest_name
    except Stay.DoesNotExist:
        return None


# ─── Expense ──────────────────────────────────────────────────────────────────

@receiver(post_save, sender=Expense)
def on_expense_saved(sender, instance, created, **kwargs):
    group_id = _get_group_id(instance.hotel_id)
    if not group_id:
        return

    icon = '💸 Новый расход' if created else '✏️ Расход изменён'
    lines = [
        icon,
        f'Отель: {instance.hotel.name}',
        f'Сумма: {instance.amount:,.0f}',
        f'Метод: {_fmt_method(instance.method, instance.custom_method_label)}',
        f'Категория: {_fmt_category(instance.category)}',
    ]
    if instance.comment:
        lines.append(f'Комментарий: {instance.comment}')
    name = _employee_name(instance.created_by_id)
    if name:
        lines.append(f'Сотрудник: {name}')

    _send_telegram(group_id, '\n'.join(lines))


@receiver(post_delete, sender=Expense)
def on_expense_deleted(sender, instance, **kwargs):
    group_id = _get_group_id(instance.hotel_id)
    if not group_id:
        return

    lines = [
        '🗑 Расход удалён',
        f'Отель: {instance.hotel.name}',
        f'Сумма: {instance.amount:,.0f}',
        f'Метод: {_fmt_method(instance.method, instance.custom_method_label)}',
        f'Категория: {_fmt_category(instance.category)}',
    ]
    if instance.comment:
        lines.append(f'Комментарий: {instance.comment}')
    name = _employee_name(instance.created_by_id)
    if name:
        lines.append(f'Сотрудник: {name}')

    _send_telegram(group_id, '\n'.join(lines))


# ─── Payment ──────────────────────────────────────────────────────────────────

@receiver(post_save, sender=Payment)
def on_payment_saved(sender, instance, created, **kwargs):
    group_id = _get_group_id(instance.hotel_id)
    if not group_id:
        return

    is_refund = instance.amount < 0
    if created:
        icon = '↩️ Возврат средств' if is_refund else '💰 Новый приход'
    else:
        icon = '✏️ Возврат изменён' if is_refund else '✏️ Приход изменён'
    lines = [
        icon,
        f'Отель: {instance.hotel.name}',
        f'Сумма: {abs(instance.amount):,.0f}',
        f'Метод: {_fmt_method(instance.method, instance.custom_method_label)}',
    ]
    guest = _guest_name(instance.stay_id)
    if guest:
        lines.append(f'Гость: {guest}')
    if instance.comment:
        lines.append(f'Комментарий: {instance.comment}')

    _send_telegram(group_id, '\n'.join(lines))


@receiver(post_delete, sender=Payment)
def on_payment_deleted(sender, instance, **kwargs):
    group_id = _get_group_id(instance.hotel_id)
    if not group_id:
        return

    lines = [
        '🗑 Приход удалён',
        f'Отель: {instance.hotel.name}',
        f'Сумма: {instance.amount:,.0f}',
        f'Метод: {_fmt_method(instance.method, instance.custom_method_label)}',
    ]
    guest = _guest_name(instance.stay_id)
    if guest:
        lines.append(f'Гость: {guest}')
    if instance.comment:
        lines.append(f'Комментарий: {instance.comment}')

    _send_telegram(group_id, '\n'.join(lines))


# ─── Transfer ─────────────────────────────────────────────────────────────────

@receiver(post_save, sender=Transfer)
def on_transfer_saved(sender, instance, created, **kwargs):
    group_id = _get_group_id(instance.hotel_id)
    if not group_id:
        return

    icon = '🔄 Новый перевод' if created else '✏️ Перевод изменён'
    lines = [
        icon,
        f'Отель: {instance.hotel.name}',
        f'Сумма: {instance.amount:,.0f}',
        f'Откуда: {instance.from_method}',
        f'Куда: {instance.to_method}',
    ]
    if instance.comment:
        lines.append(f'Комментарий: {instance.comment}')

    _send_telegram(group_id, '\n'.join(lines))


@receiver(post_delete, sender=Transfer)
def on_transfer_deleted(sender, instance, **kwargs):
    group_id = _get_group_id(instance.hotel_id)
    if not group_id:
        return

    lines = [
        '🗑 Перевод удалён',
        f'Отель: {instance.hotel.name}',
        f'Сумма: {instance.amount:,.0f}',
        f'Откуда: {instance.from_method}',
        f'Куда: {instance.to_method}',
    ]
    if instance.comment:
        lines.append(f'Комментарий: {instance.comment}')

    _send_telegram(group_id, '\n'.join(lines))
