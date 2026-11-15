import {
  GoalIntent,
  MarketIntelligenceOutput,
  CareerTrajectoryOutput,
  SourceReference,
} from "@/types";
import { getDynamicResearchProvider } from "./dynamicResearchProvider";

export interface ResearchResult {
  content: string;
  sources: SourceReference[];
  isControlledFallback: boolean;
}

export interface IResearchProvider {
  searchMarketIntelligence(
    targetRole: string,
    targetIndustry?: string,
    targetCompany?: string,
    goalIntent?: GoalIntent
  ): Promise<MarketIntelligenceOutput>;

  searchCareerTrajectories(
    targetRole: string,
    targetIndustry?: string,
    goalIntent?: GoalIntent,
    candidateSummary?: string
  ): Promise<CareerTrajectoryOutput>;
}

export class GenuineDynamicResearchProvider implements IResearchProvider {
  private dynamic = getDynamicResearchProvider();

  async searchMarketIntelligence(
    targetRole: string,
    targetIndustry = "",
    targetCompany = "",
    goalIntent?: GoalIntent
  ): Promise<MarketIntelligenceOutput> {
    return await this.dynamic.searchMarketIntelligence({
      targetRole,
      targetIndustry,
      targetCompany,
      goalIntent,
    });
  }

  async searchCareerTrajectories(
    targetRole: string,
    targetIndustry = "",
    goalIntent?: GoalIntent,
    candidateSummary = ""
  ): Promise<CareerTrajectoryOutput> {
    return await this.dynamic.searchCareerTrajectories({
      targetRole,
      targetIndustry,
      goalIntent,
      candidateSummary,
    });
  }
}

export function getResearchProvider(): IResearchProvider {
  return new GenuineDynamicResearchProvider();
}
