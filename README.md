# Amrutam Telemedicine Backend

Production-grade backend system for Amrutam's telemedicine platform, built with Node.js, TypeScript, Express, PostgreSQL, and Redis.

## Features

- **User Management**: Registration, authentication, profile management with RBAC
- **Multi-Factor Authentication (MFA)**: TOTP-based 2FA support
- **Doctor Management**: Doctor profiles, availability slots, specializations
- **Consultation Booking**: Real-time booking system with conflict detection
- **Prescription Management**: Digital prescriptions with medication tracking
- **Search & Filtering**: Advanced search for doctors by specialization, location, rating
- **Audit Logging**: Comprehensive audit trail for compliance
- **Admin Analytics**: Dashboard with statistics and trends
- **Observability**: Metrics (Prometheus), structured logging (Winston), distributed tracing (OpenTelemetry)
- **Security**: Rate limiting, input validation, encryption, JWT authentication
- **Scalability**: Designed to handle 100k daily consultations

## Architecture

### System Requirements
- **Scale**: 100k daily consultations
- **Latency**: p95 <200ms reads, <500ms writes
- **Availability**: 99.95%
- **Security**: Encryption, MFA, RBAC
- **Observability**: Metrics, logs, traces

### Technology Stack
- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Containerization**: Docker & Docker Compose

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- npm or yarn

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd amrut
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start services with Docker Compose**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Run database migrations**
   ```bash
   npm run migrate
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:3000`

### Production Deployment

1. **Build and start with Docker Compose**
   ```bash
   docker-compose up -d --build
   ```

2. **Set environment variables**
   - Update `docker-compose.yml` with production secrets
   - Or use environment variables from your deployment platform

## API Documentation

Once the server is running, access the interactive API documentation at:
- Swagger UI: `http://localhost:3000/api-docs`
- OpenAPI Spec: Available in the Swagger UI

## Project Structure

```
amrut/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/      # Request handlers
│   ├── database/         # Database schema and migrations
│   ├── middleware/       # Express middleware
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Utility functions
│   └── index.ts          # Application entry point
├── .github/
│   └── workflows/        # CI/CD pipelines
├── docker-compose.yml    # Production Docker setup
├── docker-compose.dev.yml # Development Docker setup
├── Dockerfile            # Application container
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/mfa/setup` - Setup MFA
- `POST /api/v1/auth/mfa/enable` - Enable MFA

### Users
- `GET /api/v1/users/profile` - Get user profile
- `PUT /api/v1/users/profile` - Update user profile

### Doctors
- `POST /api/v1/doctors` - Create doctor profile (doctor only)
- `GET /api/v1/doctors/search` - Search doctors
- `GET /api/v1/doctors/:id` - Get doctor details
- `GET /api/v1/doctors/me` - Get my doctor profile
- `PUT /api/v1/doctors/:id` - Update doctor profile

### Availability
- `POST /api/v1/availability/doctors/:doctorId/slots` - Create availability slot
- `GET /api/v1/availability/doctors/:doctorId/slots` - Get doctor slots
- `GET /api/v1/availability/doctors/:doctorId/available` - Get available slots for date
- `DELETE /api/v1/availability/doctors/:doctorId/slots/:slotId` - Delete slot

### Consultations
- `POST /api/v1/consultations` - Book consultation
- `GET /api/v1/consultations` - Get user consultations
- `GET /api/v1/consultations/:id` - Get consultation details
- `PUT /api/v1/consultations/:id` - Update consultation
- `POST /api/v1/consultations/:id/cancel` - Cancel consultation

### Prescriptions
- `POST /api/v1/prescriptions` - Create prescription (doctor only)
- `GET /api/v1/prescriptions` - Get user prescriptions
- `GET /api/v1/prescriptions/:id` - Get prescription details

### Analytics (Admin only)
- `GET /api/v1/analytics/dashboard` - Dashboard statistics
- `GET /api/v1/analytics/consultations/trends` - Consultation trends
- `GET /api/v1/analytics/revenue/trends` - Revenue trends
- `GET /api/v1/analytics/doctors/top` - Top doctors

### Audit (Admin only)
- `GET /api/v1/audit/logs` - Get audit logs

## Database Schema

### Core Tables
- `users` - User accounts with authentication
- `profiles` - User profile information
- `doctors` - Doctor profiles and credentials
- `availability_slots` - Doctor availability schedule
- `consultations` - Consultation bookings and sessions
- `prescriptions` - Digital prescriptions
- `payments` - Payment transactions
- `audit_logs` - Audit trail for compliance

See `src/database/schema.sql` for complete schema definition.

## Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

## Observability

### Metrics
Prometheus metrics are available at `http://localhost:9090/metrics`

Key metrics:
- HTTP request duration and count
- Database query performance
- Active consultations
- User registrations
- Consultation bookings

### Logging
Structured logs are written to:
- `logs/error-YYYY-MM-DD.log` - Error logs
- `logs/combined-YYYY-MM-DD.log` - All logs

### Tracing
OpenTelemetry tracing is enabled when `ENABLE_TRACING=true`. Configure your tracing backend in the environment.

## Security

### Implemented Security Features
- JWT-based authentication
- Password hashing with bcrypt
- Multi-factor authentication (TOTP)
- Role-based access control (RBAC)
- Rate limiting
- Input validation with Joi
- SQL injection prevention (parameterized queries)
- CORS configuration
- Helmet.js security headers
- Data encryption for sensitive fields
- Audit logging

### Security Checklist
See `docs/SECURITY.md` for detailed security checklist and threat model.

## Performance

### Optimization Strategies
- Database indexing on frequently queried columns
- Connection pooling for PostgreSQL
- Redis caching (optional, for session management)
- Query optimization with proper joins
- Pagination for list endpoints

### Scaling Considerations
- Horizontal scaling with load balancer
- Database read replicas for read-heavy workloads
- Redis cluster for distributed caching
- Message queue for async job processing (future enhancement)

## CI/CD

GitHub Actions workflow is configured in `.github/workflows/ci.yml`:
- Runs tests on push/PR
- Linting checks
- Code coverage reporting
- Docker image building

## Environment Variables

Key environment variables (see `.env.example` for complete list):

```env
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=amrutam
DB_USER=postgres
DB_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key
ENCRYPTION_KEY=your-32-character-key
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Write/update tests
4. Ensure all tests pass
5. Submit a pull request

## License

MIT

## Support

For issues and questions, please open an issue in the repository.


