import { z } from "zod";
import { ModelRouter } from "../modelRouter";
import {
  CandidateProfile,
  GapAnalysisOutput,
  GoalIntent,
  FlexibleStringSchema,
} from "@/types";
import { StateGapItem } from "./gapAgent";

export const RoadmapPhaseItemSchema = z.union([
  z.string().transform((str) => ({
    id: "action-1",
    stage: "LEARN" as const,
    title: str,
    why: "Directly closes diagnosed competency gap",
    action: str,
    deliverable: str,
    proof: str,
    resources: [{ title: "Domain Practice Guide", url: "", type: "guide" }],
    estimatedDuration: "2-3 weeks",
    priority: "medium" as const,
    completionCriteria: "Complete deliverable",
  })),
  z
    .object({
      id: z.union([z.string(), z.number()]).nullish().transform((v) => (v !== null && v !== undefined ? String(v) : "action-1")),
      stage: z.enum(["LEARN", "BUILD", "DEMONSTRATE", "REASSESS"]).nullish().default("LEARN"),
      title: z.string().nullish(),
      name: z.string().nullish(),
      why: z.string().nullish(),
      whyItMatters: z.string().nullish(),
      action: z.string().nullish(),
      deliverable: z.string().nullish(),
      proof: z.string().nullish(),
      expectedEvidence: z.string().nullish(),
      resources: z
        .union([
          z.array(
            z.union([
              z.string().transform((t) => ({ title: t, url: "", type: "guide" })),
              z.object({
                title: z.string().nullish().default("Resource"),
                url: z.string().nullish().default(""),
                type: z.string().nullish().default("guide"),
              }),
            ])
          ),
          z.string().transform((t) => [{ title: t, url: "", type: "guide" }]),
        ])
        .nullish()
        .default([]),
      estimatedDuration: z.string().nullish().default("2-3 weeks"),
      priority: z.enum(["critical", "high", "medium", "low"]).nullish().default("medium"),
      completionCriteria: z.string().nullish().default("Deliverable completed"),
    })
    .transform((val) => {
      const pri = (val.priority || "medium").toLowerCase();
      const validPri = (["critical", "high", "medium"].includes(pri) ? pri : "medium") as "critical" | "high" | "medium";
      const normalizedResources = (Array.isArray(val.resources) ? val.resources : []).map((r) =>
        typeof r === "string" ? { title: r, url: "", type: "guide" } : { title: r.title || "Resource", url: r.url || "", type: r.type || "guide" }
      );
      return {
        id: val.id || "action-1",
        stage: val.stage || "LEARN",
        title: val.title || val.name || val.action || "Action Milestone",
        why: val.why || val.whyItMatters || "Directly closes diagnosed competency gap",
        action: val.action || val.title || "Execute milestone action",
        deliverable: val.deliverable || val.proof || val.expectedEvidence || "",
        proof: val.proof || val.deliverable || val.expectedEvidence || "Tangible proof deliverable",
        resources: normalizedResources,
        estimatedDuration: val.estimatedDuration || "2-3 weeks",
        priority: validPri,
        completionCriteria: val.completionCriteria || "Deliverable completed",
      };
    }),
]);
export type RoadmapPhaseItem = z.infer<typeof RoadmapPhaseItemSchema>;

export const RoadmapAgentOutputSchema = z
  .object({
    fastestPracticalPathSummary: z.string().nullish(),
    summary: z.string().nullish(),
    pathwaySummary: z.string().nullish(),
    overview: z.string().nullish(),
    phases: z
      .object({
        LEARN: z.array(RoadmapPhaseItemSchema).nullish().default([]),
        BUILD: z.array(RoadmapPhaseItemSchema).nullish().default([]),
        DEMONSTRATE: z.array(RoadmapPhaseItemSchema).nullish().default([]),
        REASSESS: z.array(RoadmapPhaseItemSchema).nullish().default([]),
      })
      .nullish(),
    stages: z
      .object({
        LEARN: z.array(RoadmapPhaseItemSchema).nullish().default([]),
        BUILD: z.array(RoadmapPhaseItemSchema).nullish().default([]),
        DEMONSTRATE: z.array(RoadmapPhaseItemSchema).nullish().default([]),
        REASSESS: z.array(RoadmapPhaseItemSchema).nullish().default([]),
      })
      .nullish(),
    milestones: z.array(RoadmapPhaseItemSchema).nullish().default([]),
    ninetyDayTimeline: z
      .object({
        days1to30: z.array(FlexibleStringSchema).nullish().default([]),
        days31to60: z.array(FlexibleStringSchema).nullish().default([]),
        days61to90: z.array(FlexibleStringSchema).nullish().default([]),
      })
      .nullish(),
    ninetyDayRoute: z
      .object({
        days1to30: z.array(FlexibleStringSchema).nullish().default([]),
        days31to60: z.array(FlexibleStringSchema).nullish().default([]),
        days61to90: z.array(FlexibleStringSchema).nullish().default([]),
      })
      .nullish(),
    timeline: z
      .object({
        days1to30: z.array(FlexibleStringSchema).nullish().default([]),
        days31to60: z.array(FlexibleStringSchema).nullish().default([]),
        days61to90: z.array(FlexibleStringSchema).nullish().default([]),
      })
      .nullish(),
  })
  .transform((val) => {
    const rawPhases = val.phases || val.stages || { LEARN: [], BUILD: [], DEMONSTRATE: [], REASSESS: [] };
    const pLearn = (rawPhases.LEARN || []).map((item) => ({ ...item, stage: "LEARN" as const }));
    const pBuild = (rawPhases.BUILD || []).map((item) => ({ ...item, stage: "BUILD" as const }));
    const pDemo = (rawPhases.DEMONSTRATE || []).map((item) => ({ ...item, stage: "DEMONSTRATE" as const }));
    const pReassess = (rawPhases.REASSESS || []).map((item) => ({ ...item, stage: "REASSESS" as const }));

    const allMilestones =
      val.milestones && val.milestones.length > 0
        ? val.milestones
        : [...pLearn, ...pBuild, ...pDemo, ...pReassess];

    const rawTimeline = val.ninetyDayTimeline || val.ninetyDayRoute || val.timeline || { days1to30: [], days31to60: [], days61to90: [] };

    return {
      fastestPracticalPathSummary:
        val.fastestPracticalPathSummary ||
        val.pathwaySummary ||
        val.summary ||
        val.overview ||
        "Action-oriented 4-phase progression to achieve role readiness.",
      phases: {
        LEARN: pLearn,
        BUILD: pBuild,
        DEMONSTRATE: pDemo,
        REASSESS: pReassess,
      },
      milestones: allMilestones,
      ninetyDayTimeline: {
        days1to30: rawTimeline.days1to30 || [],
        days31to60: rawTimeline.days31to60 || [],
        days61to90: rawTimeline.days61to90 || [],
      },
    };
  });
export type RoadmapAgentOutput = z.infer<typeof RoadmapAgentOutputSchema>;

export interface RunRoadmapAgentParams {
  candidateProfile: CandidateProfile;
  gapAnalysis: GapAnalysisOutput;
  structuredGaps?: StateGapItem[];
  goalIntent: GoalIntent;
}

/**
 * Fast-Path Roadmap Architect Agent:
 * Formulates the fastest practical execution roadmap across LEARN → PRACTICE/BUILD → DEMONSTRATE → REASSESS
 * with verifiable proof-of-work deliverables tailored to the target domain.
 */
export async function runRoadmapAgent({
  candidateProfile,
  gapAnalysis,
  structuredGaps = [],
  goalIntent,
}: RunRoadmapAgentParams): Promise<RoadmapAgentOutput> {
  const targetRole = goalIntent.standardizedGoal || candidateProfile.targetRole;
  const domainLabel = goalIntent.domainLabel || "Target Field";

  const criticalGaps = (structuredGaps.length > 0 ? structuredGaps : gapAnalysis.skillGaps)
    .map((g) => `${g.gap} (${g.priority})`)
    .join("; ");

  const prompt = `
You are the Fast-Path Roadmap Architect Agent for M.A.C.O.S.
Architect the fastest, most practical 90-day action roadmap to transition candidate "${candidateProfile.fullName}" into "${targetRole}" in "${domainLabel}".

CANDIDATE & TARGET CONTEXT:
- Candidate Name: ${candidateProfile.fullName}
- Target Destination: ${targetRole} (${domainLabel})
- Calibrated Readiness: ${gapAnalysis.readinessScore}/100
- Competitive Advantage: ${gapAnalysis.keyCompetitiveAdvantage}
- Key Gaps to Close: ${criticalGaps || "Core domain execution"}

ROADMAP ARCHITECTURE PRINCIPLES:
1. 4 ACTION PHASES:
   - LEARN (Weeks 1-3 / Days 1-30): Master core knowledge, standards, safety rules, certifications, or fundamental tools.
   - BUILD (Weeks 4-7 / Days 31-60): Hands-on execution drills, mock customer scenarios, trade assembly, or capstone deliverables.
   - DEMONSTRATE (Weeks 8-10 / Days 61-75): Assemble proof-of-work artifacts, tailor targeted applications, and execute outreach.
   - REASSESS (Weeks 11-12 / Days 76-90): Mock interview evaluations, employer feedback loop, and calibrated readiness re-testing.

2. FAST LEARNING & PROOF-OF-WORK FOCUS:
   - Every action milestone must have a title, action, why, proof deliverable, estimatedDuration, completionCriteria, and resources array.
   - Tailor specifically to ${domainLabel}:
     * Hospitality: ServSafe food safety certificate, POS register simulation drills, menu memorization check, tailored restaurant resume.
     * Trades: Plumbing code manual mastery, soldering/PVC mock setup, safety gear check, apprenticeship application.
     * Healthcare: BLS/CPR card, clinical skills checklist, NCLEX prep drills, hospital unit applications.
     * Music: 5-song repertoire recording, metronome timing tape, live set showcase.
     * Tech/AI: GitHub repo with unit tests, deployed API, benchmark evaluation notebook.

3. SCHEMA OUTPUT:
   - fastestPracticalPathSummary: 2-3 paragraph synthesis
   - phases: { LEARN: [...], BUILD: [...], DEMONSTRATE: [...], REASSESS: [...] }
   - ninetyDayTimeline: { days1to30: [...], days31to60: [...], days61to90: [...] }

4. STRICTLY NO SAP unless explicitly an SAP role.
`.trim();

  return await ModelRouter.invokeStructured<RoadmapAgentOutput>({
    tier: "reasoning",
    prompt,
    schema: RoadmapAgentOutputSchema,
    systemInstruction:
      "You are an expert career pathway architect. Design fast, action-oriented, domain-authentic roadmaps focused on verifiable proof of work.",
  });
}
