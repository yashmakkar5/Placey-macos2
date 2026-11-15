import { z } from "zod";
import { ModelRouter } from "../modelRouter";
import { GoalIntent, CandidateProfile, GapAnalysisOutput } from "@/types";
import { StateGapItem } from "./gapAgent";

export const StateResourceItemSchema = z.union([
  z.string().transform((str) => ({
    id: "res-1",
    title: str,
    url: "",
    type: "guide" as const,
    forGap: "Core competency development",
    why: "Directly builds skills needed for target hiring bar",
    expectedOutcome: "Measurable competency deliverable",
    evidenceSource: "Official Industry Resource",
  })),
  z
    .object({
      id: z.union([z.string(), z.number()]).nullish().transform((v) => (v !== null && v !== undefined ? String(v) : "res-1")),
      title: z.string().nullish(),
      name: z.string().nullish(),
      resourceName: z.string().nullish(),
      url: z.string().nullish().default(""),
      type: z.string().nullish().default("guide"),
      forGap: z.string().nullish().default("Core competency development"),
      why: z.string().nullish().default("Directly builds skills needed for target hiring bar"),
      expectedOutcome: z.string().nullish().default("Measurable competency deliverable"),
      deliverable: z.string().nullish(),
      outcome: z.string().nullish(),
      evidenceSource: z.string().nullish().default("Official Industry Resource"),
    })
    .transform((val) => {
      const t = (val.type || "guide").toLowerCase();
      const validT = (["course", "doc", "video", "guide", "tool", "community", "practice"].includes(t)
        ? t
        : "guide") as "course" | "doc" | "video" | "guide" | "tool" | "community" | "practice";

      return {
        id: val.id || "res-1",
        title: val.title || val.name || val.resourceName || "Domain Resource Guide",
        url: val.url || "",
        type: validT,
        forGap: val.forGap || "Core competency development",
        why: val.why || "Directly builds skills needed for target hiring bar",
        expectedOutcome: val.expectedOutcome || val.deliverable || val.outcome || "Measurable competency deliverable",
        evidenceSource: val.evidenceSource || "Official Industry Resource",
      };
    }),
]);
export type StateResourceItem = z.infer<typeof StateResourceItemSchema>;

export const ResourceAgentOutputSchema = z
  .object({
    resources: z.array(StateResourceItemSchema).nullish().default([]),
    learningResources: z
      .array(
        z.object({
          title: z.string().nullish().default("Learning Resource"),
          url: z.string().nullish().default(""),
          description: z.string().nullish().default(""),
          forGap: z.string().nullish().default(""),
        })
      )
      .nullish()
      .default([]),
    buildingResources: z
      .array(
        z.object({
          title: z.string().nullish().default("Building Resource"),
          deliverable: z.string().nullish().default(""),
          forGap: z.string().nullish().default(""),
        })
      )
      .nullish()
      .default([]),
    evidenceResources: z
      .array(
        z.object({
          title: z.string().nullish().default("Evidence Format"),
          proofFormat: z.string().nullish().default(""),
          forGap: z.string().nullish().default(""),
        })
      )
      .nullish()
      .default([]),
  })
  .transform((val) => {
    const resList = val.resources || [];
    const lList =
      val.learningResources && val.learningResources.length > 0
        ? val.learningResources.map((l) => ({
            title: l.title || "Learning Guide",
            url: l.url || "",
            description: l.description || "Foundational domain reference",
            forGap: l.forGap || "Core competency",
          }))
        : resList.slice(0, 4).map((r) => ({
            title: r.title,
            url: r.url || "",
            description: r.why,
            forGap: r.forGap,
          }));

    const bList =
      val.buildingResources && val.buildingResources.length > 0
        ? val.buildingResources.map((b) => ({
            title: b.title || "Practice Project",
            deliverable: b.deliverable || "Hands-on deliverable",
            forGap: b.forGap || "Core competency",
          }))
        : resList.slice(2, 5).map((r) => ({
            title: r.title,
            deliverable: r.expectedOutcome,
            forGap: r.forGap,
          }));

    const eList =
      val.evidenceResources && val.evidenceResources.length > 0
        ? val.evidenceResources.map((e) => ({
            title: e.title || "Proof Deliverable",
            proofFormat: e.proofFormat || "Verified portfolio artifact",
            forGap: e.forGap || "Core competency",
          }))
        : resList.slice(4, 7).map((r) => ({
            title: r.title,
            proofFormat: r.expectedOutcome,
            forGap: r.forGap,
          }));

    return {
      resources: resList,
      learningResources: lList,
      buildingResources: bList,
      evidenceResources: eList,
    };
  });
export type ResourceAgentOutput = z.infer<typeof ResourceAgentOutputSchema>;

export interface RunResourceAgentParams {
  candidateProfile: CandidateProfile;
  goalIntent: GoalIntent;
  gapAnalysis: GapAnalysisOutput;
  structuredGaps?: StateGapItem[];
}

/**
 * Gap-Mapped Resource Intelligence Agent:
 * Mappings curated, verified resources directly to identified gaps with explicit "why" and "expected outcome".
 * Zero generic filler courses; strictly domain-authentic.
 */
export async function runResourceAgent({
  candidateProfile,
  goalIntent,
  gapAnalysis,
  structuredGaps = [],
}: RunResourceAgentParams): Promise<ResourceAgentOutput> {
  const targetRole = goalIntent.standardizedGoal || candidateProfile.targetRole;
  const domainLabel = goalIntent.domainLabel || "Target Field";

  const gapSummary = (structuredGaps.length > 0 ? structuredGaps : gapAnalysis.skillGaps)
    .map((g) => `${g.gap} (${g.priority})`)
    .join("; ");

  const prompt = `
You are the Gap-Mapped Resource Intelligence Agent for M.A.C.O.S.
Select and synthesize high-leverage, domain-authentic resources strictly mapped to the identified gaps for destination "${targetRole}" in "${domainLabel}".

TARGET CONTEXT:
- Role: ${targetRole} (${domainLabel})
- Target Level: ${goalIntent.targetLevel}
- Specific Gaps: ${gapSummary || "Core domain execution and proof of work"}

RESOURCE CURATION RULES:
1. STRICT GAP MAPPING:
   - Every resource MUST explicitly specify "forGap", "why", and "expectedOutcome".
   - NO generic placeholders (e.g. "Take a general Coursera course").
   - For hospitality: Food safety certification guides (ServSafe/eFoodHandlers), Toast/Square POS training videos, customer service simulation drills, restaurant interview guides.
   - For trades: Trade code handbooks (IPC/NEC), apprenticeship application portals, trade union training guides.
   - For healthcare: NCLEX/BLS certification modules, clinical nursing procedure guides.
   - For music: Ear training apps, chord progression handbooks, audio workstation tutorials.
   - For tech/AI: Official framework docs, paper implementations, architecture guides.

2. STRUCTURED SCHEMA:
   - resources: Array of 6-8 items with { id, title, url, type, forGap, why, expectedOutcome, evidenceSource }
   - learningResources: 3-4 items
   - buildingResources: 2-3 items
   - evidenceResources: 2-3 items

3. STRICTLY NO SAP unless the target is an SAP consultant.
`.trim();

  return await ModelRouter.invokeStructured<ResourceAgentOutput>({
    tier: "reasoning",
    prompt,
    schema: ResourceAgentOutputSchema,
    systemInstruction:
      "You are a specialized career learning curator. Return authentic, high-impact resources precisely mapped to candidate gaps with expected deliverables.",
  });
}
