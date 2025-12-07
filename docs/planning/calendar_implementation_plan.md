# Calendar Feature Implementation Plan

## Goal

Implement a calendar feature to manage and view schedules (events, training, meetings).

## Requirements

- **URL**: `/calendar`
- **DB**: New table `calendar_events`
- **UI**: MUI `DateCalendar` (or similar MUI X component) for viewing.
- **Permissions**:
  - View: Public (or authenticated members).
  - Create/Edit/Delete: Admin/Moderator/Verified (TBD based on general rules).

## Proposed Changes

### Database

#### [NEW] `migrations/012_create_calendar_events.sql`

- Create `calendar_events` table.
- Fields: `id`, `title`, `description`, `start_date`, `end_date`, `category`, `created_by`, `is_public`, `timestamps`.
- Add RLS policies (Public read, Staff write).

### Backend (API)

#### [NEW] `src/app/api/calendar/route.ts`

- `GET`: Fetch events (optional start/end date filters).
- `POST`: Create new event (AuthGuard: Staff/Verified).

#### [NEW] `src/app/api/calendar/[id]/route.ts`

- `PUT`: Update event.
- `DELETE`: Remove event.

### Frontend

#### [NEW] `src/app/calendar/page.tsx`

- Main layout.
- Client component wrapper for Calendar UI.

#### [NEW] `src/components/calendar/CalendarView.tsx`

- Use `@mui/x-date-pickers` (DateCalendar).
- Use `slots.day` to render badges for days with events.

#### [NEW] `src/components/calendar/EventDialog.tsx`

- Dialog to Add/Edit event details.

## Verification Plan

### Automated

- API Tests via `curl` (after creating events manually).

### Manual

1. **Migration**: Run `docker-compose up -d postgres` (or restart) to apply migration. Check table existence.
2. **UI Rendering**: Visit `/calendar`. Verify Calendar renders.
3. **Interaction**:
   - Click a date -> Open Dialog (if staff).
   - Create Event -> Verify it appears on Calendar.
   - Refresh -> Verify persistence.
