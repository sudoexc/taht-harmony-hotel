from django.db import migrations

# DDL сгенерирован из моделей через schema_editor.collect_sql().
# Таблицы исторически создавались Prisma-миграциями; эта миграция делает схему
# самодостаточной: на базе с данными не трогает ничего, на чистой — создаёт всё.
TABLES = [
    "User",
    "Hotel",
    "Profile",
    "UserRole",
    "Room",
    "Stay",
    "Payment",
    "Expense",
    "MonthClosing",
    "CustomPaymentMethod",
    "Transfer",
    "Withdrawal"
]

DDL = {
    "User": [
        "CREATE TABLE \"User\" (\"id\" varchar(36) NOT NULL PRIMARY KEY, \"email\" varchar(255) NOT NULL UNIQUE, \"passwordHash\" text NOT NULL, \"createdAt\" timestamp with time zone NOT NULL);",
        "CREATE INDEX \"User_id_dba046ea_like\" ON \"User\" (\"id\" varchar_pattern_ops);",
        "CREATE INDEX \"User_email_667201b5_like\" ON \"User\" (\"email\" varchar_pattern_ops);"
    ],
    "Hotel": [
        "CREATE TABLE \"Hotel\" (\"id\" varchar(36) NOT NULL PRIMARY KEY, \"name\" varchar(255) NOT NULL, \"timezone\" varchar(100) NOT NULL, \"createdAt\" timestamp with time zone NOT NULL);",
        "CREATE INDEX \"Hotel_id_2a4a1f2a_like\" ON \"Hotel\" (\"id\" varchar_pattern_ops);"
    ],
    "Profile": [
        "CREATE TABLE \"Profile\" (\"id\" varchar(36) NOT NULL PRIMARY KEY, \"fullName\" varchar(255) NOT NULL, \"hotelId\" varchar(36) NOT NULL, \"createdAt\" timestamp with time zone NULL);",
        "ALTER TABLE \"Profile\" ADD CONSTRAINT \"Profile_hotelId_cb063d2f_fk_Hotel_id\" FOREIGN KEY (\"hotelId\") REFERENCES \"Hotel\" (\"id\") DEFERRABLE INITIALLY DEFERRED;",
        "CREATE INDEX \"Profile_id_c7d38485_like\" ON \"Profile\" (\"id\" varchar_pattern_ops);",
        "CREATE INDEX \"Profile_hotelId_cb063d2f\" ON \"Profile\" (\"hotelId\");",
        "CREATE INDEX \"Profile_hotelId_cb063d2f_like\" ON \"Profile\" (\"hotelId\" varchar_pattern_ops);"
    ],
    "UserRole": [
        "CREATE TABLE \"UserRole\" (\"id\" varchar(36) NOT NULL PRIMARY KEY, \"userId\" varchar(36) NOT NULL, \"role\" varchar(20) NOT NULL);",
        "ALTER TABLE \"UserRole\" ADD CONSTRAINT \"UserRole_userId_5348a5ce_fk_User_id\" FOREIGN KEY (\"userId\") REFERENCES \"User\" (\"id\") DEFERRABLE INITIALLY DEFERRED;",
        "CREATE INDEX \"UserRole_id_2661054e_like\" ON \"UserRole\" (\"id\" varchar_pattern_ops);",
        "CREATE INDEX \"UserRole_userId_5348a5ce\" ON \"UserRole\" (\"userId\");",
        "CREATE INDEX \"UserRole_userId_5348a5ce_like\" ON \"UserRole\" (\"userId\" varchar_pattern_ops);"
    ],
    "Room": [
        "CREATE TABLE \"Room\" (\"id\" varchar(36) NOT NULL PRIMARY KEY, \"hotelId\" varchar(36) NOT NULL, \"number\" varchar(50) NOT NULL, \"floor\" integer NOT NULL, \"roomType\" varchar(20) NOT NULL, \"capacity\" integer NOT NULL, \"basePrice\" numeric(20, 2) NOT NULL, \"active\" boolean NOT NULL, \"notes\" text NULL, \"createdAt\" timestamp with time zone NOT NULL);",
        "ALTER TABLE \"Room\" ADD CONSTRAINT \"Room_hotelId_5b718f43_fk_Hotel_id\" FOREIGN KEY (\"hotelId\") REFERENCES \"Hotel\" (\"id\") DEFERRABLE INITIALLY DEFERRED;",
        "CREATE INDEX \"Room_id_75927249_like\" ON \"Room\" (\"id\" varchar_pattern_ops);",
        "CREATE INDEX \"Room_hotelId_5b718f43\" ON \"Room\" (\"hotelId\");",
        "CREATE INDEX \"Room_hotelId_5b718f43_like\" ON \"Room\" (\"hotelId\" varchar_pattern_ops);"
    ],
    "Stay": [
        "CREATE TABLE \"Stay\" (\"id\" varchar(36) NOT NULL PRIMARY KEY, \"hotelId\" varchar(36) NOT NULL, \"roomId\" varchar(36) NOT NULL, \"guestName\" varchar(255) NOT NULL, \"guestPhone\" varchar(50) NULL, \"checkInDate\" timestamp with time zone NOT NULL, \"checkOutDate\" timestamp with time zone NOT NULL, \"status\" varchar(20) NOT NULL, \"pricePerNight\" numeric(20, 2) NOT NULL, \"weeklyDiscountAmount\" numeric(20, 2) NOT NULL, \"manualAdjustmentAmount\" numeric(20, 2) NOT NULL, \"depositExpected\" numeric(20, 2) NOT NULL, \"comment\" text NULL, \"createdAt\" timestamp with time zone NOT NULL, \"guestId\" varchar(36) NULL);",
        "ALTER TABLE \"Stay\" ADD CONSTRAINT \"Stay_hotelId_b012b5e2_fk_Hotel_id\" FOREIGN KEY (\"hotelId\") REFERENCES \"Hotel\" (\"id\") DEFERRABLE INITIALLY DEFERRED;",
        "ALTER TABLE \"Stay\" ADD CONSTRAINT \"Stay_roomId_d11f785d_fk_Room_id\" FOREIGN KEY (\"roomId\") REFERENCES \"Room\" (\"id\") DEFERRABLE INITIALLY DEFERRED;",
        "CREATE INDEX \"Stay_id_5a68e413_like\" ON \"Stay\" (\"id\" varchar_pattern_ops);",
        "CREATE INDEX \"Stay_hotelId_b012b5e2\" ON \"Stay\" (\"hotelId\");",
        "CREATE INDEX \"Stay_hotelId_b012b5e2_like\" ON \"Stay\" (\"hotelId\" varchar_pattern_ops);",
        "CREATE INDEX \"Stay_roomId_d11f785d\" ON \"Stay\" (\"roomId\");",
        "CREATE INDEX \"Stay_roomId_d11f785d_like\" ON \"Stay\" (\"roomId\" varchar_pattern_ops);"
    ],
    "Payment": [
        "CREATE TABLE \"Payment\" (\"id\" varchar(36) NOT NULL PRIMARY KEY, \"hotelId\" varchar(36) NOT NULL, \"stayId\" varchar(36) NOT NULL, \"paidAt\" timestamp with time zone NOT NULL, \"method\" varchar(20) NOT NULL, \"customMethodLabel\" varchar(100) NULL, \"amount\" numeric(20, 2) NOT NULL, \"comment\" text NULL, \"createdAt\" timestamp with time zone NOT NULL);",
        "ALTER TABLE \"Payment\" ADD CONSTRAINT \"Payment_hotelId_a39cc8ee_fk_Hotel_id\" FOREIGN KEY (\"hotelId\") REFERENCES \"Hotel\" (\"id\") DEFERRABLE INITIALLY DEFERRED;",
        "ALTER TABLE \"Payment\" ADD CONSTRAINT \"Payment_stayId_b3f47abf_fk_Stay_id\" FOREIGN KEY (\"stayId\") REFERENCES \"Stay\" (\"id\") DEFERRABLE INITIALLY DEFERRED;",
        "CREATE INDEX \"Payment_id_99d0d7f0_like\" ON \"Payment\" (\"id\" varchar_pattern_ops);",
        "CREATE INDEX \"Payment_hotelId_a39cc8ee\" ON \"Payment\" (\"hotelId\");",
        "CREATE INDEX \"Payment_hotelId_a39cc8ee_like\" ON \"Payment\" (\"hotelId\" varchar_pattern_ops);",
        "CREATE INDEX \"Payment_stayId_b3f47abf\" ON \"Payment\" (\"stayId\");",
        "CREATE INDEX \"Payment_stayId_b3f47abf_like\" ON \"Payment\" (\"stayId\" varchar_pattern_ops);"
    ],
    "Expense": [
        "CREATE TABLE \"Expense\" (\"id\" varchar(36) NOT NULL PRIMARY KEY, \"hotelId\" varchar(36) NOT NULL, \"spentAt\" timestamp with time zone NOT NULL, \"category\" varchar(20) NOT NULL, \"method\" varchar(20) NOT NULL, \"customMethodLabel\" varchar(100) NULL, \"amount\" numeric(20, 2) NOT NULL, \"comment\" text NULL, \"createdAt\" timestamp with time zone NOT NULL, \"createdBy\" varchar(36) NULL);",
        "ALTER TABLE \"Expense\" ADD CONSTRAINT \"Expense_hotelId_c04690b0_fk_Hotel_id\" FOREIGN KEY (\"hotelId\") REFERENCES \"Hotel\" (\"id\") DEFERRABLE INITIALLY DEFERRED;",
        "ALTER TABLE \"Expense\" ADD CONSTRAINT \"Expense_createdBy_90e3bf2a_fk_User_id\" FOREIGN KEY (\"createdBy\") REFERENCES \"User\" (\"id\") DEFERRABLE INITIALLY DEFERRED;",
        "CREATE INDEX \"Expense_id_ed126a83_like\" ON \"Expense\" (\"id\" varchar_pattern_ops);",
        "CREATE INDEX \"Expense_hotelId_c04690b0\" ON \"Expense\" (\"hotelId\");",
        "CREATE INDEX \"Expense_hotelId_c04690b0_like\" ON \"Expense\" (\"hotelId\" varchar_pattern_ops);",
        "CREATE INDEX \"Expense_createdBy_90e3bf2a\" ON \"Expense\" (\"createdBy\");",
        "CREATE INDEX \"Expense_createdBy_90e3bf2a_like\" ON \"Expense\" (\"createdBy\" varchar_pattern_ops);"
    ],
    "MonthClosing": [
        "CREATE TABLE \"MonthClosing\" (\"id\" varchar(36) NOT NULL PRIMARY KEY, \"hotelId\" varchar(36) NOT NULL, \"month\" varchar(7) NOT NULL, \"closedAt\" timestamp with time zone NOT NULL, \"totalsJson\" jsonb NULL);",
        "ALTER TABLE \"MonthClosing\" ADD CONSTRAINT \"MonthClosing_hotelId_month_2aa6ba1e_uniq\" UNIQUE (\"hotelId\", \"month\");",
        "ALTER TABLE \"MonthClosing\" ADD CONSTRAINT \"MonthClosing_hotelId_e64d308c_fk_Hotel_id\" FOREIGN KEY (\"hotelId\") REFERENCES \"Hotel\" (\"id\") DEFERRABLE INITIALLY DEFERRED;",
        "CREATE INDEX \"MonthClosing_id_df2bd13a_like\" ON \"MonthClosing\" (\"id\" varchar_pattern_ops);",
        "CREATE INDEX \"MonthClosing_hotelId_e64d308c\" ON \"MonthClosing\" (\"hotelId\");",
        "CREATE INDEX \"MonthClosing_hotelId_e64d308c_like\" ON \"MonthClosing\" (\"hotelId\" varchar_pattern_ops);"
    ],
    "CustomPaymentMethod": [
        "CREATE TABLE \"CustomPaymentMethod\" (\"id\" varchar(36) NOT NULL PRIMARY KEY, \"hotelId\" varchar(36) NOT NULL, \"name\" varchar(100) NOT NULL, \"createdAt\" timestamp with time zone NOT NULL);",
        "ALTER TABLE \"CustomPaymentMethod\" ADD CONSTRAINT \"CustomPaymentMethod_hotelId_name_7a860dd7_uniq\" UNIQUE (\"hotelId\", \"name\");",
        "ALTER TABLE \"CustomPaymentMethod\" ADD CONSTRAINT \"CustomPaymentMethod_hotelId_c9495761_fk_Hotel_id\" FOREIGN KEY (\"hotelId\") REFERENCES \"Hotel\" (\"id\") DEFERRABLE INITIALLY DEFERRED;",
        "CREATE INDEX \"CustomPaymentMethod_id_bafee60e_like\" ON \"CustomPaymentMethod\" (\"id\" varchar_pattern_ops);",
        "CREATE INDEX \"CustomPaymentMethod_hotelId_c9495761\" ON \"CustomPaymentMethod\" (\"hotelId\");",
        "CREATE INDEX \"CustomPaymentMethod_hotelId_c9495761_like\" ON \"CustomPaymentMethod\" (\"hotelId\" varchar_pattern_ops);"
    ],
    "Transfer": [
        "CREATE TABLE \"Transfer\" (\"id\" varchar(36) NOT NULL PRIMARY KEY, \"hotelId\" varchar(36) NOT NULL, \"transferredAt\" timestamp with time zone NOT NULL, \"fromMethod\" varchar(100) NOT NULL, \"toMethod\" varchar(100) NOT NULL, \"amount\" numeric(20, 2) NOT NULL, \"comment\" text NULL, \"createdAt\" timestamp with time zone NOT NULL);",
        "ALTER TABLE \"Transfer\" ADD CONSTRAINT \"Transfer_hotelId_4f862db5_fk_Hotel_id\" FOREIGN KEY (\"hotelId\") REFERENCES \"Hotel\" (\"id\") DEFERRABLE INITIALLY DEFERRED;",
        "CREATE INDEX \"Transfer_id_00612a34_like\" ON \"Transfer\" (\"id\" varchar_pattern_ops);",
        "CREATE INDEX \"Transfer_hotelId_4f862db5\" ON \"Transfer\" (\"hotelId\");",
        "CREATE INDEX \"Transfer_hotelId_4f862db5_like\" ON \"Transfer\" (\"hotelId\" varchar_pattern_ops);"
    ],
    "Withdrawal": [
        "CREATE TABLE \"Withdrawal\" (\"id\" varchar(36) NOT NULL PRIMARY KEY, \"hotelId\" varchar(36) NOT NULL, \"withdrawnAt\" timestamp with time zone NOT NULL, \"method\" varchar(100) NOT NULL, \"amount\" numeric(20, 2) NOT NULL, \"comment\" text NULL, \"createdAt\" timestamp with time zone NOT NULL, \"createdById\" varchar(36) NULL);",
        "ALTER TABLE \"Withdrawal\" ADD CONSTRAINT \"Withdrawal_hotelId_990e8447_fk_Hotel_id\" FOREIGN KEY (\"hotelId\") REFERENCES \"Hotel\" (\"id\") DEFERRABLE INITIALLY DEFERRED;",
        "ALTER TABLE \"Withdrawal\" ADD CONSTRAINT \"Withdrawal_createdById_58bc3a58_fk_User_id\" FOREIGN KEY (\"createdById\") REFERENCES \"User\" (\"id\") DEFERRABLE INITIALLY DEFERRED;",
        "CREATE INDEX \"Withdrawal_id_552c7af7_like\" ON \"Withdrawal\" (\"id\" varchar_pattern_ops);",
        "CREATE INDEX \"Withdrawal_hotelId_990e8447\" ON \"Withdrawal\" (\"hotelId\");",
        "CREATE INDEX \"Withdrawal_hotelId_990e8447_like\" ON \"Withdrawal\" (\"hotelId\" varchar_pattern_ops);",
        "CREATE INDEX \"Withdrawal_createdById_58bc3a58\" ON \"Withdrawal\" (\"createdById\");",
        "CREATE INDEX \"Withdrawal_createdById_58bc3a58_like\" ON \"Withdrawal\" (\"createdById\" varchar_pattern_ops);"
    ]
}


def ensure_core_tables(apps, schema_editor):
    conn = schema_editor.connection
    with conn.cursor() as cur:
        cur.execute(
            "SELECT tablename FROM pg_tables WHERE schemaname = current_schema()"
        )
        existing = {row[0] for row in cur.fetchall()}
    for table in TABLES:
        if table in existing:
            continue
        for stmt in DDL[table]:
            schema_editor.execute(stmt)


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0003_alter_custompaymentmethod_options_and_more'),
    ]

    operations = [
        migrations.RunPython(ensure_core_tables, migrations.RunPython.noop),
    ]
