# PROJECT_CONTEXT_HISTORY.md

## Project Objectives and Vision

**RiskWise** is a comprehensive risk management application designed to help users:
1.  **Define Goals**: Clearly articulate strategic objectives.
2.  **Identify Risks**: Brainstorm and identify potential risks associated with each goal, assisted by AI leveraging risk management best practices.
3.  **Analyze Risks**: Evaluate risks using a likelihood/impact matrix and categorize them.
4.  **Control Risks**: Define and assign control measures to mitigate identified risks.
5.  **Monitor Risks**: Track risk metrics and control effectiveness over time through a dashboard.

The vision is to provide an intuitive, AI-enhanced platform for proactive risk management, enabling users to make informed decisions and improve their chances of achieving objectives.

## Technical Stack and Architecture

*   **Frontend**: Next.js (App Router), React, TypeScript
*   **UI Components**: ShadCN UI
*   **Styling**: Tailwind CSS
*   **AI Integration**: Genkit (for LLM calls and AI-driven suggestions)
*   **Backend/Database**: Firebase (Firestore for data storage, Firebase Authentication for user management)
*   **State Management**: Zustand (for client-side global state)
*   **Deployment**: Firebase App Hosting (implied by `apphosting.yaml`)

**Architecture Overview**:
*   Client-side rendering with Next.js App Router.
*   Server Components and Server Actions for optimized performance and data mutations.
*   Firebase services for authentication and database.
*   Genkit flows (`src/ai/flows/`) encapsulate AI logic, callable via Server Actions (`src/app/actions.ts`).
*   Zustand store (`src/stores/useAppStore.ts`) manages global client-side state and orchestrates data fetching and updates with Firestore services.
*   Services (`src/services/`) interact directly with Firestore for CRUD operations.

## Features Implemented

*   **User Authentication**: Email/Password and Google Sign-In via Firebase Auth.
*   **Profile Setup**: Initial profile completion for new users (display name, active period).
*   **UPR & Period Management**:
    *   Admin can create, edit, delete UPRs.
    *   Admin can assign users to UPRs.
    *   Users can set their active period and manage available periods.
*   **Goal Management**:
    *   CRUD operations for Goals (Sasaran).
    *   Goals are tied to a specific UPR and Period.
*   **Potential Risk Management**:
    *   CRUD operations for Potential Risks (Potensi Risiko), linked to Goals.
    *   AI-assisted brainstorming for potential risks.
    *   Dedicated page for managing details and causes of a Potential Risk (`/all-risks/manage/[potentialRiskId]`).
    *   Listing of all potential risks across goals (`/all-risks`).
    *   Listing of potential risks specific to a goal (`/risks/[goalId]`).
*   **Risk Cause Management**:
    *   CRUD operations for Risk Causes (Penyebab Risiko), linked to Potential Risks.
    *   AI-assisted brainstorming for risk causes (Fishbone approach).
    *   Inline management of causes on the Potential Risk detail page.
*   **Risk Cause Analysis**:
    *   Dedicated page (`/risk-cause-analysis/[riskCauseId]`) for detailed analysis:
        *   Input KRI (Key Risk Indicator) and Risk Tolerance.
        *   AI-assisted suggestions for KRI and Tolerance.
        *   Input Likelihood and Impact levels.
        *   AI-assisted suggestions for Likelihood and Impact.
        *   Visualization of calculated risk level.
        *   Management of Control Measures for the Risk Cause.
*   **Control Measure Management**:
    *   CRUD operations for Control Measures (Tindakan Pengendalian), linked to Risk Causes.
    *   AI-assisted suggestions for control measures, including KCI and Target.
*   **Risk Analysis Dashboard/Listing**:
    *   Page (`/risk-analysis`) to view all risk causes with their analysis status (KRI, Tolerance, Likelihood, Impact, Level).
    *   Filtering and sorting capabilities.
*   **Risk Priority Dashboard**:
    *   Page (`/risk-priority`) displaying a risk matrix (heatmap) of analyzed risk causes.
    *   List of analyzed risk causes sorted by priority.
*   **Monitoring & Review**:
    *   Creation of Monitoring Sessions, defining name, start/end dates, and selecting Risk Causes to monitor.
    *   Conducting Monitoring Sessions:
        *   Inputting actual KRI realization (exposure value) for each monitored Risk Cause.
        *   Inputting realization of KCI, activity narrative, and supporting documents for each Control Measure under the monitored Risk Causes.
        *   Calculating control performance.
        *   Marking sessions as "Selesai".
    *   Downloading monitoring reports as XLSX.
*   **Comparative Monitoring Analysis**:
    *   Selection of 2-4 completed monitoring sessions.
    *   Analysis page displaying trends for risk exposure (KRI) and control performance for common risk causes across selected sessions using line charts.
*   **Comprehensive Risk Document**:
    *   Selection of a reporting period.
    *   Tree view (hierarchical) of Goals > Potential Risks > Risk Causes > Control Measures.
    *   Placeholder for a flat table view.
*   **Admin Features**:
    *   UPR Management (CRUD).
    *   User Management (view users, assign UPR, assign role).
*   **Theming**: Light/Dark mode support.
*   **Internationalization (i18n)**: Basic setup with `next-intl` for English and Indonesian (though primarily Indonesian text is used in UI).

## Features Currently Under Development

*   **Risk Monitoring Dashboard**: Visualization of risk metrics and control effectiveness over time. This is largely conceptual and needs UI/data aggregation.
*   **Flat Table View for Comprehensive Risk Document**: The UI is a placeholder.
*   **AI-driven insights/observations** in the Comparative Monitoring Analysis page (currently a placeholder).
*   **File Upload for Control Measure Monitoring**: Currently supports URL, actual file upload is future work.

## Planned Features / Future Work

*   More advanced AI insights on the main dashboard.
*   Automated report generation (PDF/Word).
*   Workflow for risk treatment and review.
*   Notifications and alerts.
*   More granular user roles and permissions.
*   Improved image handling beyond placeholders.

## Design Decisions and Constraints

*   **Tech Stack**: Next.js, React, ShadCN UI, Tailwind, Genkit, Firebase (as specified).
*   **Data Ownership**: Data (Goals, Risks, etc.) is primarily owned by a UPR and scoped by a Period. A `userSatker` is typically tied to one UPR. Admins/Auditors can potentially view data across UPRs (this needs careful context management).
*   **State Management**: Zustand is used for global client-side state to reduce prop drilling and manage fetched data.
*   **AI Integration**: Genkit flows are used for specific AI tasks (brainstorming, suggestions). Server Actions act as an intermediary.
*   **UI Styling**: Adherence to style guidelines (calming blue, light gray background, soft green accent, sans-serif font, simple icons). Rounded corners, shadows for professional feel.
*   **Error Handling**: Toast notifications for user feedback. Console errors for debugging.
*   **Data Storage**: Firestore is the primary database. Data is structured hierarchically but also denormalized where necessary for easier querying (e.g., `goalId`, `potentialRiskId` stored in child documents). `uprId` and `period` are key for partitioning data.
*   **User Roles**: `admin`, `auditor`, `userSatker`. Admins have full control. Auditors can view. UserSatker manages their assigned UPR.

## Open Questions / Assumptions

*   **Auditor/Admin Context Switching**: How do admins/auditors select which UPR's data they are viewing/managing? Is this implicitly handled by `AuthContext` and `AppStore` `activeUprId`? The current implementation assumes `AppLayout` and `SettingsPage` (or a future UPR selection mechanism for admins) correctly sets `activeUprId` in the store.
*   **`userId` vs. `uprId` in Firestore Documents**:
    *   **Current Assumption Being Reinforced**: Documents like Goal, PotentialRisk, RiskCause, ControlMeasure have a `uprId` field indicating the UPR owner. They also have a `userId` field indicating the Firebase UID of the user who *created* that specific record.
    *   This distinction is crucial for queries. When fetching data for a UPR, services query `where("uprId", "==", targetUprId)`.
*   **Data Integrity on Deletion**: Cascading deletes are implemented via services (e.g., deleting a Goal also deletes its PotentialRisks, etc.).
*   **Initial Data for New UPRs**: No explicit seeding mechanism for initial data (e.g., default risk categories, likelihood/impact scales if they were dynamic) for a new UPR.
*   **Scalability of Firestore Queries**: Current queries are generally scoped by `uprId` and `period`. Complex cross-UPR reporting might require different data structures or more complex querying/aggregation if not handled client-side.

## Data Structure (Firestore Collections and Key Fields)

*   **`uprs`** (Collection: `UPRS_COLLECTION`)
    *   `id` (doc ID)
    *   `name`: string (Nama UPR)
    *   `code`: string (Kode UPR, e.g., "ITJEN")
    *   `description`: string | null
    *   `riskAppetite`: number | null (1-25)
    *   `createdAt`: Timestamp
    *   `updatedAt`: Timestamp | null

*   **`users`** (Collection: `USERS_COLLECTION`, doc ID is Firebase UID)
    *   `uid`: string (Firebase UID)
    *   `email`: string | null
    *   `displayName`: string | null (Nama Pengguna, bisa juga nama UPR jika userSatker = UPR)
    *   `photoURL`: string | null
    *   `role`: 'admin' | 'auditor' | 'userSatker'
    *   `uprId`: string | null (ID UPR dari collection `uprs` yang di-assign ke userSatker)
    *   `activePeriod`: string | null (e.g., "2024")
    *   `availablePeriods`: string[] | null
    *   `createdAt`: Timestamp
    *   `updatedAt`: Timestamp | null

*   **`goals`** (Collection: `GOALS_COLLECTION`)
    *   `id` (doc ID)
    *   `uprId`: string (FK to `uprs.id`)
    *   `userId`: string (Firebase UID of creator)
    *   `period`: string
    *   `name`: string
    *   `description`: string
    *   `code`: string (e.g., "A1", "B2")
    *   `createdAt`: Timestamp
    *   `updatedAt`: Timestamp | null

*   **`potentialRisks`** (Collection: `POTENTIAL_RISKS_COLLECTION`)
    *   `id` (doc ID)
    *   `uprId`: string (FK to `uprs.id`)
    *   `goalId`: string (FK to `goals.id`)
    *   `userId`: string (Firebase UID of creator)
    *   `period`: string
    *   `sequenceNumber`: number (e.g., 1 for PR1, 2 for PR2 under a goal)
    *   `description`: string
    *   `category`: RiskCategory | null
    *   `owner`: string | null (Nama/Jabatan Pemilik Risiko)
    *   `identifiedAt`: Timestamp
    *   `updatedAt`: Timestamp | null
    *   `goalCode`: string (Denormalized, e.g., "A1") - *Implied by current code, but ensure it's stored if used for display codes like "A1.PR1"*

*   **`riskCauses`** (Collection: `RISK_CAUSES_COLLECTION`)
    *   `id` (doc ID)
    *   `uprId`: string (FK to `uprs.id`)
    *   `potentialRiskId`: string (FK to `potentialRisks.id`)
    *   `goalId`: string (FK to `goals.id`)
    *   `userId`: string (Firebase UID of creator)
    *   `period`: string
    *   `sequenceNumber`: number
    *   `description`: string
    *   `source`: 'Internal' | 'Eksternal'
    *   `keyRiskIndicator`: string | null
    *   `riskTolerance`: string | null
    *   `likelihood`: LikelihoodLevelDesc | null
    *   `impact`: ImpactLevelDesc | null
    *   `createdAt`: Timestamp
    *   `analysisUpdatedAt`: Timestamp | null

*   **`controlMeasures`** (Collection: `CONTROL_MEASURES_COLLECTION`)
    *   `id` (doc ID)
    *   `uprId`: string (FK to `uprs.id`)
    *   `riskCauseId`: string (FK to `riskCauses.id`)
    *   `potentialRiskId`: string (FK to `potentialRisks.id`)
    *   `goalId`: string (FK to `goals.id`)
    *   `userId`: string (Firebase UID of creator)
    *   `period`: string
    *   `controlType`: 'Prv' | 'RM' | 'Crr'
    *   `sequenceNumber`: number (per `riskCauseId` per `controlType`)
    *   `description`: string
    *   `keyControlIndicator`: string | null
    *   `target`: string | null
    *   `responsiblePerson`: string | null
    *   `deadline`: string (ISO date) | null
    *   `budget`: number | null
    *   `createdAt`: Timestamp
    *   `updatedAt`: Timestamp | null

*   **`monitoringSessions`** (Collection: `MONITORING_SESSIONS_COLLECTION`)
    *   `id` (doc ID)
    *   `uprId`: string (UPR yang sesinya ini berlaku untuk)
    *   `userId`: string (Firebase UID pengguna yang membuat sesi ini)
    *   `period`: string (Periode aplikasi saat sesi dibuat, bisa juga periode spesifik sesi)
    *   `name`: string
    *   `startDate`: string (ISO date)
    *   `endDate`: string (ISO date)
    *   `riskCauseIdsToMonitor`: string[] (array of `riskCauses.id`)
    *   `status`: 'Direncanakan' | 'Aktif' | 'Selesai'
    *   `createdAt`: Timestamp
    *   `updatedAt`: Timestamp | null

*   **`riskExposures`** (Collection: `RISK_EXPOSURES_COLLECTION`, doc ID might be `sessionId_riskCauseId`)
    *   `id` (doc ID)
    *   `uprId`: string
    *   `monitoringSessionId`: string (FK to `monitoringSessions.id`)
    *   `riskCauseId`: string (FK to `riskCauses.id`)
    *   `userId`: string (Firebase UID pengguna yang mencatat exposure ini)
    *   `period`: string
    *   `exposureValue`: number | null (Realisasi KRI Penyebab)
    *   `exposureNotes`: string | null
    *   `isToleranceNegative`: boolean | null
    *   `recordedAt`: Timestamp
    *   `updatedAt`: Timestamp | null

*   **`monitoredControlMeasuresData`** (Collection: `MONITORED_CONTROL_MEASURES_DATA_COLLECTION`, doc ID might be `sessionId_riskCauseId_controlMeasureId`)
    *   `id` (doc ID)
    *   `uprId`: string
    *   `monitoringSessionId`: string (FK to `monitoringSessions.id`)
    *   `riskCauseId`: string (FK to `riskCauses.id`)
    *   `controlMeasureId`: string (FK to `controlMeasures.id`)
    *   `userId`: string (Firebase UID pengguna yang mencatat data ini)
    *   `period`: string
    *   `realizationKCI`: string | null
    *   `isTargetNegative`: boolean | null
    *   `controlPerformance`: number | null (%)
    *   `controlActivityNarrative`: string | null
    *   `supportingDocumentUrl`: string | null
    *   `recordedAt`: Timestamp
    *   `updatedAt`: Timestamp | null

## Firebase Rules, Cloud Functions, APIs

*   **Firebase Rules (Firestore)**:
    *   Implicitly, rules would need to allow authenticated users to read/write data based on their role and `uprId`/`userId` context.
    *   Example logic:
        *   `users/{userId}`: allow read/write if `request.auth.uid == userId`. Admins can read all.
        *   `uprs/{uprDocId}`: Admins can CRUD. Authenticated users can read.
        *   `goals/{goalId}`:
            *   Read: if `request.auth.uid` is assigned to `resource.data.uprId` OR `request.auth.token.role == 'admin'/'auditor'`.
            *   Write: if `request.auth.uid == resource.data.userId` (creator) AND `request.auth.uid` is assigned to `resource.data.uprId` OR `request.auth.token.role == 'admin'`.
        *   Similar logic for `potentialRisks`, `riskCauses`, `controlMeasures`, `monitoringSessions` and its sub-collections, ensuring writes are tied to the correct `uprId` and `userId` (creator) and `period`.
        *   Proper indexing is crucial for queries, especially on `uprId`, `period`, and any fields used for ordering.

*   **Cloud Functions**: No explicit Cloud Functions mentioned or implemented yet. They could be used for:
    *   Complex data aggregation for dashboards.
    *   Automated tasks (e.g., sending notifications for overdue controls).
    *   Data validation beyond Firestore rules.
    *   Cascading deletes if client-side batching becomes too complex or hits limits (though current approach is client-side batching).

*   **APIs (Genkit Flows as APIs)**:
    *   `brainstormPotentialRisksAction`: Calls `brainstorm-risks.ts` flow.
    *   `suggestRiskParametersAction`: Calls `suggest-risk-parameters-flow.ts`.
    *   `brainstormRiskCausesAction`: Calls `brainstorm-risk-causes-flow.ts`.
    *   `suggestKriToleranceAction`: Calls `suggest-kri-tolerance-flow.ts`.
    *   `suggestControlMeasuresAction`: Calls `suggest-control-measures-flow.ts`.
    *   These are Server Actions in Next.js, which internally call Genkit flows.

## Other Important Observations

*   **Context Management**: The distinction between `activeUprId` (UPR being viewed/managed) and `activeUserId` (logged-in user) in `useAppStore` is critical, especially for admin/auditor roles. `appUser.uprId` is the UPR a `userSatker` is assigned to.
*   **Data Fetching Strategy**: Centralized in `useAppStore` with `triggerGlobalDataFetch` to load data based on `activeUprId` and `activePeriod`. Sub-fetches are chained (Goals -> PRs -> RCs -> CMs; Goals -> MonitoringSessions).
*   **Sequence Numbers**: Used for Goals, Potential Risks, Risk Causes, Control Measures to generate human-readable codes (e.g., G1, G1.PR1, G1.PR1.PC1). Calculation happens client-side in services/store when adding new items by fetching existing items of the same parent.
*   **Error Propagation**: Errors from Firestore services are generally caught and re-thrown or handled by showing toasts. Store methods also follow this pattern.
*   **Code Generation**: Codes for Goals, PRs, RCs, CMs are generated based on parent codes and sequence numbers.
*   The app uses `useAuth` for user authentication and `useAppStore` for data management. `AppLayout` plays a key role in routing and initializing the data store context based on user auth state and profile completeness.
*   The term `userId` in Firestore documents (Goals, PR, RC, CM) is now consistently treated as the UID of the *creator* of the record, while `uprId` is the ID of the UPR that *owns* the data. This was a point of previous confusion.

This summary should provide a good overview of the project.