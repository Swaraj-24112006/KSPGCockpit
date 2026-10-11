"""
Kaizen Analytics Constants & Definitions
=========================================
Centralized status groupings, department definitions, and month maps.
Every analytics endpoint imports from here.
"""

from decimal import Decimal

# Status groups
# Database stores statuses in lowercase; both lowercase and TitleCase are mapped for safety.
CLOSED = [
    'approved', 'good_point', 'closed',
    'Approved', 'Good Point', 'Closed'
]
OPEN = [
    'submitted', 'pending', 'rework',
    'Submitted', 'Pending', 'Rework'
]
REJECTED = [
    'rejected',
    'Rejected'
]

STATUS_GROUPS = {
    'Closed': CLOSED,
    'Open': OPEN,
    'Reject': REJECTED
}

# Month number to abbreviation
MONTH_ABBR = {
    1: 'Jan', 2: 'Feb', 3: 'Mar', 4: 'Apr',
    5: 'May', 6: 'Jun', 7: 'Jul', 8: 'Aug',
    9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dec'
}

MONTH_NAME_TO_NUM = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12,
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4,
    'Jun': 6, 'Jul': 7, 'Aug': 8, 'Sep': 9,
    'Oct': 10, 'Nov': 11, 'Dec': 12
}

# Department defaults
DEFAULT_DEPARTMENTS = [
    {
        'code': 'MF1',
        'display_name': 'MF 1',
        'description': 'Vacuum & Oil Pump',
        'color': '#84cc16',
        'sort_order': 1,
    },
    {
        'code': 'MF2',
        'display_name': 'MF 2',
        'description': 'All types of EGR',
        'color': '#3b82f6',
        'sort_order': 2,
    },
    {
        'code': 'MF3',
        'display_name': 'MF 3',
        'description': 'BPV',
        'color': '#f97316',
        'sort_order': 3,
    },
    {
        'code': 'MC',
        'display_name': 'MC',
        'description': 'Machining, Milling & Grinder',
        'color': '#ef4444',
        'sort_order': 4,
    },
    {
        'code': 'Maintenance',
        'display_name': 'Maintenance',
        'description': 'Maintenance & Utilities',
        'color': '#a855f7',
        'sort_order': 5,
    },
    {
        'code': 'QA',
        'display_name': 'QA',
        'description': 'Quality Assurance',
        'color': '#06b6d4',
        'sort_order': 6,
    },
    {
        'code': 'NCM',
        'display_name': 'NCM',
        'description': 'New Component Manufacturing',
        'color': '#eab308',
        'sort_order': 7,
    },
    {
        'code': 'OTH',
        'display_name': 'OTH',
        'description': 'Other Plant Areas',
        'color': '#64748b',
        'sort_order': 8,
    },
]

# Normalization mapping for mini_factory string variations
DEPARTMENT_CODE_NORMALIZATION = {
    'mf1': 'MF1',
    'mf-1': 'MF1',
    'mf 1': 'MF1',
    'mf2': 'MF2',
    'mf-2': 'MF2',
    'mf 2': 'MF2',
    'mf3': 'MF3',
    'mf-3': 'MF3',
    'mf 3': 'MF3',
    'mc': 'MC',
    'machining': 'MC',
    'milling': 'MC',
    'maintenance': 'Maintenance',
    'qa': 'QA',
    'quality': 'QA',
    'ncm': 'NCM',
    'oth': 'OTH',
    'other': 'OTH',
    'others': 'OTH',
}
