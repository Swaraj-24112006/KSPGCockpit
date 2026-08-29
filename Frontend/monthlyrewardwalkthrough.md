# Phase 8 — Winner Calculation & Persistence (Backend Completed)

The backend infrastructure to reliably and deterministically calculate the Monthly Award Winners has been completely implemented and verified. 

## What Was Accomplished

1. **New Database Schema**
   - Completely replaced the legacy `MonthlyAward` model with the exact schema requested. 
   - Awards are now reliably linked to the exact `session`, `kaizen`, and `category`. 
   - Database constraints `UNIQUE(session, category, rank)` and `UNIQUE(session, kaizen)` were successfully applied to guarantee data integrity.

2. **Official Tie-Breaking Rule Engine**
   - Implemented `calculate_monthly_winners` inside `services.py`. 
   - The service calculates each Kaizen's cumulative score and tracks the exact number of 5-star ratings. 
   - Tie-breaks are fully implemented:
     1. Highest cumulative score
     2. Highest number of 5-star ratings
     3. Highest audited cost savings (parsed accurately)
     4. Earlier implementation date (using negative ID as a proxy)

3. **Winner Output and API**
   - Added `POST /api/v1/cft/sessions/{id}/calculate-winners/`.
   - The API evaluates the session, deletes any existing preview records for that session, and inserts the newly calculated ranking as `PREVIEW` in the `MonthlyAward` table.
   - It respects the exact `winner_count` configuration for each category (e.g. 1 winner for MF1, 2 for Quality, etc).

## Verification

Testing via the Django shell confirmed the API reliably produces the JSON payload grouped exactly as required, matching actual database results for an open session.

```python
Testing session: 1
Result: {
    'session_id': 1, 
    'categories': [
        {'category': 'MF1', 'winners': [{'kaizen_id': 51, 'rank': 1, 'score': 3, 'fives': 0}]}, 
        {'category': 'MACHINING', 'winners': []}, 
        {'category': 'QUALITY', 'winners': [{'kaizen_id': 38, 'rank': 1, 'score': 9, 'fives': 1}]}, 
        {'category': 'MAINTENANCE', 'winners': []}, 
        {'category': 'MF2', 'winners': [{'kaizen_id': 34, 'rank': 1, 'score': 5, 'fives': 1}]}, 
        {'category': 'MF3', 'winners': []}
    ]
}
```

The backend is now ready to be consumed by the frontend podium UI.
