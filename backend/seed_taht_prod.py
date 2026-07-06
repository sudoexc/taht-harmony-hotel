"""
Сид прод-инстанса TAHT HOTEL (taht.natus.uz).

Январь–28 июня 2026 — сгенерированная история «отель работает полгода»
(калиброванная по реальному файлу «Оплата Taht.xlsx»); свежие заезды и
расходы (июнь–июль) вшиты дословно из файла (TAHT_STAYS / TAHT_EXPENSES,
подготовлены parse-скриптом). Запуск ВНУТРИ контейнера natus-api:

    HOTEL_OWNER_EMAIL=admin@natus.uz python seed_taht_prod.py --wipe
"""
import os
import sys
import uuid
import random
import bcrypt
from datetime import datetime, timedelta, timezone as tz
from decimal import Decimal

import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_crm.settings')
django.setup()

from api.models import (User, Hotel, Profile, UserRole, Room, Stay, Payment,
                        Expense, MonthClosing, Transfer, Withdrawal, Guest)
from api.views import compute_totals

random.seed(20260704)
UTC = tz.utc
OWNER_EMAIL = os.environ.get('HOTEL_OWNER_EMAIL', 'admin@natus.uz')

owner = User.objects.get(email=OWNER_EMAIL)
profile = Profile.objects.get(id=owner.id)
HOTEL = profile.hotel
print(f'Отель: {HOTEL.name} ({HOTEL.id})')

# ── справочники ───────────────────────────────────────────────────────────────
ROOMS = {  # номер: (этаж, тип, мест, базовая цена) — типы/вместимость от Javohir 2026-07-06
    '101': (1, 'STANDARD', 3, 500_000),
    '102': (1, 'ECONOM',   2, 330_000),
    '103': (1, 'ECONOM',   2, 300_000),
    '204': (2, 'STANDARD', 1, 300_000),
    '205': (2, 'STANDARD', 2, 450_000),
    '206': (2, 'ECONOM',   1, 280_000),
    '207': (2, 'ECONOM',   2, 330_000),
    '208': (2, 'ECONOM',   2, 300_000),
}
STAFF = [  # (имя, email, роль)
    ('Умида',    'umida@taht.uz',    'MANAGER'),
    ('Мухаммад', 'muhammad@taht.uz', 'MANAGER'),
]
STAFF_PASSWORD = 'taht2026'
MAIDS = [('Гуландон опа', 1_400_000), ('Фотима опа', 1_120_000)]
ADMIN_SALARY = 2_250_000  # «админ день» / «админ ночь» из файла

GUESTS = [
    ('Алишер Хамидов', '+998901234501'), ('Дилноза Юсупова', '+998933456712'),
    ('Сардор Рахимов', '+998971112233'), ('Мадина Каримова', '+998909887766'),
    ('Жасур Тошматов', '+998935554433'), ('Нилуфар Азизова', '+998972223344'),
    ('Бехруз Салимов', '+998903334455'), ('Зарина Исмаилова', '+998936667788'),
    ('Отабек Насыров', '+998974445566'), ('Гульнора Ахмедова', '+998905556677'),
    ('Elena Petrova', '+79161234567'),   ('Дмитрий Соколов', '+79263456789'),
    ('Фаррух Умаров', '+998977778899'),  ('Севара Мирзаева', '+998938889900'),
    ('Улугбек Ганиев', '+998906665544'), ('Anna Weber', '+4915112345678'),
    ('Шахзод Кодиров', '+998939990011'), ('Лола Хакимова', '+998971110022'),
    ('Рустам Джураев', '+998902221133'), ('Malika Tashkentova', '+998934442255'),
    ('John Smith', '+447700900123'),     ('Мунира Файзиева', '+998976663377'),
    ('Икром Бабаев', '+998908884466'),   ('Дилшод Эргашев', '+998931235813'),
]
SOURCES = ['Олх', 'Олх', 'Олх', 'Booking', 'Booking', 'Прямой']
OCCUPANCY = {1: 0.45, 2: 0.50, 3: 0.65, 4: 0.58, 5: 0.65, 6: 0.55}  # сезонность

# ── реальные данные из «Оплата Taht.xlsx» ─────────────────────────────────────
TAHT_STAYS = [  # (номер, заезд, выезд, сумма, источник, payme, терминал, наличка)
    ('205', '2026-06-29', '2026-07-04', 2000000, 'Олх', 0, 0, 2000000),
    ('207', '2026-06-29', '2026-07-03', 1200000, 'Олх', 0, 0, 1200000),
    ('102', '2026-07-01', '2026-07-02',  300000, 'Олх', 0, 0, 300000),
    ('204', '2026-07-01', '2026-07-03',  670000, 'Олх', 0, 0, 670000),
    ('103', '2026-07-01', '2026-07-05', 1205000, 'Booking', 0, 0, 1205000),
    ('208', '2026-07-01', '2026-07-03',  600000, 'Booking', 0, 0, 600000),
    ('206', '2026-07-02', '2026-07-06', 1000000, 'Олх', 0, 0, 1000000),
    ('102', '2026-07-03', '2026-07-05',  600000, 'Booking', 0, 0, 600000),
    ('204', '2026-07-03', '2026-07-04',  300000, 'Олх', 0, 0, 300000),
    ('207', '2026-07-03', '2026-07-04',  330000, 'Олх', 330000, 0, 0),
]
TAHT_EXPENSES_RAW = os.environ.get('TAHT_EXPENSES_FILE', '/tmp/taht_expenses.tsv')

def categorize(text):
    t = (text or '').lower()
    if any(k in t for k in ('заплата', 'зп', 'админ', 'аванс')): return 'SALARY'
    if 'коммунал' in t or 'свет' in t or 'газ' in t: return 'UTILITIES'
    if 'бозорлик' in t or 'сув' in t or 'вода' in t: return 'FOOD'
    if any(k in t for k in ('полотенце', 'тапочки', 'ароматизатор', 'куллер',
                            'роутер', 'акуа', 'goxi', 'eva')): return 'INVENTORY'
    if 'booking' in t or 'букинг' in t: return 'MARKETING'
    if 'ремонт' in t: return 'REPAIR'
    return 'OTHER'

def D(x): return Decimal(str(int(x)))
def dt(d, h=0, m=0): return datetime(d.year, d.month, d.day, h, m, tzinfo=UTC)

# ── wipe ──────────────────────────────────────────────────────────────────────
if '--wipe' in sys.argv:
    hid = HOTEL.id
    for M in (Payment, Withdrawal, Transfer, Expense, MonthClosing, Stay, Guest, Room):
        n = M.objects.filter(hotel_id=hid).delete()[0]
        print(f'  wipe {M.__name__}: {n}')
    ids = list(Profile.objects.filter(hotel_id=hid).exclude(id=owner.id).values_list('id', flat=True))
    UserRole.objects.filter(user_id__in=ids).delete()
    Profile.objects.filter(id__in=ids).delete()
    User.objects.filter(id__in=ids).delete()
    print(f'  wipe staff users: {len(ids)}')

now = datetime.now(UTC)

# ── номера ────────────────────────────────────────────────────────────────────
rooms = {}
for num, (floor, rtype, cap, price) in ROOMS.items():
    rooms[num] = Room.objects.create(
        id=str(uuid.uuid4()), hotel=HOTEL, number=num, floor=floor,
        room_type=rtype, capacity=cap, base_price=D(price), active=True,
        created_at=datetime(2026, 1, 1, tzinfo=UTC))
print(f'Номера: {len(rooms)}')

# ── персонал ──────────────────────────────────────────────────────────────────
staff = []
pw_hash = bcrypt.hashpw(STAFF_PASSWORD.encode(), bcrypt.gensalt()).decode()
for name, email, role in STAFF:
    u = User.objects.create(id=str(uuid.uuid4()), email=email, password_hash=pw_hash,
                            created_at=datetime(2026, 1, 2, tzinfo=UTC))
    Profile.objects.create(id=u.id, full_name=name, hotel=HOTEL,
                           created_at=datetime(2026, 1, 2, tzinfo=UTC))
    UserRole.objects.create(id=str(uuid.uuid4()), user=u, role=role)
    staff.append(u)
print(f'Персонал: {[s.email for s in staff]} (пароль: {STAFF_PASSWORD})')

# ── гости (повторные — золото для аналитики) ─────────────────────────────────
guest_rows = {}
def get_guest(name, phone):
    if name not in guest_rows:
        guest_rows[name] = Guest.objects.create(
            id=str(uuid.uuid4()), hotel_id=HOTEL.id, name=name, phone=phone)
    return guest_rows[name]

# ── генерация истории 01.01–28.06 ────────────────────────────────────────────
def make_stay(room, num, ci, nights, src):
    co = ci + timedelta(days=nights)
    base = ROOMS[num][3]
    if src == 'Олх':      # торгуются
        ppn = base - random.choice([0, 0, 20_000, 30_000, 50_000])
    elif src == 'Booking':
        ppn = base
    else:
        ppn = base - random.choice([0, 20_000])
    name, phone = random.choice(GUESTS)
    g = get_guest(name, phone)
    stay = Stay.objects.create(
        id=str(uuid.uuid4()), hotel=HOTEL, room=room, guest_name=name,
        guest_phone=phone, guest_id=g.id, check_in_date=dt(ci), check_out_date=dt(co),
        status='CHECKED_OUT', price_per_night=D(ppn),
        weekly_discount_amount=D(0), manual_adjustment_amount=D(0),
        deposit_expected=D(0), comment=src if src != 'Прямой' else None,
        created_at=dt(ci - timedelta(days=random.randint(0, 5)), 11))
    total = ppn * nights
    method = random.choices(['CASH', 'PAYME', 'CARD'], weights=[60, 26, 14])[0]
    if random.random() < 0.12 and nights > 1:  # оплата двумя частями
        half = int(total * random.choice([0.3, 0.5]) // 10_000 * 10_000)
        Payment.objects.create(id=str(uuid.uuid4()), hotel=HOTEL, stay=stay,
                               paid_at=dt(ci, random.randint(12, 20)), method=method,
                               amount=D(half), created_at=dt(ci, 20))
        Payment.objects.create(id=str(uuid.uuid4()), hotel=HOTEL, stay=stay,
                               paid_at=dt(co, random.randint(8, 12)),
                               method=random.choice(['CASH', 'PAYME']),
                               amount=D(total - half), created_at=dt(co, 12))
    else:
        Payment.objects.create(id=str(uuid.uuid4()), hotel=HOTEL, stay=stay,
                               paid_at=dt(ci, random.randint(12, 21)), method=method,
                               amount=D(total), created_at=dt(ci, 21))
    return co

gen_from, gen_to = datetime(2026, 1, 3), datetime(2026, 6, 28)
for num, room in rooms.items():
    cursor = gen_from + timedelta(days=random.randint(0, 4))
    while cursor < gen_to:
        occ = OCCUPANCY[cursor.month]
        if random.random() < occ:
            nights = random.choices([1, 2, 3, 4, 5, 7], weights=[25, 30, 20, 12, 8, 5])[0]
            co = make_stay(room, num, cursor, nights, random.choice(SOURCES))
            cursor = co + timedelta(days=random.choices([0, 1, 2], weights=[45, 35, 20])[0])
        else:
            cursor += timedelta(days=1)

# ── реальные заезды из файла ──────────────────────────────────────────────────
for num, ci_s, co_s, total, src, payme, term, cash in TAHT_STAYS:
    ci = datetime.strptime(ci_s, '%Y-%m-%d')
    co = datetime.strptime(co_s, '%Y-%m-%d')
    nights = max((co - ci).days, 1)
    ppn = int(total / nights)
    name, phone = random.choice(GUESTS)
    g = get_guest(name, phone)
    today = now.date()
    status = 'CHECKED_OUT' if co.date() <= today else 'CHECKED_IN'
    stay = Stay.objects.create(
        id=str(uuid.uuid4()), hotel=HOTEL, room=rooms[num], guest_name=name,
        guest_phone=phone, guest_id=g.id, check_in_date=dt(ci), check_out_date=dt(co),
        status=status, price_per_night=D(ppn), weekly_discount_amount=D(0),
        manual_adjustment_amount=D(total - ppn * nights), deposit_expected=D(0),
        comment=src, created_at=dt(ci, 10))
    for amt, method in ((payme, 'PAYME'), (term, 'CARD'), (cash, 'CASH')):
        if amt:
            Payment.objects.create(id=str(uuid.uuid4()), hotel=HOTEL, stay=stay,
                                   paid_at=dt(ci, random.randint(12, 20)), method=method,
                                   amount=D(amt), created_at=dt(ci, 21))
print(f'Заезды: {Stay.objects.filter(hotel=HOTEL).count()}, '
      f'оплаты: {Payment.objects.filter(hotel=HOTEL).count()}')

# ── расходы: история янв–4 июня ──────────────────────────────────────────────
def add_expense(d, amount, category, method, comment, creator):
    Expense.objects.create(id=str(uuid.uuid4()), hotel=HOTEL, spent_at=dt(d, 14),
                           category=category, method=method, amount=D(amount),
                           comment=comment, created_at=dt(d, 14),
                           created_by=creator)

for month in range(1, 6):  # январь–май (июнь+ придёт из файла)
    y = 2026
    add_expense(datetime(y, month, 15), ADMIN_SALARY, 'SALARY', 'CASH', 'админ день', owner)
    add_expense(datetime(y, month, 15), ADMIN_SALARY, 'SALARY', 'CASH', 'админ ночь', owner)
    for maid, sal in MAIDS:
        add_expense(datetime(y, month, 5), sal, 'SALARY', 'CASH', f'Заплата {maid}', owner)
    utilities = random.randrange(2_200_000, 3_200_000, 50_000) if month in (1, 2) \
        else random.randrange(1_300_000, 2_000_000, 50_000)  # зимой дороже
    add_expense(datetime(y, month, 25), utilities, 'UTILITIES', 'PAYME',
                'Коммуналка', random.choice(staff))
    for week in (3, 10, 17, 24):
        add_expense(datetime(y, month, week), random.randrange(280_000, 620_000, 10_000),
                    'FOOD', 'CASH', 'Бозорлик', random.choice(staff))
    for _ in range(random.randint(1, 2)):
        add_expense(datetime(y, month, random.randint(6, 20)),
                    random.randrange(400_000, 1_800_000, 50_000),
                    'INVENTORY', 'CASH',
                    random.choice(['Тапочки', 'Ароматизатор', 'Сув 0.33', 'Полотенце',
                                   'Моющие', 'Постельное бельё']),
                    random.choice(staff))
    add_expense(datetime(y, month, random.randint(8, 14)),
                random.randrange(900_000, 1_600_000, 50_000),
                'CLEANING', 'CASH', 'Прачечная', random.choice(staff))
    add_expense(datetime(y, month, 15), random.randrange(2_500_000, 6_500_000, 250_000),
                'MARKETING', 'PAYME', 'booking', owner)
    if month in (2, 4):  # пара ремонтов за полгода
        add_expense(datetime(y, month, random.randint(10, 22)),
                    random.randrange(1_500_000, 5_000_000, 100_000),
                    'REPAIR', 'CASH',
                    random.choice(['Сантехника', 'Кондиционер ремонт', 'Покраска коридора']),
                    owner)

# ── расходы из файла (5 июня – сейчас) ───────────────────────────────────────
if os.path.exists(TAHT_EXPENSES_RAW):
    n = 0
    for line in open(TAHT_EXPENSES_RAW, encoding='utf-8'):
        d_s, amt, text = line.rstrip('\n').split('\t')
        d = datetime.strptime(d_s, '%Y-%m-%d')
        add_expense(d, int(float(amt)), categorize(text),
                    'CASH', text or None, random.choice(staff))
        n += 1
    print(f'Расходы из файла: {n}')
print(f'Расходы всего: {Expense.objects.filter(hotel=HOTEL).count()}')

# ── переводы и изъятия владельца ─────────────────────────────────────────────
for month in range(1, 7):
    d = datetime(2026, month, random.randint(24, 28))
    Transfer.objects.create(id=str(uuid.uuid4()), hotel=HOTEL, transferred_at=dt(d, 18),
                            from_method='CASH', to_method='PAYME',
                            amount=D(random.randrange(2_000_000, 5_000_000, 500_000)),
                            comment='Инкассация', created_at=dt(d, 18))
    if month < 6:
        wd = datetime(2026, month + 1, 2)
        Withdrawal.objects.create(id=str(uuid.uuid4()), hotel=HOTEL, withdrawn_at=dt(wd, 12),
                                  method='CASH',
                                  amount=D(random.randrange(9_000_000, 16_000_000, 500_000)),
                                  comment='Прибыль владельца', created_at=dt(wd, 12),
                                  created_by=owner)

# ── закрытие месяцев янв–июнь ────────────────────────────────────────────────
import calendar
for month in range(1, 7):
    last = calendar.monthrange(2026, month)[1]
    totals = compute_totals(HOTEL.id, datetime(2026, month, 1).date(),
                            datetime(2026, month, last).date())
    MonthClosing.objects.create(id=str(uuid.uuid4()), hotel=HOTEL,
                                month=f'2026-{month:02d}',
                                closed_at=datetime(2026, month, last, 19, tzinfo=UTC)
                                          + timedelta(days=1),
                                totals_json=totals)
    rev = sum(totals.get('revenue_by_method', {}).values())
    print(f'  2026-{month:02d} закрыт: выручка {rev:,.0f}, '
          f'occupancy {totals.get("occupancy_rate", 0):.0f}%, ADR {totals.get("adr", 0):,.0f}')

print('ГОТОВО.')
