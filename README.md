# RiskWise 🛡️

A comprehensive risk management application built with Next.js, TypeScript, and Firebase, featuring AI-powered risk assessment and monitoring capabilities.

## 🌟 Features

- **Goal Definition**: Guided input for strategic goal setting and tracking
- **Risk Identification**: AI-powered risk assessment and brainstorming using Google Genkit
- **Risk Analysis**: Interactive risk likelihood/impact matrix with visualization
- **Risk Control**: Comprehensive control measure management and assignment
- **Risk Monitoring**: Real-time dashboard with risk metrics and control effectiveness
- **Audit & Review**: Built-in audit functionality for risk management processes
- **Multi-role Support**: Admin, auditor, and user roles with appropriate permissions
- **Internationalization**: Support for multiple languages (currently Indonesian)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Firebase project with Firestore and Authentication enabled
- Google AI API key (for Genkit AI features)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/LuckyAnggara/RiskWise2.git
   cd RiskWise2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Configure the following variables:
   ```env
   # Firebase Configuration
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   
   # Google AI (for Genkit)
   GOOGLE_GENAI_API_KEY=your_google_ai_api_key
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:9002](http://localhost:9002)

## 🏗️ Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: TailwindCSS, Radix UI Components
- **Backend**: Firebase (Firestore, Authentication, Hosting)
- **AI**: Google Genkit for risk assessment and suggestions
- **State Management**: Zustand
- **Forms**: React Hook Form with Zod validation
- **Charts**: Recharts
- **Internationalization**: next-intl

## 📚 Documentation

- [Developer Setup Guide](./docs/SETUP.md)
- [Architecture Overview](./docs/ARCHITECTURE.md)
- [API Documentation](./docs/API.md)
- [Component Guide](./docs/COMPONENTS.md)
- [AI Features Guide](./docs/AI_FEATURES.md)
- [Deployment Guide](./docs/DEPLOYMENT.md)
- [Contributing Guidelines](./docs/CONTRIBUTING.md)

## 🛠️ Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript checking
npm run genkit:dev   # Start Genkit development server
```

### Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # Reusable UI components
├── contexts/           # React contexts
├── hooks/              # Custom React hooks
├── lib/                # Utilities and configurations
├── services/           # API and Firebase services
├── stores/             # Zustand state stores
├── ai/                 # Genkit AI flows and configurations
└── locales/            # Internationalization files
```

## 🔐 Firebase Setup

1. Create a new Firebase project
2. Enable Firestore Database
3. Enable Authentication (Email/Password)
4. Set up Firestore security rules
5. Deploy hosting configuration

Detailed setup instructions can be found in [docs/SETUP.md](./docs/SETUP.md)

## 🤖 AI Features

RiskWise leverages Google Genkit for intelligent risk management:

- **Risk Brainstorming**: AI-generated risk suggestions based on goals
- **Cause Analysis**: Intelligent identification of risk causes
- **Control Recommendations**: AI-suggested control measures
- **KRI Suggestions**: Key Risk Indicator recommendations

## 🚀 Deployment

The application is configured for Firebase Hosting with GitHub Actions CI/CD. See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed instructions.

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](./docs/CONTRIBUTING.md) for details on how to submit pull requests, report issues, and contribute to the project.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- AI powered by [Google Genkit](https://firebase.google.com/docs/genkit)
- Icons from [Lucide React](https://lucide.dev/)

## 📞 Support

For support and questions:
- Open an issue on GitHub
- Check the [documentation](./docs/)
- Review existing issues and discussions
