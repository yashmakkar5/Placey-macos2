import { NextRequest, NextResponse } from "next/server";
import { orchestrateCareerAnalysis } from "@/agents/orchestrator/careerOrchestrator";
import { SYNTHETIC_RESUME_TEXT } from "@/lib/fixtures/syntheticResume";

export const maxDuration = 120; // 120s for complete multi-agent pipeline

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const targetRole = body.targetRole || "McDonald's waiter";
    const targetIndustry = body.targetIndustry || "";
    const resumeText = body.resumeText || SYNTHETIC_RESUME_TEXT;
    const additionalContext = body.additionalContext || "";

    const record = await orchestrateCareerAnalysis({
      resumeFileName: "debug_test_run.docx",
      resumeText,
      targetRole,
      targetIndustry,
      additionalContext,
    });

    return NextResponse.json({
      success: true,
      analysisId: record.id,
      trace: record.agent_trace || [],
      macosState: record.macos_state,
      canonicalAnalysis: record.canonical_analysis,
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[Debug Pipeline API Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
