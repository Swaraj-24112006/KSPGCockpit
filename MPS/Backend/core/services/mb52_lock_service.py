import re
from datetime import datetime, date
from decimal import Decimal
from typing import Any, Optional, Union, List
from django.utils import timezone


def normalize_to_iso_date(date_val: Any) -> Optional[date]:
    """
    Normalizes any date object or date string into a standard datetime.date.
    Supports YYYY-MM-DD, DD-MM-YYYY, DD/MM/YYYY, ISO timestamps, and date/datetime objects.
    Mirrors normalizeToISODate in UPD/mb52LockEngine.ts.
    """
    if not date_val:
        return None

    if isinstance(date_val, datetime):
        return date_val.date()
    if isinstance(date_val, date):
        return date_val

    trimmed = str(date_val).strip()
    if not trimmed:
        return None

    # Standard YYYY-MM-DD
    if re.match(r'^\d{4}-\d{2}-\d{2}', trimmed):
        try:
            return datetime.strptime(trimmed[:10], '%Y-%m-%d').date()
        except ValueError:
            pass

    # DD-MM-YYYY or DD/MM/YYYY
    dmy_match = re.match(r'^(\d{1,2})[-/](\d{1,2})[-/](\d{4})', trimmed)
    if dmy_match:
        day = int(dmy_match.group(1))
        month = int(dmy_match.group(2))
        year = int(dmy_match.group(3))
        try:
            return date(year, month, day)
        except ValueError:
            pass

    # Generic ISO / date parse fallback
    try:
        dt = datetime.fromisoformat(trimmed.replace('Z', '+00:00'))
        return dt.date()
    except Exception:
        pass

    return None


def normalize_to_iso_str(date_val: Any) -> str:
    """
    Returns normalized YYYY-MM-DD string or empty string.
    """
    d = normalize_to_iso_date(date_val)
    return d.isoformat() if d else ''


def get_line_item_mb52_upload_date(
    part_number: str,
    fallback_date: Any = None
) -> Optional[date]:
    """
    Returns the effective MB52 upload / baseline date for a specific part number.
    Aligned with UPD/mb52LockEngine.ts:
    A part's baseline date is its latest active (is_previous_upload=False) stock_date.
    Falls back to fallback_date or None if not found.
    """
    if not part_number:
        return normalize_to_iso_date(fallback_date)

    from core.models import StockReport

    latest = StockReport.objects.filter(
        part_number=part_number,
        is_previous_upload=False
    ).exclude(stock_date__isnull=True).order_by('-stock_date', '-upload_date').first()

    if latest and latest.stock_date:
        return latest.stock_date

    # Fallback to upload_date if stock_date was not set
    latest_up = StockReport.objects.filter(
        part_number=part_number,
        is_previous_upload=False
    ).exclude(upload_date__isnull=True).order_by('-upload_date').first()

    if latest_up and latest_up.upload_date:
        return latest_up.upload_date

    return normalize_to_iso_date(fallback_date)


def is_date_before_mb52_upload(check_date: Any, mb52_upload_date: Any) -> bool:
    """
    Checks if a given date is strictly prior to the line item's MB52 upload baseline date.
    Any date before the upload date is considered historical / read-only.
    Mirrors isDateBeforeMB52Upload in UPD/mb52LockEngine.ts.
    """
    norm_check = normalize_to_iso_date(check_date)
    norm_upload = normalize_to_iso_date(mb52_upload_date)

    if not norm_check or not norm_upload:
        return False

    return norm_check < norm_upload


def is_stock_record_read_only(
    item: Any,
    opening_stock_date: Any = None
) -> bool:
    """
    Determines if a stock report entry is read-only.
    Mirrors isStockRecordReadOnly in UPD/mb52LockEngine.ts.
    A stock item is read-only if:
    1. It is explicitly flagged as is_read_only or is_previous_upload
    2. Its stock_date / upload_date is strictly older than the latest active baseline date for this part_number
    """
    if getattr(item, 'is_read_only', False) or getattr(item, 'is_previous_upload', False):
        return True

    part_number = getattr(item, 'part_number', None)
    if not part_number and isinstance(item, dict):
        part_number = item.get('part_number') or item.get('partNumber')

    if not part_number:
        return False

    item_date = getattr(item, 'stock_date', None) or getattr(item, 'upload_date', None)
    if not item_date and isinstance(item, dict):
        item_date = item.get('stock_date') or item.get('stockDate') or item.get('upload_date') or item.get('uploadDate')

    norm_item_date = normalize_to_iso_date(item_date)
    latest_baseline = get_line_item_mb52_upload_date(part_number, fallback_date=opening_stock_date)

    if norm_item_date and latest_baseline and norm_item_date < latest_baseline:
        return True

    return False


def is_mb51_tx_read_only(
    tx: Any,
    opening_stock_date: Any = None
) -> bool:
    """
    Determines if an MB51 transaction is read-only based on the line item's MB52 upload date.
    If the transaction posting_date is before the MB52 upload date, it is read-only.
    Mirrors isMB51TxReadOnly in UPD/mb52LockEngine.ts.
    """
    if getattr(tx, 'is_read_only', False):
        return True

    part_number = getattr(tx, 'part_number', None)
    if not part_number and isinstance(tx, dict):
        part_number = tx.get('part_number') or tx.get('partNumber')

    posting_date = getattr(tx, 'posting_date', None)
    if not posting_date and isinstance(tx, dict):
        posting_date = tx.get('posting_date') or tx.get('postingDate')

    line_upload_date = get_line_item_mb52_upload_date(part_number, fallback_date=opening_stock_date)
    return is_date_before_mb52_upload(posting_date, line_upload_date)


def is_schedule_read_only(
    schedule: Any,
    opening_stock_date: Any = None
) -> bool:
    """
    Determines if a vendor delivery schedule is read-only based on the line item's MB52 upload date.
    Even the buyer cannot add or modify a schedule before the upload date for that component.
    Mirrors isScheduleReadOnly in UPD/mb52LockEngine.ts.
    """
    if getattr(schedule, 'is_read_only', False):
        return True

    component_code = (
        getattr(schedule, 'component_id', None) or
        getattr(schedule, 'component_code', None)
    )
    if not component_code and isinstance(schedule, dict):
        component_code = (
            schedule.get('component_id') or
            schedule.get('component_code') or
            schedule.get('componentCode')
        )

    expected_delivery_date = getattr(schedule, 'expected_delivery_date', None)
    if not expected_delivery_date and isinstance(schedule, dict):
        expected_delivery_date = schedule.get('expected_delivery_date') or schedule.get('expectedDeliveryDate')

    line_upload_date = get_line_item_mb52_upload_date(component_code, fallback_date=opening_stock_date)
    return is_date_before_mb52_upload(expected_delivery_date, line_upload_date)


class MB52LockService:
    """
    Static service container mirroring mb52LockEngine.ts helper methods.
    """
    normalize_to_iso_date = staticmethod(normalize_to_iso_date)
    normalize_to_iso_str = staticmethod(normalize_to_iso_str)
    get_line_item_mb52_upload_date = staticmethod(get_line_item_mb52_upload_date)
    is_date_before_mb52_upload = staticmethod(is_date_before_mb52_upload)
    is_stock_record_read_only = staticmethod(is_stock_record_read_only)
    is_mb51_tx_read_only = staticmethod(is_mb51_tx_read_only)
    is_schedule_read_only = staticmethod(is_schedule_read_only)

