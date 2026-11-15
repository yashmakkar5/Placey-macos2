import {
  GoalIntent,
  CandidateProfile,
  MarketIntelligenceOutput,
  SkillsDiscoveryOutput,
  GapAnalysisOutput,
  MACOSState,
  CanonicalAnalysis,
  AgentTraceStep,
  ProfessionalProfile,
  TrajectoryStageItem,
  CareerRouteItem,
  TrajectoryPatternItem,
  JourneyComparisonItem,
  SmartGapItem,
  ActionItem,
  SourceReference,
  TrajectoryCaseStudy,
  FlexibleString,
} from "@/types";
import { PeopleAgentOutput } from "./peopleAgent";
import { StateGapItem } from "./gapAgent";
import { RoadmapAgentOutput } from "./roadmapAgent";
import { ResourceAgentOutput } from "./resourceAgent";
import { ValidationAgentOutput } from "./validationAgent";

export interface SynthesisParams {
  goalIntent: GoalIntent;
  candidateProfile: CandidateProfile;
  marketIntelligence: MarketIntelligenceOutput;
  peopleIntelligence: PeopleAgentOutput;
  skillsDiscovery: SkillsDiscoveryOutput;
  competencies?: Array<{
    competency: string;
    category: "skill" | "experience" | "evidence";
    status: "demonstrated" | "partial" | "missing" | "unknown";
    userEvidence: string;
    marketExpectation: string;
  }>;
  gapAnalysis: GapAnalysisOutput;
  structuredGaps?: StateGapItem[];
  roadmap: RoadmapAgentOutput;
  resources: ResourceAgentOutput;
  validation: ValidationAgentOutput;
  trace: AgentTraceStep[];
}

/**
 * State Synthesis Agent:
 * Integrates all agent outputs into the canonical MACOSState and CanonicalAnalysis structures,
 * ensuring complete consistency across all 11 core sections.
 */
export function runSynthesisAgent({
  goalIntent,
  candidateProfile,
  marketIntelligence,
  peopleIntelligence,
  skillsDiscovery,
  competencies = [],
  gapAnalysis,
  structuredGaps = [],
  roadmap,
  resources,
  validation,
  trace,
}: SynthesisParams): { macosState: MACOSState; canonicalAnalysis: CanonicalAnalysis } {
  const targetRole = goalIntent.standardizedGoal || candidateProfile.targetRole;
  const domainLabel = goalIntent.domainLabel || "Target Field";

  // 1. Build MACOSState
  const macosState: MACOSState = {
    goal: {
      rawGoal: candidateProfile.targetRole || targetRole,
      standardizedGoal: targetRole,
      domain: goalIntent.domain || "other",
      domainLabel,
      goalType: goalIntent.goalType || "job_entry",
      targetLevel: goalIntent.targetLevel || "entry_level",
      constraints: candidateProfile.additionalContext ? [candidateProfile.additionalContext] : [],
    },
    userProfile: candidateProfile,
    research: {
      searchQueries: (goalIntent.keySearchQueries || []).map((q) => String(q)),
      sources: marketIntelligence.sources || [],
      marketOverview: marketIntelligence.marketOverview || "",
      coreRequirements: (marketIntelligence.coreRequirements || []).map((r) => ({
        requirement: r.requirement,
        why: r.why,
        evidenceExpectation: r.evidenceExpectation,
      })),
      tools: (marketIntelligence.tools || []).map((t) => String(t)),
      responsibilities: (marketIntelligence.responsibilities || []).map((res) => String(res)),
      emergingSkills: (marketIntelligence.emergingSkills || []).map((e) => ({
        skill: e.skill,
        trend: e.trend,
        detail: e.detail,
      })),
    },
    peopleAndTrajectories: {
      routes: peopleIntelligence.routes || [],
      stages: peopleIntelligence.stages || [],
      patterns: peopleIntelligence.patterns || [],
      caseStudies: peopleIntelligence.caseStudies || [],
    },
    competencies:
      competencies.length > 0
        ? competencies
        : (skillsDiscovery.demonstratedSkills || []).map((s) => ({
            competency: s.skill,
            category: "skill" as const,
            status: "demonstrated" as const,
            userEvidence: s.evidence || "Demonstrated in candidate background",
            marketExpectation: `Core competency for ${targetRole}`,
          })),
    gaps:
      structuredGaps.length > 0
        ? structuredGaps
        : [
            ...(gapAnalysis.skillGaps || []),
            ...(gapAnalysis.experienceGaps || []),
            ...(gapAnalysis.evidenceGaps || []),
          ].map((g, idx) => ({
            id: `gap-${idx + 1}`,
            gap: g.gap,
            category: g.category || "skill",
            priority: g.priority || "medium",
            userEvidence: g.candidateEvidence || "No public documentation",
            requirement: g.marketRequirement || `Hiring bar expectation for ${targetRole}`,
            howToClose: `Targeted practice and deliverable creation for ${g.gap}`,
            proofDeliverable: `Verified deliverable proving ${g.gap}`,
          })),
    roadmap: {
      fastestPracticalPathSummary:
        roadmap.fastestPracticalPathSummary ||
        `Structured 4-phase progression to achieve ${targetRole} hiring readiness.`,
      phases: {
        LEARN: (roadmap.phases?.LEARN || []).map((item) => ({
          ...item,
          stage: "LEARN" as const,
          proof: item.proof || item.deliverable || "Completed coursework",
        })),
        BUILD: (roadmap.phases?.BUILD || []).map((item) => ({
          ...item,
          stage: "BUILD" as const,
          proof: item.proof || item.deliverable || "Hands-on project deliverable",
        })),
        DEMONSTRATE: (roadmap.phases?.DEMONSTRATE || []).map((item) => ({
          ...item,
          stage: "DEMONSTRATE" as const,
          proof: item.proof || item.deliverable || "Verified work sample or application submission",
        })),
        REASSESS: (roadmap.phases?.REASSESS || []).map((item) => ({
          ...item,
          stage: "REASSESS" as const,
          proof: item.proof || item.deliverable || "Readiness re-assessment score",
        })),
      },
      milestones: (roadmap.milestones || []).map((item) => ({
        ...item,
        stage: item.stage || "LEARN",
        proof: item.proof || item.deliverable || "Deliverable completed",
      })),
      ninetyDayTimeline: {
        days1to30: (roadmap.ninetyDayTimeline?.days1to30 || []).map((s) => String(s)),
        days31to60: (roadmap.ninetyDayTimeline?.days31to60 || []).map((s) => String(s)),
        days61to90: (roadmap.ninetyDayTimeline?.days61to90 || []).map((s) => String(s)),
      },
    },
    resources: (resources.resources || []).map((r, idx) => ({
      id: r.id || `res-${idx + 1}`,
      title: r.title,
      url: r.url || "",
      type: r.type,
      forGap: r.forGap,
      why: r.why,
      expectedOutcome: r.expectedOutcome,
      evidenceSource: r.evidenceSource || "Curated Domain Resource",
    })),
    validation: {
      approved: validation.approved,
      validationTimestamp: new Date().toISOString(),
      checks: validation.checks || [],
      refinementIterations: validation.revisionsMade?.length ? 1 : 0,
    },
    trace,
  };

  // 2. Build CanonicalAnalysis
  const candidateStrengths = (skillsDiscovery.demonstratedSkills || []).slice(0, 3).map((s) => ({
    name: s.skill,
    evidence: s.evidence || "Demonstrated across past project or work experience.",
  }));

  const readinessScore = gapAnalysis.readinessScore || 65;
  const benchmarkLabel: "Strong Base" | "Early Transition" | "Progression Needed" | "Close to Destination" =
    readinessScore >= 80
      ? "Close to Destination"
      : readinessScore >= 65
      ? "Strong Base"
      : readinessScore >= 45
      ? "Early Transition"
      : "Progression Needed";

  const professionals: ProfessionalProfile[] = (peopleIntelligence.caseStudies || []).map((cs: TrajectoryCaseStudy) => ({
    name: cs.name,
    currentRole: cs.currentPosition,
    company: cs.organization || "",
    organization: cs.organization || "",
    startingPoint: cs.startingPoint || "Foundational Role",
    careerSteps: cs.earlySkills.map((s: FlexibleString) => String(s)),
    careerPath: cs.earlySkills.map((s: FlexibleString) => String(s)),
    skills: cs.earlySkills.map((s: FlexibleString) => String(s)),
    experiences: cs.majorProjects.map((p: FlexibleString) => String(p)),
    keyLearnings: cs.transferableAspects.map((t: FlexibleString) => String(t)),
    transitions: cs.careerTransitions || "Progressive skill acquisition",
    relevantTransition: cs.careerTransitions || "Progressive skill acquisition",
    relevanceToCandidate: cs.relevanceExplanation || "Provides precedent for target progression",
    whyRelevant: cs.relevanceExplanation || "Provides precedent for target progression",
    sources: cs.sources || [],
  }));

  const smartGaps: SmartGapItem[] = macosState.gaps.map((g) => ({
    id: g.id,
    gap: g.gap,
    category: g.category,
    priority: g.priority,
    currentEvidence: g.userEvidence,
    destinationRequirement: g.requirement,
    difference: `Delta: current evidence does not yet satisfy ${g.requirement}`,
    howToCloseIt: g.howToClose,
    proofYouCanCreate: g.proofDeliverable,
  }));

  const learnItems: ActionItem[] = macosState.roadmap.phases.LEARN;
  const buildItems: ActionItem[] = macosState.roadmap.phases.BUILD;
  const demoItems: ActionItem[] = macosState.roadmap.phases.DEMONSTRATE;
  const reassessItems: ActionItem[] = macosState.roadmap.phases.REASSESS;

  const canonicalAnalysis: CanonicalAnalysis = {
    candidate: {
      fullName: candidateProfile.fullName,
      headline: candidateProfile.headline,
      summary: candidateProfile.summary || `Candidate pursuing transition into ${targetRole}.`,
      strengths: candidateStrengths.length > 0 ? candidateStrengths : [{ name: "Core Aptitude", evidence: "Verified candidate background" }],
      currentPositionSummary: candidateProfile.summary || "Current professional baseline",
      evidence: (candidateProfile.evidence || []).map((e) =>
        typeof e === "string" ? { type: "work_output", description: e } : e
      ),
    },
    destination: {
      role: targetRole,
      industry: domainLabel,
      company: candidateProfile.targetCompany,
      description: `Target career destination in ${domainLabel}.`,
      domain: goalIntent.domain,
      domainLabel,
    },
    readiness: {
      score: readinessScore,
      benchmarkLabel,
      explanation: gapAnalysis.readinessSummary || `Candidate has a readiness score of ${readinessScore}/100 for ${targetRole}.`,
    },
    biggestInsight: {
      headline: `The Fastest Route to ${targetRole}: ${gapAnalysis.keyCompetitiveAdvantage || "Proof-of-work focus"}`,
      detail: gapAnalysis.readinessSummary || "Focused progression across core standards.",
    },
    whatNotToDo: [
      {
        actionToAvoid: "Don't jump into unverified resume spamming before establishing core proof",
        reason: "Hiring managers look for verifiable competence before extending interviews.",
      },
      {
        actionToAvoid: "Don't rely on passive tutorials without producing tangible work samples",
        reason: "Hands-on artifacts and certifications build lasting credibility.",
      },
    ],
    market: {
      summary: marketIntelligence.marketOverview || `Market standards for ${targetRole}.`,
      requirements: (marketIntelligence.coreRequirements || []).map((r) => ({
        skill: r.requirement,
        frequency: "High" as const,
        evidenceNote: r.evidenceExpectation,
      })),
      trends: (marketIntelligence.emergingSkills || []).map((e) => ({
        trend: e.skill,
        trajectory: "Growing" as const,
        details: e.detail,
      })),
      tools: (marketIntelligence.tools || []).map((t) => String(t)),
      responsibilities: (marketIntelligence.responsibilities || []).map((r) => String(r)),
      evidenceCountNote: "Mined from live market standards",
      sources: marketIntelligence.sources || [],
    },
    trajectories: {
      summary: peopleIntelligence.summary || `Trajectory intelligence for ${targetRole}.`,
      stages: peopleIntelligence.stages || [],
      routes: peopleIntelligence.routes || [],
      closestRoute: peopleIntelligence.routes?.find((r: CareerRouteItem) => r.isClosestRoute) || peopleIntelligence.routes?.[0] || {
        routeId: "route-1",
        routeName: "Direct Intake Route",
        stages: ["Intake", "Execution", targetRole],
        description: `Direct progression into ${targetRole}.`,
        isClosestRoute: true,
        candidateFit: "Aligned with starting background",
        whyClosest: "Direct entry pathway",
      },
      patterns: peopleIntelligence.patterns || [],
      professionals,
      sources: marketIntelligence.sources || [],
    },
    comparison: {
      items: (marketIntelligence.coreRequirements || []).map((req) => {
        const isDemo = (skillsDiscovery.demonstratedSkills || []).some((ds) =>
          ds.skill.toLowerCase().includes(req.requirement.toLowerCase())
        );
        return {
          dimension: req.requirement,
          status: isDemo ? ("demonstrated" as const) : ("not_demonstrated" as const),
          evidenceSnippet: isDemo ? "Demonstrated in profile" : "No direct evidence found",
          whatItMeans: isDemo ? "Established baseline" : `Build proof for ${req.requirement}`,
        };
      }),
      demonstrated: (skillsDiscovery.demonstratedSkills || []).map((s) => s.skill),
      partial: (skillsDiscovery.uncertainSkills || []).map((s) => s.skill),
      missing: (skillsDiscovery.missingList || []).map((s) => s.skill),
      unknown: (skillsDiscovery.unknownList || []).map((s) => s.skill),
    },
    priorities: smartGaps.slice(0, 3).map((g, idx) => ({
      id: `priority-${idx + 1}`,
      title: g.gap,
      type: g.category,
      currentSignal: g.currentEvidence,
      destinationRequirement: g.destinationRequirement,
      difference: g.difference,
      action: g.howToCloseIt,
      proof: g.proofYouCanCreate,
    })),
    gaps: smartGaps,
    pathway: {
      stages: {
        LEARN: learnItems,
        BUILD: buildItems,
        DEMONSTRATE: demoItems,
        REASSESS: reassessItems,
      },
      learn: learnItems,
      build: buildItems,
      demonstrate: demoItems,
      reassess: reassessItems,
      milestones: macosState.roadmap.milestones,
      ninetyDayRoute: macosState.roadmap.ninetyDayTimeline,
    },
    resources: {
      learning: (resources.learningResources || []).map((l) => ({
        title: l.title,
        url: l.url,
        description: l.description,
        forGap: l.forGap,
      })),
      building: (resources.buildingResources || []).map((b) => ({
        title: b.title,
        deliverable: b.deliverable,
        forGap: b.forGap,
      })),
      evidence: (resources.evidenceResources || []).map((e) => ({
        title: e.title,
        proofFormat: e.proofFormat,
        forGap: e.forGap,
      })),
      exploration: [],
    },
    sources: {
      marketSources: marketIntelligence.sources || [],
      careerSources: marketIntelligence.sources || [],
      learningSources: marketIntelligence.sources || [],
      totalCount: (marketIntelligence.sources || []).length,
      researchBasis: {
        marketCount: (marketIntelligence.sources || []).length,
        trajectoryCount: (peopleIntelligence.caseStudies || []).length,
        learningCount: (resources.resources || []).length,
        evidenceQuality: "Strong evidence",
      },
    },
    meta: {
      researchTimestamp: new Date().toISOString(),
      confidence: "High",
    },
  };

  return { macosState, canonicalAnalysis };
}
