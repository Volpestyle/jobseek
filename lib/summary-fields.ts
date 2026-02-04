import fs from "fs";
import path from "path";

export interface SummaryField {
  key: string;
  type: "string" | "array";
  description: string;
}

export const DEFAULT_SUMMARY_FIELDS: SummaryField[] = [
  { key: "skills", type: "array", description: "Hard and soft skills explicitly mentioned" },
  { key: "tech_stack", type: "array", description: "Technologies, languages, frameworks, tools, or platforms" },
  { key: "years_experience", type: "string", description: "Years of experience required (e.g., '3+ years')" },
  { key: "education", type: "string", description: "Education requirements (degrees, fields, or equivalent)" },
  { key: "responsibilities", type: "array", description: "Key responsibilities (short phrases)" },
  { key: "requirements", type: "array", description: "Must-have requirements (short phrases)" },
  { key: "seniority", type: "string", description: "Seniority level (e.g., junior, mid, senior, staff)" },
  { key: "employment_type", type: "string", description: "Employment type (full-time, contract, internship, etc.)" },
  { key: "location_type", type: "string", description: "Location type (remote, hybrid, onsite)" },
  { key: "salary", type: "string", description: "Compensation mentioned in description" },
];

export function loadSummaryFields(pathOverride?: string): SummaryField[] {
  const envFields = process.env.JOB_SUMMARY_FIELDS;
  if (envFields) {
    try {
      const parsed = JSON.parse(envFields);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Fall through
    }
  }

  const filePath = pathOverride
    ? path.resolve(pathOverride)
    : path.join(process.cwd(), "scripts", "summary_fields.json");

  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // Fall through
    }
  }

  return DEFAULT_SUMMARY_FIELDS;
}

export function buildSummarySchema(fields: SummaryField[]): Record<string, unknown> {
  const props: Record<string, unknown> = {
    summary: { type: "string" },
  };

  for (const field of fields) {
    if (!field.key) continue;
    if (field.type === "array") {
      props[field.key] = { type: ["array", "null"], items: { type: "string" } };
    } else {
      props[field.key] = { type: ["string", "null"] };
    }
  }

  return {
    type: "object",
    properties: props,
    required: ["summary"],
  };
}

export function buildSummaryPrompt(
  title: string,
  company: string,
  description: string,
  fields: SummaryField[]
): string {
  const fieldLines = fields
    .filter((f) => f.key)
    .map((f) => (f.description ? `- "${f.key}": ${f.description}` : `- "${f.key}"`));

  return `You extract structured info from job descriptions.
Return JSON only that matches the schema.
Rules:
- Use concise phrases.
- If a field is not mentioned, use null (or [] for arrays).
- Summary should be 2-4 sentences max.

Fields to extract:
${fieldLines.join("\n")}

Job title: ${title}
Company: ${company}

Description:
${description}`;
}
