import uuid
import bcrypt
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from django.conf import settings
from django.db import IntegrityError
from django.db.models import Sum, Q
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework_simplejwt.tokens import AccessToken

from .models import User, Hotel, Profile, UserRole, Room, Stay, Payment, Expense, MonthClosing, CustomPaymentMethod, Transfer
from .permissions import IsAdmin


# ─── helpers ─────────────────────────────────────────────────────────────────

def make_token(user, profile, role):
    token = AccessToken()
    token['sub'] = user.id
    token['email'] = user.email
    token['hotel_id'] = profile.hotel_id
    token['role'] = role
    return str(token)


def get_role(user_id):
    ur = UserRole.objects.filter(user_id=user_id).first()
    return ur.role if ur else 'MANAGER'


def set_auth_cookie(response, token):
    secure = not settings.DEBUG
    response.set_cookie(
        'accessToken',
        token,
        httponly=True,
        secure=secure,
        samesite='None' if secure else 'Lax',
        max_age=7 * 24 * 3600,
        path='/',
    )


def hotel_id(request):
    return request.user.hotel_id


def fmt_dt(dt):
    if dt is None:
        return None
    if hasattr(dt, 'isoformat'):
        return dt.isoformat().replace('+00:00', 'Z') if dt.tzinfo else dt.isoformat() + 'Z'
    return str(dt)


def fmt_date(dt):
    """Return YYYY-MM-DD string from datetime."""
    if dt is None:
        return None
    return dt.strftime('%Y-%m-%d')


def to_float(val):
    if val is None:
        return 0
    return float(val)


# ─── auth ─────────────────────────────────────────────────────────────────────

class LoginView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        username = (request.data.get('username') or '').strip()
        password = (request.data.get('password') or '')
        if not username or not password:
            return Response({'message': 'Username and password required'}, status=400)
        try:
            user = User.objects.get(email__iexact=username)
        except User.DoesNotExist:
            return Response({'message': 'Invalid credentials'}, status=401)

        ok = bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8'))
        if not ok:
            return Response({'message': 'Invalid credentials'}, status=401)

        try:
            profile = Profile.objects.select_related('hotel').get(id=user.id)
        except Profile.DoesNotExist:
            return Response({'message': 'Profile not found'}, status=401)

        role = get_role(user.id)
        token = make_token(user, profile, role)
        data = {
            'user': {
                'id': user.id,
                'username': user.email,
                'full_name': profile.full_name,
                'role': role,
                'hotel_id': profile.hotel_id,
            }
        }
        resp = Response(data)
        set_auth_cookie(resp, token)
        return resp


class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        resp = Response({'ok': True})
        resp.delete_cookie('accessToken', path='/')
        return resp


class MeView(APIView):
    def get(self, request):
        u = request.user
        try:
            profile = Profile.objects.get(id=u.id)
        except Profile.DoesNotExist:
            return Response({'message': 'Profile not found'}, status=404)
        return Response({
            'user': {
                'id': u.id,
                'username': u.email,
                'full_name': profile.full_name,
                'role': u.role,  # from JWT
                'hotel_id': u.hotel_id,
            }
        })


# ─── hotel ────────────────────────────────────────────────────────────────────

class HotelMeView(APIView):
    def get(self, request):
        try:
            h = Hotel.objects.get(id=hotel_id(request))
        except Hotel.DoesNotExist:
            return Response({'message': 'Hotel not found'}, status=404)
        return Response({
            'id': h.id, 'name': h.name,
            'timezone': h.timezone, 'created_at': fmt_dt(h.created_at),
        })

    def patch(self, request):
        try:
            h = Hotel.objects.get(id=hotel_id(request))
        except Hotel.DoesNotExist:
            return Response({'message': 'Hotel not found'}, status=404)
        if 'name' in request.data:
            h.name = request.data['name']
        if 'timezone' in request.data:
            h.timezone = request.data['timezone']
        h.save(update_fields=['name', 'timezone'])
        return Response({
            'id': h.id, 'name': h.name,
            'timezone': h.timezone, 'created_at': fmt_dt(h.created_at),
        })


# ─── rooms ────────────────────────────────────────────────────────────────────

def room_data(r):
    return {
        'id': r.id, 'hotel_id': r.hotel_id, 'number': r.number,
        'floor': r.floor, 'room_type': r.room_type, 'capacity': r.capacity,
        'base_price': to_float(r.base_price), 'active': r.active,
        'notes': r.notes, 'created_at': fmt_dt(r.created_at),
    }


class RoomListCreateView(APIView):
    def get(self, request):
        rooms = Room.objects.filter(hotel_id=hotel_id(request)).order_by('-created_at')
        return Response([room_data(r) for r in rooms])

    def post(self, request):
        d = request.data
        room = Room(
            id=str(uuid.uuid4()),
            hotel_id=hotel_id(request),
            number=d.get('number', ''),
            floor=int(d.get('floor', 0)),
            room_type=d.get('room_type', 'SINGLE'),
            capacity=int(d.get('capacity', 1)),
            base_price=Decimal(str(d.get('base_price', 0))),
            active=d.get('active', True),
            notes=d.get('notes') or None,
            created_at=datetime.now(timezone.utc),
        )
        room.save()
        return Response(room_data(room), status=201)


class RoomDetailView(APIView):
    def _get(self, request, pk):
        try:
            return Room.objects.get(id=pk, hotel_id=hotel_id(request))
        except Room.DoesNotExist:
            return None

    def patch(self, request, pk):
        room = self._get(request, pk)
        if not room:
            return Response({'message': 'Not found'}, status=404)
        d = request.data
        for field, val in [
            ('number', d.get('number')), ('floor', d.get('floor')),
            ('room_type', d.get('room_type')), ('capacity', d.get('capacity')),
            ('base_price', d.get('base_price')), ('active', d.get('active')),
            ('notes', d.get('notes')),
        ]:
            if val is not None:
                setattr(room, field, val)
        room.save()
        return Response(room_data(room))

    def delete(self, request, pk):
        room = self._get(request, pk)
        if not room:
            return Response({'message': 'Not found'}, status=404)
        room.delete()
        return Response(status=204)


# ─── stays ────────────────────────────────────────────────────────────────────

def stay_data(s):
    return {
        'id': s.id, 'hotel_id': s.hotel_id, 'room_id': s.room_id,
        'guest_name': s.guest_name, 'guest_phone': s.guest_phone,
        'check_in_date': fmt_date(s.check_in_date),
        'check_out_date': fmt_date(s.check_out_date),
        'status': s.status,
        'price_per_night': to_float(s.price_per_night),
        'weekly_discount_amount': to_float(s.weekly_discount_amount),
        'manual_adjustment_amount': to_float(s.manual_adjustment_amount),
        'deposit_expected': to_float(s.deposit_expected),
        'comment': s.comment, 'created_at': fmt_dt(s.created_at),
    }


def parse_date(val):
    if not val:
        return None
    if 'T' in str(val):
        return datetime.fromisoformat(str(val).replace('Z', '+00:00'))
    return datetime.strptime(str(val), '%Y-%m-%d').replace(tzinfo=timezone.utc)


BLOCKING_STATUSES = ['CHECKED_IN', 'BOOKED']


def has_room_overlap(hotel_id_val, room_id, check_in, check_out, exclude_id=None):
    """Return True if any active stay occupies this room during [check_in, check_out)."""
    qs = Stay.objects.filter(
        hotel_id=hotel_id_val,
        room_id=room_id,
        status__in=BLOCKING_STATUSES,
        check_in_date__lt=check_out,
        check_out_date__gt=check_in,
    )
    if exclude_id:
        qs = qs.exclude(id=exclude_id)
    return qs.exists()


class StayListCreateView(APIView):
    def get(self, request):
        stays = Stay.objects.filter(hotel_id=hotel_id(request)).order_by('-created_at')
        return Response([stay_data(s) for s in stays])

    def post(self, request):
        d = request.data
        check_in = parse_date(d.get('check_in_date'))
        check_out = parse_date(d.get('check_out_date'))
        room_id = d.get('room_id')
        new_status = d.get('status', 'BOOKED')

        if new_status in BLOCKING_STATUSES and check_in and check_out:
            if has_room_overlap(hotel_id(request), room_id, check_in, check_out):
                return Response({'message': 'Room is occupied in the selected dates'}, status=409)

        stay = Stay(
            id=str(uuid.uuid4()),
            hotel_id=hotel_id(request),
            room_id=room_id,
            guest_name=d.get('guest_name', ''),
            guest_phone=d.get('guest_phone') or None,
            check_in_date=check_in,
            check_out_date=check_out,
            status=new_status,
            price_per_night=Decimal(str(d.get('price_per_night', 0))),
            weekly_discount_amount=Decimal(str(d.get('weekly_discount_amount', 0))),
            manual_adjustment_amount=Decimal(str(d.get('manual_adjustment_amount', 0))),
            deposit_expected=Decimal(str(d.get('deposit_expected', 0))),
            comment=d.get('comment') or None,
            created_at=datetime.now(timezone.utc),
        )
        stay.save()
        return Response(stay_data(stay), status=201)


class StayDetailView(APIView):
    def _get(self, request, pk):
        try:
            return Stay.objects.get(id=pk, hotel_id=hotel_id(request))
        except Stay.DoesNotExist:
            return None

    def patch(self, request, pk):
        stay = self._get(request, pk)
        if not stay:
            return Response({'message': 'Not found'}, status=404)
        d = request.data
        if 'room_id' in d:         stay.room_id = d['room_id']
        if 'guest_name' in d:     stay.guest_name = d['guest_name']
        if 'guest_phone' in d:    stay.guest_phone = d['guest_phone'] or None
        if 'check_in_date' in d:  stay.check_in_date = parse_date(d['check_in_date'])
        if 'check_out_date' in d: stay.check_out_date = parse_date(d['check_out_date'])
        if 'status' in d:         stay.status = d['status']
        if 'price_per_night' in d:          stay.price_per_night = Decimal(str(d['price_per_night']))
        if 'weekly_discount_amount' in d:   stay.weekly_discount_amount = Decimal(str(d['weekly_discount_amount']))
        if 'manual_adjustment_amount' in d: stay.manual_adjustment_amount = Decimal(str(d['manual_adjustment_amount']))
        if 'deposit_expected' in d:         stay.deposit_expected = Decimal(str(d['deposit_expected']))
        if 'comment' in d:        stay.comment = d['comment'] or None

        # Overlap check: only for blocking statuses
        if stay.status in BLOCKING_STATUSES:
            if has_room_overlap(hotel_id(request), stay.room_id, stay.check_in_date, stay.check_out_date, exclude_id=pk):
                return Response({'message': 'Room is occupied in the selected dates'}, status=409)

        stay.save()
        return Response(stay_data(stay))

    def delete(self, request, pk):
        stay = self._get(request, pk)
        if not stay:
            return Response({'message': 'Not found'}, status=404)
        if stay.status == 'CHECKED_IN':
            return Response({'message': 'Cannot delete an active stay: guest is checked in'}, status=409)
        if Payment.objects.filter(stay_id=pk).exists():
            return Response({'message': 'Cannot delete a stay with payments'}, status=409)
        stay.delete()
        return Response(status=204)


# ─── payments ─────────────────────────────────────────────────────────────────

def payment_data(p):
    return {
        'id': p.id, 'hotel_id': p.hotel_id, 'stay_id': p.stay_id,
        'paid_at': fmt_dt(p.paid_at), 'method': p.method,
        'custom_method_label': p.custom_method_label,
        'amount': to_float(p.amount), 'comment': p.comment,
        'created_at': fmt_dt(p.created_at),
    }


class PaymentListCreateView(APIView):
    def get(self, request):
        payments = Payment.objects.filter(hotel_id=hotel_id(request)).order_by('-paid_at')
        return Response([payment_data(p) for p in payments])

    def post(self, request):
        d = request.data
        p = Payment(
            id=str(uuid.uuid4()),
            hotel_id=hotel_id(request),
            stay_id=d.get('stay_id'),
            paid_at=parse_date(d.get('paid_at')),
            method=d.get('method', 'OTHER'),
            custom_method_label=d.get('custom_method_label') or None,
            amount=Decimal(str(d.get('amount', 0))),
            comment=d.get('comment') or None,
            created_at=datetime.now(timezone.utc),
        )
        p.save()
        return Response(payment_data(p), status=201)


class PaymentDetailView(APIView):
    def _get(self, request, pk):
        try:
            return Payment.objects.get(id=pk, hotel_id=hotel_id(request))
        except Payment.DoesNotExist:
            return None

    def patch(self, request, pk):
        p = self._get(request, pk)
        if not p:
            return Response({'message': 'Not found'}, status=404)
        d = request.data
        if 'paid_at' in d:              p.paid_at = parse_date(d['paid_at'])
        if 'method' in d:               p.method = d['method']
        if 'custom_method_label' in d:  p.custom_method_label = d['custom_method_label'] or None
        if 'amount' in d:               p.amount = Decimal(str(d['amount']))
        if 'comment' in d:              p.comment = d['comment'] or None
        p.save()
        return Response(payment_data(p))

    def delete(self, request, pk):
        p = self._get(request, pk)
        if not p:
            return Response({'message': 'Not found'}, status=404)
        # Check if month is closed
        month = p.paid_at.strftime('%Y-%m')
        if MonthClosing.objects.filter(hotel_id=p.hotel_id, month=month).exists():
            if not request.user.is_admin:
                return Response({'message': 'Month is closed'}, status=403)
        p.delete()
        return Response(status=204)


# ─── expenses ─────────────────────────────────────────────────────────────────

def expense_data(e):
    created_by_name = None
    if e.created_by_id:
        try:
            profile = Profile.objects.get(id=e.created_by_id)
            created_by_name = profile.full_name
        except Profile.DoesNotExist:
            created_by_name = None
    return {
        'id': e.id, 'hotel_id': e.hotel_id,
        'spent_at': fmt_dt(e.spent_at), 'category': e.category,
        'method': e.method, 'custom_method_label': e.custom_method_label,
        'amount': to_float(e.amount), 'comment': e.comment,
        'created_at': fmt_dt(e.created_at),
        'created_by_name': created_by_name,
    }


class ExpenseListCreateView(APIView):
    def get(self, request):
        qs = Expense.objects.filter(hotel_id=hotel_id(request))
        if not request.user.is_admin:
            qs = qs.filter(created_by_id=request.user.id)
        return Response([expense_data(e) for e in qs.order_by('-spent_at')])

    def post(self, request):
        d = request.data
        e = Expense(
            id=str(uuid.uuid4()),
            hotel_id=hotel_id(request),
            spent_at=parse_date(d.get('spent_at')),
            category=d.get('category', 'OTHER'),
            method=d.get('method', 'OTHER'),
            custom_method_label=d.get('custom_method_label') or None,
            amount=Decimal(str(d.get('amount', 0))),
            comment=d.get('comment') or None,
            created_at=datetime.now(timezone.utc),
            created_by_id=request.user.id,
        )
        e.save()
        return Response(expense_data(e), status=201)


class ExpenseDetailView(APIView):
    def _get(self, request, pk):
        try:
            return Expense.objects.get(id=pk, hotel_id=hotel_id(request))
        except Expense.DoesNotExist:
            return None

    def patch(self, request, pk):
        e = self._get(request, pk)
        if not e:
            return Response({'message': 'Not found'}, status=404)
        d = request.data
        if 'spent_at' in d:             e.spent_at = parse_date(d['spent_at'])
        if 'category' in d:             e.category = d['category']
        if 'method' in d:               e.method = d['method']
        if 'custom_method_label' in d:  e.custom_method_label = d['custom_method_label'] or None
        if 'amount' in d:               e.amount = Decimal(str(d['amount']))
        if 'comment' in d:              e.comment = d['comment'] or None
        e.save()
        return Response(expense_data(e))

    def delete(self, request, pk):
        e = self._get(request, pk)
        if not e:
            return Response({'message': 'Not found'}, status=404)
        month = e.spent_at.strftime('%Y-%m')
        if MonthClosing.objects.filter(hotel_id=e.hotel_id, month=month).exists():
            if not request.user.is_admin:
                return Response({'message': 'Month is closed'}, status=403)
        e.delete()
        return Response(status=204)


# ─── month closings ───────────────────────────────────────────────────────────

def closing_data(c):
    return {
        'id': c.id, 'hotel_id': c.hotel_id, 'month': c.month,
        'closed_at': fmt_dt(c.closed_at),
        'totals_json': c.totals_json,
    }


def compute_totals(hotel_id_val, from_date, to_date):
    """Compute TotalsSnapshot for a date range."""
    payments = Payment.objects.filter(
        hotel_id=hotel_id_val,
        paid_at__date__gte=from_date,
        paid_at__date__lte=to_date,
    )
    expenses = Expense.objects.filter(
        hotel_id=hotel_id_val,
        spent_at__date__gte=from_date,
        spent_at__date__lte=to_date,
    )

    revenue_by_method = {}
    for p in payments:
        label = p.custom_method_label or p.method
        revenue_by_method[label] = revenue_by_method.get(label, 0) + float(p.amount)

    expenses_by_category = {}
    for e in expenses:
        expenses_by_category[e.category] = expenses_by_category.get(e.category, 0) + float(e.amount)

    total_revenue = sum(revenue_by_method.values())
    total_expenses = sum(expenses_by_category.values())
    profit = total_revenue - total_expenses

    # Occupancy
    rooms = Room.objects.filter(hotel_id=hotel_id_val, active=True)
    days = (to_date - from_date).days + 1
    available_nights = rooms.count() * days

    stays = Stay.objects.filter(
        hotel_id=hotel_id_val,
        status__in=['CHECKED_IN', 'CHECKED_OUT'],
        check_in_date__date__lte=to_date,
        check_out_date__date__gte=from_date,
    )
    sold_nights = 0
    for s in stays:
        ci = max(s.check_in_date.date(), from_date)
        co = min(s.check_out_date.date(), to_date)
        sold_nights += max(0, (co - ci).days)

    occupancy_rate = (sold_nights / available_nights * 100) if available_nights > 0 else 0
    adr = (total_revenue / sold_nights) if sold_nights > 0 else 0
    revpar = (total_revenue / available_nights) if available_nights > 0 else 0

    return {
        'revenue_by_method': revenue_by_method,
        'expenses_by_category': expenses_by_category,
        'profit': profit,
        'occupancy_rate': occupancy_rate,
        'adr': adr,
        'revpar': revpar,
        'sold_nights': sold_nights,
        'available_nights': available_nights,
        'total_room_revenue': total_revenue,
    }


class MonthClosingListView(APIView):
    def get(self, request):
        closings = MonthClosing.objects.filter(hotel_id=hotel_id(request)).order_by('-month')
        return Response([closing_data(c) for c in closings])


class ClosePreviousMonthView(APIView):
    def post(self, request):
        now = datetime.now(timezone.utc)
        first_of_current = now.replace(day=1)
        last_month = first_of_current - timedelta(days=1)
        month_str = last_month.strftime('%Y-%m')
        hid = hotel_id(request)

        existing = MonthClosing.objects.filter(hotel_id=hid, month=month_str).first()
        if existing:
            return Response(closing_data(existing))

        from_date = last_month.replace(day=1).date()
        to_date = last_month.date()
        totals = compute_totals(hid, from_date, to_date)

        closing = MonthClosing(
            id=str(uuid.uuid4()),
            hotel_id=hid,
            month=month_str,
            closed_at=datetime.now(timezone.utc),
            totals_json=totals,
        )
        closing.save()
        return Response(closing_data(closing), status=201)


class ReopenMonthView(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, month):
        try:
            closing = MonthClosing.objects.get(hotel_id=hotel_id(request), month=month)
        except MonthClosing.DoesNotExist:
            return Response({'message': 'Not found'}, status=404)
        closing.delete()
        return Response(status=204)


# ─── reports ──────────────────────────────────────────────────────────────────

class ReportsView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        from_str = request.query_params.get('from', '')
        to_str = request.query_params.get('to', '')
        try:
            from_date = datetime.strptime(from_str, '%Y-%m-%d').date()
            to_date = datetime.strptime(to_str, '%Y-%m-%d').date()
        except (ValueError, TypeError):
            return Response({'message': 'Invalid date range'}, status=400)

        totals = compute_totals(hotel_id(request), from_date, to_date)
        return Response(totals)


# ─── users (admin only) ───────────────────────────────────────────────────────

class UserListCreateView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        profiles = Profile.objects.filter(hotel_id=hotel_id(request))
        # Owner = the profile with the earliest created_at for this hotel
        owner_id = None
        oldest = None
        for p in profiles:
            if p.created_at and (oldest is None or p.created_at < oldest):
                oldest = p.created_at
                owner_id = p.id
        result = []
        for p in profiles:
            try:
                user = User.objects.get(id=p.id)
                role = get_role(p.id)
                result.append({
                    'id': p.id, 'username': user.email,
                    'full_name': p.full_name, 'role': role,
                    'is_owner': p.id == owner_id,
                })
            except User.DoesNotExist:
                pass
        return Response(result)

    def post(self, request):
        d = request.data
        username = (d.get('username') or '').strip()
        password = d.get('password') or ''
        full_name = d.get('full_name') or ''
        role = d.get('role', 'MANAGER')

        if not username or not password or not full_name:
            return Response({'message': 'All fields required'}, status=400)
        if len(password) < 6:
            return Response({'message': 'Password must be at least 6 characters'}, status=400)
        if User.objects.filter(email__iexact=username).exists():
            return Response({'message': 'Username already exists'}, status=409)

        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        uid = str(uuid.uuid4())
        now = datetime.now(timezone.utc)

        user = User(id=uid, email=username, password_hash=hashed, created_at=now)
        user.save()
        profile = Profile(id=uid, full_name=full_name, hotel_id=hotel_id(request), created_at=now)
        profile.save()
        UserRole(id=str(uuid.uuid4()), user_id=uid, role=role).save()

        return Response({'id': uid, 'username': username, 'full_name': full_name, 'role': role}, status=201)


class UserRoleView(APIView):
    permission_classes = [IsAdmin]

    def patch(self, request, pk):
        try:
            profile = Profile.objects.get(id=pk, hotel_id=hotel_id(request))
        except Profile.DoesNotExist:
            return Response({'message': 'Not found'}, status=404)
        # Protect the owner (earliest created profile for this hotel)
        oldest = Profile.objects.filter(hotel_id=hotel_id(request)).order_by('created_at').first()
        if oldest and pk == oldest.id:
            return Response({'message': 'Cannot change the role of the main admin'}, status=403)
        role = request.data.get('role')
        if role not in ('ADMIN', 'MANAGER'):
            return Response({'message': 'Invalid role'}, status=400)
        # Update role in UserRole table
        ur = UserRole.objects.filter(user_id=pk).first()
        if ur:
            ur.role = role
            ur.save(update_fields=['role'])
        else:
            UserRole(id=str(uuid.uuid4()), user_id=pk, role=role).save()
        try:
            user = User.objects.get(id=pk)
        except User.DoesNotExist:
            return Response({'message': 'User not found'}, status=404)
        return Response({'id': pk, 'username': user.email, 'full_name': profile.full_name, 'role': role})


class UserDeleteView(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, pk):
        if pk == request.user.id:
            return Response({'message': 'Cannot delete yourself'}, status=400)
        try:
            profile = Profile.objects.get(id=pk, hotel_id=hotel_id(request))
        except Profile.DoesNotExist:
            return Response({'message': 'Not found'}, status=404)
        UserRole.objects.filter(user_id=pk).delete()
        profile.delete()
        try:
            User.objects.filter(id=pk).delete()
        except Exception:
            pass
        return Response(status=204)


# ─── custom payment methods (admin only) ──────────────────────────────────────

class CustomPaymentMethodListCreateView(APIView):
    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAdmin()]
        return super().get_permissions()

    def get(self, request):
        methods = CustomPaymentMethod.objects.filter(hotel_id=hotel_id(request)).order_by('name')
        return Response([{
            'id': m.id, 'name': m.name, 'created_at': fmt_dt(m.created_at),
        } for m in methods])

    def post(self, request):
        name = (request.data.get('name') or '').strip()
        if not name:
            return Response({'message': 'Name required'}, status=400)
        hid = hotel_id(request)
        if CustomPaymentMethod.objects.filter(hotel_id=hid, name=name).exists():
            return Response({'message': 'Method already exists'}, status=409)
        m = CustomPaymentMethod(
            id=str(uuid.uuid4()),
            hotel_id=hid,
            name=name,
            created_at=datetime.now(timezone.utc),
        )
        m.save()
        return Response({'id': m.id, 'name': m.name, 'created_at': fmt_dt(m.created_at)}, status=201)


class CustomPaymentMethodDeleteView(APIView):
    permission_classes = [IsAdmin]

    def delete(self, request, pk):
        try:
            m = CustomPaymentMethod.objects.get(id=pk, hotel_id=hotel_id(request))
        except CustomPaymentMethod.DoesNotExist:
            return Response({'message': 'Not found'}, status=404)
        m.delete()
        return Response(status=204)


# ─── transfers ────────────────────────────────────────────────────────────────

def transfer_data(t):
    return {
        'id': t.id, 'hotel_id': t.hotel_id,
        'transferred_at': fmt_dt(t.transferred_at),
        'from_method': t.from_method,
        'to_method': t.to_method,
        'amount': to_float(t.amount),
        'comment': t.comment,
        'created_at': fmt_dt(t.created_at),
    }


class TransferListCreateView(APIView):
    def get(self, request):
        transfers = Transfer.objects.filter(hotel_id=hotel_id(request)).order_by('-transferred_at')
        return Response([transfer_data(t) for t in transfers])

    def post(self, request):
        d = request.data
        from_m = (d.get('from_method') or '').strip()
        to_m = (d.get('to_method') or '').strip()
        amount = Decimal(str(d.get('amount', 0)))
        if not from_m or not to_m:
            return Response({'message': 'from_method and to_method required'}, status=400)
        if from_m == to_m:
            return Response({'message': 'Cannot transfer to the same register'}, status=400)
        if amount <= 0:
            return Response({'message': 'Amount must be positive'}, status=400)
        t = Transfer(
            id=str(uuid.uuid4()),
            hotel_id=hotel_id(request),
            transferred_at=parse_date(d.get('transferred_at')),
            from_method=from_m,
            to_method=to_m,
            amount=amount,
            comment=d.get('comment') or None,
            created_at=datetime.now(timezone.utc),
        )
        t.save()
        return Response(transfer_data(t), status=201)


class TransferDetailView(APIView):
    def _get(self, request, pk):
        try:
            return Transfer.objects.get(id=pk, hotel_id=hotel_id(request))
        except Transfer.DoesNotExist:
            return None

    def patch(self, request, pk):
        t = self._get(request, pk)
        if not t:
            return Response({'message': 'Not found'}, status=404)
        d = request.data
        if 'transferred_at' in d: t.transferred_at = parse_date(d['transferred_at'])
        if 'from_method' in d:    t.from_method = d['from_method']
        if 'to_method' in d:      t.to_method = d['to_method']
        if 'amount' in d:         t.amount = Decimal(str(d['amount']))
        if 'comment' in d:        t.comment = d['comment'] or None
        t.save()
        return Response(transfer_data(t))

    def delete(self, request, pk):
        t = self._get(request, pk)
        if not t:
            return Response({'message': 'Not found'}, status=404)
        month = t.transferred_at.strftime('%Y-%m')
        if MonthClosing.objects.filter(hotel_id=t.hotel_id, month=month).exists():
            if not request.user.is_admin:
                return Response({'message': 'Month is closed'}, status=403)
        t.delete()
        return Response(status=204)


# ─── health ───────────────────────────────────────────────────────────────────

class HealthView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request):
        return Response({'ok': True, 'timestamp': datetime.now(timezone.utc).isoformat()})
