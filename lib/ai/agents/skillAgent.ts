import { z } from "zod";
import { ModelRouter } from "../modelRouter";
import {
  CandidateProfile,
  SkillsDiscoveryOutput,
  SkillsDiscoveryOutputSchema,
  DemonstratedSkillSchema,
  UncertainSkillSchema,
  CategorizedSkillSchema,
  FlexibleStringSchema,
  GoalIntent,
} from "@/types";

export interface RunSkillAgentParams {
  candidateProfile: CandidateProfile;
  goalIntent: GoalIntent;
}

export const SkillCompetencySchema = z.union([
  z.string().transform((str) => ({
    competency: str,
    category: "skill" as const,
    status: "demonstrated" as const,
    userEvidence: "Extracted from candidate profile",
    marketExpectation: "Relevant domain standard",
  })),
  z
    .object({
      competency: z.string().nullish(),
      name: z.string().nullish(),
      skill: z.string().nullish(),
      category: z.enum(["skill", "experience", "evidence"]).nullish().default("skill"),
      status: z.enum(["demonstrated", "partial", "missing", "unknown"]).nullish().default("demonstrated"),
      userEvidence: z.string().nullish().default(""),
      marketExpectation: z.string().nullish().default(""),
    })
    .transform((val) => ({
      competency: val.competency || val.name || val.skill || "Core Competency",
      category: val.category || "skill",
      status: val.status || "demonstrated",
      userEvidence: val.userEvidence || "",
      marketExpectation: val.marketExpectation || "",
    })),
]);
export type SkillCompetency = z.infer<typeof SkillCompetencySchema>;

export const SkillAgentDetailedOutputSchema = z
  .object({
    demonstratedSkills: z.array(DemonstratedSkillSchema).nullish().default([]),
    uncertainSkills: z.array(UncertainSkillSchema).nullish().default([]),
    categorizedSkills: z.array(CategorizedSkillSchema).nullish().default([]),
    missingInformation: z.array(FlexibleStringSchema).nullish().default([]),
    coreStrengthsSummary: z.string().nullish().default("Candidate strengths evaluated against target role expectations."),
    competencies: z.array(SkillCompetencySchema).nullish().default([]),
    skillsDiscovery: SkillsDiscoveryOutputSchema.nullish(),
  })
  .transform((val) => {
    const sd: SkillsDiscoveryOutput =
      val.skillsDiscovery ||
      SkillsDiscoveryOutputSchema.parse({
        demonstratedSkills: val.demonstratedSkills || [],
        uncertainSkills: val.uncertainSkills || [],
        categorizedSkills: val.categorizedSkills || [],
        missingInformation: val.missingInformation || [],
        coreStrengthsSummary: val.coreStrengthsSummary || "Candidate strengths evaluated against target role expectations.",
      });

    const competencies: Array<{
      competency: string;
      category: "skill" | "experience" | "evidence";
      status: "demonstrated" | "partial" | "missing" | "unknown";
      userEvidence: string;
      marketExpectation: string;
    }> =
      val.competencies && val.competencies.length > 0
        ? val.competencies
        : (sd.demonstratedSkills || []).map((s) => ({
            competency: s.skill,
            category: "skill" as const,
            status: "demonstrated" as const,
            userEvidence: s.evidence || "Demonstrated in profile",
            marketExpectation: "Core domain requirement",
          }));

    return {
      skillsDiscovery: sd,
      competencies,
    };
  });
export type SkillAgentDetailedOutput = z.infer<typeof SkillAgentDetailedOutputSchema>;

/**
 * Forensic Skill & Profile Discovery Agent:
 * Objectively audits the candidate's resume/background against the target domain,
 * distinguishing verified project/work evidence from mere buzzword claims.
 */
export async function runSkillAgent({
  candidateProfile,
  goalIntent,
}: RunSkillAgentParams): Promise<SkillAgentDetailedOutput> {
  const targetRole = goalIntent.standardizedGoal || candidateProfile.targetRole;
  const domainLabel = goalIntent.domainLabel || "Target Field";

  const prompt = `
You are the Forensic Skill Discovery Agent for M.A.C.O.S.
Perform an objective, evidence-based audit of candidate "${candidateProfile.fullName}" targeting "${targetRole}" in "${domainLabel}".

CANDIDATE DOSSIER:
- Full Name: ${candidateProfile.fullName} (${candidateProfile.headline || "Practitioner"})
- Summary / Pitch: ${candidateProfile.summary || "Seeking transition"}
- Education: ${candidateProfile.education.map((e) => `${e.degree} from ${e.institution}`).join("; ") || "None listed"}
- Professional Experience:
${candidateProfile.experience.map((e) => `  * ${e.role} at ${e.company} (${e.duration}): ${e.description}`).join("\n") || "  * None listed"}
- Projects & Proof-of-Work:
${candidateProfile.projects.map((p) => `  * "${p.title}" [Tools: ${p.technologies.join(", ")}]: ${p.description} (Evidence: ${p.link || p.evidence || "None"})`).join("\n") || "  * None listed"}
- Listed Skills: ${[...candidateProfile.skills, ...candidateProfile.technologies].join(", ") || "None"}
- Additional Notes: ${candidateProfile.additionalContext || "None"}

TARGET DOMAIN REQUIREMENTS:
- Domain: ${goalIntent.domain} (${domainLabel})
- Target Level: ${goalIntent.targetLevel}
- Core Domain Skills Expected: ${goalIntent.primaryDomainSkills.join(", ")}

EVALUATION DIRECTIVES:
1. STRICT EVIDENCE CATEGORIZATION:
   - "demonstratedSkills": 4-6 capabilities backed by tangible work experience, measurable deliverables, or portfolio samples with evidence string and confidence.
   - "uncertainSkills": 2-4 skills cited without verifiable context or deliverables with reason string.
   - "missingInformation": 2-3 core competencies demanded for ${targetRole} that are absent from this profile.
   - "coreStrengthsSummary": 2-3 paragraph objective summary.
2. DOMAIN ADAPTATION:
   - If target is hospitality/trades/healthcare/music, evaluate relevant communication, physical tools, certifications, safety, customer service, or dexterity.
   - Do NOT force software or coding evaluation unless the destination is software/tech.
3. COMPETENCIES ARRAY:
   - Generate 5-7 granular items: { competency: string, category: "skill"|"experience"|"evidence", status: "demonstrated"|"partial"|"missing"|"unknown", userEvidence: string, marketExpectation: string }.
4. STRICTLY NO SAP unless explicitly an SAP role.
`.trim();

  return await ModelRouter.invokeStructured<SkillAgentDetailedOutput>({
    tier: "reasoning",
    prompt,
    schema: SkillAgentDetailedOutputSchema,
    systemInstruction:
      "You are a rigorous, forensic technical and vocational recruiter. Evaluate candidate evidence objectively against the target occupation without bias or tech contamination.",
  });
}
