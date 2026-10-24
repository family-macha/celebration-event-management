import { createPlanHandler } from '@/lib/server/planHandler';
import { getPlanHandlerDeps } from '@/lib/server/container';

// Node runtime: the Gemini SDK and `node:net` are not available on the edge.
export const runtime = 'nodejs';
// Responses depend on today's date and on the request, so never cache or prerender.
export const dynamic = 'force-dynamic';

export const POST = createPlanHandler(getPlanHandlerDeps);
