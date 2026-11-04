import pytest
import datetime
from decimal import Decimal
from django.conf import settings
from django.utils import timezone
from django.contrib.auth.models import User
from rest_framework.test import APIClient
from rest_framework import status


@pytest.fixture(scope="session")
def django_db_setup(
    request,
    django_test_environment,
    django_db_blocker,
    django_db_use_migrations,
    django_db_keepdb,
    django_db_createdb,
    django_db_modify_db_settings,
):
    from django.db import connections
    from django.test.utils import setup_databases, teardown_databases

    settings.DATABASES['default'] = {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
        'ATOMIC_REQUESTS': False,
        'AUTOCOMMIT': True,
        'CONN_MAX_AGE': 0,
        'CONN_HEALTH_CHECKS': False,
        'OPTIONS': {},
        'TIME_ZONE': None,
        'USER': '',
        'PASSWORD': '',
        'HOST': '',
        'PORT': '',
        'TEST': {
            'CHARSET': None,
            'COLLATION': None,
            'MIGRATE': True,
            'MIRROR': None,
            'NAME': ':memory:',
        },
    }
    connections.close_all()
    try:
        delattr(connections._connections, 'default')
    except AttributeError:
        pass
    connections._databases = None

    with django_db_blocker.unblock():
        db_cfg = setup_databases(
            verbosity=0,
            interactive=False,
        )

    yield

    with django_db_blocker.unblock():
        try:
            teardown_databases(db_cfg, verbosity=0)
        except Exception:
            pass


from core.models import (
    StockReport,
    MB51Transaction,
    VendorDeliverySchedule,
    RMPMComponentMaster,
    WeekDefinition,
)
from core.services.mb52_lock_service import (
    get_line_item_mb52_upload_date,
    is_stock_record_read_only,
    is_mb51_tx_read_only,
    is_schedule_read_only,
)


@pytest.fixture
def auth_client(db):
    client = APIClient()
    user = User.objects.create_user(username='planner_test', password='password123')
    client.force_authenticate(user=user)
    return client


@pytest.mark.django_db
def test_two_uploads_on_different_dates_and_superseding(auth_client):
    """
    1. First upload on 2026-08-01 creates snapshot rows.
    2. Second upload on 2026-08-08 marks older rows of the same parts as is_previous_upload and read-only.
    3. Both snapshot rows are stored in the database.
    """
    csv_day1 = "Part Number,Material Description,Unrestricted Stock,Safety Stock,UOM,SLOC\nRM-101,Casting Body,1000,500,PC,SL01"
    res1 = auth_client.post(
        '/api/uploads/stock-report/',
        data={'csv_text': csv_day1, 'mode': 'replace', 'stock_date': '2026-08-01'},
        format='multipart'
    )
    assert res1.status_code == status.HTTP_201_CREATED, res1.data
    assert res1.data['imported_rows'] == 1

    row1 = StockReport.objects.get(part_number='RM-101', stock_date='2026-08-01')
    assert row1.unrestricted_stock == Decimal('1000.000')
    assert row1.is_read_only is False
    assert row1.is_previous_upload is False

    # Second upload on 2026-08-08 for the same part
    csv_day2 = "Part Number,Material Description,Unrestricted Stock,Safety Stock,UOM,SLOC\nRM-101,Casting Body,1200,500,PC,SL01"
    res2 = auth_client.post(
        '/api/uploads/stock-report/',
        data={'csv_text': csv_day2, 'mode': 'replace', 'stock_date': '2026-08-08'},
        format='multipart'
    )
    assert res2.status_code == status.HTTP_201_CREATED, res2.data
    assert res2.data['imported_rows'] == 1

    # Verify both rows exist
    all_rows = StockReport.objects.filter(part_number='RM-101').order_by('stock_date')
    assert all_rows.count() == 2

    # Old row is now read-only and previous upload
    row1.refresh_from_db()
    assert row1.is_previous_upload is True
    assert row1.is_read_only is True

    # New row is active and not previous upload
    row2 = StockReport.objects.get(part_number='RM-101', stock_date='2026-08-08')
    assert row2.unrestricted_stock == Decimal('1200.000')
    assert row2.is_previous_upload is False
    assert row2.is_read_only is False


@pytest.mark.django_db
def test_rejected_edit_and_delete_on_old_read_only_row(auth_client):
    """
    StockDetailView: reject PATCH and DELETE on read-only rows.
    """
    old_row = StockReport.objects.create(
        part_number='RM-201',
        material_description='Bracket Old',
        storage_location='SL01',
        unrestricted_stock=Decimal('500.000'),
        material_type='RM',
        stock_date=datetime.date(2026, 8, 1),
        is_read_only=True,
        is_previous_upload=True
    )
    new_row = StockReport.objects.create(
        part_number='RM-201',
        material_description='Bracket Current',
        storage_location='SL01',
        unrestricted_stock=Decimal('700.000'),
        material_type='RM',
        stock_date=datetime.date(2026, 8, 8),
        is_read_only=False,
        is_previous_upload=False
    )

    # Attempt to edit old row -> should fail with HTTP 400
    patch_res = auth_client.patch(
        f'/api/stock/{old_row.id}/',
        data={'unrestricted_stock': 999.0},
        format='json'
    )
    assert patch_res.status_code == status.HTTP_400_BAD_REQUEST
    assert 'read-only' in patch_res.data.get('error', '').lower()

    # Attempt to delete old row -> should fail with HTTP 400
    del_res = auth_client.delete(f'/api/stock/{old_row.id}/')
    assert del_res.status_code == status.HTTP_400_BAD_REQUEST
    assert 'read-only' in del_res.data.get('error', '').lower()
    assert StockReport.objects.filter(id=old_row.id).exists()

    # Active row can be edited
    active_patch = auth_client.patch(
        f'/api/stock/{new_row.id}/',
        data={'unrestricted_stock': 850.0},
        format='json'
    )
    assert active_patch.status_code == status.HTTP_200_OK
    new_row.refresh_from_db()
    assert new_row.unrestricted_stock == Decimal('850.000')


@pytest.mark.django_db
def test_unchanged_reupload_on_same_date(auth_client):
    """
    Only an upload with the same part, location and date overwrites a row.
    Uploading again with the same date updates the existing row without creating duplicates.
    """
    csv_initial = "Part Number,Material Description,Unrestricted Stock,Safety Stock,UOM,SLOC\nRM-301,Gasket,300,50,PC,SL01"
    auth_client.post(
        '/api/uploads/stock-report/',
        data={'csv_text': csv_initial, 'mode': 'replace', 'stock_date': '2026-08-08'},
        format='multipart'
    )

    row = StockReport.objects.get(part_number='RM-301', storage_location='SL01', stock_date='2026-08-08')
    assert row.unrestricted_stock == Decimal('300.000')
    initial_id = row.id

    # Re-upload on the exact same date with updated quantity
    csv_updated = "Part Number,Material Description,Unrestricted Stock,Safety Stock,UOM,SLOC\nRM-301,Gasket,450,50,PC,SL01"
    res_reupload = auth_client.post(
        '/api/uploads/stock-report/',
        data={'csv_text': csv_updated, 'mode': 'replace', 'stock_date': '2026-08-08'},
        format='multipart'
    )
    assert res_reupload.status_code == status.HTTP_201_CREATED

    # Should overwrite the existing row, not create a duplicate
    qs = StockReport.objects.filter(part_number='RM-301', storage_location='SL01', stock_date='2026-08-08')
    assert qs.count() == 1
    updated_row = qs.first()
    assert updated_row.id == initial_id
    assert updated_row.unrestricted_stock == Decimal('450.000')
    assert updated_row.is_read_only is False
    assert updated_row.is_previous_upload is False


@pytest.mark.django_db
def test_mb51_and_schedule_locked_guards(auth_client):
    """
    MB51DetailView: reject changes when posting_date is before the part's baseline.
    VendorScheduleDetailView: reject changes when expected_delivery_date is before the baseline.
    In bulk uploads, list such rows under skipped_rows.
    """
    # Create baseline stock record dated 2026-08-10
    StockReport.objects.create(
        part_number='RM-LOCK-01',
        material_description='Locked Part',
        storage_location='SL01',
        unrestricted_stock=Decimal('100.000'),
        material_type='RM',
        stock_date=datetime.date(2026, 8, 10),
        is_read_only=False,
        is_previous_upload=False
    )

    comp = RMPMComponentMaster.objects.create(
        component_code='RM-LOCK-01',
        component_description='Locked Part Component'
    )

    # 1. MB51 Transaction before baseline
    tx_before = MB51Transaction.objects.create(
        material_document='DOC-HIST',
        posting_date=datetime.date(2026, 8, 5),
        movement_type='101',
        part_number='RM-LOCK-01',
        quantity=Decimal('20.000'),
        storage_location='SL01'
    )
    # Attempt to edit or delete tx_before
    patch_tx = auth_client.patch(
        f'/api/mb51/{tx_before.id}/',
        data={'quantity': 50.0},
        format='json'
    )
    assert patch_tx.status_code == status.HTTP_400_BAD_REQUEST

    del_tx = auth_client.delete(f'/api/mb51/{tx_before.id}/')
    assert del_tx.status_code == status.HTTP_400_BAD_REQUEST

    # 2. MB51 Bulk Upload with historical dates -> listed under skipped_rows
    mb51_csv = (
        "Material Document,Posting Date,Movement Type,Material,Material Description,Quantity,Unit of Entry,Storage Location\n"
        "DOC-NEW1,2026-08-12,101,RM-LOCK-01,Locked Part,10,PC,SL01\n"
        "DOC-OLD1,2026-08-02,101,RM-LOCK-01,Locked Part,15,PC,SL01\n"
    )
    res_mb51_bulk = auth_client.post(
        '/api/uploads/mb51/',
        data={'csv_text': mb51_csv},
        format='multipart'
    )
    assert res_mb51_bulk.status_code == status.HTTP_201_CREATED
    assert res_mb51_bulk.data['imported_rows'] == 1
    assert res_mb51_bulk.data['error_rows'] == 1
    assert any('DOC-OLD1' in str(skip) for skip in res_mb51_bulk.data['skipped_rows'])

    # 3. Vendor Delivery Schedule before baseline
    sched_before = VendorDeliverySchedule.objects.create(
        po_number='PO-LOCK-01',
        component=comp,
        expected_delivery_date=datetime.date(2026, 8, 5),
        promised_qty=Decimal('100.000'),
        vendor_name='Vendor Lock'
    )
    # Attempt to edit
    patch_sched = auth_client.patch(
        f'/api/vendor-delivery-schedules/{sched_before.id}/',
        data={
            'promised_qty': 200.0,
            'changed_by': 'Buyer Bob',
            'reason_for_change': 'Adjustment to delivery quantity for testing'
        },
        format='json'
    )
    assert patch_sched.status_code == status.HTTP_400_BAD_REQUEST

    # Attempt to delete
    del_sched = auth_client.delete(
        f'/api/vendor-delivery-schedules/{sched_before.id}/',
        data={
            'changed_by': 'Buyer Bob',
            'reason_for_change': 'Deleting this obsolete schedule record'
        },
        format='json'
    )
    assert del_sched.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
def test_stock_export_csv_includes_opening_stock_date(auth_client):
    """
    Stock export: add an 'Opening Stock Date' column to StockExportCSVView.
    """
    StockReport.objects.create(
        part_number='RM-EXP-01',
        material_description='Export Test Part',
        storage_location='SL01',
        unrestricted_stock=Decimal('350.000'),
        material_type='RM',
        stock_date=datetime.date(2026, 8, 1),
        is_read_only=False,
        is_previous_upload=False
    )

    res = auth_client.get('/api/exports/stock-csv/?part_number=RM-EXP-01')
    assert res.status_code == status.HTTP_200_OK
    content = res.getvalue().decode('utf-8')
    lines = content.strip().split('\r\n') if '\r\n' in content else content.strip().split('\n')
    header_line = lines[0]
    assert 'Opening Stock Date' in header_line
    assert '2026-08-01' in lines[1]
