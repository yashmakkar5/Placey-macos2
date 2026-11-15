"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Cpu,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Eye,
  ChevronDown,
  ChevronRight,
  Layers,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentTraceStep } from "@/types";

const PRESET_PROMPTS = [
  { role: "McDonald's waiter", industry: "Hospitality / Fast Food", desc: "Test hospitality & customer service with ZERO tech contamination" },
  { role: "Journeyman Plumber", industry: "Trades & Crafts", desc: "Test plumbing code, toolsets, and apprenticeship pathways" },
  { role: "Classical Guitarist", industry: "Creative Arts & Music", desc: "Test repertoire, metronome drills, and audio performance" },
  { role: "AI Research Scientist", industry: "AI & Machine Learning", desc: "Test technical deep-learning, papers, and benchmark models" },
  { role: "Technical Product Manager", industry: "Software & SaaS", desc: "Test cross-functional roadmap and product telemetry" },
];

export function InteractiveAgentDebugger() {
  const [targetRole, setTargetRole] = useState("McDonald's waiter");
  const [targetIndustry, setTargetIndustry] = useState("Hospitality / Fast Food");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trace, setTrace] = useState<AgentTraceStep[]>([]);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});

  const toggleStep = (stepNum: number) => {
    setExpandedSteps((prev) => ({ ...prev, [stepNum]: !prev[stepNum] }));
  };

  const handleRunPipeline = async () => {
    if (!targetRole.trim()) return;
    setIsRunning(true);
    setError(null);
    setTrace([]);
    setAnalysisId(null);

    try {
      const res = await fetch("/api/debug/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetRole: targetRole.trim(),
          targetIndustry: targetIndustry.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Pipeline execution failed");
      }

      setTrace(data.trace || []);
      setAnalysisId(data.analysisId);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  };

  const totalDuration = trace.reduce((acc, step) => acc + (step.durationMs || 0), 0);

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-[#121016] p-6 sm:p-8 space-y-6 shadow-2xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-[#ac1ed6] animate-ping" />
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="h-5 w-5 text-[#ac1ed6]" />
              Live Multi-Agent Pipeline Test Runner
            </h2>
          </div>
          <p className="text-xs text-[#9a93a5] mt-1">
            Execute the 10-step reciprocal debate pipeline on Azure AI Foundry in real-time.
          </p>
        </div>

        {analysisId && (
          <Link href={`/results/${analysisId}`}>
            <Button size="sm" className="rounded-full bg-gradient-to-r from-[#ac1ed6] to-[#c26e73] text-white text-xs gap-1.5 font-bold shadow-lg shadow-[#ac1ed6]/20">
              <Eye className="h-3.5 w-3.5" />
              View Resulting Career Map
            </Button>
          </Link>
        )}
      </div>

      {/* Preset Pickers */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-[#d5d0dd]">
          Test Benchmark Domains
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PRESET_PROMPTS.map((p) => (
            <button
              key={p.role}
              type="button"
              disabled={isRunning}
              onClick={() => {
                setTargetRole(p.role);
                setTargetIndustry(p.industry);
              }}
              className={`rounded-2xl border p-3 text-left transition-all ${
                targetRole === p.role
                  ? "border-[#ac1ed6] bg-[#ac1ed6]/10 text-white shadow-md shadow-[#ac1ed6]/10"
                  : "border-white/[0.06] bg-white/[0.02] text-[#9a93a5] hover:text-white hover:border-white/20"
              }`}
            >
              <p className="text-xs font-bold text-white">{p.role}</p>
              <p className="text-[10px] text-[#ac1ed6] font-mono mt-0.5">{p.industry}</p>
              <p className="text-[10px] text-[#757080] mt-1 line-clamp-1">{p.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Custom Inputs & Run Trigger */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#d5d0dd]">Target Goal / Role</label>
          <input
            type="text"
            value={targetRole}
            onChange={(e) => setTargetRole(e.target.value)}
            placeholder="e.g. McDonald's waiter, Electrician, Guitarist"
            className="w-full rounded-xl border border-white/10 bg-[#090607]/80 px-3.5 py-2.5 text-xs text-white placeholder:text-[#757080] focus:border-[#ac1ed6] focus:outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-[#d5d0dd]">Target Industry / Domain (Optional)</label>
          <input
            type="text"
            value={targetIndustry}
            onChange={(e) => setTargetIndustry(e.target.value)}
            placeholder="e.g. Hospitality, Skilled Trades, Music"
            className="w-full rounded-2xl border border-white/10 bg-[#090607]/80 px-3.5 py-2.5 text-xs text-white placeholder:text-[#757080] focus:border-[#ac1ed6] focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          onClick={handleRunPipeline}
          disabled={isRunning || !targetRole.trim()}
          className="rounded-full bg-gradient-to-r from-[#ac1ed6] to-[#c26e73] text-white text-xs font-bold gap-2 px-6 h-10 shadow-lg shadow-[#ac1ed6]/25 hover:opacity-90"
        >
          {isRunning ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin text-white" />
              Running 10-Agent Pipeline on Azure AI Foundry...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 fill-white" />
              Execute Live Pipeline
            </>
          )}
        </Button>

        {trace.length > 0 && (
          <span className="text-xs font-mono text-[#9a93a5] flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-[#ac1ed6]" />
            Total Pipeline Latency: {(totalDuration / 1000).toFixed(2)}s
          </span>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs text-red-300 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      {/* Live Trace Timeline Visualizer */}
      {trace.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-white/[0.06]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#d5d0dd] flex items-center gap-2">
            <Layers className="h-4 w-4 text-[#ac1ed6]" />
            Multi-Agent Step-by-Step Execution Trace ({trace.length} Steps)
          </h3>

          <div className="space-y-2">
            {trace.map((step) => {
              const isExpanded = !!expandedSteps[step.stepNumber];
              const isCritique = step.status === "critiqued" || step.status === "revised";

              return (
                <div
                  key={step.stepNumber}
                  className={`rounded-2xl border transition-all ${
                    isCritique
                      ? "border-amber-500/30 bg-amber-500/[0.03]"
                      : "border-white/[0.08] bg-[#090607]/60"
                  }`}
                >
                  <div
                    onClick={() => toggleStep(step.stepNumber)}
                    className="flex items-center justify-between p-3.5 cursor-pointer hover:bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-[11px] font-mono font-bold text-[#ac1ed6]">
                        {step.stepNumber}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">{step.agentName}</p>
                          <span className="rounded-md bg-white/[0.05] px-1.5 py-0.5 text-[10px] font-mono text-[#757080]">
                            {step.modelUsed}
                          </span>
                          {step.critiqueOrValidation && (
                            <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-2 py-0.2 text-[10px] text-purple-300 flex items-center gap-1 font-semibold">
                              <ShieldCheck className="h-3 w-3" />
                              Critique Audited
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-[#9a93a5] mt-0.5">{step.summary}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[11px] font-mono text-[#757080]">
                        {step.durationMs}ms
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-[#757080]" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-[#757080]" />
                      )}
                    </div>
                  </div>

                  {/* Expanded Payload & Validation Details */}
                  {isExpanded && (
                    <div className="border-t border-white/[0.06] p-4 bg-[#090607]/90 space-y-3 rounded-b-2xl">
                      {step.inputSummary && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#757080]">
                            Input Summary
                          </p>
                          <p className="text-xs text-[#d5d0dd] mt-0.5 font-mono">{step.inputSummary}</p>
                        </div>
                      )}

                      {step.critiqueOrValidation && (
                        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
                          <p className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Adversarial Validation & Critique Notes
                          </p>
                          {step.critiqueOrValidation.critiqueNotes?.map((note: string, idx: number) => (
                            <p key={idx} className="text-xs text-amber-200/90 pl-4 border-l border-amber-500/30">
                              • {note}
                            </p>
                          ))}
                          {step.critiqueOrValidation.revisionsMade?.map((rev: string, idx: number) => (
                            <p key={idx} className="text-xs text-emerald-300/90 pl-4 border-l border-emerald-500/30">
                              ✓ Revision: {rev}
                            </p>
                          ))}
                        </div>
                      )}

                      {step.outputPayload && (
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-[#757080] mb-1">
                            Output Payload Inspector
                          </p>
                          <pre className="max-h-48 overflow-y-auto rounded-xl bg-black/60 p-3 text-[11px] font-mono text-emerald-400 border border-white/[0.06]">
                            {JSON.stringify(step.outputPayload, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
