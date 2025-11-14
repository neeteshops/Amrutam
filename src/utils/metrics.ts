import client from 'prom-client';

// Create a Registry to register the metrics
export const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

export const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [register],
});

export const activeConsultations = new client.Gauge({
  name: 'active_consultations',
  help: 'Number of active consultations',
  registers: [register],
});

export const userRegistrations = new client.Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['role'],
  registers: [register],
});

export const consultationBookings = new client.Counter({
  name: 'consultation_bookings_total',
  help: 'Total number of consultation bookings',
  labelNames: ['status'],
  registers: [register],
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(databaseQueryDuration);
register.registerMetric(activeConsultations);
register.registerMetric(userRegistrations);
register.registerMetric(consultationBookings);


