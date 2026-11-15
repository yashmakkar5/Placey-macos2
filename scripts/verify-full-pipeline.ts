import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { orchestrateCareerAnalysis } from "../agents/orchestrator/careerOrchestrator";
import { SYNTHETIC_RESUME_TEXT } from "../lib/fixtures/syntheticResume";

async function main() {
  console.log("=================================================================");
  console.log("M.A.C.O.S. 10-Agent Pipeline End-to-End Live Verification Suite");
  console.log("Testing Complete Multi-Agent Execution on Azure AI Foundry");
  console.log("=================================================================\n");

  const testCases = [
    {
      name: "Non-Tech Hospitality: McDonald's Waiter / Crew Member",
      targetRole: "McDonald's waiter",
      targetIndustry: "",
      bannedKeywords: [
        "satya nadella",
        "dj patil",
        "kelsey hightower",
        "swyx",
        "python",
        "docker",
        "kubernetes",
        "prd authorship",
        "sql cohort",
        "mixpanel",
      ],
      requiredDomainTerms: ["food", "order", "service", "customer", "pos", "hygiene", "clean"],
    },
    {
      name: "High-Tech AI: AI Research Scientist",
      targetRole: "AI Research Scientist",
      targetIndustry: "Artificial Intelligence & Deep Learning",
      bannedKeywords: ["satya nadella", "dj patil"],
      requiredDomainTerms: ["model", "learning", "neural", "research", "paper", "data", "training"],
    },
  ];

  for (const tc of testCases) {
    console.log(`\n-------------------------------------------------------------`);
    console.log(`RUNNING PIPELINE FOR: ${tc.name}`);
    console.log(`Target Role: "${tc.targetRole}"`);
    console.log(`-------------------------------------------------------------`);

    const record = await orchestrateCareerAnalysis({
      resumeFileName: "test_candidate.docx",
      resumeText: SYNTHETIC_RESUME_TEXT,
      targetRole: tc.targetRole,
      targetIndustry: tc.targetIndustry,
      onProgress: (status, msg) => {
        console.log(`  [Progress -> ${status}] ${msg}`);
      },
    });

    console.log(`\n✔ Pipeline Completed Successfully! ID: ${record.id}`);
    console.log(`  Trace Steps Count: ${record.agent_trace?.length || 0}`);

    record.agent_trace?.forEach((step) => {
      console.log(`   Step ${step.stepNumber}: [${step.agentName}] -> Status: ${step.status} (${step.durationMs}ms) [${step.modelUsed}]`);
      if (step.critiqueOrValidation) {
        console.log(`     Validation Approved: ${step.critiqueOrValidation.approved}`);
        if (step.critiqueOrValidation.critiqueNotes?.length) {
          console.log(`     Critique Notes: ${step.critiqueOrValidation.critiqueNotes.join(" | ")}`);
        }
      }
    });

    const macosState = record.macos_state;
    const canon = record.canonical_analysis;

    if (!macosState || !canon) {
      throw new Error("Missing macos_state or canonical_analysis in completed record!");
    }

    console.log(`\n  MACOSState Goal: ${macosState.goal.standardizedGoal} (${macosState.goal.domain} - ${macosState.goal.domainLabel})`);
    console.log(`  Readiness Score: ${canon.readiness.score}/100 (${canon.readiness.benchmarkLabel})`);
    console.log(`  Case Studies Count: ${macosState.peopleAndTrajectories.caseStudies.length}`);
    macosState.peopleAndTrajectories.caseStudies.forEach((cs, i) => {
      console.log(`    Case Study ${i + 1}: ${cs.name} - ${cs.currentPosition} (Starting: ${cs.startingPoint}, First Opp: ${cs.firstOpportunity})`);
      console.log(`      Transferable: ${cs.transferableAspects.join(", ")}`);
    });

    console.log(`  Roadmap Phases:`);
    console.log(`    LEARN (${macosState.roadmap.phases.LEARN.length} items): ${macosState.roadmap.phases.LEARN.map((l) => l.title).join("; ")}`);
    console.log(`    BUILD (${macosState.roadmap.phases.BUILD.length} items): ${macosState.roadmap.phases.BUILD.map((b) => b.title).join("; ")}`);
    console.log(`    DEMONSTRATE (${macosState.roadmap.phases.DEMONSTRATE.length} items): ${macosState.roadmap.phases.DEMONSTRATE.map((d) => d.title).join("; ")}`);
    console.log(`    REASSESS (${macosState.roadmap.phases.REASSESS.length} items): ${macosState.roadmap.phases.REASSESS.map((r) => r.title).join("; ")}`);

    console.log(`  Resources Mapped Count: ${macosState.resources.length}`);
    macosState.resources.slice(0, 3).forEach((r) => {
      console.log(`    • ${r.title} (For Gap: ${r.forGap}) -> Outcome: ${r.expectedOutcome}`);
    });

    // Adversarial Text Inspection for Banned Keywords & Domain Leakage
    const serializedAnalysis = JSON.stringify(record).toLowerCase();

    for (const banned of tc.bannedKeywords) {
      if (serializedAnalysis.includes(banned.toLowerCase())) {
        throw new Error(`[VIOLATION] Banned keyword/persona found: "${banned}" in ${tc.name}!`);
      }
    }

    let foundConcepts = 0;
    for (const req of tc.requiredDomainTerms) {
      if (serializedAnalysis.includes(req.toLowerCase())) {
        foundConcepts++;
      }
    }

    console.log(`  Domain Term Coverage: ${foundConcepts}/${tc.requiredDomainTerms.length} required domain concepts verified.`);
    if (foundConcepts < 3) {
      throw new Error(`[VIOLATION] Insufficient domain concept coverage in ${tc.name}!`);
    }

    console.log(`✔ ALL ADVERSARIAL INTEGRITY CHECKS PASSED FOR: ${tc.name}\n`);
  }

  console.log("=================================================================");
  console.log("🎉 ALL MULTI-AGENT PIPELINE TESTS PASSED 100% ON LIVE AZURE FOUNDRY!");
  console.log("=================================================================");
}

main().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
