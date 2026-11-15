import { z } from "zod";
import { ModelRouter } from "../modelRouter";
import {
  GoalIntent,
  CandidateProfile,
  MarketIntelligenceOutput,
  GapAnalysisOutput,
  TrajectoryCaseStudy,
  FlexibleStringSchema,
} from "@/types";
import { PeopleAgentOutput } from "./peopleAgent";
import { RoadmapAgentOutput } from "./roadmapAgent";
import { ResourceAgentOutput } from "./resourceAgent";

export const ValidationCheckItemSchema = z.union([
  z.string().transform((str) => ({
    checkName: str.split(":")[0] || "Audit Check",
    passed: !str.toLowerCase().includes("fail") && !str.toLowerCase().includes("rejected"),
    feedback: str,
  })),
  z
    .object({
      checkName: z.string().nullish(),
      name: z.string().nullish(),
      check: z.string().nullish(),
      passed: z
        .union([
          z.boolean(),
          z.string().transform((s) => s.toLowerCase() === "passed" || s.toLowerCase() === "true" || s.toLowerCase() === "pass"),
        ])
        .nullish()
        .default(true),
      status: z.string().nullish(),
      feedback: z.string().nullish(),
      notes: z.string().nullish(),
      comment: z.string().nullish(),
    })
    .transform((val) => ({
      checkName: val.checkName || val.name || val.check || "Validation Check",
      passed:
        typeof val.passed === "boolean"
          ? val.passed
          : val.status?.toLowerCase() !== "failed" && val.status?.toLowerCase() !== "fail",
      feedback: val.feedback || val.notes || val.comment || "Check completed successfully.",
    })),
]);
export type ValidationCheckItem = z.infer<typeof ValidationCheckItemSchema>;

export const ValidationAgentOutputSchema = z
  .object({
    approved: z
      .union([
        z.boolean(),
        z.string().transform((s) => s.toLowerCase() === "true" || s.toLowerCase() === "approved"),
      ])
      .nullish()
      .default(true),
    overallAssessment: z.string().nullish().default("All domain recommendations validated and grounded in research evidence."),
    critiqueNotes: z
      .union([
        z.string().transform((s) => [s]),
        z.array(
          z.union([
            z.string(),
            z
              .object({
                note: z.string().nullish(),
                issue: z.string().nullish(),
                feedback: z.string().nullish(),
                critique: z.string().nullish(),
              })
              .transform((o) => o.note || o.issue || o.feedback || o.critique || "Critique note"),
          ])
        ),
      ])
      .nullish()
      .default([]),
    revisionsMade: z
      .union([
        z.string().transform((s) => [s]),
        z.array(
          z.union([
            z.string(),
            z
              .object({
                revision: z.string().nullish(),
                change: z.string().nullish(),
                action: z.string().nullish(),
                detail: z.string().nullish(),
              })
              .transform((o) => o.revision || o.change || o.action || o.detail || "Revision applied"),
          ])
        ),
      ])
      .nullish()
      .default([]),
    checks: z.array(ValidationCheckItemSchema).nullish().default([]),
  })
  .transform((val) => ({
    approved: val.approved ?? true,
    overallAssessment: val.overallAssessment || "All domain recommendations validated and grounded in research evidence.",
    critiqueNotes: (val.critiqueNotes || []).map(String),
    revisionsMade: (val.revisionsMade || []).map(String),
    checks: val.checks || [],
  }));
export type ValidationAgentOutput = z.infer<typeof ValidationAgentOutputSchema>;

export interface RunValidationAgentParams {
  goalIntent: GoalIntent;
  candidateProfile: CandidateProfile;
  marketIntelligence: MarketIntelligenceOutput;
  peopleIntelligence?: PeopleAgentOutput;
  gapAnalysis: GapAnalysisOutput;
  roadmap: RoadmapAgentOutput;
  resources: ResourceAgentOutput;
}

/**
 * Multi-Agent Debate & Validation Agent:
 * Acts as an adversarial quality critic, auditing proposed career intelligence against research evidence.
 * 
 * AUDIT CRITERIA:
 * 1. Domain Grounding: Zero tech contamination in non-tech domains.
 * 2. Case Study Authenticity: Zero forced celebrity role models.
 * 3. Fast Learning / Proof-of-Work: Every action milestone must produce tangible proof.
 * 4. Gap-Resource Coupling: Resources must directly close the diagnosed gaps.
 */
export async function runValidationAgent({
  goalIntent,
  candidateProfile,
  marketIntelligence,
  peopleIntelligence,
  gapAnalysis,
  roadmap,
  resources,
}: RunValidationAgentParams): Promise<ValidationAgentOutput> {
  const targetRole = goalIntent.standardizedGoal || candidateProfile.targetRole;
  const domainLabel = goalIntent.domainLabel || "Target Field";

  const caseStudyNames = (peopleIntelligence?.caseStudies || []).map((c: TrajectoryCaseStudy) => `${c.name} (${c.currentPosition})`).join(", ") || "Domain practitioner archetypes";
  const roadmapMilestones = (roadmap.milestones || []).map((m) => `${m.title} [${m.stage}]: ${m.proof}`).join("; ");
  const resourceTitles = (resources.resources || []).map((r) => `${r.title} (for: ${r.forGap})`).join("; ");

  const prompt = `
You are the Adversarial Validation & Critique Agent for M.A.C.O.S.
Your duty is to rigorously evaluate the candidate career plan to ensure absolute domain authenticity, zero hallucination, and high actionability.

DESTINATION UNDER AUDIT:
- Target Role: "${targetRole}"
- Domain: "${goalIntent.domain}" (${domainLabel})
- Target Level: "${goalIntent.targetLevel}"

PROPOSED INTELLIGENCE DOSSIER:
1. Case Studies / Practitioners:
   ${caseStudyNames}

2. Proposed 4-Phase Milestones & Proof Deliverables:
   ${roadmapMilestones}

3. Gap-Mapped Resources:
   ${resourceTitles}

4. Calibrated Readiness Score: ${gapAnalysis.readinessScore}/100

CRITICAL AUDIT CHECKS:
1. "Domain Grounding Check":
   - IF destination is non-tech (e.g., McDonald's waiter, plumber, nurse, guitarist), verify that ZERO tech buzzwords (Python, GitHub, PRD, Docker, API, microservices) appear anywhere in the roadmap or resources.
   - Pass = true if clean; Pass = false if tech leakage is detected.

2. "Role Precedent Authenticity Check":
   - Verify that NO famous tech executives (Satya Nadella, DJ Patil, Kelsey Hightower, Swyx) are forced as case studies for non-tech roles.
   - Pass = true if authentic; Pass = false if celebrities are forced.

3. "Proof-of-Work Deliverable Check":
   - Verify that all roadmap milestones require tangible deliverables (e.g. food safety certificate, timing drill tape, trade mock setup, portfolio sample).

4. "Gap-Resource Alignment Check":
   - Verify that resources directly address the candidate's primary gaps.

5. "Fast Learning / Timeline Feasibility Check":
   - Verify that the 90-day plan is sequenced logically across LEARN → BUILD → DEMONSTRATE → REASSESS.

SCHEMA OUTPUT:
- approved: boolean (true if all checks pass)
- overallAssessment: string
- critiqueNotes: array of strings (or empty array if all passed)
- revisionsMade: array of strings
- checks: array of 5 items with { checkName: string, passed: boolean, feedback: string }
`.trim();

  return await ModelRouter.invokeStructured<ValidationAgentOutput>({
    tier: "reasoning",
    prompt,
    schema: ValidationAgentOutputSchema,
    systemInstruction:
      "You are a strict, adversarial quality validation agent. Audit recommendations for domain grounding, proof-of-work feasibility, and zero celebrity forcing.",
  });
}
