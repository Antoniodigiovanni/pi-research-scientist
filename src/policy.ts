import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDocument } from 'yaml';

export interface ResearchPolicy {
  project: { name: string; type: 'public' | 'internal'; research_question: string; owner: string };
  data_policy: {
    raw_data_to_model: boolean; allow_aggregates: boolean;
    allow_samples: boolean; allow_sensitive_values: boolean; public_release_allowed: boolean;
    approved_models: string[];
  };
  publication: { intended: boolean; candidate_venues: string[]; external_release_allowed: boolean };
  research: { current_sprint: number; status: string };
}

function object(value: unknown, location: string, keys: string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${location} must be a mapping`);
  for (const key of Object.keys(value)) if (!keys.includes(key)) throw new Error(`Unknown policy field in ${location}`);
  return value as Record<string, unknown>;
}
function string(value: unknown, location: string, fallback?: string): string {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || value.length > 10000) throw new Error(`${location} must be a string`);
  return value;
}
function bool(value: unknown, location: string, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (typeof value !== 'boolean') throw new Error(`${location} must be a boolean`);
  return value;
}
function strings(value: unknown, location: string): string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 1000 || value.some(v => typeof v !== 'string' || !v || v.length > 500)) {
    throw new Error(`${location} must be a bounded list of nonempty strings`);
  }
  return value;
}
function integer(value: unknown, location: string, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || Number(value) < min || Number(value) > max) throw new Error(`${location} is outside its integer range`);
  return Number(value);
}

export function parsePolicy(source: string): ResearchPolicy {
  if (source.length > 100000) throw new Error('research.yaml is too large');
  const doc = parseDocument(source, { uniqueKeys: true });
  if (doc.errors.length) throw new Error('research.yaml is invalid YAML (check duplicate keys and syntax)');
  let raw: unknown;
  try { raw = doc.toJS({ maxAliasCount: 0 }); } catch { throw new Error('YAML aliases are not supported in research.yaml'); }
  const root = object(raw, 'research.yaml', ['project', 'data_policy', 'publication', 'research']);
  const p = object(root.project, 'project', ['name', 'type', 'research_question', 'owner']);
  if (p.type !== 'public' && p.type !== 'internal') throw new Error('project.type must explicitly be public or internal');
  const internal = p.type === 'internal';
  const d = object(root.data_policy ?? {}, 'data_policy', ['raw_data_to_model', 'allow_aggregates', 'allow_samples', 'allow_sensitive_values', 'public_release_allowed', 'approved_models']);
  const pub = object(root.publication ?? {}, 'publication', ['intended', 'candidate_venues', 'external_release_allowed']);
  const r = object(root.research ?? {}, 'research', ['current_sprint', 'status']);
  const result: ResearchPolicy = {
    project: { name: string(p.name, 'project.name'), type: p.type, research_question: string(p.research_question, 'project.research_question'), owner: string(p.owner, 'project.owner') },
    data_policy: {
      raw_data_to_model: bool(d.raw_data_to_model, 'raw_data_to_model', false),
      allow_aggregates: bool(d.allow_aggregates, 'allow_aggregates', true),
      allow_samples: bool(d.allow_samples, 'allow_samples', false),
      allow_sensitive_values: bool(d.allow_sensitive_values, 'allow_sensitive_values', false),
      public_release_allowed: bool(d.public_release_allowed, 'public_release_allowed', !internal),
      approved_models: strings(d.approved_models, 'approved_models'),
    },
    publication: { intended: bool(pub.intended, 'publication.intended', false), candidate_venues: strings(pub.candidate_venues, 'candidate_venues'), external_release_allowed: bool(pub.external_release_allowed, 'external_release_allowed', !internal) },
    research: { current_sprint: integer(r.current_sprint, 'current_sprint', 0, 0, 10000), status: string(r.status, 'research.status', 'discovery') },
  };
  return result;
}

export async function loadPolicy(cwd: string): Promise<ResearchPolicy> {
  let source: string;
  try { source = await readFile(resolve(cwd, 'research.yaml'), 'utf8'); }
  catch { throw new Error('Cannot read research.yaml in the project working directory; initialize or cd to the project root'); }
  return parsePolicy(source);
}

// Enforce at each tool invocation, before creating a client or reading private data.
// This does not control future processing of content already in Pi session history.
export async function loadToolPolicy(ctx: { cwd: string; model?: { provider: string; id: string } }): Promise<ResearchPolicy> {
  const policy = await loadPolicy(ctx.cwd);
  const models = policy.data_policy.approved_models;
  const model = ctx.model ? `${ctx.model.provider}/${ctx.model.id}` : undefined;
  if ((policy.project.type === 'internal' || models.length > 0) && (!model || !models.includes(model))) {
    throw new Error('The current model is not explicitly approved in data_policy.approved_models');
  }
  return policy;
}
