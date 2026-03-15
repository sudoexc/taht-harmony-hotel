from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='HotelSettings',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('hotel_id', models.CharField(max_length=36, unique=True)),
                ('telegram_group_id', models.CharField(blank=True, default='', max_length=50)),
            ],
            options={
                'db_table': 'api_hotel_settings',
            },
        ),
    ]
