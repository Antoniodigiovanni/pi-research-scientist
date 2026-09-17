import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile, rm, mkdir, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { parsePolicy, loadToolPolicy } from '../src/policy.ts';
import databricks from '../extensions/databricks/index.ts';
import mlflow from '../extensions/mlflow/index.ts';
import zotero, { writeProjectReferences } from '../extensions/zotero/index.ts';
import { DatabricksClient } from '../extensions/databricks/client.ts';
import { profileTable } from '../extensions/databricks/profiling.ts';
import { normalizeSqlResult } from '../extensions/databricks/normalize.ts';
import { normalizeRun } from '../extensions/mlflow/normalize.ts';
import { normalizeItem, normalizeFullText } from '../extensions/zotero/normalize.ts';
import { normalizeOpenReviewNote } from '../extensions/scholarly/openreview.ts';
import { normalizeOpenAlexWork } from '../extensions/scholarly/openalex.ts';
import { normalizeCrossrefWork } from '../extensions/scholarly/crossref.ts';
import { normalizeSemanticScholarPaper } from '../extensions/scholarly/semantic-scholar.ts';
import { deduplicateRecords } from '../extensions/scholarly/dedupe.ts';
import { normalizeDoi } from '../extensions/scholarly/text.ts';
import { renderDatasetDocumentation } from '../extensions/databricks/documentation.ts';

const source = 'project:\n  name: audit\n  type: internal\n  research_question: Synthetic question\n  owner: tester\n';

test('every private-data tool rejects missing policy and unapproved models before I/O', async () => {
  const tools: Array<{name: string; execute: Function}> = [];
  const api = { registerTool: (tool: typeof tools[number]) => tools.push(tool) } as unknown as ExtensionAPI;
  databricks(api); mlflow(api); zotero(api);
  assert.equal(tools.length, 26);
  const cwd = await mkdtemp(join(tmpdir(), 'pi-research-scientist-gates-'));
  try {
    for (const tool of tools) await assert.rejects(tool.execute('test', {}, undefined, undefined, { cwd }), /Cannot read research.yaml/, tool.name);
    await writeFile(join(cwd, 'research.yaml'), source);
    for (const tool of tools) await assert.rejects(tool.execute('test', {}, undefined, undefined, { cwd, model: {provider:'test', id:'unapproved'} }), /not explicitly approved/, tool.name);
    await writeFile(join(cwd, 'research.yaml'), source + 'data_policy:\n  approved_models: [test/approved]\n');
    for (const tool of tools.filter(t => /zotero|better_bibtex/.test(t.name))) {
      await assert.rejects(tool.execute('test', {}, undefined, undefined, { cwd, model: {provider:'test', id:'approved'} }), /raw_data_to_model/, tool.name);
    }
    await assert.doesNotReject(loadToolPolicy({cwd, model: {provider:'test',id:'approved'}}));
    await assert.rejects(loadToolPolicy({cwd}), /not explicitly approved/);
    await writeFile(join(cwd, 'research.yaml'), source.replace('internal', 'public'));
    await assert.doesNotReject(loadToolPolicy({cwd}));
  } finally { await rm(cwd, { recursive: true, force: true }); }
});

function profileFixture(tags: Array<Record<string, string | null>>, count = '100', nulls = '4') {
  let counts = 0;
  const client = {
    getTable: async () => ({ columns: [{ name: 'score', type: 'DOUBLE' }] }),
    getTableTags: async () => ({ rows: tags }),
    getApprovedRowCount: async () => { counts++; return { rows: [{ row_count: '100' }] }; },
    getApprovedProfile: async () => ({ rows: [{ row_count: count, duplicate_rows: '0', c0_null_count: nulls, c0_cardinality: '2', c0_minimum: 'private-extremum' }] }),
  } as unknown as DatabricksClient;
  const policy = parsePolicy(source + 'databricks:\n  enabled: true\n  allowed_catalogs: [a]\n  allowed_schemas: [a.b]\n  warehouse: test\n  approved_tables:\n    a.b.c: [score]\n');
  return { client, policy, counts: () => counts };
}

test('unrelated and irrelevant-column tags do not authorize any row count', async () => {
  for (const tag of [
    {object_type:'table', column_name:null, tag_name:'owner', tag_value:'public'},
    {object_type:'column', column_name:'other', tag_name:'classification', tag_value:'public'},
    {object_type:'table', column_name:null, tag_name:'classification', tag_value:'unclassified'},
  ]) {
    const f = profileFixture([tag]);
    await assert.rejects(profileTable(f.client, f.policy, 'a.b.c', ['score']), /classification=public/);
    assert.equal(f.counts(), 0);
  }
});

test('profiles suppress shrinking cohorts and sparse column values, and use same-statement denominators', async () => {
  const tags = [{object_type:'table',column_name:null,tag_name:'classification',tag_value:'public'}];
  const small = profileFixture(tags, '3', '0');
  assert.deepEqual((await profileTable(small.client, small.policy, 'a.b.c', ['score'])).columns, []);
  const sparse = profileFixture(tags, '100', '99');
  const result = await profileTable(sparse.client, sparse.policy, 'a.b.c', ['score']);
  assert.deepEqual(result.columns, [{ name:'score',type:'DOUBLE',suppressed:true }]);
  assert.doesNotMatch(JSON.stringify(result), /private-extremum/);
  const changed = profileFixture(tags, '200', '20');
  assert.equal((await profileTable(changed.client, changed.policy, 'a.b.c', ['score'])).columns[0]?.nullProportion, 0.1);
  const malformed = profileFixture(tags, 'NaN');
  await assert.rejects(profileTable(malformed.client, malformed.policy, 'a.b.c', ['score']), /invalid profile row count/);
});

test('SQL truncation and unexpected result chunks are not silently treated as complete classification', () => {
  const result = {status:{state:'SUCCEEDED'},manifest:{schema:{columns:[]},truncated:true},result:{data_array:[]}};
  assert.throws(() => normalizeSqlResult(result), /truncated/);
  result.manifest.truncated = false;
  assert.throws(() => normalizeSqlResult({...result,result:{data_array:[],next_chunk_index:1}}), /multi-part/);
});

test('MLflow metadata requires explicit keys and never exposes storage URLs or credential keys', () => {
  const run = {info:{run_id:'a',experiment_id:'b',artifact_uri:'https://secret.example/?token=secret'},data:{params:[{key:'model',value:''},{key:'password',value:'secret'},{key:'unapproved',value:'secret'}],tags:[{key:'fixture',value:''}],metrics:[{key:'loss',value:1}]}};
  const result = normalizeRun(run, ['model','password','fixture'], false);
  assert.deepEqual(result.data.params, [{key:'model',value:''}]);
  assert.deepEqual(result.data.tags, [{key:'fixture',value:''}]);
  assert.deepEqual(result.data.metrics, []);
  assert.doesNotMatch(JSON.stringify(result), /secret|password|unapproved/);
});

test('bibliographic status does not turn preprints or a bare venue ID into acceptance', () => {
  const crossref = normalizeCrossrefWork({DOI:'10.1234/test',type:'posted-content',published:{'date-parts':[[2025]]}});
  assert.equal(crossref.publicationStatus, 'preprint');
  assert.equal(crossref.publicationDate, '2025');
  assert.equal(normalizeOpenAlexWork({type:'preprint',publication_year:2025,primary_location:{source:{display_name:'arXiv'}}}).publicationStatus, 'preprint');
  assert.equal(normalizeSemanticScholarPaper({venue:'arXiv',publicationDate:'2025-01-01'}).publicationStatus, 'preprint');
  assert.equal(normalizeOpenReviewNote({content:{venueid:{value:'venue/2026/Conference'}}}).publicationStatus, 'submitted');
  assert.equal(normalizeOpenReviewNote({content:{venue:{value:'Accepted'}}}).publicationStatus, 'accepted');
  assert.equal(normalizeOpenReviewNote({content:{venue:{value:'Withdrawn'}}}).publicationStatus, 'withdrawn');
  const published = normalizeCrossrefWork({DOI:'10.1234/test',type:'journal-article',published:{'date-parts':[[2026]]}});
  for (const records of [[crossref,published],[published,crossref]]) {
    const merged = deduplicateRecords(records)[0]!;
    assert.equal(merged.publicationStatus, 'unknown');
    assert.equal(merged.statusHistory?.length, 2);
  }
  assert.equal(normalizeDoi('10.1234/valid.'), '10.1234/valid.');
});

test('Zotero keeps citation fields and annotation locators; empty indexed text is represented', () => {
  const item = normalizeItem({key:'ITEM0001',data:{itemType:'annotation',publicationTitle:'Journal',volume:'2',pages:'3–4',annotationPageLabel:'4',annotationPosition:'{"pageIndex":3}'}});
  assert.equal(item.data.publicationTitle,'Journal');
  assert.equal(item.data.annotationPageLabel,'4');
  assert.equal(item.data.annotationPosition,'{"pageIndex":3}');
  assert.equal(normalizeFullText({content:'',indexedPages:0,totalPages:10}).content,'');
});

test('bibliography export rejects both file symlinks and escaping paper directories', async () => {
  const root = await mkdtemp(join(tmpdir(),'pi-research-scientist-links-'));
  try {
    const project = join(root,'project');
    await mkdir(join(project,'paper'),{recursive:true});
    const target = join(root,'valuable.bib');
    await writeFile(target,'keep');
    await symlink(target,join(project,'paper','references.bib'));
    await assert.rejects(writeProjectReferences(project,'replace',true), /symbolic link/);
    assert.equal(await readFile(target,'utf8'),'keep');
    const other = join(root,'other'); await mkdir(other);
    await symlink(root,join(other,'paper'));
    await assert.rejects(writeProjectReferences(other,'replace',true), /outside/);
  } finally { await rm(root,{recursive:true,force:true}); }
});

test('dataset documentation renders scoped facts, escaped cells and explicit evidence gaps', () => {
  const markdown = renderDatasetDocumentation({
    table:{name:'c',fullName:'a.b.c',catalogName:'a',schemaName:'b',comment:'Public | synthetic',columns:[{name:'score',type:'DOUBLE',comment:'Fixture'}]},
    tags:[{objectType:'table',key:'classification',value:'public'}],
    lineage:{table:'a.b.c',upstreamTables:['a.b.source'],downstreamTables:[],omittedOutsideScope:1,coverage:'Incomplete capture'},
    profile:{table:'a.b.c',cohort:{suppressed:true,minimumSize:10},columns:[]},
  });
  assert.ok(markdown.includes('Public \\| synthetic'));
  assert.match(markdown,/classification=public/);
  assert.match(markdown,/a\.b\.source/);
  assert.match(markdown,/Incomplete capture/);
  assert.match(markdown,/Data version or snapshot: TODO/);
  assert.match(markdown,/profile suppressed/);
});
