
'use server';
/**
 * @fileOverview A Genkit flow to suggest control measures for a given risk cause.
 *
 * - suggestControlMeasuresFlow - A function that provides AI-driven suggestions for control measures.
 * - SuggestControlMeasuresInput - Input type for the flow.
 * - SuggestControlMeasuresOutput - Output type for the flow.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import type { ControlMeasureTypeKey, LikelihoodLevelDesc, ImpactLevelDesc, CalculatedRiskLevelCategory } from '@/lib/types';
import { CONTROL_MEASURE_TYPE_KEYS, LIKELIHOOD_LEVELS_DESC, IMPACT_LEVELS_DESC } from '@/lib/types'; // Assuming CalculatedRiskLevelCategory is also in types or derived

// Schema definitions
const SuggestControlMeasuresInputSchema = z.object({
  riskCauseDescription: z.string().describe('Deskripsi penyebab risiko yang memerlukan tindakan pengendalian.'),
  parentPotentialRiskDescription: z.string().describe('Deskripsi potensi risiko induk dari penyebab ini.'),
  grandParentGoalDescription: z.string().describe('Deskripsi sasaran terkait untuk konteks keseluruhan.'),
  riskCauseLevelText: z.custom<CalculatedRiskLevelCategory | 'N/A'>().describe('Tingkat risiko yang telah dihitung untuk penyebab risiko ini (misalnya, Tinggi, Sedang, N/A).'),
  riskCauseLikelihood: z.custom<LikelihoodLevelDesc>().nullable().describe(`Level kemungkinan penyebab risiko (dari: ${LIKELIHOOD_LEVELS_DESC.join(', ')}).`),
  riskCauseImpact: z.custom<ImpactLevelDesc>().nullable().describe(`Level dampak penyebab risiko (dari: ${IMPACT_LEVELS_DESC.join(', ')}).`),
});
export type SuggestControlMeasuresInput = z.infer<typeof SuggestControlMeasuresInputSchema>;

const AISuggestedControlMeasureSchema = z.object({
  description: z.string().describe('Deskripsi tindakan pengendalian yang disarankan dalam Bahasa Indonesia.'),
  suggestedControlType: z.custom<ControlMeasureTypeKey>().describe(`Tipe kontrol yang disarankan dari daftar: ${CONTROL_MEASURE_TYPE_KEYS.join(', ')} (Prv, RM, Crr).`),
  justification: z.string().describe('Alasan atau justifikasi mengapa pengendalian ini disarankan, dalam Bahasa Indonesia.'),
});
export type AISuggestedControlMeasure = z.infer<typeof AISuggestedControlMeasureSchema>;

const SuggestControlMeasuresOutputSchema = z.object({
  suggestedControls: z.array(AISuggestedControlMeasureSchema).describe('Daftar (hingga 3) saran tindakan pengendalian yang spesifik dan dapat diimplementasikan.'),
});
export type SuggestControlMeasuresOutput = z.infer<typeof SuggestControlMeasuresOutputSchema>;

// Exported function
export async function suggestControlMeasures(
  input: SuggestControlMeasuresInput
): Promise<SuggestControlMeasuresOutput> {
  return suggestControlMeasuresFlow(input);
}

// Prompt definition
const prompt = ai.definePrompt({
  name: 'suggestControlMeasuresPrompt',
  input: { schema: SuggestControlMeasuresInputSchema },
  output: { schema: SuggestControlMeasuresOutputSchema },
  prompt: (input: SuggestControlMeasuresInput) => {
    let guidance = `
Anda adalah seorang ahli manajemen risiko. Tugas Anda adalah menyarankan hingga 3 tindakan pengendalian (control measures) yang spesifik, relevan, dan dapat diimplementasikan untuk sebuah penyebab risiko, berdasarkan konteks yang diberikan.
Untuk setiap saran, berikan deskripsi tindakan, tipe kontrol yang paling sesuai (Preventif (Prv), Mitigasi Risiko (RM), atau Korektif (Crr)), dan justifikasi singkat mengapa tindakan tersebut disarankan. Pastikan semua output dalam Bahasa Indonesia.

Konteks Penyebab Risiko:
- Deskripsi Penyebab Risiko: "${input.riskCauseDescription}"
- Deskripsi Potensi Risiko Induk: "${input.parentPotentialRiskDescription}"
- Deskripsi Sasaran Terkait: "${input.grandParentGoalDescription}"
- Tingkat Risiko Penyebab Saat Ini: "${input.riskCauseLevelText}"
- Kemungkinan Penyebab: "${input.riskCauseLikelihood || 'Belum dianalisis'}"
- Dampak Penyebab: "${input.riskCauseImpact || 'Belum dianalisis'}"

Panduan Umum Tipe Kontrol Berdasarkan Tingkat Risiko Penyebab:
- Jika Tingkat Risiko "Sangat Tinggi" atau "Tinggi": Fokus pada kombinasi Preventif (Prv), Mitigasi Risiko (RM), dan Korektif (Crr).
- Jika Tingkat Risiko "Sedang": Fokus pada Preventif (Prv) dan Mitigasi Risiko (RM).
- Jika Tingkat Risiko "Rendah" atau "Sangat Rendah": Fokus pada Preventif (Prv).
- Jika Tingkat Risiko "N/A" atau Kemungkinan/Dampak belum dianalisis: Berikan saran umum atau sarankan untuk melengkapi analisis terlebih dahulu.

Contoh Saran:
- Deskripsi: "Melakukan pelatihan reguler terkait kebijakan X untuk semua staf terkait."
- Tipe Kontrol: "Prv"
- Justifikasi: "Pelatihan akan meningkatkan pemahaman dan kesadaran staf, mencegah terjadinya ketidakpatuhan akibat kurangnya pengetahuan."

Harap hasilkan output dalam format JSON yang sesuai dengan skema output yang diberikan. Berikan hingga 3 saran yang berbeda.
Pastikan semua nilai string, termasuk deskripsi, tipe, dan justifikasi, dalam Bahasa Indonesia.
    `;
    return guidance;
  },
});

// Flow definition
const suggestControlMeasuresFlow = ai.defineFlow(
  {
    name: 'suggestControlMeasuresFlow',
    inputSchema: SuggestControlMeasuresInputSchema,
    outputSchema: SuggestControlMeasuresOutputSchema,
  },
  async (input) => {
    const llmResponse = await prompt(input);
    const output = llmResponse.output;

    if (!output || !Array.isArray(output.suggestedControls)) {
      console.warn("[suggestControlMeasuresFlow] AI output for control measures was not in the expected format or was null/undefined.");
      return { suggestedControls: [] };
    }
    
    // Validate control types
    const validatedControls = output.suggestedControls.map(control => ({
      ...control,
      suggestedControlType: CONTROL_MEASURE_TYPE_KEYS.includes(control.suggestedControlType as ControlMeasureTypeKey) ? control.suggestedControlType : 'Prv', // Default to Prv if invalid
    }));

    return { suggestedControls: validatedControls.slice(0, 3) }; // Ensure max 3 suggestions
  }
);
