# Static Pages to API Migration Guide

## Quick Summary
Three static pages have been successfully migrated from hardcoded mock data to dynamic backend API integration.

### ✅ Completed Pages
1. **Archive.jsx** - Fetches archived/completed records from `api.audit()`
2. **AuditLog.jsx** - Fetches audit log entries from `api.audit()`
3. **ExportData.jsx** - Fetches exports from `api.exports()` and uses `api.exportDownloadUrl()` for downloads

## Key Changes

### Import Updates
All three files now include:
```javascript
import React, { useState, useEffect } from 'react';
import { api } from './api/client';
```

### State Management
Each component now manages:
- `[Data]State` - Holds fetched records
- `loading` - Boolean for loading indicator
- `error` - String for error messages
- `stats` - Dynamic stats calculated from data

### useEffect Hook
Each component fetches data on mount:
```javascript
useEffect(() => {
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.endpoint();
      // Transform and set data
      setData(transformedData);
    } catch (err) {
      setError('Error message');
    } finally {
      setLoading(false);
    }
  };
  fetchData();
}, []);
```

## API Endpoints Reference

### Archive.jsx
**Endpoint:** `api.audit('?status=completed')`
**Expected Response:** Array of audit entries with completed status
```javascript
{
  id: string,
  type: string,
  description: string,
  target: string,
  amount: number,
  timestamp: ISO8601 date,
  details: string
}
```

### AuditLog.jsx
**Endpoint:** `api.audit()`
**Expected Response:** Array of audit log entries
```javascript
{
  id: string,
  user: string,
  action: string,
  target: string,
  type: 'job' | 'invoice' | 'expense' | 'system' | 'user',
  timestamp: ISO8601 date,
  details: string
}
```

### ExportData.jsx
**Endpoint:** `api.exports()`
**Expected Response:** Array of export records
```javascript
{
  id: string,
  name: string,
  format: 'CSV' | 'PDF' | 'Excel' | 'Backup',
  recordCount: number,
  fileSize: number (in bytes),
  createdAt: ISO8601 date,
  status: 'ready' | 'processing' | 'failed' | 'completed',
  generatedBy: string,
  notes: string
}
```

**Download URL:** `api.exportDownloadUrl(id)` returns full download URL

## Data Transformation

Each component transforms API responses to match the expected component format. Key transformations:

### Archive.jsx
- Formats currency: `amount` → `MK ${amount.toLocaleString()}`
- Formats date: `timestamp` → Locale date string
- Fallback values for missing fields

### AuditLog.jsx
- Maps event types: `type` field mapped to display types
- Formats datetime: `timestamp` → Locale date-time string
- Abbreviates user names in avatar display

### ExportData.jsx
- Converts file size: `fileSize` (bytes) → MB string
- Formats date: `createdAt` → Locale date string
- Maps format types consistently

## UI/UX Features Preserved

✅ **Filter & Search** - All original filtering works with API data
✅ **Expandable Rows** - Click to expand/collapse row details
✅ **Status Badges** - Color-coded status indicators
✅ **Stats Cards** - Dynamic stats updated from API data
✅ **Hover Effects** - Visual feedback on interactions
✅ **Responsive Layout** - Mobile-friendly grid layouts
✅ **Empty States** - "No results" message when filtered data is empty

## Error Handling

All components handle errors gracefully:
- **Loading State** - Spinner displayed while fetching
- **Error State** - Red error message if fetch fails
- **Network Issues** - Console logs for debugging
- **Fallback Values** - Sensible defaults for missing data

## Testing Checklist

- [ ] Backend API is running and accessible
- [ ] API returns expected data format
- [ ] Loading spinner appears during fetch
- [ ] Data displays correctly after fetch
- [ ] Filter and search work with API data
- [ ] Export downloads use correct URLs (ExportData.jsx)
- [ ] Error handling works (test by stopping API)
- [ ] Stats update dynamically from data
- [ ] Mobile view works with API data
- [ ] Expand/collapse works with API data

## Common Issues & Fixes

### Issue: "api.audit is not a function"
**Fix:** Ensure `import { api } from './api/client';` is present

### Issue: Data not displaying
**Fix:** Check browser console for fetch errors. Verify API endpoint returns correct format.

### Issue: Dates formatted incorrectly
**Fix:** Check timestamp format in API response. Ensure it's ISO8601 format.

### Issue: Stats show "-" instead of numbers
**Fix:** Verify API is returning data. Check data transformation logic.

## Performance Notes

- API responses are cached by the client for 30 seconds (defined in api/client.js)
- Each page fetches once on mount
- Filter and search work on cached data (no additional API calls)
- Download URLs are generated on-demand (ExportData.jsx only)

## Future Enhancements

Consider implementing:
- Pagination for large datasets
- Real-time updates with WebSocket
- Sorting options on columns
- Bulk operations (select multiple rows)
- Export to CSV/PDF from the pages
- Refresh button to manually update data
- Last updated timestamp

