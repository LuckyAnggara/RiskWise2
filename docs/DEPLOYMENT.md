# Deployment Guide

This guide covers deploying RiskWise to production environments, with a focus on Firebase Hosting and GitHub Actions CI/CD.

## 📋 Table of Contents

- [Production Environment Setup](#production-environment-setup)
- [Firebase Hosting Deployment](#firebase-hosting-deployment)
- [GitHub Actions CI/CD](#github-actions-cicd)
- [Environment Configuration](#environment-configuration)
- [Security Configuration](#security-configuration)
- [Performance Optimization](#performance-optimization)
- [Monitoring and Maintenance](#monitoring-and-maintenance)

## 🚀 Production Environment Setup

### Prerequisites
- Firebase project with billing enabled
- GitHub repository with appropriate permissions
- Google Cloud Platform account for AI services
- Domain name (optional, for custom domain)

### Firebase Project Configuration

#### 1. Create Production Firebase Project
```bash
# Login to Firebase
firebase login

# Create new project (or use existing)
firebase projects:create your-production-project-id

# Select project
firebase use your-production-project-id
```

#### 2. Enable Required Services
```bash
# Enable Firestore
firebase firestore --project your-production-project-id

# Enable Authentication
firebase auth --project your-production-project-id

# Enable Hosting
firebase hosting --project your-production-project-id
```

#### 3. Configure Firebase Services

**Firestore Security Rules:**
Deploy production-ready security rules from the repository:
```bash
firebase deploy --only firestore:rules
```

**Firestore Indexes:**
```bash
firebase deploy --only firestore:indexes
```

**Authentication Settings:**
1. Go to Firebase Console → Authentication → Settings
2. Configure authorized domains for production
3. Set up email templates
4. Configure password policy

## 🌐 Firebase Hosting Deployment

### Manual Deployment

#### 1. Build the Application
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Export static files (if using static export)
npm run export
```

#### 2. Deploy to Firebase Hosting
```bash
# Deploy to hosting
firebase deploy --only hosting

# Deploy specific project
firebase deploy --only hosting --project your-production-project-id
```

### Firebase Configuration
File: `firebase.json`
```json
{
  "hosting": {
    "public": "out",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "**/*",
        "headers": [
          {
            "key": "X-Content-Type-Options",
            "value": "nosniff"
          },
          {
            "key": "X-Frame-Options",
            "value": "DENY"
          },
          {
            "key": "X-XSS-Protection",
            "value": "1; mode=block"
          }
        ]
      },
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp|js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  }
}
```

### Next.js Configuration for Static Export
File: `next.config.ts`
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true
  },
  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }
};

export default nextConfig;
```

## 🔄 GitHub Actions CI/CD

### Automated Deployment Workflow
File: `.github/workflows/deploy.yml`

```yaml
name: Deploy to Firebase Hosting

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout code
      uses: actions/checkout@v4
      
    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '18'
        cache: 'npm'
        
    - name: Install dependencies
      run: npm ci
      
    - name: Run tests
      run: npm run test --if-present
      
    - name: Run linting
      run: npm run lint
      
    - name: Type check
      run: npm run typecheck
      
    - name: Build application
      run: npm run build
      env:
        NEXT_PUBLIC_FIREBASE_API_KEY: ${{ secrets.NEXT_PUBLIC_FIREBASE_API_KEY }}
        NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: ${{ secrets.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN }}
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_PROJECT_ID }}
        NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: ${{ secrets.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET }}
        NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID }}
        NEXT_PUBLIC_FIREBASE_APP_ID: ${{ secrets.NEXT_PUBLIC_FIREBASE_APP_ID }}
        GOOGLE_GENAI_API_KEY: ${{ secrets.GOOGLE_GENAI_API_KEY }}
    
    - name: Deploy to Firebase Hosting (Preview)
      if: github.event_name == 'pull_request'
      uses: FirebaseExtended/action-hosting-deploy@v0
      with:
        repoToken: '${{ secrets.GITHUB_TOKEN }}'
        firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
        projectId: '${{ secrets.FIREBASE_PROJECT_ID }}'
        
    - name: Deploy to Firebase Hosting (Production)
      if: github.ref == 'refs/heads/main'
      uses: FirebaseExtended/action-hosting-deploy@v0
      with:
        repoToken: '${{ secrets.GITHUB_TOKEN }}'
        firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
        projectId: '${{ secrets.FIREBASE_PROJECT_ID }}'
        channelId: live
```

### GitHub Secrets Configuration
Add the following secrets to your GitHub repository:

1. **FIREBASE_SERVICE_ACCOUNT**: Firebase service account JSON
2. **FIREBASE_PROJECT_ID**: Your Firebase project ID
3. **NEXT_PUBLIC_FIREBASE_API_KEY**: Firebase API key
4. **NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN**: Firebase auth domain
5. **NEXT_PUBLIC_FIREBASE_PROJECT_ID**: Firebase project ID
6. **NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET**: Firebase storage bucket
7. **NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID**: Firebase messaging sender ID
8. **NEXT_PUBLIC_FIREBASE_APP_ID**: Firebase app ID
9. **GOOGLE_GENAI_API_KEY**: Google AI API key

### Service Account Setup
```bash
# Create service account
firebase service-accounts:create github-actions --project your-project-id

# Download service account key
firebase service-accounts:download github-actions@your-project-id.iam.gserviceaccount.com --project your-project-id
```

## ⚙️ Environment Configuration

### Production Environment Variables
File: `.env.production`
```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_production_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-production-project
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google AI Configuration
GOOGLE_GENAI_API_KEY=your_production_google_ai_key

# Application Configuration
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Environment Validation
```typescript
// lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  GOOGLE_GENAI_API_KEY: z.string().min(1),
});

export const env = envSchema.parse(process.env);
```

## 🔒 Security Configuration

### Firestore Security Rules
File: `firestore.rules`
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User authentication required
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // User owns the document
    function isOwner(userId) {
      return request.auth.uid == userId;
    }
    
    // User has admin role
    function isAdmin() {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // User belongs to UPR
    function belongsToUpr(uprId) {
      return isAuthenticated() && 
             get(/databases/$(database)/documents/users/$(request.auth.uid)).data.activeUprId == uprId;
    }
    
    // Users collection
    match /users/{userId} {
      allow read, write: if isOwner(userId) || isAdmin();
    }
    
    // UPR collection
    match /uprs/{uprId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
    
    // Goals collection
    match /goals/{goalId} {
      allow read, write: if isAuthenticated() && 
                            belongsToUpr(resource.data.uprId) && 
                            resource.data.userId == request.auth.uid;
    }
    
    // Risks and related collections
    match /{path=**} {
      allow read, write: if isAuthenticated() && 
                            belongsToUpr(resource.data.uprId) && 
                            resource.data.userId == request.auth.uid;
    }
  }
}
```

### Content Security Policy
```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://apis.google.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://api.gemini.com https://*.googleapis.com wss://*.firebaseio.com",
    ].join('; ')
  }
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

## ⚡ Performance Optimization

### Build Optimization
```json
// package.json scripts
{
  "scripts": {
    "build": "next build",
    "build:analyze": "ANALYZE=true next build",
    "build:production": "NODE_ENV=production next build"
  }
}
```

### Bundle Analysis
```bash
# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Analyze bundle
npm run build:analyze
```

### Caching Strategy
```typescript
// next.config.ts
const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

## 📊 Monitoring and Maintenance

### Firebase Performance Monitoring
```typescript
// lib/firebase/performance.ts
import { getPerformance } from 'firebase/performance';
import { app } from './config';

export const perf = getPerformance(app);
```

### Error Monitoring
```typescript
// lib/error-monitoring.ts
export const logError = (error: Error, context?: Record<string, any>) => {
  console.error('Application Error:', error, context);
  
  // Send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // Integrate with Sentry, LogRocket, etc.
  }
};
```

### Health Check Endpoint
```typescript
// pages/api/health.ts
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
}
```

### Deployment Checklist

#### Pre-deployment
- [ ] Run all tests and ensure they pass
- [ ] Verify TypeScript compilation
- [ ] Check linting and formatting
- [ ] Review security settings
- [ ] Validate environment variables
- [ ] Test build process locally

#### Production Deployment
- [ ] Deploy Firestore rules and indexes
- [ ] Deploy application to Firebase Hosting
- [ ] Verify application functionality
- [ ] Check performance metrics
- [ ] Monitor error logs
- [ ] Update DNS if using custom domain

#### Post-deployment
- [ ] Verify all features work correctly
- [ ] Test user authentication
- [ ] Validate AI features
- [ ] Monitor performance metrics
- [ ] Set up alerting for critical issues
- [ ] Document deployment version

### Rollback Procedure
```bash
# List hosting releases
firebase hosting:releases

# Rollback to previous version
firebase hosting:rollback --site your-site-id

# Rollback Firestore rules (if needed)
firebase deploy --only firestore:rules --project your-project-id
```

### Custom Domain Setup
```bash
# Add custom domain
firebase hosting:sites:create your-site-name

# Configure domain
firebase hosting:sites:link your-site-name --project your-project-id

# Add domain in Firebase Console
# Update DNS records as instructed
```

This deployment guide provides a comprehensive approach to deploying RiskWise to production with proper security, monitoring, and maintenance considerations.