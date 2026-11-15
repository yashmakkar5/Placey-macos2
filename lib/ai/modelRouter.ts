import { z } from "zod";
import {
  generateAzureFoundryStructuredJson,
  generateAzureFoundryText,
  AZURE_FOUNDRY_AGENTS,
  AzureAgentConfig,
  DEFAULT_AZURE_MODEL,
} from "./azureFoundry";

export type ModelTier = "fast" | "reasoning" | "agent";

export interface InvokeModelOptions<T> {
  tier?: ModelTier;
  agent?: AzureAgentConfig;
  prompt: string;
  schema: z.ZodType<T>;
  systemInstruction?: string;
  temperature?: number;
  maxRetries?: number;
}

/**
 * Model Router Abstraction:
 * Routes intelligence requests to the optimal Azure AI Foundry model tier or registered cloud agent.
 * 
 * - fast: High-throughput tasks (e.g. intent extraction, query generation, classification)
 * - reasoning: In-depth cognitive tasks (e.g. multi-angle trajectory analysis, gap derivation, roadmap synthesis, reciprocal debate & critique)
 * - agent: Directly binds to Azure AI Foundry registered agent IDs
 */
export class ModelRouter {
  static async invokeStructured<T>(options: InvokeModelOptions<T>): Promise<T> {
    const temperature =
      options.temperature !== undefined
        ? options.temperature
        : options.tier === "fast"
        ? 0.1
        : 0.2;

    return await generateAzureFoundryStructuredJson<T>({
      prompt: options.prompt,
      schema: options.schema,
      systemInstruction: options.systemInstruction,
      agent: options.agent,
      temperature,
      maxRetries: options.maxRetries ?? 2,
    });
  }

  static async invokeText(options: {
    tier?: ModelTier;
    prompt: string;
    systemInstruction?: string;
    temperature?: number;
  }): Promise<string> {
    return await generateAzureFoundryText({
      prompt: options.prompt,
      systemInstruction: options.systemInstruction,
      temperature: options.temperature ?? 0.2,
    });
  }
}
