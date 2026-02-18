from django.db import models


class User(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    email = models.CharField(max_length=255, unique=True)
    password_hash = models.TextField(db_column='passwordHash')
    created_at = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = '"User"'


class Hotel(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    name = models.CharField(max_length=255)
    timezone = models.CharField(max_length=100, default='Asia/Tashkent')
    created_at = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = '"Hotel"'


class Profile(models.Model):
    id = models.CharField(max_length=36, primary_key=True, db_column='id')
    full_name = models.CharField(max_length=255, db_column='fullName')
    hotel = models.ForeignKey(Hotel, on_delete=models.PROTECT, db_column='hotelId')
    role = models.CharField(max_length=20, default='MANAGER')

    class Meta:
        managed = False
        db_table = '"Profile"'


class Room(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, db_column='hotelId')
    number = models.CharField(max_length=50)
    floor = models.IntegerField()
    room_type = models.CharField(max_length=20, db_column='roomType')
    capacity = models.IntegerField()
    base_price = models.DecimalField(max_digits=20, decimal_places=2, db_column='basePrice')
    active = models.BooleanField(default=True)
    notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = '"Room"'


class Stay(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, db_column='hotelId')
    room = models.ForeignKey(Room, on_delete=models.PROTECT, db_column='roomId')
    guest_name = models.CharField(max_length=255, db_column='guestName')
    guest_phone = models.CharField(max_length=50, null=True, blank=True, db_column='guestPhone')
    check_in_date = models.DateTimeField(db_column='checkInDate')
    check_out_date = models.DateTimeField(db_column='checkOutDate')
    status = models.CharField(max_length=20)
    price_per_night = models.DecimalField(max_digits=20, decimal_places=2, db_column='pricePerNight')
    weekly_discount_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, db_column='weeklyDiscountAmount')
    manual_adjustment_amount = models.DecimalField(max_digits=20, decimal_places=2, default=0, db_column='manualAdjustmentAmount')
    deposit_expected = models.DecimalField(max_digits=20, decimal_places=2, default=0, db_column='depositExpected')
    comment = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = '"Stay"'


class Payment(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, db_column='hotelId')
    stay = models.ForeignKey(Stay, on_delete=models.CASCADE, db_column='stayId')
    paid_at = models.DateTimeField(db_column='paidAt')
    method = models.CharField(max_length=20)
    custom_method_label = models.CharField(max_length=100, null=True, blank=True, db_column='customMethodLabel')
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    comment = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = '"Payment"'


class Expense(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, db_column='hotelId')
    spent_at = models.DateTimeField(db_column='spentAt')
    category = models.CharField(max_length=20)
    method = models.CharField(max_length=20)
    custom_method_label = models.CharField(max_length=100, null=True, blank=True, db_column='customMethodLabel')
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    comment = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = '"Expense"'


class MonthClosing(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, db_column='hotelId')
    month = models.CharField(max_length=7)  # YYYY-MM
    closed_at = models.DateTimeField(db_column='closedAt')
    totals_json = models.JSONField(null=True, blank=True, db_column='totalsJson')

    class Meta:
        managed = False
        db_table = '"MonthClosing"'
        unique_together = [('hotel', 'month')]


class CustomPaymentMethod(models.Model):
    id = models.CharField(max_length=36, primary_key=True)
    hotel = models.ForeignKey(Hotel, on_delete=models.CASCADE, db_column='hotelId')
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(db_column='createdAt')

    class Meta:
        managed = False
        db_table = '"CustomPaymentMethod"'
        unique_together = [('hotel', 'name')]
