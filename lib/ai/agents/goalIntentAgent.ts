import { generateStructuredJson } from "../foundryClient";
import { GoalIntent, GoalIntentSchema, DomainCategory } from "@/types";

export interface ClassifyGoalParams {
  targetRole: string;
  targetIndustry?: string;
  targetCompany?: string;
  additionalContext?: string;
  resumeSummary?: string;
}

/**
 * Goal & Intent Agent:
 * Analyzes the user's natural language destination and context to classify domain,
 * goal type, seniority level, and generates precise, targeted search queries without bias.
 */
export async function runGoalIntentAgent({
  targetRole,
  targetIndustry = "",
  targetCompany = "",
  additionalContext = "",
  resumeSummary = "",
}: ClassifyGoalParams): Promise<GoalIntent> {
  const prompt = `
You are the Goal & Intent Classification Agent for M.A.C.O.S.
Your job is to objectively analyze the user's career or learning goal and categorize its domain, intent, and generate search queries without any bias toward technology or software engineering.

TARGET DESTINATION:
- Role / Goal: "${targetRole}"
- Stated Industry: "${targetIndustry || "Not specified"}"
- Stated Company: "${targetCompany || "Not specified"}"
- Additional Context / Preferences: "${additionalContext || "None"}"
- Candidate Context Snippet: "${resumeSummary || "None"}"

DOMAIN CATEGORIES:
- "hospitality": Restaurant, fast food, waiter, hotel, front desk, barista, event staffing, customer service
- "trades_crafts": Plumbing, electrical, carpentry, HVAC, welding, mechanic, construction, roofing
- "healthcare_nursing": Nurse, medical assistant, doctor, pharmacy, physical therapy, caretaking, EMT
- "culinary_food": Chef, line cook, baker, pastry chef, food prep, catering, food safety
- "software_tech": Frontend, backend, fullstack, DevOps, QA, product manager, UX designer, systems architect
- "ai_data": AI researcher, ML engineer, data scientist, data analyst, prompt engineer, NLP specialist
- "creative_arts": Musician, guitarist, painter, video editor, writer, photographer, animator, actor
- "business_finance": Accounting, investment banking, marketing, sales, HR, operations, supply chain
- "education_academics": Teacher, tutor, university professor, researcher, instructional designer
- "sports_fitness": Personal trainer, athletic coach, yoga instructor, nutritionist, athlete
- "legal_public": Paralegal, lawyer, policy analyst, government clerk, civil service
- "other": Any unique or uncategorized vocational or learning pursuit

DIRECTIVES:
1. STRICT DOMAIN CLASSIFICATION:
   - If the user specifies "McDonald's waiter" or "restaurant server", the domain MUST be "hospitality" (or "culinary_food"). NEVER classify non-tech roles as "software_tech" or "ai_data".
   - If the user specifies "Plumber", domain MUST be "trades_crafts".
   - If the user specifies "Guitarist", domain MUST be "creative_arts".
   - If the user specifies "Nurse", domain MUST be "healthcare_nursing".
2. TARGET LEVEL & GOAL TYPE:
   - Identify whether this is "entry_level", "mid_level", "senior_level", or "mastery". (e.g. "McDonald's waiter" is "entry_level" / "job_entry").
3. KEY SEARCH QUERIES (3 to 5 queries):
   - Formulate 3-5 concrete search queries targeting real-world employer expectations, daily tasks, certifications, and entry standards for this EXACT goal.
   - Example for McDonald's waiter:
     * "McDonald's crew member job responsibilities food service"
     * "fast food restaurant cashier guest hospitality requirements"
     * "food safety hygiene basics restaurant crew onboarding"
     * "entry level restaurant service job application interview tips"
4. PRIMARY DOMAIN SKILLS:
   - List 4 to 6 real competencies genuine to this goal.
`.trim();

  return await generateStructuredJson<GoalIntent>({
    prompt,
    schema: GoalIntentSchema,
    systemInstruction:
      "You are an expert vocational and career classifier. Classify the user's intent objectively across all domains (hospitality, trades, healthcare, music, arts, business, tech) without assuming tech or software.",
  });
}
