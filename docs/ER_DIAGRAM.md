# Entity Relationship Diagram

## Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ id (UUID, PK)                                            │  │
│  │ email (VARCHAR, UNIQUE)                                  │  │
│  │ password_hash (VARCHAR)                                  │  │
│  │ role (VARCHAR: patient|doctor|admin)                    │  │
│  │ is_active (BOOLEAN)                                      │  │
│  │ is_email_verified (BOOLEAN)                              │  │
│  │ mfa_enabled (BOOLEAN)                                    │  │
│  │ mfa_secret (VARCHAR)                                     │  │
│  │ last_login (TIMESTAMP)                                   │  │
│  │ created_at, updated_at (TIMESTAMP)                        │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │                                    │
         │ 1:1                                │ 1:1
         │                                    │
         ▼                                    ▼
┌──────────────────┐              ┌──────────────────┐
│    PROFILES      │              │     DOCTORS       │
│──────────────────│              │──────────────────│
│ id (UUID, PK)    │              │ id (UUID, PK)    │
│ user_id (FK)     │              │ user_id (FK)     │
│ first_name       │              │ license_number   │
│ last_name        │              │ specialization   │
│ phone            │              │ experience_years │
│ date_of_birth    │              │ qualification    │
│ gender           │              │ bio              │
│ address          │              │ consultation_fee │
│ city             │              │ rating           │
│ state            │              │ total_consultations│
│ country          │              │ is_verified      │
│ pincode          │              │ is_available     │
│ created_at       │              │ created_at       │
│ updated_at       │              │ updated_at       │
└──────────────────┘              └────────┬─────────┘
                                           │
                                           │ 1:N
                                           │
                              ┌────────────▼────────────┐
                              │  AVAILABILITY_SLOTS     │
                              │────────────────────────│
                              │ id (UUID, PK)          │
                              │ doctor_id (FK)         │
                              │ day_of_week (INT)      │
                              │ start_time (TIME)      │
                              │ end_time (TIME)        │
                              │ timezone (VARCHAR)      │
                              │ is_recurring (BOOLEAN) │
                              │ valid_from (DATE)      │
                              │ valid_until (DATE)     │
                              │ created_at, updated_at │
                              └────────────────────────┘

┌──────────┐         ┌──────────────────────────────────┐
│  USERS   │────────>│        CONSULTATIONS              │<────────┌──────────┐
│(patient) │    N:1  │──────────────────────────────────│   1:N   │ DOCTORS  │
└──────────┘         │ id (UUID, PK)                    │         └──────────┘
                     │ patient_id (FK)                  │
                     │ doctor_id (FK)                   │
                     │ slot_id (FK, nullable)           │
                     │ scheduled_at (TIMESTAMP)          │
                     │ status (VARCHAR)                 │
                     │ consultation_type (VARCHAR)       │
                     │ symptoms (TEXT)                   │
                     │ diagnosis (TEXT)                  │
                     │ notes (TEXT)                      │
                     │ duration_minutes (INT)            │
                     │ started_at (TIMESTAMP)            │
                     │ ended_at (TIMESTAMP)               │
                     │ created_at, updated_at            │
                     └──────────┬────────────────────────┘
                                │
                                │ 1:1
                                │
                    ┌───────────▼────────────┐
                    │      PAYMENTS          │
                    │────────────────────────│
                    │ id (UUID, PK)          │
                    │ consultation_id (FK)  │
                    │ patient_id (FK)       │
                    │ doctor_id (FK)        │
                    │ amount (DECIMAL)       │
                    │ currency (VARCHAR)     │
                    │ status (VARCHAR)      │
                    │ payment_method        │
                    │ transaction_id        │
                    │ payment_gateway       │
                    │ paid_at (TIMESTAMP)   │
                    │ created_at, updated_at│
                    └───────────────────────┘

┌──────────────────────────────────┐         ┌──────────────────┐
│        CONSULTATIONS              │────────>│  PRESCRIPTIONS   │
└──────────────────────────────────┘   1:N    │──────────────────│
                                             │ id (UUID, PK)    │
                                             │ consultation_id  │
                                             │ doctor_id (FK)   │
                                             │ patient_id (FK)  │
                                             │ medications (JSONB)│
                                             │ instructions     │
                                             │ follow_up_date   │
                                             │ is_active        │
                                             │ created_at       │
                                             │ updated_at       │
                                             └──────────────────┘

┌──────────┐         ┌──────────────────┐
│  USERS   │────────>│   AUDIT_LOGS     │
└──────────┘    N:1  │──────────────────│
                     │ id (UUID, PK)    │
                     │ user_id (FK)     │
                     │ action (VARCHAR) │
                     │ resource_type    │
                     │ resource_id      │
                     │ details (JSONB)  │
                     │ ip_address       │
                     │ user_agent       │
                     │ created_at       │
                     └──────────────────┘
```

## Relationships

### One-to-One (1:1)
- `users` ↔ `profiles`: Each user has one profile
- `users` ↔ `doctors`: Each doctor user has one doctor profile
- `consultations` ↔ `payments`: Each consultation has one payment record

### One-to-Many (1:N)
- `doctors` → `availability_slots`: A doctor can have multiple availability slots
- `doctors` → `consultations`: A doctor can have multiple consultations
- `users` (patient) → `consultations`: A patient can have multiple consultations
- `consultations` → `prescriptions`: A consultation can have multiple prescriptions (historical)
- `users` → `audit_logs`: A user can have multiple audit log entries

### Many-to-Many (N:M)
- Implicit: `doctors` ↔ `users` (patients) through `consultations`

## Key Constraints

1. **Foreign Keys**: All foreign key relationships are enforced
2. **Unique Constraints**:
   - `users.email` - Unique email addresses
   - `doctors.license_number` - Unique license numbers
   - `profiles.user_id` - One profile per user
   - `doctors.user_id` - One doctor profile per user

3. **Check Constraints**:
   - `users.role`: Must be 'patient', 'doctor', or 'admin'
   - `consultations.status`: Valid status values
   - `consultations.consultation_type`: Valid type values
   - `payments.status`: Valid payment status values
   - `availability_slots.day_of_week`: 0-6 (Sunday-Saturday)
   - `availability_slots`: end_time > start_time

4. **Indexes**:
   - Primary keys (automatic)
   - Foreign keys (for join performance)
   - Frequently queried columns:
     - `users.email`
     - `users.role`
     - `doctors.specialization`
     - `doctors.is_available`
     - `consultations.scheduled_at`
     - `consultations.status`
     - `audit_logs.created_at`
     - Composite indexes on (resource_type, resource_id) for audit logs

## Data Types

- **UUID**: Primary keys for distributed system compatibility
- **VARCHAR**: Variable-length strings with appropriate limits
- **TEXT**: Unlimited text for descriptions, notes
- **DECIMAL**: Monetary values and ratings
- **BOOLEAN**: Flags and status indicators
- **TIMESTAMP**: All temporal data
- **DATE**: Date-only values
- **TIME**: Time-only values
- **JSONB**: Structured data (medications, audit details)

## Triggers

- **Automatic `updated_at`**: All tables have triggers to update `updated_at` on row modification

## Future Enhancements

1. **Partitioning**:
   - `audit_logs` by month
   - `consultations` by year for historical data

2. **Soft Deletes**:
   - Add `deleted_at` column for compliance requirements

3. **Archival**:
   - Archive old consultations and prescriptions
   - Separate archive tables for historical data


