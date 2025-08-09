# Developer Setup Guide

This guide will help you set up the RiskWise development environment from scratch.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js 18 or later** - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** - [Download here](https://git-scm.com/)
- **Firebase CLI** - `npm install -g firebase-tools`
- **Google Cloud account** (for Genkit AI features)

## 1. Repository Setup

### Clone the Repository
```bash
git clone https://github.com/LuckyAnggara/RiskWise2.git
cd RiskWise2
```

### Install Dependencies
```bash
npm install
```

## 2. Firebase Configuration

### Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Follow the setup wizard
4. Enable Google Analytics (optional)

### Enable Required Firebase Services

#### Firestore Database
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development
4. Select a location closest to your users

#### Authentication
1. Go to "Authentication" → "Sign-in method"
2. Enable "Email/Password" provider
3. Configure authorized domains if needed

#### Firebase Hosting (Optional)
1. Go to "Hosting"
2. Click "Get started"
3. Follow the setup instructions

### Get Firebase Configuration
1. Go to Project Settings (gear icon)
2. Scroll down to "Your apps"
3. Click "Add app" → Web app
4. Register your app and copy the configuration

## 3. Environment Configuration

### Create Environment File
```bash
cp .env.example .env.local
```

### Configure Environment Variables
Add the following to your `.env.local` file:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google AI Configuration (for Genkit)
GOOGLE_GENAI_API_KEY=your_google_ai_api_key

# Development Configuration
NODE_ENV=development
```

### Get Google AI API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Add it to your environment file

## 4. Firestore Security Rules

Deploy the following security rules to your Firestore database:

```javascript
// Copy the content from firestore.rules file in the project root
// Deploy using: firebase deploy --only firestore:rules
```

Deploy rules:
```bash
firebase login
firebase use your_project_id
firebase deploy --only firestore:rules
```

## 5. Development Server

### Start Development Server
```bash
npm run dev
```

The application will be available at [http://localhost:9002](http://localhost:9002)

### Start Genkit Development Server (Optional)
For AI features development:
```bash
npm run genkit:dev
```

This will start the Genkit development UI for testing AI flows.

## 6. Initial Data Setup

### Create Admin User
1. Register a new account through the application
2. In Firestore console, find the user document
3. Add an `isAdmin: true` field to make them an admin

### Set Up UPR (Unit Pengelola Risiko)
1. Login as admin
2. Go to Admin → UPR Management
3. Create your organization's risk management units
4. Assign users to appropriate UPRs

### Configure Periods
1. In Admin panel, set up risk management periods
2. These represent time periods for risk assessment cycles

## 7. Testing the Setup

### Verify Basic Functionality
1. User registration and login
2. Goal creation
3. Risk identification
4. Risk analysis matrix
5. Control measure management

### Test AI Features
1. Try risk brainstorming on a goal
2. Test cause analysis suggestions
3. Verify control measure recommendations

## 8. Common Issues and Solutions

### Firebase Authentication Issues
- Ensure authorized domains are configured in Firebase Console
- Check that API keys have proper permissions

### Genkit AI Not Working
- Verify Google AI API key is valid
- Check that billing is enabled on Google Cloud project
- Ensure API quotas are not exceeded

### Build Errors
- Run `npm run typecheck` to identify TypeScript issues
- Check that all environment variables are set
- Verify Node.js version compatibility

### Firestore Permission Errors
- Check security rules are deployed
- Verify user authentication state
- Ensure user has proper role assignments

## 9. Development Tools

### Recommended VS Code Extensions
- TypeScript and JavaScript Language Features
- Tailwind CSS IntelliSense
- Firebase Explorer
- ES7+ React/Redux/React-Native snippets
- Prettier - Code formatter

### Browser Development Tools
- React Developer Tools
- Firebase DevTools
- Redux DevTools (for Zustand)

## 10. Next Steps

After successful setup:
1. Read the [Architecture Overview](./ARCHITECTURE.md)
2. Explore [API Documentation](./API.md)
3. Check out [Component Guide](./COMPONENTS.md)
4. Learn about [AI Features](./AI_FEATURES.md)

## Need Help?

- Check [GitHub Issues](https://github.com/LuckyAnggara/RiskWise2/issues)
- Review [Contributing Guidelines](./CONTRIBUTING.md)
- Contact the development team