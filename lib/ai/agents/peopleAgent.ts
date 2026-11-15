import { z } from "zod";
import { ModelRouter } from "../modelRouter";
import {
  GoalIntent,
  CandidateProfile,
  MarketIntelligenceOutput,
  TrajectoryCaseStudy,
  TrajectoryCaseStudySchema,
  CareerRouteItem,
  CareerRouteSchema,
  TrajectoryStageItem,
  TrajectoryStageSchema,
  TrajectoryPatternItem,
  RecurringPatternSchema,
  SourceReference,
} from "@/types";

export interface RunPeopleAgentParams {
  goalIntent: GoalIntent;
  candidateProfile: CandidateProfile;
  marketIntelligence: MarketIntelligenceOutput;
}

export const PeopleAgentOutputSchema = z.object({
  summary: z.string().default("Analysis of authentic career progression trajectories and case studies."),
  routes: z.array(CareerRouteSchema).default([]),
  stages: z.array(TrajectoryStageSchema).default([]),
  patterns: z.array(RecurringPatternSchema).default([]),
  caseStudies: z.array(TrajectoryCaseStudySchema).default([]),
});
export type PeopleAgentOutput = z.infer<typeof PeopleAgentOutputSchema>;

/**
 * People & Trajectory Intelligence Agent:
 * Mined real-world career trajectories and case studies strictly relevant to the user's specific goal.
 * 
 * CORE PRINCIPLE: People are CASE STUDIES, not celebrity role models.
 * - Extracts transferable vs non-transferable aspects.
 * - Identifies starting points, early skills, first opportunities, and transition catalysts.
 * - Enforces relevance threshold. Zero famous-person forcing.
 */
export async function runPeopleAgent({
  goalIntent,
  candidateProfile,
  marketIntelligence,
}: RunPeopleAgentParams): Promise<PeopleAgentOutput> {
  const targetRole = goalIntent.standardizedGoal || candidateProfile.targetRole;
  const domainLabel = goalIntent.domainLabel || "Target Field";

  const prompt = `
You are the People & Career Trajectory Intelligence Agent for M.A.C.O.S.
Your mission is to research and synthesize how REAL PEOPLE actually reached destination: "${targetRole}" in "${domainLabel}".

CANDIDATE STARTING CONTEXT:
- Candidate Name: ${candidateProfile.fullName}
- Headline: ${candidateProfile.headline || "Practitioner"}
- Current Skills & Tools: ${[...candidateProfile.skills, ...candidateProfile.technologies].join(", ") || "Baseline capabilities"}
- Current Background Summary: ${candidateProfile.summary || "Seeking structured transition"}

DOMAIN & MARKET INTELLIGENCE:
- Domain: ${goalIntent.domain} (${goalIntent.domainLabel})
- Target Level: ${goalIntent.targetLevel}
- Core Requirements: ${marketIntelligence.coreRequirements.map((r) => r.requirement).join("; ")}
- High-Value Tools: ${marketIntelligence.tools.join(", ")}

CRITICAL PRINCIPLES:
1. PEOPLE ARE CASE STUDIES, NOT ROLE MODELS:
   - Identify 2 to 3 REAL or DOCUMENTED PRACTITIONERS who achieved "${targetRole}".
   - For EACH person, extract the granular timeline:
     * Starting point (where they began)
     * Education / self-directed study
     * Early skills developed
     * First opportunity (how they broke in)
     * Major projects or research deliverables
     * Career transitions (the exact catalyst)
     * Transferable aspects (what THIS candidate can directly replicate)
     * Non-transferable aspects (contextual factors unique to their time/location)
     * Relevance score (0.0 to 1.0) & explanation
   - STRICT PROHIBITION: NEVER force famous tech figures (Satya Nadella, Elon Musk, DJ Patil, Kelsey Hightower, Swyx) onto non-tech or unrelated goals.
   - If the role is entry-level hospitality/trades without famous celebrities, provide authentic documented practitioner case studies (e.g. shift leads, master tradespeople, crew trainers who rose to management) or set caseStudies to empty.

2. MULTIPLE TRAJECTORIES (3 Distinct Routes):
   - Formulate 3 distinct realistic routes into "${targetRole}" (e.g., "Direct Intake Route", "Cross-Functional Bridge Route", "Independent Portfolio Route").
   - Explicitly identify the route closest to THIS candidate's starting background with a clear whyClosest explanation.

3. PROGRESSION STAGES (4-5 chronological stages):
   - Typical stages from intake to mastery.

4. RECURRING PATTERNS (3-4 patterns):
   - Common habits, catalysts, or deliverables observed across successful practitioners.
`.trim();

  return await ModelRouter.invokeStructured<PeopleAgentOutput>({
    tier: "reasoning",
    prompt,
    schema: PeopleAgentOutputSchema,
    systemInstruction:
      "You are an expert career trajectory researcher. Detail authentic case studies with transferable takeaways and multi-route progression without forcing celebrities or tech defaults.",
  });
}
