"""
Генерация реалистичных тестовых данных за последний год + брони на 2-3 месяца вперёд.
Запуск: python backend/manage.py shell < backend/seed_year.py
"""
import uuid, random
from datetime import datetime, timedelta, timezone, date
from decimal import Decimal
from zoneinfo import ZoneInfo

import django
django.setup()

from django.db.models.signals import post_save, post_delete
from api.models import Hotel, Room, Stay, Payment, Expense, Guest
from api import signals as sig_module

# Отключаем Telegram-сигналы
post_save.disconnect(sig_module.on_expense_saved, sender=Expense)
post_delete.disconnect(sig_module.on_expense_deleted, sender=Expense)
post_save.disconnect(sig_module.on_payment_saved, sender=Payment)
post_delete.disconnect(sig_module.on_payment_deleted, sender=Payment)

HOTEL_ID = 'hotel-001'
TZ = ZoneInfo('Asia/Tashkent')

rooms = list(Room.objects.filter(hotel_id=HOTEL_ID, active=True))
methods = ['Наличные', 'Humo', 'Uzcard', 'PayMe', 'Click', 'Терминал']
method_weights = [35, 20, 15, 15, 10, 5]

today = date.today()
start = today - timedelta(days=365)
future_end = today + timedelta(days=90)  # брони на 3 месяца вперёд

def rand_method():
    return random.choices(methods, weights=method_weights, k=1)[0]

def to_utc_time(d: date, hour: int, minute: int = 0):
    local = datetime(d.year, d.month, d.day, hour, minute, tzinfo=TZ)
    return local.astimezone(timezone.utc)

# ── Очистка ───────────────────────────────────────────────────────────────────
print('Очистка старых данных...')
Payment.objects.filter(hotel_id=HOTEL_ID).delete()
Expense.objects.filter(hotel_id=HOTEL_ID).delete()
Stay.objects.filter(hotel_id=HOTEL_ID).delete()
Guest.objects.filter(hotel_id=HOTEL_ID).delete()
print('Очищено.')

# ── Создаём гостей ────────────────────────────────────────────────────────────
print('Создание клиентской базы...')

guest_data = [
    # Постоянные клиенты (много визитов)
    ('Алишер Каримов',       '+998901234567'),
    ('Дилноза Юсупова',      '+998902345678'),
    ('Бехзод Рахимов',       '+998903456789'),
    ('Нилуфар Эргашева',     '+998904567890'),
    ('Жамшид Холиков',       '+998905678901'),
    ('Малика Абдуллаева',    '+998906789012'),
    ('Санжар Мирзаев',       '+998907890123'),
    ('Гулнора Турсунова',    '+998908901234'),
    ('Отабек Назаров',       '+998909012345'),
    ('Зулфия Хасанова',      '+998901122334'),
    # Регулярные клиенты
    ('Руслан Петров',        '+998912233445'),
    ('Анна Иванова',         '+998913344556'),
    ('Комилжон Тошматов',    '+998914455667'),
    ('Феруза Салимова',      '+998915566778'),
    ('Акбар Усманов',        '+998916677889'),
    ('Шахло Рустамова',      '+998917788990'),
    ('Иван Сидоров',         '+998918899001'),
    ('Мария Козлова',        '+998919900112'),
    ('Тимур Исмаилов',       '+998901011121'),
    ('Барно Норматова',      '+998902122232'),
    # Разовые / редкие клиенты
    ('Азиз Кодиров',         '+998903233343'),
    ('Нозима Хамидова',      '+998904344454'),
    ('Элмурод Абдурахманов', '+998905455565'),
    ('Дина Юлдашева',        '+998906566676'),
    ('Давид Ким',            '+998907677787'),
    ('Хамид Мирзаев',        '+998908788898'),
    ('Севара Рашидова',      '+998909899909'),
    ('Бахром Салихов',       '+998901990010'),
    ('Екатерина Смирнова',   '+998912100121'),
    ('Лола Аскарова',        '+998913211232'),
    ('Шерзод Юлдашев',       '+998914322343'),
    ('Камола Бегматова',     '+998915433454'),
    ('Фарход Алимов',        '+998916544565'),
    ('Умида Рахматова',      '+998917655676'),
    ('Бобур Турсунов',       '+998918766787'),
    ('Зебо Исмоилова',       '+998919877898'),
    ('Лазиз Мусаев',         '+998901988909'),
    ('Дилфуза Хошимова',     '+998902099010'),
    ('Жасур Каюмов',         '+998903100121'),
    ('Наргиза Раджабова',    '+998904211232'),
]

guests = []
for name, phone in guest_data:
    g = Guest(
        id=str(uuid.uuid4()),
        hotel_id=HOTEL_ID,
        name=name,
        phone=phone,
        notes='',
    )
    g.save()
    guests.append(g)

# Веса: первые 10 — постоянные (высокий вес), следующие 10 — регулярные, остальные — разовые
guest_weights = [12]*10 + [6]*10 + [2]*20
print(f'Гостей создано: {len(guests)}')

# ── Генерация заездов ─────────────────────────────────────────────────────────
print('Генерация заездов...')

stays_created = 0
payments_created = 0

for room in rooms:
    base_price = float(room.base_price)
    cur = start

    # Прошлое + текущие заезды
    while cur < today:
        gap = random.randint(0, 3)
        ci = cur + timedelta(days=gap)
        if ci >= today:
            break

        if room.room_type == 'SUITE':
            nights = random.choices([1, 2, 3, 4, 5, 7], weights=[20, 25, 25, 15, 10, 5])[0]
        elif room.room_type == 'FAMILY':
            nights = random.choices([2, 3, 4, 5, 7, 10], weights=[15, 20, 25, 20, 15, 5])[0]
        else:
            nights = random.choices([1, 2, 3, 5, 7, 14], weights=[25, 30, 20, 12, 8, 5])[0]

        co = ci + timedelta(days=nights)
        if co > today + timedelta(days=5):
            co = today + timedelta(days=5)
            nights = (co - ci).days
        if nights < 1:
            cur = co
            continue

        ppn = base_price * random.uniform(0.9, 1.1)
        ppn = round(ppn / 1000) * 1000
        weekly_discount = ppn * nights * 0.07 if nights >= 7 else 0
        manual_adj = 0
        if random.random() < 0.08:
            manual_adj = -random.randint(1, 3) * 10000

        if co <= today:
            status = 'CHECKED_OUT'
        elif ci <= today:
            status = random.choices(['CHECKED_IN', 'CHECKED_OUT'], weights=[85, 15])[0]
        else:
            status = 'BOOKED'

        if random.random() < 0.04:
            status = 'CANCELLED'

        guest = random.choices(guests, weights=guest_weights, k=1)[0]

        stay = Stay(
            id=str(uuid.uuid4()),
            hotel_id=HOTEL_ID,
            room_id=room.id,
            guest_name=guest.name,
            guest_phone=guest.phone,
            guest_id=guest.id,
            check_in_date=to_utc_time(ci, random.randint(10, 15)),
            check_out_date=to_utc_time(co, random.randint(10, 13)),
            status=status,
            price_per_night=Decimal(str(ppn)),
            weekly_discount_amount=Decimal(str(weekly_discount)),
            manual_adjustment_amount=Decimal(str(manual_adj)),
            deposit_expected=Decimal(str(ppn)),
            comment='',
            created_at=datetime.now(timezone.utc),
        )
        stay.save()
        stays_created += 1

        if status != 'CANCELLED':
            total_due = ppn * nights + manual_adj - weekly_discount
            total_due = max(total_due, 0)

            # Будущие проживания — только депозит или не оплачены
            if ci > today:
                cur = co
                continue

            n_payments = random.choices([1, 2, 3], weights=[50, 35, 15])[0]
            paid_total = 0
            for i in range(n_payments):
                if i < n_payments - 1:
                    amount = round(total_due * random.uniform(0.3, 0.6) / 1000) * 1000
                    amount = min(amount, total_due - paid_total - 1000)
                else:
                    amount = total_due - paid_total
                if amount <= 0:
                    break

                pay_date = ci + timedelta(days=random.randint(0, min(nights, 2)))
                if pay_date >= today:
                    pay_date = today - timedelta(days=1)

                Payment(
                    id=str(uuid.uuid4()),
                    hotel_id=HOTEL_ID,
                    stay_id=stay.id,
                    paid_at=to_utc_time(pay_date, random.randint(9, 18), random.randint(0, 59)),
                    method=rand_method(),
                    amount=Decimal(str(amount)),
                    comment='',
                    created_at=datetime.now(timezone.utc),
                ).save()
                paid_total += amount
                payments_created += 1

        cur = co

    # ── Брони вперёд на 2-3 месяца ────────────────────────────────────────────
    cur = today + timedelta(days=random.randint(1, 7))
    while cur < future_end:
        gap = random.randint(1, 10)
        ci = cur + timedelta(days=gap)
        if ci >= future_end:
            break

        if room.room_type == 'SUITE':
            nights = random.choices([2, 3, 4, 5], weights=[30, 30, 25, 15])[0]
        elif room.room_type == 'FAMILY':
            nights = random.choices([3, 4, 5, 7], weights=[25, 30, 25, 20])[0]
        else:
            nights = random.choices([1, 2, 3, 5, 7], weights=[20, 35, 25, 15, 5])[0]

        co = ci + timedelta(days=nights)
        if co > future_end:
            break

        ppn = base_price * random.uniform(0.9, 1.1)
        ppn = round(ppn / 1000) * 1000
        weekly_discount = ppn * nights * 0.07 if nights >= 7 else 0

        guest = random.choices(guests, weights=guest_weights, k=1)[0]

        # Часть броней — с депозитом
        has_deposit = random.random() < 0.4

        stay = Stay(
            id=str(uuid.uuid4()),
            hotel_id=HOTEL_ID,
            room_id=room.id,
            guest_name=guest.name,
            guest_phone=guest.phone,
            guest_id=guest.id,
            check_in_date=to_utc_time(ci, random.randint(12, 15)),
            check_out_date=to_utc_time(co, 12),
            status='BOOKED',
            price_per_night=Decimal(str(ppn)),
            weekly_discount_amount=Decimal(str(weekly_discount)),
            manual_adjustment_amount=Decimal('0'),
            deposit_expected=Decimal(str(ppn)),
            comment='',
            created_at=datetime.now(timezone.utc),
        )
        stay.save()
        stays_created += 1

        if has_deposit:
            deposit_amount = round(ppn * random.uniform(0.3, 0.5) / 1000) * 1000
            if deposit_amount > 0:
                pay_date = today - timedelta(days=random.randint(0, 3))
                Payment(
                    id=str(uuid.uuid4()),
                    hotel_id=HOTEL_ID,
                    stay_id=stay.id,
                    paid_at=to_utc_time(pay_date, random.randint(10, 17)),
                    method=rand_method(),
                    amount=Decimal(str(deposit_amount)),
                    comment='Депозит',
                    created_at=datetime.now(timezone.utc),
                ).save()
                payments_created += 1

        cur = co

print(f'Заездов: {stays_created}, Платежей: {payments_created}')

# ── Расходы ───────────────────────────────────────────────────────────────────
print('Генерация расходов...')
expenses_created = 0

expense_comments = {
    'SALARY':    ['Зарплата сотрудников', 'Аванс', 'Премия персонала'],
    'INVENTORY': ['Моющие средства', 'Постельное бельё', 'Полотенца', 'Мыло и шампунь', 'Туалетная бумага'],
    'UTILITIES': ['Электроэнергия', 'Водоснабжение', 'Газ', 'Интернет'],
    'REPAIR':    ['Ремонт сантехники', 'Покраска стен', 'Замена замка', 'Ремонт кондиционера'],
    'MARKETING': ['Реклама в Instagram', 'Баннер', 'Продвижение Booking'],
    'OTHER':     ['Канцтовары', 'Хозяйственные расходы', 'Прочее'],
}
expense_categories = ['SALARY', 'INVENTORY', 'UTILITIES', 'REPAIR', 'MARKETING', 'OTHER']
cat_weights = [40, 20, 15, 10, 10, 5]

cur_month = date(start.year, start.month, 1)
while cur_month <= today:
    month_end = (cur_month.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
    month_end = min(month_end, today - timedelta(days=1))

    # Зарплата
    salary_date = cur_month.replace(day=random.randint(1, 5))
    if salary_date <= today - timedelta(days=1):
        Expense(
            id=str(uuid.uuid4()),
            hotel_id=HOTEL_ID,
            spent_at=to_utc_time(salary_date, 10),
            category='SALARY',
            method=random.choice(['Наличные', 'Humo', 'Uzcard']),
            amount=Decimal(str(random.randint(8, 15) * 500000)),
            comment='Зарплата сотрудников',
            created_at=datetime.now(timezone.utc),
        ).save()
        expenses_created += 1

    # Коммуналка
    util_date = cur_month.replace(day=random.randint(8, 15))
    if util_date <= today - timedelta(days=1):
        for cat, comment, lo, hi in [
            ('UTILITIES', 'Электроэнергия', 300, 700),
            ('UTILITIES', 'Водоснабжение',  80,  220),
            ('UTILITIES', 'Интернет',        50,   80),
        ]:
            Expense(
                id=str(uuid.uuid4()),
                hotel_id=HOTEL_ID,
                spent_at=to_utc_time(util_date + timedelta(days=random.randint(0, 3)), 11),
                category=cat,
                method='Наличные',
                amount=Decimal(str(random.randint(lo, hi) * 1000)),
                comment=comment,
                created_at=datetime.now(timezone.utc),
            ).save()
            expenses_created += 1

    # Прочие расходы 3-5 раз в месяц
    for _ in range(random.randint(3, 5)):
        exp_date = cur_month + timedelta(days=random.randint(0, (month_end - cur_month).days))
        if exp_date <= today - timedelta(days=1):
            cat = random.choices(expense_categories[1:], weights=cat_weights[1:])[0]
            comment = random.choice(expense_comments[cat])
            Expense(
                id=str(uuid.uuid4()),
                hotel_id=HOTEL_ID,
                spent_at=to_utc_time(exp_date, random.randint(9, 17)),
                category=cat,
                method=rand_method(),
                amount=Decimal(str(random.randint(3, 50) * 10000)),
                comment=comment,
                created_at=datetime.now(timezone.utc),
            ).save()
            expenses_created += 1

    cur_month = (cur_month.replace(day=28) + timedelta(days=4)).replace(day=1)

print(f'Расходов: {expenses_created}')
print('✓ Готово!')
