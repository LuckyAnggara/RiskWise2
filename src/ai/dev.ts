
import { config } from 'dotenv';
config();

import '@/ai/flows/brainstorm-risks.ts';
import '@/ai/flows/suggest-risk-parameters-flow.ts';
import '@/ai/flows/brainstorm-risk-causes-flow.ts';
import '@/ai/flows/suggest-kri-tolerance-flow.ts';
import '@/ai/flows/suggest-control-measures-flow.ts'; // Tambahkan flow baru
