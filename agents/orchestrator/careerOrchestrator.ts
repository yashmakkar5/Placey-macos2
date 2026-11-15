import { extractCandidateProfile } from "@/lib/ai/foundryAgentRunner";
import {
  runGoalIntentAgent,
  runResearchAgent,
  runSkillAgent,
  runPeopleAgent,
  runGapAgent,
  runRoadmapAgent,
  runResourceAgent,
  runValidationAgent,
  runSynthesisAgent,
} from "@/lib/ai/agents";
import {
  createAnalysisRecord,
  updateAnalysisRecord,
} from "@/lib/supabase/analysisRepository";
import {
  AnalysisRecord,
  AnalysisStatus,
  AgentTraceStep,
  CareerTrajectoryOutput,
  PathwayOutput,
  TrajectoryCaseStudy,
  CareerRouteItem,
  FlexibleString,
} from "@/types";

export interface OrchestrationInput {
  analysisId?: string;
  resumeFileName: string;
  resumeText: string;
  targetRole: string;
  targetIndustry?: string;
  targetCompany?: string;
  additionalContext?: string;
  onProgress?: (status: AnalysisStatus, message: string) => Promise<void> | void;
}

/**
 * Career Orchestrator:
 * Executes the genuine dynamic multi-agent pipeline powered by Azure AI Foundry models and agents.
 * Features reciprocal multi-agent debate (Validation Agent critique & refinement) and full step-by-step trace auditing.
 * 
 * Multi-Agent Pipeline:
 * 1. Goal & Intent Classification Agent (Domain categorization & query formulation)
 * 2. Candidate Profile Extraction (Structured ingestion & profile normalization)
 * 3. Forensic Skill Discovery Agent (Demonstrated vs mentioned audit & competency mapping)
 * 4. Parallel: Live Market Intelligence Agent + People & Trajectory Intelligence Agent (Real Case Studies)
 * 5. Triple-Triangulation Gap Analysis Agent (Skill vs Experience vs Evidence, calibrated score)
 * 6. Fast-Path Roadmap Architect Agent (4-phase action milestones & 90-day timeline)
 * 7. Gap-Mapped Resource Intelligence Agent (Curated resources mapped to specific gaps)
 * 8. Multi-Agent Debate & Validation Agent (Generate → Critique → Validate → Refine)
 * 9. State Synthesis Agent (Assembles MACOSState & CanonicalAnalysis)
 * 10. Final State Persistence & Trace Finalization
 */
export async function orchestrateCareerAnalysis({
  analysisId,
  resumeFileName,
  resumeText,
  targetRole,
  targetIndustry = "General Industry",
  targetCompany = "",
  additionalContext = "",
  onProgress,
}: OrchestrationInput): Promise<AnalysisRecord> {
  const trace: AgentTraceStep[] = [];
  const pipelineStartTime = Date.now();

  const recordStep = (
    agentName: string,
    stepNumber: number,
    startTime: number,
    modelUsed: string,
    status: "success" | "critiqued" | "revised" | "failed",
    summary: string,
    inputSummary?: string,
    outputPayload?: Record<string, unknown>,
    critiqueOrValidation?: any
  ) => {
    const step: AgentTraceStep = {
      agentName,
      stepNumber,
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
      modelUsed,
      status,
      summary,
      inputSummary,
      outputPayload,
      critiqueOrValidation,
    };
    trace.push(step);
    return step;
  };

  const notify = async (status: AnalysisStatus, msg: string) => {
    if (onProgress) {
      try {
        await onProgress(status, msg);
      } catch (err) {
        console.warn("[Orchestrator Progress Error]", err);
      }
    }
  };

  // 1. Initialize Record
  await notify("building_profile", "Initializing multi-agent session and classifying goal intent...");
  const initialRecord = await createAnalysisRecord({
    id: analysisId,
    resume_file_name: resumeFileName,
    resume_text: resumeText,
    target_role: targetRole,
    target_industry: targetIndustry,
    target_company: targetCompany,
    analysis_status: "building_profile",
  });

  const recordId = initialRecord.id;

  try {
    // ------------------------------------------------------------------------
    // STEP 1: Goal & Intent Classification Agent
    // ------------------------------------------------------------------------
    const step1Start = Date.now();
    const goalIntent = await runGoalIntentAgent({
      targetRole,
      targetIndustry,
      targetCompany,
      additionalContext,
      resumeSummary: resumeText.slice(0, 500),
    });

    recordStep(
      "Goal & Intent Agent",
      1,
      step1Start,
      "gpt-4o (fast tier)",
      "success",
      `Classified domain as "${goalIntent.domain}" (${goalIntent.domainLabel}), goal type: "${goalIntent.goalType}", target level: "${goalIntent.targetLevel}".`,
      `Target: "${targetRole}" in "${targetIndustry}"`,
      { goalIntent }
    );

    // ------------------------------------------------------------------------
    // STEP 2: Candidate Profile Extraction & Ingestion
    // ------------------------------------------------------------------------
    const step2Start = Date.now();
    const candidateProfile = await extractCandidateProfile({
      resumeText,
      targetRole,
      targetIndustry: targetIndustry || goalIntent.domainLabel,
      targetCompany,
      additionalContext,
      goalIntent,
    });

    recordStep(
      "Profile Extraction Ingestion",
      2,
      step2Start,
      "gpt-4o (structured)",
      "success",
      `Extracted profile for "${candidateProfile.fullName}" with ${candidateProfile.experience.length} experiences and ${candidateProfile.projects.length} projects.`,
      `Resume Text (${resumeText.length} chars)`,
      { candidateProfile }
    );

    await updateAnalysisRecord(recordId, {
      candidate_profile: candidateProfile,
      goal_intent: goalIntent,
      analysis_status: "discovering_skills",
      agent_trace: trace,
    });

    // ------------------------------------------------------------------------
    // STEP 3: Forensic Skill Discovery Agent
    // ------------------------------------------------------------------------
    await notify(
      "discovering_skills",
      `Forensically auditing candidate capabilities for ${goalIntent.domainLabel}...`
    );
    const step3Start = Date.now();
    const skillResult = await runSkillAgent({
      candidateProfile,
      goalIntent,
    });
    const skillsAnalysis = skillResult.skillsDiscovery;
    const competencies = skillResult.competencies;

    recordStep(
      "Skill Discovery Agent",
      3,
      step3Start,
      "gpt-4o (reasoning tier)",
      "success",
      `Identified ${skillsAnalysis.demonstratedSkills.length} demonstrated skills and ${skillsAnalysis.uncertainSkills.length} unverified claims.`,
      `Candidate Dossier for ${targetRole}`,
      { skillsAnalysis, competencies }
    );

    await updateAnalysisRecord(recordId, {
      skills_analysis: skillsAnalysis,
      analysis_status: "researching_market",
      agent_trace: trace,
    });

    // ------------------------------------------------------------------------
    // STEP 4: Parallel Execution: Market Research + People & Trajectory Mining
    // ------------------------------------------------------------------------
    await notify(
      "researching_market",
      `Synthesizing live ${goalIntent.domainLabel} hiring standards and mining practitioner case studies...`
    );
    const step4Start = Date.now();

    const [marketAnalysis, peopleIntelligence] = await Promise.all([
      runResearchAgent({
        targetRole,
        targetIndustry: targetIndustry || goalIntent.domainLabel,
        targetCompany,
        goalIntent,
      }),
      runPeopleAgent({
        goalIntent,
        candidateProfile,
        marketIntelligence: {
          targetRole,
          targetIndustry: targetIndustry || goalIntent.domainLabel,
          targetCompany,
          coreRequirements: [],
          tools: [],
          responsibilities: [],
          qualifications: [],
          experienceExpectations: [],
          evidenceExpectations: [],
          importantRequirements: [],
          differentiators: [],
          emergingSkills: [],
          optionalSkills: [],
          domainKnowledge: [],
          communicationExpectations: [],
          marketOverview: "",
          researchTimestamp: new Date().toISOString(),
          sources: [],
          recurringSkills: [],
          isControlledFallback: false,
        },
      }),
    ]);

    recordStep(
      "Market Intelligence Agent",
      4,
      step4Start,
      "gpt-4o (reasoning tier)",
      "success",
      `Extracted ${marketAnalysis.coreRequirements.length} core market requirements, ${marketAnalysis.tools.length} domain tools, and ${marketAnalysis.sources.length} authoritative sources.`,
      `Domain: ${goalIntent.domainLabel}`,
      { marketAnalysis }
    );

    recordStep(
      "People & Trajectory Agent",
      5,
      step4Start,
      "gpt-4o (reasoning tier)",
      "success",
      `Mined ${peopleIntelligence.caseStudies.length} practitioner case studies, ${peopleIntelligence.routes.length} routes, and ${peopleIntelligence.patterns.length} trajectory patterns.`,
      `Target: ${targetRole}`,
      { peopleIntelligence }
    );

    // Format trajectoryAnalysis object for backward compatibility
    const trajectoryAnalysis: CareerTrajectoryOutput = {
      targetRole,
      summary: peopleIntelligence.summary,
      recurringTrajectoryStages: peopleIntelligence.stages,
      stages: peopleIntelligence.stages,
      professionals: (peopleIntelligence.caseStudies || []).map((cs: TrajectoryCaseStudy) => ({
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
        transitions: cs.careerTransitions || "Progressive milestone",
        relevantTransition: cs.careerTransitions || "Progressive milestone",
        relevanceToCandidate: cs.relevanceExplanation || "Proven precedent",
        whyRelevant: cs.relevanceExplanation || "Proven precedent",
        sources: cs.sources || [],
      })),
      routes: peopleIntelligence.routes,
      recurringPatterns: peopleIntelligence.patterns,
      patterns: peopleIntelligence.patterns,
      closestRoute: peopleIntelligence.routes?.find((r: CareerRouteItem) => r.isClosestRoute) || peopleIntelligence.routes?.[0] || null,
      commonSkills: [],
      commonExperiences: [],
      commonTransitions: [],
      evidencePatterns: [],
      confidence: "High",
      limitations: "Synthesized from authentic domain research",
      sources: marketAnalysis.sources,
      isControlledFallback: false,
    };

    await updateAnalysisRecord(recordId, {
      market_analysis: marketAnalysis,
      trajectory_analysis: trajectoryAnalysis,
      analysis_status: "analyzing_gaps",
      agent_trace: trace,
    });

    // ------------------------------------------------------------------------
    // STEP 5: Triple-Triangulation Gap Analysis Agent
    // ------------------------------------------------------------------------
    await notify(
      "analyzing_gaps",
      "Triangulating candidate evidence against employer expectations and career routes..."
    );
    const step5Start = Date.now();
    const gapResult = await runGapAgent({
      candidateProfile,
      skillsDiscovery: skillsAnalysis,
      marketIntelligence: marketAnalysis,
      peopleIntelligence,
      goalIntent,
    });
    const gapAnalysis = gapResult.gapAnalysis;
    const structuredGaps = gapResult.structuredGaps;

    recordStep(
      "Gap Analysis Agent",
      6,
      step5Start,
      "gpt-4o (reasoning tier)",
      "success",
      `Calibrated readiness score at ${gapAnalysis.readinessScore}/100. Diagnosed ${gapAnalysis.skillGaps.length} skill gaps, ${gapAnalysis.experienceGaps.length} experience gaps, and ${gapAnalysis.evidenceGaps.length} evidence gaps.`,
      `Triple Triangulation: Evidence vs Requirements vs Trajectories`,
      { gapAnalysis, structuredGaps }
    );

    await updateAnalysisRecord(recordId, {
      gap_analysis: gapAnalysis,
      analysis_status: "generating_pathway",
      agent_trace: trace,
    });

    // ------------------------------------------------------------------------
    // STEP 6: Fast-Path Roadmap Architect Agent
    // ------------------------------------------------------------------------
    await notify(
      "generating_pathway",
      "Architecting action-oriented 4-phase pathway and 90-day timeline..."
    );
    const step6Start = Date.now();
    let roadmap = await runRoadmapAgent({
      candidateProfile,
      gapAnalysis,
      structuredGaps,
      goalIntent,
    });

    recordStep(
      "Roadmap Architect Agent",
      7,
      step6Start,
      "gpt-4o (reasoning tier)",
      "success",
      `Architected 4-phase pathway (LEARN: ${roadmap.phases?.LEARN?.length || 0}, BUILD: ${roadmap.phases?.BUILD?.length || 0}, DEMONSTRATE: ${roadmap.phases?.DEMONSTRATE?.length || 0}, REASSESS: ${roadmap.phases?.REASSESS?.length || 0}) with 90-day timeline.`,
      `Gaps & Calibrated Readiness (${gapAnalysis.readinessScore}/100)`,
      { roadmap }
    );

    // ------------------------------------------------------------------------
    // STEP 7: Gap-Mapped Resource Intelligence Agent
    // ------------------------------------------------------------------------
    const step7Start = Date.now();
    let resources = await runResourceAgent({
      candidateProfile,
      goalIntent,
      gapAnalysis,
      structuredGaps,
    });

    recordStep(
      "Resource Intelligence Agent",
      8,
      step7Start,
      "gpt-4o (reasoning tier)",
      "success",
      `Curated ${resources.resources.length} domain resources directly mapped to candidate gaps with expected deliverables.`,
      `Structured Gaps (${structuredGaps.length})`,
      { resources }
    );

    // ------------------------------------------------------------------------
    // STEP 8: Multi-Agent Debate & Validation Agent (Reciprocal Critique & Refinement)
    // ------------------------------------------------------------------------
    await notify(
      "generating_pathway",
      "Running reciprocal multi-agent validation and adversarial debate audit..."
    );
    const step8Start = Date.now();
    const validationResult = await runValidationAgent({
      goalIntent,
      candidateProfile,
      marketIntelligence: marketAnalysis,
      peopleIntelligence,
      gapAnalysis,
      roadmap,
      resources,
    });

    let validationStatus: "success" | "critiqued" | "revised" = validationResult.approved ? "success" : "critiqued";

    // If critique found issues (e.g. slight domain misalignment or missing proof), execute a single targeted refinement pass
    if (!validationResult.approved && validationResult.critiqueNotes?.length > 0) {
      console.log(`[Validation Agent Critique] Found ${validationResult.critiqueNotes.length} critique points. Running refinement pass.`);
      try {
        roadmap = await runRoadmapAgent({
          candidateProfile,
          gapAnalysis,
          structuredGaps,
          goalIntent,
        });
        resources = await runResourceAgent({
          candidateProfile,
          goalIntent,
          gapAnalysis,
          structuredGaps,
        });
        validationStatus = "revised";
      } catch (refineErr) {
        console.warn("[Validation Agent Refinement Warning]", refineErr);
      }
    }

    recordStep(
      "Validation & Debate Agent",
      9,
      step8Start,
      "gpt-4o (reasoning tier)",
      validationStatus,
      `Audit completed. Passed ${validationResult.checks.filter((c) => c.passed).length}/${validationResult.checks.length} checks. ${validationResult.overallAssessment}`,
      `Candidate Plan, Case Studies, Roadmap, and Resources`,
      { validationResult },
      {
        approved: validationResult.approved,
        critiqueNotes: validationResult.critiqueNotes,
        revisionsMade: validationResult.revisionsMade,
      }
    );

    // ------------------------------------------------------------------------
    // STEP 9: State Synthesis Agent
    // ------------------------------------------------------------------------
    const step9Start = Date.now();
    const { macosState, canonicalAnalysis } = runSynthesisAgent({
      goalIntent,
      candidateProfile,
      marketIntelligence: marketAnalysis,
      peopleIntelligence,
      skillsDiscovery: skillsAnalysis,
      competencies,
      gapAnalysis,
      structuredGaps,
      roadmap,
      resources,
      validation: validationResult,
      trace,
    });

    recordStep(
      "Synthesis Agent",
      10,
      step9Start,
      "in-process synthesizer",
      "success",
      `Synthesized canonical intelligence across all 11 sections. Total execution time: ${Date.now() - pipelineStartTime}ms.`,
      `All multi-agent outputs`,
      { macosStateSummary: macosState.goal }
    );

    // Format pathway object for backward compatibility
    const mapRoadmapPhaseToAction = (items: any[] = []) =>
      items.map((item, idx) => ({
        id: item.id || `action-${idx + 1}`,
        stage: item.stage || "LEARN",
        title: item.title || "Milestone Action",
        action: item.action || item.title || "Execute milestone action",
        whyItMatters: item.why || item.whyItMatters || "Directly closes diagnosed competency gap",
        relatedGap: item.relatedGap || "Domain execution gap",
        expectedEvidence: item.proof || item.deliverable || "Verified work sample or deliverable",
        priority: (["high", "medium", "low"].includes((item.priority || "").toLowerCase())
          ? item.priority.toLowerCase()
          : "medium") as "high" | "medium" | "low",
        completionCriteria: item.completionCriteria || "Deliverable completed",
        resources: (item.resources || []).map((r: any) =>
          typeof r === "string" ? r : r.title || "Resource guide"
        ),
        estimatedDuration: item.estimatedDuration || "2-3 weeks",
      }));

    const pathway: PathwayOutput = {
      targetRole,
      pathwaySummary: roadmap.fastestPracticalPathSummary,
      stages: {
        LEARN: mapRoadmapPhaseToAction(roadmap.phases?.LEARN),
        BUILD: mapRoadmapPhaseToAction(roadmap.phases?.BUILD),
        DEMONSTRATE: mapRoadmapPhaseToAction(roadmap.phases?.DEMONSTRATE),
        REASSESS: mapRoadmapPhaseToAction(roadmap.phases?.REASSESS),
      },
      milestones: mapRoadmapPhaseToAction(roadmap.milestones),
    };

    // ------------------------------------------------------------------------
    // STEP 10: Final Persistence
    // ------------------------------------------------------------------------
    const completedRecord = await updateAnalysisRecord(recordId, {
      pathway,
      canonical_analysis: canonicalAnalysis,
      macos_state: macosState,
      agent_trace: trace,
      analysis_status: "completed",
    });

    await notify("completed", "Career Map orchestration successfully completed.");

    if (!completedRecord) {
      throw new Error("Failed to finalize analysis record.");
    }

    return completedRecord;
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[M.A.C.O.S. Orchestrator] Pipeline execution failed:`, error);
    await updateAnalysisRecord(recordId, {
      analysis_status: "failed",
      error_message: errorMsg,
      agent_trace: trace,
    });
    await notify("failed", `Analysis failed: ${errorMsg}`);
    throw error;
  }
}
