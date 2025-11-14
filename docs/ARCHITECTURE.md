# Amrutam Telemedicine Backend - Architecture Documentation

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [Data Flow](#data-flow)
3. [Booking Flow Sequence](#booking-flow-sequence)
4. [Database Design](#database-design)
5. [API Design](#api-design)
6. [Retry & Backoff Strategies](#retry--backoff-strategies)
7. [Data Partitioning](#data-partitioning)
8. [Caching Strategy](#caching-strategy)
9. [Concurrency Handling](#concurrency-handling)
10. [Transaction Management](#transaction-management)
11. [Backup and DR Strategy](#backup-and-dr-strategy)

## High-Level Architecture

### System Overview

```
┌─────────────┐
│   Clients   │ (Web, Mobile)
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────────┐
│      Load Balancer              │
└──────┬──────────────────────────┘
       │
       ├──────────────┬──────────────┐
       ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐
│  App 1   │   │  App 2   │   │  App N   │ (Node.js/Express)
└────┬─────┘   └────┬─────┘   └────┬─────┘
     │             │              │
     └─────────────┼──────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   ┌─────────┐ ┌──────┐  ┌──────────┐
   │PostgreSQL│ │Redis │  │Prometheus│
   │(Primary) │ │Cache │  │Metrics   │
   └────┬─────┘ └──────┘  └──────────┘
        │
        ▼
   ┌─────────┐
   │PostgreSQL│ (Read Replica)
   └─────────┘
```

### Component Responsibilities

1. **Load Balancer**: Distributes incoming requests across multiple application instances
2. **Application Layer**: Stateless Node.js services handling business logic
3. **Database Layer**: PostgreSQL for persistent data storage
4. **Cache Layer**: Redis for session management and frequently accessed data
5. **Observability**: Prometheus for metrics, Winston for logs, OpenTelemetry for tracing

## Data Flow

### Request Flow

```
Client Request
    │
    ▼
Rate Limiter (express-rate-limit)
    │
    ▼
Authentication Middleware (JWT verification)
    │
    ▼
Authorization Middleware (RBAC check)
    │
    ▼
Validation Middleware (Joi schema validation)
    │
    ▼
Controller (Request handler)
    │
    ▼
Service Layer (Business logic)
    │
    ├──► Database Query (PostgreSQL)
    ├──► Cache Check/Update (Redis)
    └──► Audit Logging
    │
    ▼
Response to Client
```

### Write Flow (Consultation Booking Example)

1. **Request Validation**: Validate input data (doctor ID, scheduled time, etc.)
2. **Authorization Check**: Verify user has permission to book
3. **Business Logic**:
   - Check doctor availability
   - Verify time slot is not booked
   - Calculate fees
4. **Transaction**:
   - Create consultation record
   - Create payment record
   - Update availability (if needed)
5. **Audit Logging**: Log the booking action
6. **Response**: Return consultation details

## Booking Flow Sequence

```
Patient                    API                    Database              Payment Gateway
  │                         │                         │                        │
  │──Book Consultation─────>│                         │                        │
  │                         │──Check Availability─────>│                        │
  │                         │<──Available─────────────│                        │
  │                         │──Begin Transaction──────>│                        │
  │                         │──Create Consultation────>│                        │
  │                         │──Create Payment─────────>│                        │
  │                         │<──Success───────────────│                        │
  │                         │──Process Payment────────┼───────────────────────>│
  │                         │<──Payment Success───────┼───────────────────────<│
  │                         │──Commit Transaction─────>│                        │
  │                         │──Audit Log──────────────>│                        │
  │<──Booking Confirmed─────│                         │                        │
```

## Database Design

### Entity Relationship Diagram

```
┌──────────┐         ┌──────────┐
│  users   │────────│ profiles │
└────┬─────┘ 1:1    └──────────┘
     │
     │ 1:1
     │
┌────▼─────┐
│ doctors  │
└────┬─────┘
     │
     │ 1:N
     │
┌────▼──────────────┐
│availability_slots │
└───────────────────┘

┌──────────┐         ┌──────────────┐
│  users   │────────>│consultations│<────────┌──────────┐
│(patient) │    N:1  └──────┬───────┘   1:N   │ doctors  │
└──────────┘                │                 └──────────┘
                            │ 1:1
                            │
                    ┌───────▼────────┐
                    │ prescriptions  │
                    └────────────────┘

┌──────────────┐         ┌──────────┐
│consultations │────────>│ payments │
└──────────────┘   1:1   └──────────┘

┌──────────┐
│  users   │────────>┌────────────┐
└──────────┘    N:1   │audit_logs  │
                      └────────────┘
```

### Key Design Decisions

1. **Normalization**: Third normal form to reduce redundancy
2. **Indexing**: Strategic indexes on foreign keys and frequently queried columns
3. **Constraints**: Foreign keys, check constraints for data integrity
4. **Timestamps**: Automatic `updated_at` triggers for audit purposes
5. **Soft Deletes**: Consider adding `deleted_at` for compliance (future enhancement)

## API Design

### RESTful Principles

- **Resources**: Nouns (users, doctors, consultations)
- **HTTP Methods**: GET (read), POST (create), PUT (update), DELETE (remove)
- **Status Codes**: 200 (OK), 201 (Created), 400 (Bad Request), 401 (Unauthorized), 404 (Not Found), 500 (Server Error)
- **Versioning**: URL-based (`/api/v1/`)

### Idempotency

Write operations (POST, PUT) use idempotency keys where applicable:
- Consultation booking: Check for existing booking at same time slot
- Payment processing: Transaction IDs prevent duplicate charges

### Pagination

List endpoints support pagination:
```
GET /api/v1/consultations?limit=20&offset=0
```

## Retry & Backoff Strategies

### Database Connection Retry

```typescript
// Exponential backoff for database connections
const retryWithBackoff = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
};
```

### External Service Calls

- **Initial Retry**: Immediate
- **Subsequent Retries**: Exponential backoff (1s, 2s, 4s, 8s)
- **Max Retries**: 3 attempts
- **Timeout**: 5 seconds per attempt

## Data Partitioning

### Current Strategy

1. **Time-based Partitioning** (Future):
   - `audit_logs`: Partition by month
   - `consultations`: Partition by year for historical data

2. **Horizontal Sharding** (Future):
   - Shard by `user_id` hash for `consultations` table
   - Shard by `doctor_id` for `availability_slots`

### Index Strategy

- Primary keys: UUID for distributed systems
- Foreign keys: Indexed for join performance
- Composite indexes: On frequently queried combinations (doctor_id + scheduled_at)

## Caching Strategy

### Redis Cache Layers

1. **Session Cache**: JWT tokens, user sessions
2. **Query Cache**: Frequently accessed doctor profiles (TTL: 1 hour)
3. **Availability Cache**: Doctor availability slots (TTL: 15 minutes)
4. **Rate Limiting**: Request counts per IP/user

### Cache Invalidation

- **Write-through**: Update cache on database writes
- **TTL-based**: Automatic expiration for time-sensitive data
- **Manual invalidation**: On profile updates, availability changes

## Concurrency Handling

### Database-Level

1. **Row-level Locking**: Use `SELECT FOR UPDATE` for booking operations
2. **Optimistic Locking**: Version columns for conflict detection
3. **Unique Constraints**: Prevent duplicate bookings at database level

### Application-Level

1. **Transaction Isolation**: Use `SERIALIZABLE` for critical booking operations
2. **Idempotency Keys**: Prevent duplicate operations
3. **Queue System**: Use Bull/Redis for async job processing (future)

### Example: Booking Conflict Prevention

```sql
BEGIN;
SELECT * FROM consultations 
WHERE doctor_id = $1 AND scheduled_at = $2 
FOR UPDATE;

-- If no row found, proceed with insert
INSERT INTO consultations ...
COMMIT;
```

## Transaction Management

### ACID Compliance

- **Atomicity**: All-or-nothing operations (e.g., booking + payment)
- **Consistency**: Foreign key constraints, check constraints
- **Isolation**: Appropriate isolation levels per operation
- **Durability**: WAL (Write-Ahead Logging) in PostgreSQL

### Saga Pattern (Future)

For distributed transactions across services:
1. **Choreography**: Each service publishes events
2. **Orchestration**: Central coordinator manages workflow
3. **Compensation**: Rollback actions for failed steps

Example: Consultation booking saga
1. Reserve slot → 2. Create consultation → 3. Process payment → 4. Send notification
   (If step 3 fails, compensate by releasing slot and cancelling consultation)

## Backup and DR Strategy

### Backup Strategy

1. **Database Backups**:
   - **Full Backup**: Daily at 2 AM (low traffic)
   - **Incremental Backup**: Every 6 hours
   - **WAL Archiving**: Continuous for point-in-time recovery
   - **Retention**: 30 days for full, 7 days for incremental

2. **Backup Storage**:
   - Primary: Same region (fast restore)
   - Secondary: Different region (disaster recovery)

3. **Backup Verification**:
   - Weekly restore tests
   - Automated integrity checks

### Disaster Recovery

1. **RTO (Recovery Time Objective)**: 4 hours
2. **RPO (Recovery Point Objective)**: 1 hour (WAL-based)

3. **DR Plan**:
   - **Failover**: Automated DNS failover to secondary region
   - **Data Replication**: PostgreSQL streaming replication
   - **Application**: Multi-region deployment with health checks

4. **Testing**:
   - Quarterly DR drills
   - Automated failover testing

### High Availability

1. **Database**: Primary + Standby with automatic failover
2. **Application**: Multiple instances behind load balancer
3. **Monitoring**: Health checks and automatic instance replacement

## Scalability Considerations

### Horizontal Scaling

- **Stateless Application**: All instances are identical
- **Database Connection Pooling**: Manage connections efficiently
- **Load Balancing**: Round-robin or least-connections algorithm

### Vertical Scaling

- **Database**: Increase resources for read-heavy workloads
- **Application**: Increase Node.js memory/CPU for compute-intensive operations

### Future Enhancements

1. **Read Replicas**: Distribute read queries
2. **Message Queue**: Async job processing (email, notifications)
3. **CDN**: Static asset delivery
4. **Microservices**: Split into domain-specific services at scale


