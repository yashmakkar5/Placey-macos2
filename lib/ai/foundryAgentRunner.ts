/**
 * Placey (M.A.C.O.S.) — Azure AI Foundry Cloud Agent Runners
 * Course AI-103: Azure AI Apps and Agents Developer
 * 
 * Dispatchers that format dynamic candidate & domain payloads and invoke
 * the Cloud Agents in Azure AI Foundry (yashplacey-resource / yashplacey).
 * Zero hardcoded personas, zero static tech fallbacks.
 */

import { generateStructuredJson, AZURE_FOUNDRY_AGENTS } from "./foundryClient";
import { getResearchProvider } from "@/lib/research/researchProvider";
import {
  CandidateProfile,
  CandidateProfileSchema,
  SkillsDiscoveryOutput,
  SkillsDiscoveryOutputSchema,
  MarketIntelligenceOutput,
  MarketIntelligenceOutputSchema,
  CareerTrajectoryOutput,
  CareerTrajectoryOutputSchema,
  GapAnalysisOutput,
  GapAnalysisOutputSchema,
  PathwayOutput,
  PathwayOutputSchema,
  GoalIntent,
} from "@/types";

// ============================================================================
// 1. Candidate Profile Extraction (Structured Ingestion)
// ============================================================================
export interface ExtractProfileParams {
  resumeText: string;
  targetRole: string;
  targetIndustry?: string;
  targetCompany?: string;
  additionalContext?: string;
  goalIntent?: GoalIntent;
}

export async function extractCandidateProfile({
  resumeText,
  targetRole,
  targetIndustry = "",
  targetCompany = "",
  additionalContext = "",
  goalIntent,
}: ExtractProfileParams): Promise<CandidateProfile> {
  const domainInfo = goalIntent
    ? `Target Domain: ${goalIntent.domain} (${goalIntent.domainLabel}), Goal Type: ${goalIntent.goalType}`
    : `Target Field: ${targetIndustry || "General Industry"}`;

  const prompt = `
Extract the candidate's structured profile for destination "${targetRole}":
- Target Role: "${targetRole}"
- ${domainInfo}
- Target Company: "${targetCompany || "Unspecified"}"
- Additional Notes / Constraints: "${additionalContext || "None"}"

RESUME CONTENT:
"""
${resumeText}
"""

Extract education, experience, projects, stated skills, tools, and explicitly list any missing information or unverified claims.
`.trim();

  const profile = await generateStructuredJson<CandidateProfile>({
    prompt,
    schema: CandidateProfileSchema,
  });

  return {
    ...profile,
    targetRole,
    targetIndustry: targetIndustry || profile.targetIndustry || goalIntent?.domainLabel || "General Industry",
    targetCompany: targetCompany || profile.targetCompany || "",
  };
}

// ============================================================================
// 2. Skills Discovery Agent (Cloud Agent: SkillsDiscoveryAgent v4)
// ============================================================================
export interface RunSkillsAgentParams {
  profile: CandidateProfile;
  goalIntent?: GoalIntent;
}

export async function runSkillsDiscoveryAgent(
  profileOrParams: CandidateProfile | RunSkillsAgentParams
): Promise<SkillsDiscoveryOutput> {
  const profile = "profile" in profileOrParams ? profileOrParams.profile : profileOrParams;
  const goalIntent = "goalIntent" in profileOrParams ? profileOrParams.goalIntent : undefined;

  const domainContext = goalIntent
    ? `Domain: ${goalIntent.domain} (${goalIntent.domainLabel}), Key Domain Capabilities: ${goalIntent.primaryDomainSkills.join(", ")}`
    : `Industry: ${profile.targetIndustry || "General Industry"}`;

  const prompt = `
You are the Skills Discovery Agent (v4). Perform a forensic, evidence-driven evaluation of THIS candidate's verified capabilities against the target role "${profile.targetRole}" (${domainContext}).

CANDIDATE DOSSIER:
- Full Name: ${profile.fullName} (${profile.headline || "Practitioner"})
- Background Summary: ${profile.summary || "None provided"}
- Education: ${profile.education.map((e) => `${e.degree} from ${e.institution}`).join("; ") || "None listed"}
- Professional Experience:
${profile.experience.map((e) => `  * ${e.role} at ${e.company} (${e.duration}): ${e.description}`).join("\n") || "  * None listed"}
- Projects & Proof-of-Work:
${profile.projects.map((p) => `  * Project: "${p.title}" [Tools/Tech: ${p.technologies.join(", ")}]: ${p.description} (Artifact/Proof: ${p.link || p.evidence || "No external link provided"})`).join("\n") || "  * None listed"}
- Claimed Skills & Tools: ${[...profile.skills, ...profile.technologies].join(", ") || "None listed"}
- Additional Context / Constraints: ${profile.additionalContext || "None"}

CRITICAL EVALUATION GUIDELINES:
1. STRICTLY OBJECTIVE & CANDIDATE-SPECIFIC: Evaluate candidate evidence against what "${profile.targetRole}" actually requires.
2. EVIDENCE CATEGORIZATION:
   - "demonstrated": Only capabilities proven by tangible deliverables, work samples, past roles, or verifiable metrics.
   - "mentioned": Skills cited in resume text or summary sections without verifiable context.
   - "missing": Core competencies demanded for ${profile.targetRole} that are absent from this profile.
   - "unknown": Ambiguous claims where proficiency cannot be determined.
3. ADAPTIVE TO ANY DOMAIN: If the target role is in hospitality/trades/healthcare/music, evaluate relevant communication, physical tools, certifications, customer service, or manual dexterity honestly. Do NOT assume tech or software skills unless it is a software role.
4. STRICTLY NO SAP unless explicitly an SAP role.
`.trim();

  return await generateStructuredJson<SkillsDiscoveryOutput>({
    agent: AZURE_FOUNDRY_AGENTS.skills,
    prompt,
    schema: SkillsDiscoveryOutputSchema,
  });
}

// ============================================================================
// 3. Market Intelligence Agent (Cloud Agent: marketIntelligenceAgent v2)
// ============================================================================
export interface RunMarketAgentParams {
  targetRole: string;
  targetIndustry?: string;
  targetCompany?: string;
  goalIntent?: GoalIntent;
}

export async function runMarketIntelligenceAgent({
  targetRole,
  targetIndustry = "General Industry",
  targetCompany = "",
  goalIntent,
}: RunMarketAgentParams): Promise<MarketIntelligenceOutput> {
  const provider = getResearchProvider();
  const marketOutput = await provider.searchMarketIntelligence(targetRole, targetIndustry, targetCompany, goalIntent);
  return marketOutput;
}

// ============================================================================
// 4. Career Trajectory Intelligence Agent (Cloud Agent: careerTrajectoryIntelligenceAgent v2)
// ============================================================================
export interface RunTrajectoryAgentParams {
  targetRole: string;
  targetIndustry?: string;
  candidateProfile?: CandidateProfile;
  goalIntent?: GoalIntent;
}

export async function runCareerTrajectoryAgent({
  targetRole,
  targetIndustry = "General Industry",
  candidateProfile,
  goalIntent,
}: RunTrajectoryAgentParams): Promise<CareerTrajectoryOutput> {
  const provider = getResearchProvider();
  const candidateSummary = candidateProfile?.summary || candidateProfile?.headline || "";
  const trajectoryOutput = await provider.searchCareerTrajectories(
    targetRole,
    targetIndustry,
    goalIntent,
    candidateSummary
  );
  return trajectoryOutput;
}

// ============================================================================
// 5. Gap Analysis Specialist Agent (Cloud Agent: gapAnalysisSpecialist v2)
// ============================================================================
export interface RunGapAnalysisParams {
  candidateProfile: CandidateProfile;
  skillsAnalysis: SkillsDiscoveryOutput;
  marketAnalysis: MarketIntelligenceOutput;
  trajectoryAnalysis: CareerTrajectoryOutput;
  goalIntent?: GoalIntent;
}

export async function runGapAnalysisAgent({
  candidateProfile,
  skillsAnalysis,
  marketAnalysis,
  trajectoryAnalysis,
  goalIntent,
}: RunGapAnalysisParams): Promise<GapAnalysisOutput> {
  const domainLabel = goalIntent?.domainLabel || candidateProfile.targetIndustry || "Target Field";

  const prompt = `
You are the Gap Analysis Specialist (v2). Perform a rigorous, triple-triangulation gap analysis for candidate "${candidateProfile.fullName}" targeting "${candidateProfile.targetRole}" in "${domainLabel}".

1. CANDIDATE EVIDENCE (FROM SKILLS DISCOVERY):
- Headline / Role: ${candidateProfile.headline}
- Demonstrated Capabilities: ${skillsAnalysis.demonstratedSkills.map((s) => `${s.skill}: ${s.evidence}`).join("; ") || "Limited direct evidence"}
- Uncertain / Buzzwords: ${skillsAnalysis.uncertainSkills.map((u) => `${u.skill} (${u.reason})`).join("; ") || "None"}
- Missing Core Information: ${skillsAnalysis.missingInformation?.join(", ") || "None"}

2. MARKET EXPECTATIONS (FROM MARKET INTELLIGENCE):
- Core Requirements: ${marketAnalysis.coreRequirements.map((c) => c.requirement).join("; ")}
- High-Value Tools & Equipment: ${marketAnalysis.tools.join(", ")}
- Evidence Demanded by Employers: ${marketAnalysis.evidenceExpectations.join("; ")}

3. TRAJECTORY SIGNALS (FROM CAREER TRAJECTORY MINING):
- Precedent Catalysts: ${trajectoryAnalysis.professionals.map((p) => `${p.name} (${p.currentRole}): ${p.transitions}`).join("; ") || "Demonstrated baseline mastery"}
- Common Transition Patterns: ${trajectoryAnalysis.commonTransitions?.map((t) => `${t.from} -> ${t.to}: ${t.transitionCatalyst}`).join("; ") || "Verifiable practical proof-of-work"}

TRIANGULATION DIRECTIVES:
1. DOMAIN SPECIFICITY: Ground all gaps strictly in "${candidateProfile.targetRole}" (${domainLabel}). Avoid generic or software-biased gaps unless the target is a software role.
2. CALIBRATED READINESS SCORE: Provide an honest, realistic readiness score (0-100) reflecting real hiring bar expectations for ${candidateProfile.targetRole}.
3. READINESS SUMMARY: A nuanced 2-3 paragraph evaluation of where the candidate stands today and what is required to reach hiring readiness.
4. KEY COMPETITIVE ADVANTAGE: Identify the candidate's genuine advantage—how their unique background creates a distinctive edge when targeted at ${candidateProfile.targetRole}.
5. Categorize gaps into skillGaps, experienceGaps, and evidenceGaps with priorities (critical, high, medium).
6. Strictly NO references to SAP unless the role is an SAP consultant.
`.trim();

  return await generateStructuredJson<GapAnalysisOutput>({
    agent: AZURE_FOUNDRY_AGENTS.gap,
    prompt,
    schema: GapAnalysisOutputSchema,
  });
}

// ============================================================================
// 6. Pathway Architect Agent (Cloud Agent: pathwayArchitectAgent v2)
// ============================================================================
export interface RunPathwayAgentParams {
  candidateProfile: CandidateProfile;
  gapAnalysis: GapAnalysisOutput;
  goalIntent?: GoalIntent;
}

export async function runPathwayAgent({
  candidateProfile,
  gapAnalysis,
  goalIntent,
}: RunPathwayAgentParams): Promise<PathwayOutput> {
  const domainLabel = goalIntent?.domainLabel || candidateProfile.targetIndustry || "Target Field";

  const prompt = `
You are the Pathway Architect Agent (v2). Architect a customized, realistic 90-day action pathway across LEARN → BUILD → DEMONSTRATE → REASSESS to bridge candidate "${candidateProfile.fullName}" into "${candidateProfile.targetRole}" in "${domainLabel}".

CANDIDATE CONTEXT & GAPS:
- Candidate: ${candidateProfile.fullName}
- Target Destination: ${candidateProfile.targetRole} (${domainLabel})
- Readiness Score: ${gapAnalysis.readinessScore}/100
- Competitive Advantage: ${gapAnalysis.keyCompetitiveAdvantage}
- Critical Skill Gaps: ${gapAnalysis.skillGaps.filter((g) => g.priority === "critical").map((g) => g.gap).join("; ") || "Core domain execution"}
- High Skill Gaps: ${gapAnalysis.skillGaps.filter((g) => g.priority === "high").map((g) => g.gap).join("; ") || "Tool depth"}
- Experience Gaps: ${gapAnalysis.experienceGaps.map((g) => g.gap).join("; ")}
- Evidence Gaps: ${gapAnalysis.evidenceGaps.map((g) => g.gap).join("; ")}

PATHWAY ARCHITECTURE RULES:
1. DOMAIN AUTHENTICITY & PRACTICALITY:
   - Tailor every action milestone directly to "${candidateProfile.targetRole}".
   - For hospitality/restaurant service:
     * Focus on food safety certifications (ServSafe), register/POS drills, guest greeting, menu mastery, customized resume, application walk-in / online submissions, and interview practice.
   - For trades/crafts:
     * Focus on trade basics, safety standards (OSHA), hands-on pipe/wire drills, apprenticeship applications, and tool familiarity.
   - For healthcare:
     * Focus on clinical skills, certification reviews, patient care documentation, CPR/BLS, and clinical rotation applications.
   - For music/creative:
     * Focus on technique practice, repertoire development, audio/video recording, and portfolio/performance delivery.
   - For tech/AI:
     * Focus on system design, code repos, unit tests, and production deployments.
2. 4 PHASES STRUCTURE:
   - LEARN (Weeks 1-3): Foundational knowledge, standards, safety, or core toolsets.
   - BUILD / PRACTICE (Weeks 4-7): Hands-on practice, capstone deliverable, or practical scenario drills.
   - DEMONSTRATE (Weeks 8-10): Package proof-of-work, assemble portfolio/application, and submit to target employers.
   - REASSESS (Weeks 11-12): Mock interviews, feedback incorporation, and calibrated readiness re-evaluation.
3. Every action milestone must have an actionable title, clear whyItMatters, relatedGap, estimatedDuration, completionCriteria, and authentic resources.
4. Strictly NO references to SAP unless the role is an SAP consultant.
`.trim();

  return await generateStructuredJson<PathwayOutput>({
    agent: AZURE_FOUNDRY_AGENTS.pathway,
    prompt,
    schema: PathwayOutputSchema,
  });
}
