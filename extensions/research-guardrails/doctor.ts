import { loadPolicy } from '../../src/policy.ts';
import { loopbackUrl, requestJson, workspaceUrl } from '../../src/http.ts';

export async function doctor(cwd: string, tools: string[], env: NodeJS.ProcessEnv = process.env) {
  const checks: Record<string, string> = { package: 'pi-research-scientist loaded', web: ['web_search', 'fetch_content', 'get_search_content', 'source_check'].every(t => tools.includes(t)) ? 'pi-web-access tool interface available' : 'missing one or more pi-web-access tools; install npm:pi-web-access and reload' };
  try {
    const p = await loadPolicy(cwd);
    checks.policy = 'valid'; checks.mode = p.project.type;
    checks.rows = 'not implemented; no pi-research-scientist tool returns raw Databricks rows';
    checks.model_policy = p.project.type === 'internal' && !p.data_policy.approved_models.length ? 'internal data tools blocked until approved_models is configured' : 'current model checked before each private-data tool call; history is not protected';
    checks.databricks = p.databricks.enabled ? 'enabled by policy' : 'disabled by policy';
    checks.mlflow = p.mlflow.enabled ? 'enabled by policy; service not probed' : 'disabled by policy';
  } catch { checks.policy = 'missing or invalid research.yaml; data tools fail closed'; checks.rows = 'disabled'; }
	  checks.databricks_auth = env.DATABRICKS_TOKEN ? 'environment token configured (not validated)' : 'no environment token; configured CLI authentication may be available';
  if (env.DATABRICKS_HOST) {
    try { workspaceUrl(env.DATABRICKS_HOST); checks.databricks_host = 'valid HTTPS origin; not live verified'; }
    catch { checks.databricks_host = 'invalid workspace origin'; }
	  } else checks.databricks_host = 'not configured';
	  if (env.MLFLOW_TRACKING_URI) {
	    try {
	      const url = env.MLFLOW_TRACKING_URI.startsWith('http:') ? loopbackUrl(env.MLFLOW_TRACKING_URI) : workspaceUrl(env.MLFLOW_TRACKING_URI);
	      checks.mlflow_tracking = `${url.protocol === 'https:' ? 'HTTPS' : 'loopback'} origin configured; not live verified`;
	    } catch { checks.mlflow_tracking = 'invalid tracking origin'; }
	  } else checks.mlflow_tracking = 'uses Databricks host/auth when enabled; not live verified';
	  checks.mlflow_artifacts = env.MLFLOW_ARTIFACT_DOWNLOAD_MODE === 'presigned' ? 'presigned download mode configured; policy gates still apply' : 'content download disabled unless explicitly configured';
  try {
	    const base = loopbackUrl(env.ZOTERO_LOCAL_API_URL || 'http://127.0.0.1:23119/api/');
    const url = new URL(`${base.toString().replace(/\/$/, '')}/users/0/items?limit=1`);
    await requestJson(url, { headers: { 'Zotero-API-Version': '3' }, timeoutMs: 1500, maxBytes: 100000 });
    checks.zotero = 'reachable';
  } catch { checks.zotero = 'unavailable; start Zotero and enable local API communication'; }
  try {
	    const url = loopbackUrl(env.BETTER_BIBTEX_JSON_RPC_URL || 'http://127.0.0.1:23119/better-bibtex/json-rpc');
    const result = await requestJson<{result?: unknown; error?: unknown}>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'api.ready', params: [] }), timeoutMs: 1500, maxBytes: 10000 });
    checks.better_bibtex = result.error || result.result === undefined ? 'not ready or unsupported; optional' : 'reachable';
  } catch { checks.better_bibtex = 'unavailable; optional Better BibTeX plugin'; }
  checks.scholarly = `Crossref public API; OpenAlex key ${env.OPENALEX_API_KEY ? 'configured' : 'absent'}; Semantic Scholar key ${env.SEMANTIC_SCHOLAR_API_KEY ? 'configured' : 'absent'}; no remote service probed`;
  return checks;
}
