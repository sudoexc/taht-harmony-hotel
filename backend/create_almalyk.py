import os, uuid, bcrypt, django
from datetime import datetime, timezone as tz
from decimal import Decimal
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'hotel_crm.settings')
django.setup()
from api.models import Hotel, User, Profile, UserRole, Room

UTC = tz.utc
now = datetime.now(UTC)
D = lambda x: Decimal(str(int(x)))

EMAIL = 'admin@almalykplaza.uz'
PASSWORD = os.environ['ALMALYK_PW']
OWNER = 'Almalyk Plaza — администратор'

if User.objects.filter(email__iexact=EMAIL).exists():
    print('ABORT: user already exists'); raise SystemExit(1)
if Hotel.objects.filter(name='Almalyk Plaza Hotel').exists():
    print('ABORT: hotel already exists'); raise SystemExit(1)

hotel = Hotel.objects.create(id=str(uuid.uuid4()), name='Almalyk Plaza Hotel',
                             timezone='Asia/Tashkent', created_at=now)
pw = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()
user = User.objects.create(id=str(uuid.uuid4()), email=EMAIL, password_hash=pw, created_at=now)
Profile.objects.create(id=user.id, full_name=OWNER, hotel=hotel, created_at=now)
UserRole.objects.create(id=str(uuid.uuid4()), user=user, role='ADMIN')

# (номер, этаж, enum-тип, вместимость, цена, примечание)
ROOMS = [
    ('101', 1, 'ECONOM',   2, 400000, 'Эконом'),
    ('102', 1, 'ECONOM',   2, 400000, 'Эконом'),
    ('103', 1, 'ECONOM',   2, 400000, 'Эконом · доступный номер (для людей с инвалидностью)'),
    ('104', 1, 'STANDARD', 2, 450000, 'Стандарт'),
    ('105', 1, 'STANDARD', 2, 450000, 'Стандарт'),
    ('106', 1, 'STANDARD', 2, 450000, 'Стандарт'),
    ('107', 1, 'STANDARD', 2, 500000, 'King size'),
    ('108', 1, 'STANDARD', 2, 500000, 'King size'),
    ('310', 3, 'FAMILY',   3, 730000, 'Трёхместный'),
    ('311', 3, 'FAMILY',   3, 730000, 'Трёхместный'),
    ('401', 4, 'SUITE',    2, 850000, 'Полулюкс'),
    ('402', 4, 'SUITE',    2, 850000, 'Полулюкс'),
    ('403', 4, 'SUITE',    2, 1400000, 'Люкс'),
    ('404', 4, 'SUITE',    2, 1400000, 'Люкс'),
    ('405', 4, 'SUITE',    2, 1400000, 'Люкс'),
]
# 18 двухместных: 201-209 (этаж 2), 301-309 (этаж 3)
двухм_note = 'Двухместный · при одноместном размещении — 550 000'
for floor, start in ((2, 201), (3, 301)):
    for i in range(9):
        ROOMS.append((str(start + i), floor, 'STANDARD', 2, 630000, двухм_note))

for num, floor, rtype, cap, price, note in ROOMS:
    Room.objects.create(id=str(uuid.uuid4()), hotel=hotel, number=num, floor=floor,
                        room_type=rtype, capacity=cap, base_price=D(price),
                        active=True, notes=note, created_at=now)

print(f'Отель: {hotel.name} ({hotel.id})')
print(f'Владелец: {EMAIL}')
print(f'Номеров создано: {Room.objects.filter(hotel=hotel).count()}')
from django.db.models import Count
print('По типам:', dict(Room.objects.filter(hotel=hotel).values_list('room_type').annotate(c=Count('id'))))
