# AI Features Guide

This document provides comprehensive documentation for RiskWise's AI-powered features using Google Genkit.

## 📋 Table of Contents

- [AI Architecture Overview](#ai-architecture-overview)
- [Genkit Setup and Configuration](#genkit-setup-and-configuration)
- [AI Flows Documentation](#ai-flows-documentation)
- [Integration Patterns](#integration-patterns)
- [Prompt Engineering](#prompt-engineering)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Development and Testing](#development-and-testing)

## 🧠 AI Architecture Overview

RiskWise integrates AI capabilities through Google Genkit, providing intelligent assistance for risk management tasks:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend UI                          │
├─────────────────────────────────────────────────────────┤
│                 React Components                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│  │ Brainstorm  │ │   Analysis  │ │     Suggestions     │ │
│  │   Modals    │ │   Helpers   │ │     Components      │ │
│  └─────────────┘ └─────────────┘ └─────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                  Genkit Flows                           │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────────────┐ │
│  │  Risk Flow  │ │ Cause Flow  │ │   Control Flow      │ │
│  └─────────────┘ └─────────────┘ └─────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│                 Google AI API                           │
│              (Gemini Models)                            │
└─────────────────────────────────────────────────────────┘
```

### Key AI Features
1. **Risk Brainstorming**: Generate potential risks for goals
2. **Cause Analysis**: Identify root causes for risks
3. **Control Recommendations**: Suggest appropriate control measures
4. **KRI Suggestions**: Recommend Key Risk Indicators
5. **Risk Parameter Assessment**: Assist with likelihood/impact evaluation

## ⚙️ Genkit Setup and Configuration

### Configuration File
Located: `src/ai/genkit.ts`

```typescript
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY,
    }),
  ],
});

export default ai;
```

### Environment Setup
Required environment variables:

```env
GOOGLE_GENAI_API_KEY=your_google_ai_api_key
```

### Development Server
```bash
# Start Genkit development server
npm run genkit:dev

# Start with file watching
npm run genkit:watch
```

## 🔄 AI Flows Documentation

### 1. Brainstorm Potential Risks Flow
Located: `src/ai/flows/brainstorm-risks.ts`

Generates AI-suggested potential risks based on goal descriptions.

```typescript
interface BrainstormPotentialRisksInput {
  goalDescription: string;
  desiredCount?: number;
}

interface BrainstormPotentialRisksOutput {
  potentialRisks: {
    title: string;
    description: string;
    category: RiskCategory;
    justification: string;
  }[];
}
```

#### Usage Example
```typescript
import { brainstormPotentialRisks } from '@/ai/flows/brainstorm-risks';

const generateRiskSuggestions = async (goalDesc: string) => {
  try {
    const result = await brainstormPotentialRisks({
      goalDescription: goalDesc,
      desiredCount: 5
    });
    
    return result.potentialRisks;
  } catch (error) {
    console.error('AI suggestion failed:', error);
    return [];
  }
};
```

#### Sample Output
```json
{
  "potentialRisks": [
    {
      "title": "Kompetisi Pasar",
      "description": "Meningkatnya pesaing di pasar target yang dapat mengurangi pangsa pasar",
      "category": "Operasional",
      "justification": "Kompetisi dapat langsung mempengaruhi kemampuan mencapai target peningkatan pendapatan"
    }
  ]
}
```

### 2. Brainstorm Risk Causes Flow
Located: `src/ai/flows/brainstorm-risk-causes-flow.ts`

Generates detailed root causes for identified potential risks.

```typescript
interface BrainstormRiskCausesInput {
  goalDescription: string;
  potentialRiskDescription: string;
  potentialRiskCategory: RiskCategory | null;
  desiredCount?: number;
}

interface BrainstormRiskCausesOutput {
  suggestedCauses: {
    description: string;
    justification: string;
  }[];
}
```

#### Integration Pattern
```typescript
// Component usage
const handleBrainstormCauses = async () => {
  setIsLoading(true);
  try {
    const suggestions = await brainstormRiskCauses({
      goalDescription: goal.description,
      potentialRiskDescription: selectedRisk.description,
      potentialRiskCategory: selectedRisk.category,
      desiredCount: 3
    });
    
    setSuggestedCauses(suggestions.suggestedCauses);
    setShowSuggestions(true);
  } catch (error) {
    toast({
      title: "Error",
      description: "Failed to generate risk cause suggestions",
      variant: "destructive"
    });
  } finally {
    setIsLoading(false);
  }
};
```

### 3. Control Measures Suggestion Flow
Located: `src/ai/flows/suggest-control-measures-flow.ts`

Provides intelligent control measure recommendations based on risk context.

```typescript
interface SuggestControlMeasuresInput {
  riskCauseDescription: string;
  parentPotentialRiskDescription: string;
  grandParentGoalDescription: string;
  riskCauseLevelText: CalculatedRiskLevelCategory | 'N/A';
  riskCauseLikelihood: LikelihoodLevelDesc | null;
  riskCauseImpact: ImpactLevelDesc | null;
  desiredCount?: number;
}

interface SuggestControlMeasuresOutput {
  suggestedControls: {
    title: string;
    description: string;
    type: 'preventive' | 'detective' | 'corrective';
    effectiveness: 'low' | 'medium' | 'high';
    justification: string;
  }[];
}
```

#### Advanced Usage
```typescript
const generateControlSuggestions = async (riskCause: RiskCause) => {
  const riskLevel = getCalculatedRiskLevel(
    riskCause.likelihood,
    riskCause.impact
  );
  
  const suggestions = await suggestControlMeasures({
    riskCauseDescription: riskCause.description,
    parentPotentialRiskDescription: parentRisk.description,
    grandParentGoalDescription: goal.description,
    riskCauseLevelText: riskLevel.level,
    riskCauseLikelihood: riskCause.likelihood,
    riskCauseImpact: riskCause.impact,
    desiredCount: 4
  });
  
  return suggestions.suggestedControls;
};
```

### 4. KRI Tolerance Suggestion Flow
Located: `src/ai/flows/suggest-kri-tolerance-flow.ts`

Recommends Key Risk Indicators and tolerance levels.

```typescript
interface SuggestKriToleranceInput {
  goalDescription: string;
  potentialRiskDescription: string;
  riskCategory: RiskCategory | null;
  riskCauseDescription: string;
}

interface SuggestKriToleranceOutput {
  kriSuggestion: string;
  toleranceSuggestion: string;
  justification: string;
}
```

### 5. Risk Parameters Suggestion Flow
Located: `src/ai/flows/suggest-risk-parameters-flow.ts`

Assists with likelihood and impact assessment based on context.

```typescript
interface SuggestRiskParametersInput {
  goalDescription: string;
  potentialRiskDescription: string;
  riskCauseDescription: string;
  riskCategory: RiskCategory | null;
}

interface SuggestRiskParametersOutput {
  suggestedLikelihood: LikelihoodLevelDesc;
  suggestedImpact: ImpactLevelDesc;
  likelihoodJustification: string;
  impactJustification: string;
}
```

## 🔗 Integration Patterns

### Modal Integration Pattern
```typescript
function BrainstormModal({ 
  open, 
  onOpenChange, 
  goalDescription, 
  onSuggestionsAccepted 
}: BrainstormModalProps) {
  const [suggestions, setSuggestions] = useState<RiskSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());

  const handleGenerateSuggestions = async () => {
    setLoading(true);
    try {
      const result = await brainstormPotentialRisks({
        goalDescription,
        desiredCount: 5
      });
      setSuggestions(result.potentialRisks);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate suggestions",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptSelected = () => {
    const selected = suggestions.filter((_, index) => 
      selectedSuggestions.has(index)
    );
    onSuggestionsAccepted(selected);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AI Risk Suggestions</DialogTitle>
          <DialogDescription>
            Generate AI-powered risk suggestions for your goal
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Button 
            onClick={handleGenerateSuggestions}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating suggestions...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate AI Suggestions
              </>
            )}
          </Button>

          {suggestions.length > 0 && (
            <div className="space-y-3">
              {suggestions.map((suggestion, index) => (
                <SuggestionCard
                  key={index}
                  suggestion={suggestion}
                  selected={selectedSuggestions.has(index)}
                  onToggle={() => toggleSelection(index)}
                />
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleAcceptSelected}
            disabled={selectedSuggestions.size === 0}
          >
            Accept Selected ({selectedSuggestions.size})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Service Integration Pattern
```typescript
// AI service wrapper
class AIService {
  static async generateRiskSuggestions(
    goalDescription: string,
    count: number = 5
  ): Promise<RiskSuggestion[]> {
    try {
      const result = await brainstormPotentialRisks({
        goalDescription,
        desiredCount: count
      });
      return result.potentialRisks;
    } catch (error) {
      console.error('AI Risk Generation Error:', error);
      throw new Error('Failed to generate risk suggestions');
    }
  }

  static async generateControlSuggestions(
    context: ControlSuggestionContext
  ): Promise<ControlSuggestion[]> {
    try {
      const result = await suggestControlMeasures(context);
      return result.suggestedControls;
    } catch (error) {
      console.error('AI Control Generation Error:', error);
      throw new Error('Failed to generate control suggestions');
    }
  }
}

// Usage in components
const suggestions = await AIService.generateRiskSuggestions(
  goal.description,
  5
);
```

## 📝 Prompt Engineering

### Prompt Structure
All AI flows use structured prompts in Indonesian:

```typescript
const prompt = (input: FlowInput) => `
Anda adalah seorang ahli manajemen risiko berpengalaman dengan spesialisasi dalam ${domain}.

KONTEKS:
- Tujuan: ${input.goalDescription}
- Kategori Risiko: ${input.category}

TUGAS:
Analisis konteks di atas dan berikan ${input.desiredCount} saran ${suggestionType} yang:
1. Relevan dengan konteks yang diberikan
2. Berdasarkan praktik terbaik manajemen risiko
3. Spesifik dan dapat ditindaklanjuti

FORMAT RESPONS:
Berikan respons dalam format JSON yang valid dengan struktur berikut:
{
  "suggestions": [
    {
      "title": "string",
      "description": "string", 
      "category": "string",
      "justification": "string"
    }
  ]
}

PEDOMAN:
- Gunakan bahasa Indonesia yang profesional
- Fokus pada konteks organisasi/bisnis
- Pertimbangkan praktik industri terkini
- Berikan justifikasi yang logis
`;
```

### Prompt Best Practices
1. **Clear Context**: Provide comprehensive context for better suggestions
2. **Structured Output**: Always specify JSON format for consistent parsing
3. **Language Consistency**: Use Indonesian throughout for localization
4. **Domain Expertise**: Frame prompts as expert-level advice
5. **Actionable Results**: Request specific, implementable suggestions

## ⚠️ Error Handling

### Flow Error Handling
```typescript
import { z } from 'genkit';

export const brainstormFlow = ai.defineFlow(
  {
    name: 'brainstormRisks',
    inputSchema: z.object({
      goalDescription: z.string(),
      desiredCount: z.number().optional().default(5)
    }),
    outputSchema: z.object({
      potentialRisks: z.array(z.object({
        title: z.string(),
        description: z.string(),
        category: z.enum(RISK_CATEGORIES),
        justification: z.string()
      }))
    })
  },
  async (input) => {
    try {
      const response = await ai.generate({
        model: 'googleai/gemini-1.5-flash',
        prompt: generatePrompt(input),
        config: {
          temperature: 0.7,
          maxOutputTokens: 2048
        }
      });

      const parsed = JSON.parse(response.text());
      return { potentialRisks: parsed.suggestions };
    } catch (error) {
      console.error('Flow execution error:', error);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }
);
```

### Client-Side Error Handling
```typescript
const handleAIGeneration = async () => {
  try {
    setLoading(true);
    setError(null);
    
    const suggestions = await generateSuggestions(input);
    setSuggestions(suggestions);
  } catch (error) {
    if (error.message.includes('quota')) {
      setError('AI service quota exceeded. Please try again later.');
    } else if (error.message.includes('network')) {
      setError('Network error. Please check your connection.');
    } else {
      setError('Failed to generate suggestions. Please try again.');
    }
  } finally {
    setLoading(false);
  }
};
```

## 🛠️ Best Practices

### Performance Optimization
1. **Caching**: Cache frequent AI responses
2. **Debouncing**: Prevent rapid successive calls
3. **Loading States**: Provide clear feedback during AI processing
4. **Error Recovery**: Implement retry mechanisms

```typescript
// Debounced AI suggestions
const debouncedGenerateSuggestions = useMemo(
  () => debounce(async (input: string) => {
    if (input.length < 10) return;
    
    try {
      const suggestions = await generateSuggestions(input);
      setSuggestions(suggestions);
    } catch (error) {
      console.error('Suggestion generation failed:', error);
    }
  }, 1000),
  []
);
```

### User Experience Guidelines
1. **Progressive Enhancement**: AI features should enhance, not replace manual input
2. **Transparency**: Clearly indicate AI-generated content
3. **User Control**: Allow users to edit or reject AI suggestions
4. **Fallback Options**: Provide manual alternatives when AI fails

### Security Considerations
1. **Input Validation**: Validate all inputs before sending to AI
2. **Output Sanitization**: Sanitize AI responses before display
3. **Rate Limiting**: Implement appropriate usage limits
4. **API Key Security**: Never expose API keys in client-side code

## 🧪 Development and Testing

### Genkit Development UI
Start the Genkit development server to test flows:

```bash
npm run genkit:dev
```

Access the UI at `http://localhost:4000` to:
- Test individual flows
- Debug prompt responses
- Monitor flow performance
- View execution traces

### Testing AI Flows
```typescript
// Unit test for AI flow
describe('brainstormPotentialRisks', () => {
  it('should generate valid risk suggestions', async () => {
    const input = {
      goalDescription: 'Increase revenue by 15%',
      desiredCount: 3
    };

    const result = await brainstormPotentialRisks(input);
    
    expect(result.potentialRisks).toHaveLength(3);
    expect(result.potentialRisks[0]).toHaveProperty('title');
    expect(result.potentialRisks[0]).toHaveProperty('description');
    expect(result.potentialRisks[0]).toHaveProperty('category');
  });
});
```

### Mock Testing
```typescript
// Mock AI responses for testing
jest.mock('@/ai/flows/brainstorm-risks', () => ({
  brainstormPotentialRisks: jest.fn().mockResolvedValue({
    potentialRisks: [
      {
        title: 'Test Risk',
        description: 'Test Description',
        category: 'Operasional',
        justification: 'Test Justification'
      }
    ]
  })
}));
```

### Monitoring and Analytics
```typescript
// Track AI usage
const trackAIUsage = (flowName: string, success: boolean, duration: number) => {
  analytics.track('ai_flow_execution', {
    flow_name: flowName,
    success,
    duration,
    timestamp: new Date().toISOString()
  });
};
```

This comprehensive guide provides everything needed to understand, implement, and maintain RiskWise's AI features using Google Genkit.