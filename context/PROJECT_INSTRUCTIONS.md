
# AI Project Context Management Instructions

This document outlines the procedures for managing and utilizing project context files (`PROJECT_CONTEXT_HISTORY.md` and `PROJECT_PROGRESS.md`) to ensure consistent and informed assistance.

## 🔁 When to Update Context Files

Context files **must** be updated in the following situations:

- **After completing a major task or feature implementation**: Reflect the changes in functionality and status.
- **After a significant design decision or architectural change is made**: Document the rationale and the change itself.
- **After a major discussion leading to changes in scope, requirements, or priorities**: Capture the new understanding.
- **When new information is provided by the user that alters the project's state or goals**: Integrate this new knowledge.
- **When an error is fixed or a significant refactor is completed**: Note the resolution and any implications.

## 📄 How to Update Context Files

### `PROJECT_CONTEXT_HISTORY.md`
- **Append new relevant information**: Add new sections or update existing ones to reflect the latest understanding of the project. Be specific about what was changed, decided, or implemented.
- **Maintain structure**: Ensure the document remains well-organized and easy to parse.
- **Be comprehensive but concise**: Include all critical details without unnecessary verbosity.
- **Log AI-driven changes**: If I (the AI) make significant architectural suggestions that are accepted, or implement complex logic, briefly note this in a relevant section (e.g., "Design Decisions" or "Features Implemented").

### `PROJECT_PROGRESS.md`
- **Move items**: When a task's status changes, move it from one section (e.g., `WORKING`) to another (e.g., `DONE` or `NEXT`).
- **Add new items**: If new tasks are identified, add them to the `NEXT` or `WORKING` section as appropriate.
- **Keep it current**: This file should be an accurate snapshot of the project's current development status.
- **Clarity**: Use clear and concise task descriptions.

### General Guidelines for Both Files
- **Avoid duplication**: If information is better suited for one file, don't repeat it extensively in the other. Cross-reference if necessary.
- **Remove outdated information**: If a decision is superseded or a feature is removed, update the context to reflect this, rather than just appending.
- **Tidiness**: Ensure both files remain readable and well-formatted.

## 📌 Startup Routine

Before providing any substantive response in a new session, **always** perform the following steps:

1.  **Load and Parse `PROJECT_CONTEXT_HISTORY.md`**: Thoroughly read and internalize the entire content. This file contains the deep historical and architectural knowledge of the project.
2.  **Load and Review `PROJECT_PROGRESS.md`**: Understand the current status of tasks – what's done, what's in progress, and what's planned.
3.  **Synthesize Context**: Combine the information from both files to form a comprehensive understanding of the project's current state, history, and trajectory.
4.  **Inform Responses**: All subsequent advice, code suggestions, planning, and discussions **must** be informed by this synthesized context.
5.  **Verify Context**: If the context files seem missing, incomplete, or potentially outdated based on the user's initial prompt, politely ask the user to clarify or request an update to the context files before proceeding with complex tasks.

## ⚠️ Important Commands (Internal AI Directives)

- `ALWAYS read context/*.md files before starting any session or providing significant responses.`
- `NEVER assume project status, features, or architecture without first consulting PROJECT_CONTEXT_HISTORY.md and PROJECT_PROGRESS.md.`
- `PROACTIVELY update context files (PROJECT_CONTEXT_HISTORY.md and PROJECT_PROGRESS.md) whenever a significant change occurs as defined in the "When to Update" section.`
- `LOG significant changes or decisions made during the interaction, or features implemented by you (the AI), in PROJECT_CONTEXT_HISTORY.md before ending the session or when the change is established.`
- `If the user provides new contextual information or a direct update to the project's state, INTEGRATE and PERSIST this information into the relevant context files immediately or at the earliest appropriate juncture.`
- `MAINTAIN the integrity and accuracy of the context files as a primary responsibility.`
- `REQUEST clarification if the user's request seems to conflict with the established context, before making potentially incorrect changes.`
