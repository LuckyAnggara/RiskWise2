# Contributing Guidelines

Welcome to RiskWise! We appreciate your interest in contributing to our risk management platform. This document provides guidelines and information for contributors.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Standards](#documentation-standards)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)

## 🤝 Code of Conduct

### Our Commitment
We are committed to providing a welcoming and inclusive environment for all contributors, regardless of background, experience level, or identity.

### Expected Behavior
- Be respectful and constructive in all interactions
- Welcome newcomers and help them get started
- Focus on the technical merits of contributions
- Provide helpful and actionable feedback
- Respect different viewpoints and experiences

### Unacceptable Behavior
- Harassment, discrimination, or hostile behavior
- Personal attacks or inflammatory language
- Spam, trolling, or disruptive behavior
- Sharing private information without permission

## 🚀 Getting Started

### Prerequisites
Before contributing, ensure you have:
- Node.js 18+ installed
- Firebase CLI installed and configured
- Git knowledge and GitHub account
- Basic understanding of Next.js, TypeScript, and React

### Initial Setup
1. **Fork the repository**
   ```bash
   # Fork the repo on GitHub, then clone your fork
   git clone https://github.com/YOUR_USERNAME/RiskWise2.git
   cd RiskWise2
   ```

2. **Set up the development environment**
   ```bash
   # Install dependencies
   npm install
   
   # Copy environment template
   cp .env.example .env.local
   
   # Configure environment variables (see SETUP.md)
   ```

3. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

### Repository Structure
```
RiskWise2/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # Reusable UI components
│   ├── services/         # API and Firebase services
│   ├── ai/              # Genkit AI flows
│   └── lib/             # Utilities and types
├── docs/                # Documentation
├── public/              # Static assets
└── tests/               # Test files
```

## 🔄 Development Workflow

### Branch Naming Convention
Use descriptive branch names with prefixes:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Adding or updating tests

Examples:
```
feature/risk-matrix-visualization
fix/authentication-timeout
docs/api-documentation-update
refactor/service-layer-optimization
```

### Commit Message Format
Follow the conventional commit format:
```
type(scope): description

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(risks): add AI-powered risk suggestion modal
fix(auth): resolve token refresh timeout issue
docs(setup): update Firebase configuration steps
refactor(services): optimize Firestore query performance
```

### Development Process
1. **Create feature branch**
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Develop and test locally**
   ```bash
   npm run dev          # Start development server
   npm run typecheck    # Check TypeScript
   npm run lint         # Run linting
   npm run test         # Run tests (if available)
   ```

3. **Commit changes**
   ```bash
   git add .
   git commit -m "feat(component): add new risk analysis modal"
   ```

4. **Push and create pull request**
   ```bash
   git push origin feature/your-feature
   # Create pull request on GitHub
   ```

## 📝 Coding Standards

### TypeScript Guidelines
- **Use strict TypeScript**: Enable strict mode in tsconfig.json
- **Type everything**: Avoid `any` types, use proper interfaces
- **Export types**: Make interfaces and types reusable
- **Use generics**: For flexible, reusable components

```typescript
// ✅ Good - Proper typing
interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  isAdmin?: boolean;
}

function updateUser(id: string, updates: Partial<UserProfile>): Promise<void> {
  // Implementation
}

// ❌ Bad - Any types
function updateUser(id: any, updates: any): any {
  // Implementation
}
```

### Component Standards
- **Functional components**: Use function declarations over arrow functions for components
- **Props interfaces**: Define clear props interfaces
- **Proper imports**: Group and order imports logically

```typescript
// ✅ Good component structure
interface RiskCardProps {
  risk: PotentialRisk;
  onEdit: (risk: PotentialRisk) => void;
  onDelete: (id: string) => void;
  className?: string;
}

export function RiskCard({ risk, onEdit, onDelete, className }: RiskCardProps) {
  const handleEdit = () => onEdit(risk);
  const handleDelete = () => onDelete(risk.id);

  return (
    <Card className={cn("risk-card", className)}>
      {/* Component content */}
    </Card>
  );
}
```

### Service Layer Standards
- **Consistent error handling**: Use standardized error responses
- **Input validation**: Validate all inputs before processing
- **Type safety**: Properly type service responses

```typescript
// ✅ Good service pattern
export async function createGoal(
  goalData: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>,
  uprId: string
): Promise<ServiceResponse<Goal>> {
  try {
    // Validate input
    const validatedData = goalSchema.parse(goalData);
    
    // Process request
    const newGoal = await addGoalToFirestore(validatedData, uprId);
    
    return {
      success: true,
      data: newGoal
    };
  } catch (error) {
    console.error('Error creating goal:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

### Styling Guidelines
- **Tailwind CSS**: Use Tailwind utility classes
- **Component variants**: Use class-variance-authority for component variants
- **Consistent spacing**: Follow the design system spacing scale
- **Responsive design**: Mobile-first approach

```typescript
// ✅ Good styling pattern
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

## 🧪 Testing Guidelines

### Test Structure
```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── __mocks__/     # Mock files
```

### Writing Tests
- **Test behavior, not implementation**: Focus on what the component does
- **Use descriptive test names**: Clearly describe what is being tested
- **Arrange, Act, Assert**: Structure tests clearly

```typescript
// ✅ Good test example
describe('RiskAnalysisModal', () => {
  it('should display risk analysis form when opened', () => {
    // Arrange
    const mockRisk = {
      id: '1',
      title: 'Test Risk',
      description: 'Test Description'
    };

    // Act
    render(
      <RiskAnalysisModal
        open={true}
        risk={mockRisk}
        onSave={jest.fn()}
        onClose={jest.fn()}
      />
    );

    // Assert
    expect(screen.getByText('Risk Analysis')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Test Risk')).toBeInTheDocument();
  });
});
```

### Test Coverage
- Aim for at least 80% code coverage
- Focus on critical business logic
- Test error conditions and edge cases
- Mock external dependencies (Firebase, AI services)

## 📚 Documentation Standards

### Code Documentation
- **JSDoc comments**: Document complex functions and components
- **README updates**: Update relevant documentation when adding features
- **Type documentation**: Include descriptions in TypeScript interfaces

```typescript
/**
 * Generates AI-powered risk suggestions based on goal description
 * @param goalDescription - The description of the goal to analyze
 * @param count - Number of suggestions to generate (default: 5)
 * @returns Promise resolving to array of risk suggestions
 * @throws Error when AI service is unavailable or quota exceeded
 */
export async function generateRiskSuggestions(
  goalDescription: string,
  count: number = 5
): Promise<RiskSuggestion[]> {
  // Implementation
}
```

### Component Documentation
Document props and usage examples:

```typescript
/**
 * Risk priority matrix component for visualizing risk levels
 * 
 * @example
 * ```tsx
 * <RiskPriorityMatrix
 *   risks={riskData}
 *   onRiskClick={handleRiskClick}
 *   showLegend={true}
 * />
 * ```
 */
interface RiskPriorityMatrixProps {
  /** Array of risk causes to display in the matrix */
  risks: RiskCause[];
  /** Callback fired when a risk is clicked */
  onRiskClick: (risk: RiskCause) => void;
  /** Whether to show the risk level legend */
  showLegend?: boolean;
}
```

## 🔍 Pull Request Process

### Before Creating a PR
1. **Sync with main branch**
   ```bash
   git checkout main
   git pull upstream main
   git checkout your-feature-branch
   git rebase main
   ```

2. **Run quality checks**
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   npm run build
   ```

3. **Update documentation** if needed

### PR Template
Use this template for your pull request description:

```markdown
## Description
Brief description of the changes made.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] TypeScript compilation successful

## Screenshots (if applicable)
Add screenshots to help reviewers understand the changes.

## Checklist
- [ ] Code follows project coding standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors or warnings
- [ ] Responsive design tested (if UI changes)
```

### Review Process
1. **Automated checks**: Ensure all CI checks pass
2. **Code review**: Address reviewer feedback promptly
3. **Testing**: Verify the changes work as expected
4. **Documentation**: Ensure documentation is updated
5. **Approval**: Obtain required approvals before merging

### Merge Guidelines
- Use "Squash and merge" for feature branches
- Use descriptive merge commit messages
- Delete feature branches after merging

## 🐛 Issue Guidelines

### Reporting Bugs
Use the bug report template:

```markdown
**Bug Description**
A clear description of what the bug is.

**Steps to Reproduce**
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected Behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment**
- Browser: [e.g. Chrome, Firefox]
- Version: [e.g. 22]
- Device: [e.g. Desktop, Mobile]

**Additional Context**
Any other context about the problem.
```

### Feature Requests
Use the feature request template:

```markdown
**Feature Description**
A clear description of the feature you'd like to see.

**Problem Statement**
What problem does this feature solve?

**Proposed Solution**
Describe your proposed solution.

**Alternatives Considered**
Alternative solutions you've considered.

**Additional Context**
Any other context about the feature request.
```

### Issue Labels
- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements or additions to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention is needed
- `priority: high`: High priority issue
- `type: breaking change`: Breaking change

## 🏆 Recognition

### Contributors
We recognize contributors in several ways:
- GitHub contributor graph
- Release notes acknowledgments
- Special recognition for significant contributions

### Becoming a Maintainer
Regular contributors who demonstrate:
- Consistent high-quality contributions
- Good understanding of the codebase
- Helpful code reviews and community participation
- Commitment to the project's goals

May be invited to become maintainers with additional responsibilities.

## 📞 Getting Help

### Resources
- [Setup Guide](./SETUP.md) - Development environment setup
- [Architecture Guide](./ARCHITECTURE.md) - Understanding the codebase
- [API Documentation](./API.md) - Service layer documentation

### Communication
- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For questions and general discussion
- **Pull Request Comments**: For code-specific questions

### Response Times
- Bug reports: 1-2 days
- Feature requests: 3-5 days
- Pull requests: 2-4 days
- Security issues: Same day

Thank you for contributing to RiskWise! Your contributions help make risk management more accessible and effective for organizations worldwide.