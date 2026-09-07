// Local-only test server. NEVER deploy or use as an authentication provider.
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = process.cwd();
const fixtureDir = mkdtempSync(join(tmpdir(), 'ggc-account-fixture-'));
const require = createRequire(root + '/package.json');
const { build } = require('esbuild');
const { PGlite } = require('@electric-sql/pglite');
const { accountApi } = await import(
  pathToFileURL(root + '/lib/account-service.ts')
);
const { postgresDatabase } = await import(
  pathToFileURL(root + '/lib/account-database.ts')
);
const pg = new PGlite();
for (const f of readdirSync(root + '/migrations/postgres')
  .filter((f) => f.endsWith('.sql'))
  .sort())
  await pg.exec(readFileSync(root + '/migrations/postgres/' + f, 'utf8'));
const db = postgresDatabase({
  query: async (q, v) => {
    const r = await pg.query(q, v);
    return { rows: r.rows, rowCount: r.affectedRows ?? r.rows.length };
  },
  batch: (qs) =>
    pg.transaction(async (tx) => {
      const out = [];
      for (const q of qs) {
        const r = await tx.query(q.query, q.values);
        out.push({ rows: r.rows, rowCount: r.affectedRows ?? r.rows.length });
      }
      return out;
    }),
});
const mockClerk = `export function useUser(){return {isLoaded:true,user:{id:'qa-member',fullName:'Jordan Ellis',hasImage:false,emailAddresses:[],primaryEmailAddress:{emailAddress:'qa-member@example.test'},username:'jordan'}}}; export function useClerk(){return {signOut:async()=>{await fetch('/qa/logout',{method:'POST'});window.location.assign('/sign-in')}}}`;
await build({
  stdin: {
    contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {AccountSettings} from '${root}/components/account-settings.tsx';import {SessionBoundary} from '${root}/components/account-session.tsx';createRoot(document.getElementById('root')).render(<SessionBoundary><AccountSettings/></SessionBoundary>);`,
    resolveDir: root,
    loader: 'tsx',
  },
  bundle: true,
  jsx: 'automatic',
  outfile: join(fixtureDir, 'app.js'),
  alias: { '@': root },
  plugins: [
    {
      name: 'fixture-provider',
      setup(b) {
        b.onResolve(
          {
            filter:
              /^(@clerk\/nextjs|next\/link|next\/image|next\/navigation)$/,
          },
          (a) => ({ path: a.path, namespace: 'fixture' }),
        );
        b.onLoad({ filter: /.*/, namespace: 'fixture' }, (a) => ({
          contents:
            a.path === '@clerk/nextjs'
              ? mockClerk
              : a.path === 'next/navigation'
                ? `export function usePathname(){return '/account'}`
                : a.path === 'next/link'
                  ? `import React from 'react';export default function Link(p){return <a {...p}/>}`
                  : `import React from 'react';export default function Image({unoptimized,...p}){return <img {...p}/>}`,
          loader: 'jsx',
          resolveDir: root,
        }));
      },
    },
  ],
});
let signedIn = true;
const server = createServer(async (req, res) => {
  try {
    const url = 'http://127.0.0.1:4319' + req.url;
    if (req.url === '/qa/logout') {
      signedIn = false;
      res.end('ok');
      return;
    }
    if (req.url === '/qa/login') {
      signedIn = true;
      res.writeHead(302, { Location: '/account' });
      res.end();
      return;
    }
    if (req.url.startsWith('/api/account')) {
      let body = '';
      for await (const chunk of req) body += chunk;
      const request = new Request(url, {
        method: req.method,
        headers: req.headers,
        ...(body ? { body } : {}),
      });
      const response = await accountApi(request, db, {
        mode: 'verified-provider',
        verifiedIdentity: signedIn
          ? { id: 'qa-member', email: 'qa-member@example.test' }
          : null,
      });
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(await response.text());
      return;
    }
    if (req.url === '/app.js') {
      res.setHeader('content-type', 'text/javascript');
      res.end(readFileSync(join(fixtureDir, 'app.js')));
      return;
    }
    if (req.url === '/style.css') {
      res.setHeader('content-type', 'text/css');
      res.end(
        '*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}a{color:inherit;text-decoration:none}dl,dd{margin:0}.skip-link{position:absolute;left:-9999px}.skip-link:focus{left:10px}' +
          readFileSync(root + '/app/brand-tokens.css') +
          readFileSync(root + '/app/account.css'),
      );
      return;
    }
    if (req.url === '/sign-in') {
      res.end(
        '<h1>Test provider signed out</h1><a href="/qa/login">Sign in to test account</a>',
      );
      return;
    }
    res.setHeader('content-type', 'text/html');
    res.end(
      '<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/app.js"></script></body></html>',
    );
  } catch (e) {
    console.error(e.message);
    res.writeHead(500);
    res.end('test harness error');
  }
});
server.listen(4319, '127.0.0.1', () =>
  console.log(
    'Isolated QA fixture: http://127.0.0.1:4319/account (mock Clerk, real Postgres API)',
  ),
);
