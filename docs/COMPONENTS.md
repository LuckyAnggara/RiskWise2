# Component Guide

This guide provides comprehensive documentation for RiskWise UI components, their usage patterns, and best practices.

## 📋 Table of Contents

- [Component Architecture](#component-architecture)
- [Base UI Components](#base-ui-components)
- [Layout Components](#layout-components)
- [Feature Components](#feature-components)
- [Component Patterns](#component-patterns)
- [Styling Guidelines](#styling-guidelines)

## 🏗️ Component Architecture

RiskWise follows a hierarchical component structure:

```
components/
├── ui/                 # Base UI components (Radix UI based)
├── layout/            # Layout and navigation components
├── goals/             # Goal management components
├── risks/             # Risk management components
├── icons.tsx          # Icon definitions
└── theme-provider.tsx # Theme configuration
```

### Design System Principles
- **Consistent**: All components follow the same design patterns
- **Accessible**: Built on Radix UI for accessibility compliance
- **Responsive**: Mobile-first responsive design
- **Composable**: Components can be combined to create complex UIs

## 🧱 Base UI Components

### Button Component
Located: `src/components/ui/button.tsx`

```typescript
import { Button } from "@/components/ui/button";

// Usage examples
<Button variant="default">Primary Action</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Subtle Action</Button>
<Button size="sm">Small Button</Button>
<Button size="lg">Large Button</Button>
<Button disabled>Disabled</Button>
```

**Variants:**
- `default`: Primary blue button
- `destructive`: Red button for dangerous actions
- `outline`: Outlined button for secondary actions
- `secondary`: Muted background button
- `ghost`: No background, text-only button
- `link`: Link-styled button

### Card Component
Located: `src/components/ui/card.tsx`

```typescript
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

<Card>
  <CardHeader>
    <CardTitle>Card Title</CardTitle>
    <CardDescription>Optional description</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Form Components

#### Input
```typescript
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input
    id="email"
    type="email"
    placeholder="Enter your email"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
</div>
```

#### Select
```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

<Select value={value} onValueChange={setValue}>
  <SelectTrigger>
    <SelectValue placeholder="Select an option" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="option1">Option 1</SelectItem>
    <SelectItem value="option2">Option 2</SelectItem>
  </SelectContent>
</Select>
```

#### Textarea
```typescript
import { Textarea } from "@/components/ui/textarea";

<Textarea
  placeholder="Enter description"
  value={description}
  onChange={(e) => setDescription(e.target.value)}
  rows={4}
/>
```

### Dialog Component
```typescript
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

<Dialog>
  <DialogTrigger asChild>
    <Button>Open Dialog</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Dialog Title</DialogTitle>
      <DialogDescription>Dialog description</DialogDescription>
    </DialogHeader>
    <div className="py-4">
      {/* Dialog content */}
    </div>
    <DialogFooter>
      <Button variant="outline">Cancel</Button>
      <Button>Confirm</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Table Component
```typescript
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Name</TableHead>
      <TableHead>Email</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {data.map((item) => (
      <TableRow key={item.id}>
        <TableCell>{item.name}</TableCell>
        <TableCell>{item.email}</TableCell>
        <TableCell>
          <Button size="sm">Edit</Button>
        </TableCell>
      </TableRow>
    ))}
  </TableBody>
</Table>
```

## 🏠 Layout Components

### App Layout
Located: `src/components/layout/app-layout.tsx`

The main application layout with sidebar navigation and header.

```typescript
import { AppLayout } from "@/components/layout/app-layout";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout>
      {children}
    </AppLayout>
  );
}
```

**Features:**
- Responsive sidebar navigation
- User profile menu
- Breadcrumb navigation
- Theme toggle
- UPR and period context display

### Sidebar Navigation
Located: `src/components/layout/sidebar-nav.tsx`

Provides the main navigation structure with role-based menu items.

```typescript
const navigationItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: Home,
    roles: ["user", "admin", "auditor"]
  },
  {
    title: "Goals",
    href: "/goals",
    icon: Target,
    roles: ["user", "admin"]
  }
  // ... more items
];
```

### Page Header
Located: `src/components/ui/page-header.tsx`

Standardized page header component.

```typescript
import { PageHeader } from "@/components/ui/page-header";

<PageHeader
  title="Risk Analysis"
  description="Assess and analyze identified risks"
  action={
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Add Risk
    </Button>
  }
/>
```

## 🎯 Feature Components

### Goal Components

#### Goal Card
Located: `src/components/goals/goal-card.tsx`

Displays a goal with associated risk metrics.

```typescript
import { GoalCard } from "@/components/goals/goal-card";

<GoalCard
  goal={goalData}
  riskCount={5}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onViewRisks={handleViewRisks}
/>
```

#### Add Goal Dialog
Located: `src/components/goals/add-goal-dialog.tsx`

Modal for creating new goals with form validation.

```typescript
import { AddGoalDialog } from "@/components/goals/add-goal-dialog";

<AddGoalDialog
  open={isOpen}
  onOpenChange={setIsOpen}
  onGoalAdded={handleGoalAdded}
/>
```

### Risk Management Components

#### Risk Identification Card
Located: `src/components/risks/risk-identification-card.tsx`

Card component for displaying potential risks.

```typescript
import { RiskIdentificationCard } from "@/components/risks/risk-identification-card";

<RiskIdentificationCard
  risk={riskData}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onAnalyze={handleAnalyze}
/>
```

#### Risk Analysis Modal
Located: `src/components/risks/risk-analysis-modal.tsx`

Modal for conducting risk analysis with likelihood/impact assessment.

```typescript
import { RiskAnalysisModal } from "@/components/risks/risk-analysis-modal";

<RiskAnalysisModal
  open={isOpen}
  onOpenChange={setIsOpen}
  riskCause={selectedCause}
  onAnalysisComplete={handleComplete}
/>
```

#### Risk Priority Matrix
Located: `src/components/risks/risk-priority-matrix.tsx`

Interactive risk matrix visualization.

```typescript
import { RiskPriorityMatrix } from "@/components/risks/risk-priority-matrix";

<RiskPriorityMatrix
  riskCauses={riskCauses}
  onRiskClick={handleRiskClick}
  showLegend={true}
/>
```

#### Control Measure Modal
Located: `src/components/risks/risk-control-modal.tsx`

Modal for managing control measures.

```typescript
import { RiskControlModal } from "@/components/risks/risk-control-modal";

<RiskControlModal
  open={isOpen}
  onOpenChange={setIsOpen}
  riskCause={selectedCause}
  onControlAdded={handleControlAdded}
/>
```

### AI-Powered Components

#### Brainstorm Suggestions Modal
Located: `src/components/risks/brainstorm-suggestions-modal.tsx`

Modal for displaying AI-generated risk suggestions.

```typescript
import { BrainstormSuggestionsModal } from "@/components/risks/brainstorm-suggestions-modal";

<BrainstormSuggestionsModal
  open={isOpen}
  onOpenChange={setIsOpen}
  goalDescription="Increase revenue by 15%"
  onSuggestionsAccepted={handleAcceptSuggestions}
/>
```

#### Control Measure AI Suggestions
Located: `src/components/risks/control-measure-ai-suggestions-modal.tsx`

AI-powered control measure recommendations.

```typescript
import { ControlMeasureAISuggestionsModal } from "@/components/risks/control-measure-ai-suggestions-modal";

<ControlMeasureAISuggestionsModal
  open={isOpen}
  onOpenChange={setIsOpen}
  riskCause={selectedCause}
  onSuggestionsApplied={handleApply}
/>
```

## 🔄 Component Patterns

### Form Handling Pattern
RiskWise uses React Hook Form with Zod validation:

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(10, "Description must be at least 10 characters")
});

type FormData = z.infer<typeof schema>;

function MyForm() {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: ""
    }
  });

  const onSubmit = async (data: FormData) => {
    try {
      // Handle form submission
      await submitData(data);
    } catch (error) {
      console.error("Submission failed:", error);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <div className="space-y-4">
        <div>
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            {...form.register("title")}
          />
          {form.formState.errors.title && (
            <p className="text-sm text-destructive">
              {form.formState.errors.title.message}
            </p>
          )}
        </div>
        {/* More fields */}
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
```

### Loading State Pattern
```typescript
function DataComponent() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const result = await fetchData();
        setData(result);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive">{error}</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return <div>{/* Render data */}</div>;
}
```

### Modal State Pattern
```typescript
function ComponentWithModal() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const handleOpenModal = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  return (
    <div>
      <Button onClick={() => handleOpenModal(item)}>
        Open Modal
      </Button>
      
      <MyModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        item={selectedItem}
        onComplete={handleCloseModal}
      />
    </div>
  );
}
```

## 🎨 Styling Guidelines

### Tailwind CSS Classes
RiskWise uses a consistent set of Tailwind utility classes:

#### Spacing
```css
/* Consistent spacing scale */
.space-y-2  /* 0.5rem vertical spacing */
.space-y-4  /* 1rem vertical spacing */
.space-y-6  /* 1.5rem vertical spacing */
.p-4        /* 1rem padding */
.px-6       /* 1.5rem horizontal padding */
.mb-8       /* 2rem bottom margin */
```

#### Colors
```css
/* Primary colors */
.text-primary       /* Main blue color */
.bg-primary         /* Primary background */
.border-primary     /* Primary border */

/* Status colors */
.text-destructive   /* Red for errors/danger */
.text-muted-foreground /* Muted text */
.bg-secondary       /* Secondary background */

/* Custom risk level colors */
.bg-risk-very-low   /* Very low risk (green) */
.bg-risk-low        /* Low risk (light green) */
.bg-risk-medium     /* Medium risk (yellow) */
.bg-risk-high       /* High risk (orange) */
.bg-risk-very-high  /* Very high risk (red) */
```

#### Layout
```css
/* Grid layouts */
.grid-cols-1        /* Single column */
.md:grid-cols-2     /* Two columns on medium screens */
.lg:grid-cols-3     /* Three columns on large screens */

/* Flexbox */
.flex .items-center .justify-between  /* Common flex pattern */
.flex .flex-col .space-y-4           /* Vertical flex layout */
```

### Component Styling Patterns

#### Card Layouts
```typescript
<Card className="hover:shadow-md transition-shadow">
  <CardHeader className="pb-3">
    <div className="flex items-center justify-between">
      <CardTitle className="text-lg">{title}</CardTitle>
      <Badge variant="secondary">{status}</Badge>
    </div>
  </CardHeader>
  <CardContent className="space-y-3">
    {/* Content */}
  </CardContent>
</Card>
```

#### Form Layouts
```typescript
<div className="space-y-6">
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input {...props} />
    </div>
  </div>
  <div className="flex justify-end space-x-2">
    <Button variant="outline">Cancel</Button>
    <Button type="submit">Save</Button>
  </div>
</div>
```

#### Responsive Patterns
```typescript
// Mobile-first responsive design
<div className="
  flex flex-col space-y-4
  md:flex-row md:space-y-0 md:space-x-4
  lg:space-x-6
">
  {/* Content adapts to screen size */}
</div>
```

### Theme Configuration
The application uses CSS custom properties for theming:

```css
:root {
  --primary: 221 83% 53%;
  --primary-foreground: 210 40% 98%;
  --secondary: 210 40% 96%;
  --muted: 210 40% 96%;
  --accent: 210 40% 96%;
  --destructive: 0 84% 60%;
  /* ... more variables */
}
```

### Accessibility Guidelines
- Use semantic HTML elements
- Provide proper ARIA labels
- Ensure sufficient color contrast
- Support keyboard navigation
- Include screen reader friendly text

```typescript
<Button
  aria-label="Delete risk"
  className="sr-only:not-sr-only"
>
  <Trash2 className="h-4 w-4" />
  <span className="sr-only">Delete</span>
</Button>
```

This component guide provides a comprehensive overview of RiskWise's component architecture and usage patterns, enabling developers to build consistent and accessible user interfaces.