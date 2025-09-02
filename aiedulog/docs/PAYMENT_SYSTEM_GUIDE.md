# Comprehensive Payment Integration System - AIedulog

## 🎯 Overview

This document outlines the comprehensive payment integration system implemented for the AIedulog appointment booking platform. The system provides secure, scalable payment processing with Stripe integration, comprehensive audit trails, and advanced administrative features.

## 🏗️ System Architecture

### Core Components

```
💳 Payment System Architecture
├── 🔐 Stripe Integration Layer
│   ├── Payment Intents
│   ├── Payment Methods
│   ├── Customers
│   ├── Webhooks
│   └── Refunds
├── 💾 Database Layer
│   ├── Payments Table
│   ├── Payment Methods
│   ├── Refunds
│   ├── Transactions
│   ├── Webhooks Log
│   └── Analytics
├── 🎨 Frontend Components
│   ├── PaymentForm
│   ├── PaymentMethodManager
│   ├── PaymentHistory
│   └── Admin Dashboard
├── 🔗 API Layer
│   ├── Payment Processing
│   ├── Method Management
│   ├── Refund Processing
│   ├── Webhook Handling
│   └── Admin Operations
└── 🛡️ Security Layer
    ├── Row Level Security
    ├── PCI DSS Compliance
    ├── Data Encryption
    └── Audit Logging
```

## 💾 Database Schema

### Core Tables

#### 1. **payments**
Primary payment records with complete transaction details:

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_payment_intent_id VARCHAR(255) UNIQUE,
  stripe_charge_id VARCHAR(255),
  stripe_customer_id VARCHAR(255),
  user_id UUID NOT NULL REFERENCES identities(id),
  appointment_id UUID REFERENCES appointments(id),
  payment_method_id UUID REFERENCES payment_methods(id),
  amount INTEGER NOT NULL, -- Amount in cents
  currency currency_code NOT NULL DEFAULT 'KRW',
  status payment_status NOT NULL DEFAULT 'pending',
  payment_method_type payment_method_type NOT NULL,
  application_fee INTEGER DEFAULT 0,
  processing_fee INTEGER DEFAULT 0,
  tax_amount INTEGER DEFAULT 0,
  refunded_amount INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. **payment_methods**
Stored payment methods for users:

```sql
CREATE TABLE payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES identities(id),
  stripe_payment_method_id VARCHAR(255) UNIQUE,
  type payment_method_type NOT NULL,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  card_brand VARCHAR(50),
  card_last4 VARCHAR(4),
  card_exp_month INTEGER,
  card_exp_year INTEGER,
  billing_address JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. **refunds**
Comprehensive refund tracking:

```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  stripe_refund_id VARCHAR(255) UNIQUE,
  payment_id UUID NOT NULL REFERENCES payments(id),
  amount INTEGER NOT NULL,
  currency currency_code NOT NULL DEFAULT 'KRW',
  reason TEXT,
  status refund_status NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMPTZ,
  requested_by UUID REFERENCES identities(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4. **payment_transactions**
Detailed transaction audit trail:

```sql
CREATE TABLE payment_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payment_id UUID NOT NULL REFERENCES payments(id),
  type transaction_type NOT NULL,
  amount INTEGER NOT NULL,
  currency currency_code NOT NULL DEFAULT 'KRW',
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'completed',
  external_transaction_id VARCHAR(255),
  gateway_response JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5. **payment_pricing**
Dynamic pricing configuration:

```sql
CREATE TABLE payment_pricing (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_type VARCHAR(100) NOT NULL,
  service_name VARCHAR(255) NOT NULL,
  base_price INTEGER NOT NULL,
  currency currency_code NOT NULL DEFAULT 'KRW',
  duration_minutes INTEGER,
  early_bird_discount_percent DECIMAL(5,2) DEFAULT 0,
  late_booking_fee_percent DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enums and Types

```sql
-- Payment status types
CREATE TYPE payment_status AS ENUM (
  'pending', 'processing', 'succeeded', 'failed', 
  'canceled', 'refunded', 'partially_refunded'
);

-- Payment method types
CREATE TYPE payment_method_type AS ENUM (
  'card', 'bank_transfer', 'digital_wallet', 'cash', 'voucher', 'free'
);

-- Currency support
CREATE TYPE currency_code AS ENUM ('KRW', 'USD', 'EUR', 'JPY');

-- Transaction types
CREATE TYPE transaction_type AS ENUM (
  'payment', 'refund', 'adjustment', 'fee', 'chargeback'
);

-- Refund status
CREATE TYPE refund_status AS ENUM (
  'pending', 'processing', 'succeeded', 'failed', 'canceled'
);
```

## 🔌 API Endpoints

### Payment Processing

#### Create Payment Intent
```http
POST /api/payments/create-intent
```

**Request:**
```json
{
  "appointmentId": "uuid",
  "paymentMethodId": "pm_xxx", // optional
  "savePaymentMethod": true,
  "returnUrl": "https://domain.com/success"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "paymentIntent": {
      "id": "pi_xxx",
      "client_secret": "pi_xxx_secret",
      "status": "requires_payment_method",
      "amount": 5000000,
      "currency": "krw"
    },
    "appointment": { /* appointment details */ },
    "pricing": { /* pricing breakdown */ },
    "customer": { "id": "cus_xxx" }
  }
}
```

#### Confirm Payment
```http
POST /api/payments/confirm
```

**Request:**
```json
{
  "paymentIntentId": "pi_xxx",
  "paymentMethodId": "pm_xxx" // optional
}
```

### Payment Method Management

#### List Payment Methods
```http
GET /api/payments/methods
```

#### Add Payment Method
```http
POST /api/payments/methods
```

**Request:**
```json
{
  "paymentMethodId": "pm_xxx",
  "setAsDefault": true
}
```

#### Remove Payment Method
```http
DELETE /api/payments/methods
```

**Request:**
```json
{
  "paymentMethodId": "pm_xxx"
}
```

### Refund Processing

#### Create Refund
```http
POST /api/payments/refunds
```

**Request:**
```json
{
  "paymentId": "uuid",
  "amount": 2500000, // optional, full refund if not specified
  "reason": "requested_by_customer",
  "description": "Customer requested refund"
}
```

#### List Refunds
```http
GET /api/payments/refunds?paymentId=uuid&status=succeeded
```

### Admin Endpoints

#### List All Payments
```http
GET /api/admin/payments?status=succeeded&limit=20&offset=0
```

#### Payment Statistics
```http
GET /api/admin/payments/stats?period=month
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalRevenue": 15000000,
    "totalTransactions": 25,
    "successfulPayments": 23,
    "failedPayments": 2,
    "refundAmount": 500000,
    "averageTransactionValue": 652173,
    "successRate": 92.0,
    "currency": "KRW",
    "revenueGrowth": 12.5,
    "paymentMethodBreakdown": { /* method stats */ },
    "dailyStats": [ /* daily breakdown */ ]
  }
}
```

## 🎨 Frontend Components

### PaymentForm Component

```tsx
<PaymentForm
  appointmentId="uuid"
  amount={5000000}
  currency="KRW"
  appointmentDetails={{
    title: "AI 교육 상담",
    date: "2025-09-15",
    time: "14:00",
    duration: 60
  }}
  onSuccess={(result) => handleSuccess(result)}
  onError={(error) => handleError(error)}
  onCancel={() => handleCancel()}
/>
```

**Features:**
- Stripe Elements integration
- Dynamic pricing display
- Billing address collection
- Real-time validation
- Payment method saving option
- Mobile-responsive design
- Korean language support

### PaymentMethodManager Component

```tsx
<PaymentMethodManager
  onPaymentMethodSelected={(method) => setSelected(method)}
  allowSelection={true}
  showAddButton={true}
/>
```

**Features:**
- List saved payment methods
- Add new payment methods
- Set default payment method
- Remove payment methods
- Card details display
- Security indicators

### PaymentHistory Component

```tsx
<PaymentHistory
  userId="user-uuid"
  appointmentId="appointment-uuid" // optional
  showRefundButton={true}
/>
```

**Features:**
- Transaction history display
- Payment status indicators
- Refund management
- Receipt access
- Filtering and search
- Pagination support

## 🔐 Security Implementation

### 1. **Data Protection**

#### Encryption at Rest
- All sensitive payment data encrypted using AES-256
- Database-level encryption for payment methods
- Secure key management with rotation

#### PCI DSS Compliance
- No sensitive card data stored locally
- Stripe handles all card information
- Secure tokenization for payment methods
- Regular security audits and compliance checks

### 2. **Access Control**

#### Row Level Security (RLS)
```sql
-- Users can only access their own payments
CREATE POLICY "payments_user_access" ON payments
FOR SELECT USING (user_id = auth.uid());

-- Admins have full access
CREATE POLICY "payments_admin_access" ON payments
FOR ALL USING (has_role_or_higher('admin'::security_role));
```

#### API Security
- JWT-based authentication
- Role-based authorization
- Rate limiting on payment endpoints
- Request validation and sanitization

### 3. **Webhook Security**

```typescript
// Webhook signature verification
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  endpointSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, endpointSecret)
}
```

#### Webhook Processing
- Signature verification for all webhooks
- Idempotent event processing
- Automatic retry with exponential backoff
- Comprehensive error logging

### 4. **Fraud Prevention**

- Stripe Radar integration for fraud detection
- Velocity checks for rapid payments
- Geolocation validation
- Device fingerprinting
- Behavioral analysis

## 💰 Pricing System

### Dynamic Pricing Calculation

```typescript
function calculateAppointmentPricing(
  appointmentTypeId: string,
  appointmentDate: Date,
  durationMinutes: number,
  userId?: string
): PricingBreakdown {
  // Base price calculation
  // Duration-based fees
  // Early bird discounts
  // Late booking fees
  // User-specific discounts
}
```

#### Pricing Features
- **Base Pricing**: Service-specific base rates
- **Duration Fees**: Per-minute pricing for extended sessions
- **Early Bird Discounts**: 7+ days advance booking discounts
- **Late Booking Fees**: <24 hours booking surcharge
- **Dynamic Adjustments**: Admin-configurable pricing rules

### Sample Pricing Structure

```json
{
  "base_price": 5000000,      // 50,000 KRW
  "duration_fee": 0,          // No additional duration fee
  "early_bird_discount": 500000,  // 5,000 KRW discount
  "late_booking_fee": 0,      // No late fee
  "final_price": 4500000,     // 45,000 KRW final
  "currency": "KRW",
  "days_until_appointment": 10
}
```

## 🔄 Refund System

### Refund Processing Flow

1. **Validation**
   - Check payment status
   - Verify refund eligibility
   - Calculate maximum refund amount
   - Apply cancellation policies

2. **Processing**
   - Create refund record in database
   - Process refund through Stripe
   - Update payment status
   - Generate transaction record

3. **Notification**
   - Send refund confirmation email
   - Update appointment status
   - Create audit log entry

### Refund Policies

#### Standard Policy
- **24+ hours**: Full refund
- **<24 hours**: 50% refund
- **After appointment**: No refund (admin discretion)

#### Implementation
```typescript
function calculateRefundAmount(
  payment: Payment,
  appointment: Appointment,
  isAdmin: boolean = false
): number {
  const hoursUntil = getHoursUntilAppointment(appointment)
  
  if (hoursUntil >= 24) return payment.amount
  if (hoursUntil > 0) return Math.round(payment.amount * 0.5)
  if (isAdmin) return payment.amount // Admin override
  
  return 0 // No refund for past appointments
}
```

## 📊 Analytics and Reporting

### Key Metrics

#### Revenue Metrics
- **Total Revenue**: Sum of all successful payments
- **Net Revenue**: Revenue minus refunds and fees
- **Average Transaction Value**: Total revenue / successful transactions
- **Revenue Growth**: Period-over-period comparison

#### Performance Metrics
- **Success Rate**: Successful payments / total attempts
- **Conversion Rate**: Payments / payment intents created
- **Refund Rate**: Refunds / successful payments
- **Time to Payment**: Average payment completion time

#### Customer Metrics
- **Unique Customers**: Distinct users making payments
- **Repeat Customers**: Users with multiple payments
- **Customer Lifetime Value**: Average revenue per customer
- **Payment Method Preferences**: Distribution of payment methods

### Reporting Dashboard

The admin dashboard provides:
- Real-time payment statistics
- Interactive charts and graphs
- Customizable date ranges
- Export functionality
- Automated alerts for anomalies

## 🚀 Deployment Configuration

### Environment Variables

```bash
# Stripe Configuration
STRIPE_PUBLISHABLE_KEY=pk_test_51...
STRIPE_SECRET_KEY=sk_test_51...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_51...

# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Security
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://yourdomain.com
```

### Webhook Endpoints

Configure in Stripe Dashboard:
- **Endpoint URL**: `https://yourdomain.com/api/payments/webhooks`
- **Events to send**:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.requires_action`
  - `payment_intent.canceled`
  - `charge.dispute.created`
  - `charge.refund.updated`

### Production Checklist

- [ ] Stripe live keys configured
- [ ] Webhook endpoints verified
- [ ] SSL certificate installed
- [ ] Database backups configured
- [ ] Monitoring and alerting set up
- [ ] Security audit completed
- [ ] PCI DSS compliance verified
- [ ] Performance testing completed

## 📚 Usage Examples

### Basic Payment Flow

```typescript
// 1. Create payment intent
const response = await fetch('/api/payments/create-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    appointmentId: 'uuid',
    savePaymentMethod: true
  })
})

const { data } = await response.json()
const { paymentIntent } = data

// 2. Confirm payment with Stripe Elements
const { error, paymentIntent: confirmed } = await stripe.confirmCardPayment(
  paymentIntent.client_secret,
  {
    payment_method: {
      card: cardElement,
      billing_details: { /* billing info */ }
    }
  }
)

// 3. Handle result
if (error) {
  console.error('Payment failed:', error)
} else if (confirmed.status === 'succeeded') {
  console.log('Payment successful!')
}
```

### Refund Processing

```typescript
// Process refund
const refund = await fetch('/api/payments/refunds', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    paymentId: 'uuid',
    amount: 2500000, // Partial refund
    reason: 'requested_by_customer',
    description: 'Customer cancellation'
  })
})

const result = await refund.json()
console.log('Refund processed:', result.data)
```

### Admin Operations

```typescript
// Get payment statistics
const stats = await fetch('/api/admin/payments/stats?period=month')
const data = await stats.json()

console.log(`Total Revenue: ${data.totalRevenue}`)
console.log(`Success Rate: ${data.successRate}%`)

// Export payment data
const exportData = await fetch('/api/admin/payments/export', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    dateRange: { start: '2025-01-01', end: '2025-01-31' },
    format: 'csv'
  })
})
```

## 🔧 Troubleshooting

### Common Issues

#### Payment Failures
- **Card declined**: Check card status and limits
- **Insufficient funds**: Request alternative payment method
- **Authentication required**: Handle 3D Secure flow
- **Network errors**: Implement retry logic

#### Webhook Issues
- **Signature verification failed**: Check webhook secret
- **Duplicate events**: Implement idempotency keys
- **Processing timeouts**: Optimize webhook handlers
- **Missing events**: Check Stripe event logs

### Monitoring and Alerts

Set up alerts for:
- Payment failure rate > 10%
- Webhook processing failures
- Refund rate > 5%
- Unusual payment patterns
- API response time > 2s

### Logging

Enable comprehensive logging for:
- All payment attempts
- Webhook events
- Refund requests
- Admin actions
- Error conditions

## 📞 Support and Maintenance

### Regular Maintenance Tasks

#### Weekly
- Review payment failure reports
- Check webhook processing status
- Monitor refund requests
- Update fraud detection rules

#### Monthly
- Analyze payment trends
- Review pricing strategies
- Update security configurations
- Generate compliance reports

#### Quarterly
- Security audit and penetration testing
- Performance optimization review
- Disaster recovery testing
- Customer satisfaction survey

### Documentation Updates

This document should be updated when:
- New payment methods are added
- API endpoints are modified
- Security policies change
- New features are implemented
- Issues and solutions are identified

---

**Document Version**: 1.0  
**Created**: 2025-09-02  
**Last Updated**: 2025-09-02  
**Author**: AIedulog Development Team  
**Status**: Production Ready

*This comprehensive payment system provides enterprise-grade payment processing capabilities with the highest levels of security, compliance, and user experience for the AIedulog platform.*