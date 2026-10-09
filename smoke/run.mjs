import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const srcApp = path.resolve(here, '../src/App.jsx');
const authed = "{ name: 'Keerthan', email: 'smoke@example.edu' }";
const payload = "{ title: 'Plan accepted', message: 'Blocks clear 4.5h.', outcome: 'success', before: { score: 72, level: 'HIGH' }, after: { score: 62, level: 'MEDIUM' }, plannedHours: 4.5 }";

const variants = [
  { name: 'a', user: authed, success: 'null' },
  { name: 'b', user: authed, success: payload },
  { name: 'c', user: authed, success: payload.replace("'success'", "'failure'") },
];

// needles are matched against the tag-stripped rendered text ([] = must merely not throw)
const checks = {
  a: [
    ['/', []],
    ['/signup', ['Create your workload map', 'STUDENT WORKLOAD INTELLIGENCE', 'Full name']],
    ['/login', ['Welcome back', 'Demo access']],
    ['/dashboard', ['Statistics Assignment', 'Cloud Computing Lab', 'MEDIUM risk', 'plan can clear 4.5h', 'In progress', 'Due 24 Sept 2026 - in 3 days', '4 tracked']],
    ['/add-assignment', ['Give DeadlineMap the minimum data it needs', 'Clustered due dates push the forecast up', 'Priority', 'Status']],
    ['/assignment/marketing-report', ['Marketing Report', 'Item risk', 'in 3 days', 'MEDIUM risk', 'Estimated', 'Remaining', '46']],
    ['/assignment/marketing-report/progress', ['Projected item risk', 'Optional note', 'Out of 10h estimated', 'LIVE PREVIEW', 'h remaining']],
    ['/workload', ['CAPACITY CHECK', '76% of the 24h study-week budget', 'Peak day', 'of budget', 'Thu']],
    ['/risk', ['72 /100 SCORE IS BUILT', 'Weight 40 %', 'Weight 35 %', 'Weight 25 %', 'Weighted total: 40 + 26.7 + 4.9 = 72 / 100', 'WHY YOUR RISK IS HIGH', 'not a diagnosis']],
    ['/plan', ['Forecast after', 'Forecast now', 'Why: High priority', 'Accept recommended plan', '62', '-10']],
    ['/success', ['ACTION COMPLETE', 'Plan updated']],
    ['/nope', []],
  ],
  b: [['/success', ['ACTION COMPLETE', 'Forecast before', 'Work cleared', 'Return to dashboard', 'Reset demo data']]],
  c: [['/success', ['ACTION NEEDED', 'Forecast after', 'Review the risk breakdown', 'not a diagnosis', 'Add capacity or reduce scope']]],
};

mkdirSync(here, { recursive: true });

let passes = 0;
let failures = 0;

for (const variant of variants) {
  let code = readFileSync(srcApp, 'utf8').replace(/from '\.\//g, "from '../src/");
  code = code.replace('const [user, setUser] = useState(null);', `const [user, setUser] = useState(${variant.user});`);
  code = code.replace('const [success, setSuccess] = useState(null);', `const [success, setSuccess] = useState(${variant.success});`);
  writeFileSync(path.join(here, `AppVariant-${variant.name}.jsx`), code);

  const routes = checks[variant.name].map(([route]) => route);
  const entry = [
    "import React from 'react';",
    "import { renderToString } from 'react-dom/server';",
    "import { MemoryRouter } from 'react-router-dom';",
    `import App from './AppVariant-${variant.name}.jsx';`,
    `for (const route of ${JSON.stringify(routes)}) {`,
    '  try {',
    '    const html = renderToString(React.createElement(MemoryRouter, { initialEntries: [route] }, React.createElement(App)));',
    '    const text = html.replace(/<[^>]+>/g, " ").replace(/\\s+/g, " ").trim();',
    '    console.log("ROUTE " + route + " HTML " + html.length + " TEXT " + text);',
    '  } catch (error) {',
    '    console.log("ROUTE " + route + " RUNTIME-ERROR " + (error && error.message));',
    '  }',
    '}',
  ].join('\n');

  const entryFile = path.join(here, `entry-${variant.name}.jsx`);
  const outfile = path.join(here, `bundle-${variant.name}.mjs`);
  writeFileSync(entryFile, entry);
  await build({
    entryPoints: [entryFile],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'esm',
    jsx: 'automatic',
    external: ['react', 'react-dom', 'react-dom/server', 'react-router-dom', 'lucide-react'],
    logLevel: 'silent',
  });

  let output = '';
  try {
    output = execFileSync(process.execPath, [outfile], { encoding: 'utf8' });
  } catch (error) {
    console.log(`VARIANT ${variant.name} BUNDLE FAILED: ${error.message}`);
    failures += 1;
    continue;
  }

  const lines = output.split(/\r?\n/).filter((line) => line.startsWith('ROUTE '));
  for (const [route, needles] of checks[variant.name]) {
    const line = lines.find((l) => l.startsWith(`ROUTE ${route} `));
    if (!line) {
      failures += 1;
      console.log(`[FAIL] ${variant.name}${route} produced no output line`);
      continue;
    }
    const body = line.split(' TEXT ')[1] || '';
    const runtimeError = line.includes('RUNTIME-ERROR');
    const missing = needles.filter((needle) => !body.includes(needle));
    if (runtimeError || missing.length) {
      failures += 1;
      console.log(`[FAIL] ${variant.name}${route} ${runtimeError ? line.split(' RUNTIME-ERROR ')[1] : `missing: ${missing.join(' , ')}`}`);
      console.log(`       raw: ${line.slice(0, 600)}`);
    } else {
      passes += 1;
      console.log(`[PASS] ${variant.name}${route}${needles.length ? ` (${needles.length} markers, ${body.length} chars)` : ' (rendered, no throw)'}`);
    }
  }

  rmSync(entryFile, { force: true });
  rmSync(outfile, { force: true });
  rmSync(path.join(here, `AppVariant-${variant.name}.jsx`), { force: true });
}

console.log(`SMOKE RESULT: ${passes} passed, ${failures} failed`);