import { z } from "zod";
import { ModelRouter } from "../modelRouter";
import {
  GoalIntent,
  MarketIntelligenceOutput,
  MarketIntelligenceOutputSchema,
} from "@/types";

export interface RunResearchAgentParams {
  targetRole: string;
  targetIndustry?: string;
  targetCompany?: string;
  goalIntent: GoalIntent;
}

/**
 * Market & Domain Research Agent:
 * Synthesizes live market expectations, core requirements, tools, responsibilities,
 * and authoritative sources for ANY domain without cross-domain contamination or tech bias.
 */
export async function runResearchAgent({
  targetRole,
  targetIndustry = "General Industry",
  targetCompany = "",
  goalIntent,
}: RunResearchAgentParams): Promise<MarketIntelligenceOutput> {
  const domainLabel = goalIntent.domainLabel || targetIndustry || "Target Field";

  const prompt = `
You are the Market & Domain Research Agent for M.A.C.O.S.
Synthesize verified, authentic labor market standards, employer hiring bars, daily equipment/tools, and core requirements for destination: "${targetRole}" in "${domainLabel}".

DOMAIN CLASSIFICATION:
- Domain: ${goalIntent.domain} (${domainLabel})
- Goal Type: ${goalIntent.goalType}
- Target Seniority / Level: ${goalIntent.targetLevel}
- Targeted Search Queries: ${goalIntent.keySearchQueries.join("; ")}
- Primary Domain Capabilities: ${goalIntent.primaryDomainSkills.join("; ")}
- Licensing / Certification Required: ${goalIntent.regulatoryOrCertificationNeeded ? "Yes" : "No"}
- Target Company / Employer Tier: ${targetCompany || "Standard Industry Establishments"}

DOMAIN DIRECTIVES & PURITY:
1. STRICT DOMAIN GROUNDING:
   - Provide requirements authentic to "${targetRole}" in "${domainLabel}".
   - For Hospitality/Restaurant (e.g. waiter, crew member, barista):
     * Focus on guest hospitality, order accuracy, POS till operation, food safety hygiene (ServSafe/HACCP), station speed, and dining area sanitation.
     * ZERO mentions of software development, Python, SQL, Docker, APIs, or tech PRDs!
   - For Trades/Crafts (e.g. plumber, electrician, carpenter):
     * Focus on trade codes, pipe/wire fitting, safety standards (OSHA), blueprints, diagnostic tools, and apprenticeships.
   - For Healthcare/Nursing (e.g. nurse, CNA, medical assistant):
     * Focus on patient vitals, medication administration, EHR documentation, CPR/BLS, NCLEX-RN, and bedside communication.
   - For Music/Creative (e.g. guitarist, sound engineer, video editor):
     * Focus on technique, ear training, fretboard/DAW mechanics, repertoire, metronome drills, and live performance.
   - For Tech/AI (e.g. software engineer, AI researcher):
     * Focus on real software engineering, data structures, cloud platforms, model architectures, and production deployment.

2. STRUCTURED SCHEMA REQUIREMENTS:
   - coreRequirements: 4-5 core competencies with { requirement: string, why: string, evidenceExpectation: string }.
   - importantRequirements: 2-3 secondary requirements.
   - differentiators: 2-3 capabilities that make an applicant stand out.
   - recurringSkills: 6-8 skill names authentic to this exact role.
   - tools: 6-10 real equipment, software, or physical tool names used daily in this role.
   - responsibilities: 4-6 authentic day-to-day duties.
   - qualifications: 3-4 standard hiring expectations or education/licensing prerequisites.
   - experienceExpectations: 2-3 realistic experience levels expected by employers.
   - evidenceExpectations: 2-3 concrete proof items (e.g. food handler certificate, customer service reference, trade portfolio, code repo).
   - emergingSkills: 2-3 modern trends in this occupation (e.g. digital kiosk ordering, mobile app fulfillment).
   - sources: 3-4 authoritative domain sources (e.g. Official Employer Portal, Bureau of Labor Statistics OOH, National Industry Association, ServSafe / Accredited Board).
   - marketOverview: A 2-3 paragraph objective overview of hiring trends, working conditions, and expectations.
   - Strictly NO references to SAP unless the role is an SAP consultant.
`.trim();

  return await ModelRouter.invokeStructured<MarketIntelligenceOutput>({
    tier: "reasoning",
    prompt,
    schema: MarketIntelligenceOutputSchema,
    systemInstruction:
      "You are an objective labor market and vocational research specialist. Provide authentic, factual, domain-accurate data matching the requested role and schema without cross-domain contamination.",
  });
}
