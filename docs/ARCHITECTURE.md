# Architecture Overview

This document provides a comprehensive overview of the RiskWise application architecture, including system design, data models, and key components.

## 🏗️ System Architecture

RiskWise follows a modern web application architecture with the following layers:

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer (Browser)                   │
├─────────────────────────────────────────────────────────────┤
│                 Next.js Frontend Application                │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │    Pages    │ │ Components  │ │      State Stores       │ │
│  │  (App Dir)  │ │  (UI/Logic) │ │      (Zustand)          │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Service Layer                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │  Firebase   │ │   Genkit    │ │    Utility Services     │ │
│  │  Services   │ │  AI Flows   │ │                         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                     Backend Services                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────────┐ │
│  │  Firebase   │ │   Google    │ │    Firebase Hosting     │ │
│  │  Firestore  │ │   AI API    │ │                         │ │
│  │   & Auth    │ │             │ │                         │ │
│  └─────────────┘ └─────────────┘ └─────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── [locale]/          # Internationalized routes
│   ├── admin/             # Admin-only pages
│   ├── auditor/           # Auditor-specific pages
│   └── globals.css        # Global styles
├── components/            # Reusable UI components
│   ├── ui/               # Base UI components (buttons, forms, etc.)
│   ├── layout/           # Layout components
│   ├── goals/            # Goal-specific components
│   └── risks/            # Risk management components
├── contexts/             # React contexts
│   └── auth-context.tsx  # Authentication context
├── hooks/                # Custom React hooks
├── lib/                  # Core utilities and configurations
│   ├── firebase/         # Firebase configuration
│   ├── types.ts          # TypeScript type definitions
│   └── utils.ts          # Utility functions
├── services/             # API service layer
│   ├── goalService.ts    # Goal CRUD operations
│   ├── riskService.ts    # Risk management operations
│   └── userService.ts    # User management
├── stores/               # Zustand state management
│   └── useAppStore.ts    # Main application store
├── ai/                   # Genkit AI configurations
│   ├── flows/            # AI flow definitions
│   └── genkit.ts         # Genkit setup
└── locales/              # Internationalization files
```

## 🗄️ Data Models

### Core Entities

#### User Management
```typescript
interface AppUser {
  uid: string;              // Firebase Auth UID
  email: string;
  displayName: string;
  isAdmin?: boolean;
  isAuditor?: boolean;
  activePeriod: string;     // Current assessment period
  activeUprId: string;      // Active UPR (Unit Pengelola Risiko)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface UPR {
  id: string;
  name: string;             // Organization unit name
  description?: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Risk Management Hierarchy
```typescript
interface Goal {
  id: string;
  title: string;
  description: string;
  uprId: string;
  period: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface PotentialRisk {
  id: string;
  title: string;
  description: string;
  category: RiskCategory;   // Kebijakan, Hukum, Reputasi, etc.
  goalId: string;
  uprId: string;
  period: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface RiskCause {
  id: string;
  description: string;
  likelihood: LikelihoodLevelDesc | null;
  impact: ImpactLevelDesc | null;
  potentialRiskId: string;
  goalId: string;
  uprId: string;
  period: string;
  userId: string;
  sequenceNumber: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface ControlMeasure {
  id: string;
  title: string;
  description: string;
  type: 'preventive' | 'detective' | 'corrective';
  effectiveness: 'low' | 'medium' | 'high';
  riskCauseId: string;
  goalId: string;
  uprId: string;
  period: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Monitoring & Audit
```typescript
interface MonitoringSession {
  id: string;
  title: string;
  description: string;
  status: 'planned' | 'in-progress' | 'completed';
  startDate: Timestamp;
  endDate?: Timestamp;
  uprId: string;
  period: string;
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface MonitoredControlMeasure {
  id: string;
  controlMeasureId: string;
  monitoringSessionId: string;
  implementation: 'not-started' | 'in-progress' | 'completed';
  effectiveness: 'low' | 'medium' | 'high';
  notes?: string;
  evidenceUrl?: string;
  reviewedAt?: Timestamp;
  reviewedBy?: string;
}
```

## 🔄 Data Flow

### Risk Assessment Workflow
1. **Goal Setting**: Users define strategic goals
2. **Risk Identification**: AI-assisted identification of potential risks
3. **Cause Analysis**: Detailed analysis of risk causes with AI suggestions
4. **Risk Assessment**: Likelihood and impact evaluation using risk matrix
5. **Control Planning**: Definition and assignment of control measures
6. **Monitoring**: Ongoing assessment of control effectiveness

### Authentication & Authorization Flow
```
User Login → Firebase Auth → User Context → Role Validation → Route Access
```

### AI Integration Flow
```
User Input → Genkit Flow → Google AI API → Response Processing → UI Update
```

## 🔧 Key Components

### State Management (Zustand)
The application uses Zustand for global state management with the following stores:

- **Auth Store**: User authentication state
- **UPR Store**: Organization unit context
- **Risk Store**: Risk management data
- **UI Store**: Application UI state

### Service Layer
Services provide abstraction over Firebase operations:

- **CRUD Operations**: Standardized create, read, update, delete
- **Real-time Subscriptions**: Live data updates
- **Batch Operations**: Efficient bulk operations
- **Validation**: Data validation before persistence

### AI Integration (Genkit)
AI features are implemented as Genkit flows:

- **Risk Brainstorming**: Generate risk suggestions based on goals
- **Cause Analysis**: Identify potential causes for risks
- **Control Recommendations**: Suggest appropriate control measures
- **KRI Suggestions**: Recommend Key Risk Indicators

## 🛡️ Security Model

### Authentication
- Firebase Authentication with email/password
- JWT token-based session management
- Automatic token refresh

### Authorization
- Role-based access control (Admin, Auditor, User)
- UPR-based data isolation
- Period-based data segregation

### Data Security
- Firestore security rules for data access control
- Client-side validation with server-side enforcement
- Audit trail for all data modifications

## 🌐 Internationalization

The application supports multiple languages using next-intl:

- **Route-based locale**: `/[locale]/path`
- **Dynamic content translation**: Server and client-side
- **Locale detection**: Browser preference with fallback

## 📊 Performance Considerations

### Frontend Optimization
- **Next.js App Router**: Server-side rendering and static generation
- **Component lazy loading**: Reduced initial bundle size
- **Image optimization**: Next.js automatic image optimization
- **Caching strategies**: Browser and CDN caching

### Backend Optimization
- **Firestore indexing**: Optimized query performance
- **Connection pooling**: Efficient Firebase connections
- **Batch operations**: Reduced API calls
- **Real-time subscriptions**: Efficient data updates

## 🔍 Monitoring & Observability

### Error Handling
- Client-side error boundaries
- Service-level error handling
- User-friendly error messages
- Error logging and tracking

### Performance Monitoring
- Core Web Vitals tracking
- Firebase Performance Monitoring
- Custom performance metrics

## 🚀 Deployment Architecture

### Production Environment
```
GitHub → GitHub Actions → Firebase Hosting
                      → Firestore (Production)
                      → Firebase Auth (Production)
```

### Development Environment
```
Local Development → Firebase Emulators (Optional)
                 → Firebase Development Project
```

## 📈 Scalability Considerations

### Database Design
- Efficient document structure for Firestore
- Denormalization for read performance
- Appropriate indexing strategy

### Application Architecture
- Modular component design
- Service-oriented architecture
- Separation of concerns

### Performance Scaling
- CDN for static assets
- Database query optimization
- Client-side caching strategies

This architecture provides a robust foundation for the RiskWise application while maintaining flexibility for future enhancements and scalability requirements.