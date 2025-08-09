# API Documentation

This document provides comprehensive documentation for the RiskWise service layer APIs and Firebase integration.

## 📋 Table of Contents

- [Service Layer Overview](#service-layer-overview)
- [Authentication Services](#authentication-services)
- [Goal Services](#goal-services)
- [Risk Management Services](#risk-management-services)
- [User & UPR Services](#user--upr-services)
- [Monitoring Services](#monitoring-services)
- [AI Services (Genkit)](#ai-services-genkit)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

## 🔧 Service Layer Overview

All services in RiskWise follow a consistent pattern for Firebase Firestore operations:

```typescript
interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
```

### Common Parameters
- `userId`: Current authenticated user ID
- `uprId`: Unit Pengelola Risiko (organization unit) ID
- `period`: Assessment period identifier

## 🔐 Authentication Services

### User Authentication Context

```typescript
interface AuthContextType {
  currentUser: User | null;
  appUser: AppUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signUp: (email: string, password: string) => Promise<UserCredential>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}
```

### Usage Example
```typescript
import { useAuth } from '@/contexts/auth-context';

function MyComponent() {
  const { currentUser, appUser, signIn, signOut } = useAuth();
  
  const handleLogin = async (email: string, password: string) => {
    try {
      await signIn(email, password);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
}
```

## 🎯 Goal Services

### `goalService.ts`

#### `getGoals(userId: string, period: string): Promise<ServiceResponse<Goal[]>>`
Retrieve all goals for a user and period.

```typescript
import { getGoals } from '@/services/goalService';

const result = await getGoals(userId, period);
if (result.success && result.data) {
  console.log('Goals:', result.data);
}
```

#### `addGoal(goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>, uprId: string): Promise<ServiceResponse<Goal>>`
Create a new goal.

```typescript
const goalData = {
  title: "Increase Revenue",
  description: "Increase annual revenue by 15%",
  userId: "user123",
  period: "2024"
};

const result = await addGoal(goalData, uprId);
```

#### `updateGoal(goalId: string, updates: Partial<Goal>, userId: string): Promise<ServiceResponse<void>>`
Update an existing goal.

#### `deleteGoal(goalId: string, userId: string): Promise<ServiceResponse<void>>`
Delete a goal and all associated risks.

## 🚨 Risk Management Services

### Potential Risk Service (`potentialRiskService.ts`)

#### `getPotentialRisksByGoalId(goalId: string, userId: string, period: string): Promise<PotentialRisk[]>`
Get all potential risks for a specific goal.

```typescript
import { getPotentialRisksByGoalId } from '@/services/potentialRiskService';

const risks = await getPotentialRisksByGoalId(goalId, userId, period);
```

#### `addPotentialRisk(riskData: Omit<PotentialRisk, 'id' | 'createdAt' | 'updatedAt'>, uprId: string): Promise<ServiceResponse<PotentialRisk>>`
Create a new potential risk.

```typescript
const riskData = {
  title: "Market Competition",
  description: "Increased competition in target market",
  category: "Operasional",
  goalId: "goal123",
  userId: "user123",
  period: "2024"
};

const result = await addPotentialRisk(riskData, uprId);
```

### Risk Cause Service (`riskCauseService.ts`)

#### `getRiskCausesByPotentialRiskId(potentialRiskId: string, userId: string, period: string): Promise<RiskCause[]>`
Get all risk causes for a potential risk.

#### `addRiskCause(causeData: Omit<RiskCause, 'id' | 'createdAt' | 'updatedAt'>, uprId: string): Promise<ServiceResponse<RiskCause>>`
Add a new risk cause with likelihood and impact assessment.

```typescript
const causeData = {
  description: "New competitors entering market",
  likelihood: "Sering terjadi (4)",
  impact: "Signifikan (4)",
  potentialRiskId: "risk123",
  goalId: "goal123",
  userId: "user123",
  period: "2024",
  sequenceNumber: 1
};
```

### Control Measure Service (`controlMeasureService.ts`)

#### `getControlMeasuresByRiskCauseId(riskCauseId: string, userId: string, period: string): Promise<ControlMeasure[]>`
Get all control measures for a risk cause.

#### `addControlMeasure(controlData: Omit<ControlMeasure, 'id' | 'createdAt' | 'updatedAt'>, uprId: string): Promise<ServiceResponse<ControlMeasure>>`
Add a new control measure.

```typescript
const controlData = {
  title: "Market Analysis",
  description: "Conduct monthly competitor analysis",
  type: "detective",
  effectiveness: "high",
  riskCauseId: "cause123",
  goalId: "goal123",
  userId: "user123",
  period: "2024"
};
```

## 👥 User & UPR Services

### User Service (`userService.ts`)

#### `createAppUser(userData: Omit<AppUser, 'createdAt' | 'updatedAt'>): Promise<ServiceResponse<AppUser>>`
Create a new application user profile.

#### `updateAppUser(userId: string, updates: Partial<AppUser>): Promise<ServiceResponse<void>>`
Update user profile information.

#### `getUsersByUpr(uprId: string): Promise<ServiceResponse<AppUser[]>>`
Get all users belonging to a specific UPR.

### UPR Service (`uprService.ts`)

#### `getUprs(): Promise<ServiceResponse<UPR[]>>`
Get all active UPRs (organizational units).

#### `addUpr(uprData: Omit<UPR, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResponse<UPR>>`
Create a new UPR.

## 📊 Monitoring Services

### Monitoring Service (`monitoringService.ts`)

#### `getMonitoringSessions(userId: string, uprId: string, period: string): Promise<ServiceResponse<MonitoringSession[]>>`
Get all monitoring sessions.

#### `addMonitoringSession(sessionData: Omit<MonitoringSession, 'id' | 'createdAt' | 'updatedAt'>, uprId: string, period: string, userId: string): Promise<ServiceResponse<MonitoringSession>>`
Create a new monitoring session.

### Monitored Control Measure Service (`monitoredControlMeasureService.ts`)

#### `getMonitoredControlsBySession(sessionId: string): Promise<ServiceResponse<MonitoredControlMeasure[]>>`
Get all monitored controls for a session.

#### `updateMonitoredControl(controlId: string, updates: Partial<MonitoredControlMeasure>): Promise<ServiceResponse<void>>`
Update monitored control implementation status.

## 🤖 AI Services (Genkit)

### Brainstorm Risks Flow

#### `brainstormPotentialRisks(input: BrainstormPotentialRisksInput): Promise<BrainstormPotentialRisksOutput>`
Generate AI-suggested risks for a goal.

```typescript
import { brainstormPotentialRisks } from '@/ai/flows/brainstorm-risks';

const input = {
  goalDescription: "Increase revenue by 15%",
  desiredCount: 5
};

const suggestions = await brainstormPotentialRisks(input);
```

### Brainstorm Risk Causes Flow

#### `brainstormRiskCauses(input: BrainstormRiskCausesInput): Promise<BrainstormRiskCausesOutput>`
Generate AI-suggested causes for a risk.

```typescript
const input = {
  goalDescription: "Increase revenue by 15%",
  potentialRiskDescription: "Market competition",
  potentialRiskCategory: "Operasional",
  desiredCount: 3
};

const causes = await brainstormRiskCauses(input);
```

### Control Measures Suggestions Flow

#### `suggestControlMeasures(input: SuggestControlMeasuresInput): Promise<SuggestControlMeasuresOutput>`
Get AI-suggested control measures for a risk cause.

```typescript
const input = {
  riskCauseDescription: "New competitors entering market",
  parentPotentialRiskDescription: "Market competition",
  grandParentGoalDescription: "Increase revenue by 15%",
  riskCauseLevelText: "Tinggi",
  // ... other parameters
};

const controls = await suggestControlMeasures(input);
```

### KRI Tolerance Suggestions Flow

#### `suggestKriTolerance(input: SuggestKriToleranceInput): Promise<SuggestKriToleranceOutput>`
Get AI-suggested Key Risk Indicators and tolerance levels.

## ⚠️ Error Handling

### Service Error Patterns
All services follow consistent error handling:

```typescript
try {
  const result = await someService(params);
  if (!result.success) {
    throw new Error(result.error || 'Operation failed');
  }
  return result.data;
} catch (error) {
  console.error('Service error:', error);
  throw error;
}
```

### Common Error Types
- **Authentication Error**: User not authenticated
- **Permission Error**: Insufficient permissions
- **Validation Error**: Invalid input data
- **Network Error**: Firebase connection issues
- **Not Found Error**: Requested resource doesn't exist

### Error Response Format
```typescript
{
  success: false,
  error: "Error message",
  code?: "ERROR_CODE"
}
```

## 📝 Best Practices

### Service Usage
1. **Always check success flag** before using response data
2. **Handle errors gracefully** with user-friendly messages
3. **Use TypeScript types** for better type safety
4. **Implement loading states** for better UX

### Performance Optimization
1. **Batch operations** when possible
2. **Use Firebase queries efficiently** with proper indexing
3. **Implement pagination** for large datasets
4. **Cache frequently accessed data**

### Security Considerations
1. **Validate all inputs** before service calls
2. **Check user permissions** for data access
3. **Use UPR and period isolation** for data security
4. **Implement audit trails** for sensitive operations

### Example: Complete CRUD Implementation
```typescript
// Component using multiple services
function RiskManagement() {
  const { appUser } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (!appUser) return;
      
      try {
        setLoading(true);
        const result = await getGoals(appUser.uid, appUser.activePeriod);
        
        if (result.success && result.data) {
          setGoals(result.data);
        } else {
          console.error('Failed to load goals:', result.error);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [appUser]);

  const handleAddGoal = async (goalData: Partial<Goal>) => {
    if (!appUser) return;

    try {
      const result = await addGoal(goalData, appUser.activeUprId);
      if (result.success && result.data) {
        setGoals(prev => [...prev, result.data]);
      }
    } catch (error) {
      console.error('Failed to add goal:', error);
    }
  };

  // ... rest of component
}
```

This API documentation provides a comprehensive guide for using the RiskWise service layer effectively and securely.