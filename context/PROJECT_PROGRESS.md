
DONE:
- User Authentication (Email/Password, Google Sign-In)
- User Profile Setup (Initial setup, user settings page for period/display name)
- Admin: UPR Management (CRUD UPRs, including risk appetite)
- Admin: User Management (View users, assign UPR, assign role)
- Goal Management (CRUD operations, linked to UPR & Period)
- Potential Risk Management (CRUD operations, linked to Goals, AI brainstorming, dedicated management page `/all-risks/manage/[potentialRiskId]`)
- Risk Cause Management (CRUD operations, linked to Potential Risks, AI brainstorming, inline management on Potential Risk detail page)
- Risk Cause Analysis (Dedicated page `/risk-cause-analysis/[riskCauseId]` for KRI, Tolerance, Likelihood, Impact, and linking Control Measures)
- Control Measure Management (CRUD operations, linked to Risk Causes, AI suggestions for KCI/Target, dedicated management page `/control-measure-manage/[controlMeasureId]`)
- Risk Analysis Listing Page (`/risk-analysis` displaying analyzed risk causes)
- Risk Priority Dashboard (`/risk-priority` with heatmap and prioritized list of analyzed risk causes)
- Monitoring Session Management (Create session, select risk causes to monitor)
- Conduct Monitoring Session (Input KRI realization, KCI realization, narrative, supporting docs, calculate control performance)
- Download Monitoring Report (XLSX format)
- Comparative Monitoring Analysis (Select 2-4 sessions, display KRI & control performance trends via charts)
- Comprehensive Risk Document (Tree view of Goals > PRs > RCs > CMs)
- Theming (Light/Dark mode support)
- Basic Internationalization Setup (`next-intl`)
- Core data fetching logic refactored to be strictly based on `uprId` and `period` for active UPR context.
- Corrected `userId` (creator) vs. `uprId` (data owner) distinction in services and store for data creation.
- Fixed "Sasaran tidak ditemukan" error on `/risks/[goalId]` page by using correct `appUser.uprId` for fetching.
- Addressed "User ID (pembuat) tidak valid" / "Owner UPR ID tidak valid" errors during Potential Risk creation by centralizing logic through `useAppStore` and ensuring correct parameter passing.

WORKING:
- Zustand Store (`useAppStore`): Ongoing refinement of global state management, ensuring all data fetching (goals, potential risks, risk causes, control measures, monitoring data) is correctly scoped by `activeUprId` and `activePeriod`. Centralizing all CRUD operations through store methods to ensure consistent context handling.
- Firebase Services: Continuous review to ensure Firestore queries in services consistently use `uprId` and `period` for data scoping, and `userId` refers to the creator UID.
- Cascading Deletes: Ensuring robustness of cascading deletes (e.g., Goal deletion also removes its PRs, RCs, CMs) via service/store logic.
- Data Integrity: Ensuring data consistency across different views and after CRUD operations, especially regarding sequence numbers and parent-child relationships.
- User Experience for Admin/Auditor: Refining how admins/auditors switch UPR contexts and ensuring data displays correctly for the selected context.

NEXT:
- Risk Monitoring Dashboard: Design and implement visualizations for risk metrics and control effectiveness over time.
- Comprehensive Risk Document: Implement the "Flat Table View".
- Comparative Monitoring Analysis: Implement AI-driven insights/observations for trends.
- File Upload for Control Measure Monitoring: Implement actual file uploads instead of just URL linking for supporting documents.
- Main Dashboard: Implement more advanced AI-driven insights.
- Automated Report Generation: Explore options for PDF/Word report generation.
- Workflow for Risk Treatment and Review: Design and implement a formal workflow process.
- Notifications and Alerts: Implement a system for important events or overdue tasks.
- Granular User Roles & Permissions: Expand beyond current roles for more fine-grained access control if needed.
- Image Handling: Implement a strategy for handling images beyond placeholders (e.g., for supporting documents or UPR logos).
- Thorough End-to-End Testing: Conduct comprehensive testing for all user roles (userSatker, admin, auditor) across all modules, especially after recent context and store refactoring.
- Firestore Security Rules: Review and update Firestore security rules to precisely match data access logic based on `uprId` (data owner) and `userId` (creator/accessor role).
- AI Feature Review: Test and refine all AI-assisted brainstorming and suggestion features for accuracy, relevance, and user experience.
- Internationalization: Populate `id.json` and `en.json` more completely and test language switching.
- Performance Optimization: Profile and optimize data fetching and rendering, especially for pages with large datasets.
