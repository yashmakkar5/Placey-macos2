import { z } from "zod";
import { ModelRouter } from "../modelRouter";
import {
  CandidateProfile,
  SkillsDiscoveryOutput,
  MarketIntelligenceOutput,
  GapAnalysisOutput,
  GapAnalysisOutputSchema,
  GapItemSchema,
  GoalIntent,
} from "@/types";
import { PeopleAgentOutput } from "./peopleAgent";

export const StateGapItemSchema = z
  .object({
    id: z.union([z.string(), z.number()]).nullish().transform((v) => (v !== null && v !== undefined ? String(v) : "gap-1")),
    gap: z.string().nullish(),
    name: z.string().nullish(),
    title: z.string().nullish(),
    category: z.enum(["skill", "experience", "evidence"]).nullish().default("skill"),
    priority: z.enum(["critical", "high", "medium"]).nullish().default("medium"),
    userEvidence: z.string().nullish().default(""),
    requirement: z.string().nullish().default(""),
    howToClose: z.string().nullish().default(""),
    proofDeliverable: z.string().nullish().default(""),
  })
  .transform((val) => ({
    id: val.id || "gap-1",
    gap: val.gap || val.name || val.title || "Identified Gap",
    category: val.category || "skill",
    priority: val.priority || "medium",
    userEvidence: val.userEvidence || "Candidate background",
    requirement: val.requirement || "Hiring bar expectation",
    howToClose: val.howToClose || "Dedicated practice and deliverable creation",
    proofDeliverable: val.proofDeliverable || "Verifiable proof deliverable",
  }));
export type StateGapItem = z.infer<typeof StateGapItemSchema>;

export const GapAgentDetailedOutputSchema = z
  .object({
    skillGaps: z.array(GapItemSchema).nullish().default([]),
    experienceGaps: z.array(GapItemSchema).nullish().default([]),
    evidenceGaps: z.array(GapItemSchema).nullish().default([]),
    readinessScore: z.number().nullish().default(65),
    readinessSummary: z.string().nullish().default("Analysis of role readiness."),
    keyCompetitiveAdvantage: z.string().nullish().default(""),
    competitiveAdvantage: z.string().nullish(),
    structuredGaps: z.array(StateGapItemSchema).nullish().default([]),
    gapAnalysis: GapAnalysisOutputSchema.nullish(),
  })
  .transform((val) => {
    const ga: GapAnalysisOutput =
      val.gapAnalysis ||
      GapAnalysisOutputSchema.parse({
        skillGaps: val.skillGaps || [],
        experienceGaps: val.experienceGaps || [],
        evidenceGaps: val.evidenceGaps || [],
        readinessScore: val.readinessScore ?? 65,
        readinessSummary: val.readinessSummary || "Analysis of role readiness.",
        keyCompetitiveAdvantage: val.keyCompetitiveAdvantage || val.competitiveAdvantage || "Strong baseline capabilities.",
      });

    const structuredGaps: StateGapItem[] =
      val.structuredGaps && val.structuredGaps.length > 0
        ? val.structuredGaps
        : [
            ...(ga.skillGaps || []),
            ...(ga.experienceGaps || []),
            ...(ga.evidenceGaps || []),
          ].map((g, idx) => ({
            id: `gap-${idx + 1}`,
            gap: g.gap,
            category: g.category || "skill",
            priority: g.priority || "medium",
            userEvidence: g.candidateEvidence || "Candidate background",
            requirement: g.marketRequirement || "Market expectation",
            howToClose: `Targeted practice and deliverable creation for ${g.gap}`,
            proofDeliverable: `Verified deliverable proving ${g.gap}`,
          }));

    return {
      gapAnalysis: ga,
      structuredGaps,
    };
  });
export type GapAgentDetailedOutput = z.infer<typeof GapAgentDetailedOutputSchema>;

export interface RunGapAgentParams {
  candidateProfile: CandidateProfile;
  skillsDiscovery: SkillsDiscoveryOutput;
  marketIntelligence: MarketIntelligenceOutput;
  peopleIntelligence?: PeopleAgentOutput | any;
  goalIntent: GoalIntent;
}

/**
 * Triple-Triangulation Gap Analysis Agent:
 * Derives the genuine delta between candidate evidence, employer hiring expectations,
 * and historical trajectory precedents. Computes calibrated readiness score (0-100).
 */
export async function runGapAgent({
  candidateProfile,
  skillsDiscovery,
  marketIntelligence,
  peopleIntelligence,
  goalIntent,
}: RunGapAgentParams): Promise<GapAgentDetailedOutput> {
  const targetRole = goalIntent.standardizedGoal || candidateProfile.targetRole;
  const domainLabel = goalIntent.domainLabel || "Target Field";

  const demonstratedText = (skillsDiscovery.demonstratedSkills || [])
    .map((s) => `${s.skill}: ${s.evidence}`)
    .join("; ") || "Baseline capabilities";

  const uncertainText = (skillsDiscovery.uncertainSkills || [])
    .map((u) => `${u.skill} (${u.reason})`)
    .join("; ") || "None";

  const coreReqText = (marketIntelligence.coreRequirements || [])
    .map((r) => r.requirement)
    .join("; ");

  const prompt = `
You are the Gap Analysis Specialist for M.A.C.O.S.
Perform a rigorous triple-triangulation gap analysis for candidate "${candidateProfile.fullName}" targeting "${targetRole}" in "${domainLabel}".

TRIANGULATION INPUTS:
1. CANDIDATE EVIDENCE:
- Full Name: ${candidateProfile.fullName}
- Headline: ${candidateProfile.headline}
- Demonstrated Capabilities: ${demonstratedText}
- Mentioned / Unverified: ${uncertainText}

2. MARKET EXPECTATIONS:
- Core Requirements: ${coreReqText}
- Required Tools & Equipment: ${marketIntelligence.tools.join(", ")}
- Employer Evidence Expectations: ${marketIntelligence.evidenceExpectations.join("; ")}

3. TRAJECTORY SIGNALS & PRECEDENTS:
- Domain Precedents: Transitions require clear practical proof-of-work and operational reliability.

TRIANGULATION DIRECTIVES:
1. DOMAIN ACCURACY:
   - Ground all gaps strictly in "${targetRole}" (${domainLabel}).
   - Never inject software/tech gaps into hospitality, trades, healthcare, or music unless the role is genuinely software/tech.
2. CALIBRATED READINESS SCORE (0 to 100):
   - Realistic numerical assessment of current readiness against the hiring bar for ${targetRole}.
   - e.g., an applicant with zero hospitality experience applying for McDonald's crew might be 40-55; an experienced cashier might be 75-85.
3. READINESS SUMMARY:
   - 2-3 paragraph nuanced narrative evaluating their current standing and exact transition requirements.
4. KEY COMPETITIVE ADVANTAGE:
   - The candidate's distinctive edge or transferable strength.
5. SCHEMA OUTPUT:
   - skillGaps: 2-3 items with { gap, category: "skill", priority: "critical"|"high"|"medium", candidateEvidence, marketRequirement, impactOnReadiness }
   - experienceGaps: 1-2 items
   - evidenceGaps: 1-2 items
   - structuredGaps: 4-6 items with { id, gap, category, priority, userEvidence, requirement, howToClose, proofDeliverable }
6. Strictly NO SAP unless the role is explicitly SAP.
`.trim();

  return await ModelRouter.invokeStructured<GapAgentDetailedOutput>({
    tier: "reasoning",
    prompt,
    schema: GapAgentDetailedOutputSchema,
    systemInstruction:
      "You are an expert vocational and career diagnostic analyst. Provide rigorous, calibrated gap analysis grounded in the specific target domain.",
  });
}
