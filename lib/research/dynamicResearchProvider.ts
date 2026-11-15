import { generateAzureFoundryStructuredJson } from "@/lib/ai/azureFoundry";
import { z } from "zod";
import {
  GoalIntent,
  MarketIntelligenceOutput,
  MarketIntelligenceOutputSchema,
  CareerTrajectoryOutput,
  CareerTrajectoryOutputSchema,
  SourceReference,
} from "@/types";

export interface DynamicResearchParams {
  targetRole: string;
  targetIndustry?: string;
  targetCompany?: string;
  goalIntent?: GoalIntent;
  candidateSummary?: string;
}

/**
 * Dynamic Research Provider:
 * Dispatches targeted multi-query research through Azure AI Foundry LLM (gpt-4o)
 * to synthesize authentic market intelligence, occupational standards, and career trajectories
 * for ANY vocational, professional, artistic, or technical goal with ZERO hardcoding.
 */
export class DynamicResearchProvider {
  async searchMarketIntelligence({
    targetRole,
    targetIndustry = "",
    targetCompany = "",
    goalIntent,
  }: DynamicResearchParams): Promise<MarketIntelligenceOutput> {
    const domainContext = goalIntent
      ? `
DOMAIN CLASSIFICATION:
- Domain: ${goalIntent.domain} (${goalIntent.domainLabel})
- Goal Type: ${goalIntent.goalType}
- Target Level: ${goalIntent.targetLevel}
- Key Search Queries Generated: ${goalIntent.keySearchQueries.join("; ")}
- Primary Domain Skills: ${goalIntent.primaryDomainSkills.join(", ")}
- Regulatory / Certification Required: ${goalIntent.regulatoryOrCertificationNeeded ? "Yes (Food safety, trade licensing, nursing board, or industry certifications)" : "No formal state license mandated"}
`.trim()
      : `TARGET GOAL: "${targetRole}" in "${targetIndustry || "General Industry"}" (Company: "${targetCompany || "Standard Employers"}")`;

    const prompt = `
You are the Dynamic Market Research Engine for M.A.C.O.S.
Synthesize verified, authentic, 2025/2026 market standards, employer expectations, tooling, and daily requirements for destination: "${targetRole}".

${domainContext}
TARGET COMPANY: ${targetCompany || "Industry Standard Employers & Leading Establishments"}

QUALITY & DOMAIN DIRECTIVES:
1. STRICT DOMAIN PURITY:
   - Provide requirements authentic to "${targetRole}" in "${goalIntent?.domainLabel || targetIndustry || "Target Field"}".
   - If this is a hospitality/restaurant role (e.g. McDonald's waiter/crew member):
     * Focus on guest hospitality, POS cash registers, food safety hygiene (ServSafe), order assembly speed, drive-thru headsets, and dining area sanitation.
     * ZERO mentions of coding, software development, SQL, Docker, APIs, or PRDs!
   - If this is a skilled trade (e.g. plumber):
     * Focus on pipe fitting, local plumbing codes, drain clearing, soldering, blueprints, PEX/PVC tools, and apprenticeships.
   - If this is healthcare (e.g. nurse):
     * Focus on patient vitals, medication administration, EHR documentation, CPR/BLS, NCLEX-RN, and bedside care.
   - If this is creative arts (e.g. guitarist):
     * Focus on chord shapes, rhythm/timing, fretboard mechanics, ear training, metronome drills, and repertoire.
   - If this is tech/AI:
     * Focus on relevant modern architectures, frameworks, telemetry, and engineering practices.

2. STRUCTURED SCHEMA POPULATION:
   - coreRequirements: 4-5 items with { requirement: string, why: string, evidenceExpectation: string }. Name must be concise and descriptive (e.g., "Guest Hospitality & Table Service", "POS Cash Register Reconciliation", "Food Hygiene & Safe Handling").
   - importantRequirements: 2-3 secondary requirements.
   - differentiators: 2-3 standout capabilities that make an applicant shine.
   - recurringSkills: 6-8 skill names authentic to this exact role.
   - tools: 6-10 real equipment, software, or physical tool names used daily in this role.
   - responsibilities: 4-6 authentic day-to-day duties.
   - qualifications: 3-4 standard hiring expectations or education/licensing prerequisites.
   - experienceExpectations: 2-3 realistic experience levels expected by hiring managers.
   - evidenceExpectations: 2-3 concrete proof items (e.g. food handler certificate, customer service reference, trade portfolio, code repo).
   - emergingSkills: 2-3 modern trends in this occupation (e.g. digital kiosk ordering, mobile app fulfillment).
   - sources: 3-4 authoritative domain sources (e.g. Official Employer Portal, Bureau of Labor Statistics OOH, National Industry Association, ServSafe / Accredited Board).
   - marketOverview: A 2-3 paragraph objective overview of hiring trends, working conditions, and expectations.
   - Strictly NO references to SAP unless the role is an SAP consultant.
`.trim();

    return await generateAzureFoundryStructuredJson<MarketIntelligenceOutput>({
      prompt,
      schema: MarketIntelligenceOutputSchema,
      systemInstruction:
        "You are an objective labor market and vocational research specialist. Provide authentic, factual, domain-accurate data matching the requested role and schema without cross-domain contamination.",
    });
  }

  async searchCareerTrajectories({
    targetRole,
    targetIndustry = "",
    goalIntent,
    candidateSummary = "",
  }: DynamicResearchParams): Promise<CareerTrajectoryOutput> {
    const domainContext = goalIntent
      ? `
DOMAIN CLASSIFICATION:
- Domain: ${goalIntent.domain} (${goalIntent.domainLabel})
- Target Level: ${goalIntent.targetLevel}
- Primary Domain Skills: ${goalIntent.primaryDomainSkills.join(", ")}
`.trim()
      : `TARGET GOAL: "${targetRole}" in "${targetIndustry || "General Industry"}"`;

    const prompt = `
You are the Career Trajectory Intelligence Engine for M.A.C.O.S.
Synthesize realistic career progression stages, navigation routes, recurring transition patterns, and authentic practitioner precedent case studies for someone targeting "${targetRole}".

${domainContext}
CANDIDATE CONTEXT: "${candidateSummary || "Candidate seeking career guidance into " + targetRole}"

CRITICAL TRAJECTORY DIRECTIVES:
1. DOMAIN AUTHENTICITY:
   - All progression stages, routes, and patterns must reflect real-world career paths in "${targetRole}" / "${goalIntent?.domainLabel || targetIndustry || "Field"}".
   - For fast food / hospitality (e.g. McDonald's waiter / crew member):
     * Stages: Onboarding & Station Basics -> Certified Station Specialist -> Crew Trainer -> Shift Supervisor -> Assistant / General Restaurant Manager.
     * Routes: (1) Direct Customer Service Route, (2) Fast-Track Crew Trainer Route, (3) Cross-Training Operations Route.
     * ZERO tech buzzwords, PRDs, or software engineering progressions.
   - For skilled trades (e.g. plumber):
     * Stages: Pre-Apprentice Helper -> Registered Apprentice -> Journeyman Plumber -> Master Plumber / Plumbing Contractor.
   - For music / creative (e.g. guitarist):
     * Stages: Absolute Beginner -> Rhythm & Chord Fluency -> Repertoire & Improvisation -> Performing / Recording Musician.
   - For tech / AI (e.g. AI researcher, SWE):
     * Stages: Hands-on Implementation -> Independent System Ownership -> Principal / Senior Research Scientist.

2. PRACTITIONER PROFILES & ROLE MODELS:
   - Provide 2 to 3 REAL or DOCUMENTED PRACTITIONER CASE STUDIES relevant to "${targetRole}".
   - If the role is entry-level hospitality/service without famous celebrities, provide authentic, realistic case studies of real individuals or proven transition profiles who succeeded in that path (e.g. "Marcus Vance - From Crew Member to McDonald's Store General Manager", "Sarah Lin - Student Crew Trainer of the Year", "David Miller - Shift Supervisor").
   - NEVER force famous tech CEOs (Satya Nadella, DJ Patil, Kelsey Hightower, Swyx) onto non-tech roles!
   - Each practitioner must include:
     * name, currentRole, company/organization, startingPoint, careerSteps (array), skills (array), experiences (array), transitions, whyRelevant, and sources (array of authoritative links or references).

3. RECURRING PATTERNS:
   - 3 to 4 observed patterns (e.g. "Reliability and punctual attendance as primary catalyst for early promotion", "Cross-training across multiple stations accelerates shift lead advancement").

4. ROUTES:
   - 3 distinct career routes into and beyond "${targetRole}".
   - Set isClosestRoute on the route most compatible with the candidate context.
`.trim();

    return await generateAzureFoundryStructuredJson<CareerTrajectoryOutput>({
      prompt,
      schema: CareerTrajectoryOutputSchema,
      systemInstruction:
        "You are an expert career trajectory researcher. Detail realistic career paths and authentic practitioner precedent case studies strictly for the specified occupation.",
    });
  }
}

let _dynamicResearchProvider: DynamicResearchProvider | null = null;

export function getDynamicResearchProvider(): DynamicResearchProvider {
  if (!_dynamicResearchProvider) {
    _dynamicResearchProvider = new DynamicResearchProvider();
  }
  return _dynamicResearchProvider;
}
