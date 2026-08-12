#!/usr/bin/env node
/**
 * Capture jait.dev product screenshots from a running Jait gateway.
 *
 * Usage:
 *   JAIT_USER=you JAIT_PASS=secret node scripts/capture-screenshots.mjs
 *
 * Optional env:
 *   JAIT_URL     gateway base URL            (default http://localhost:8000)
 *   JAIT_VIEWS   comma-separated view keys   (default chat,jobs,memory,network)
 *   JAIT_THEMES  comma-separated themes      (default dark,light)
 *   JAIT_WAIT    ms to settle before a shot  (default 2500)
 *
 * Theme note: Jait resolves the colour mode from your account setting. This
 * script emulates the OS preference, which only wins when that setting is
 * "System". If your account pins dark or light, flip it in Settings first or
 * the two passes will look identical.
 *
 * Editor note: the Editor/Preview/Architecture rail buttons only render once
 * `activeProject` is set, and that only happens after the editor panel is
 * already open — a chicken-and-egg on a fresh account. JAIT_PROJECT_PATH +
 * JAIT_SESSION_ID work around it by opening the panel server-side first.
 *
 * Known bug (v0.1.708): in light mode the Monaco pane falls back to theme id
 * 'vs', which isn't registered — opening a file trips "Editor project crashed".
 * Light captures therefore avoid opening a file tab.
 *
 * Output: assets/jait-<view>-<theme>-<YYYY-MM>.png at 1440x810, 2x DPR.
 */
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..')
const OUT_DIR = join(REPO, 'assets')

const BASE = (process.env.JAIT_URL || 'http://localhost:8000').replace(/\/+$/, '')
const USER = process.env.JAIT_USER
const PASS = process.env.JAIT_PASS
const WAIT = Number(process.env.JAIT_WAIT || 2500)
const THEMES = (process.env.JAIT_THEMES || 'dark,light').split(',').map(s => s.trim()).filter(Boolean)

// Nav targets use the buttons' accessible names in the Jait header.
const VIEWS = {
  chat: { label: null, desc: 'agent chat / editor workspace' },
  jobs: { label: 'Jobs', desc: 'scheduled jobs' },
  memory: { label: 'Memory', desc: 'memory browser' },
  network: { label: 'Network', desc: 'network scan' },
  prs: { label: 'Pull Requests', desc: 'pull requests' },
  todo: { label: 'Todo', desc: 'todo board' },
  email: { label: 'Email', desc: 'email' },
  calendar: { label: 'Calendar', desc: 'calendar' },
}
const WANTED = (process.env.JAIT_VIEWS || 'chat,jobs,memory,network')
  .split(',').map(s => s.trim()).filter(Boolean)

if (!USER || !PASS) {
  console.error('Missing credentials. Run with:\n  JAIT_USER=you JAIT_PASS=secret node scripts/capture-screenshots.mjs')
  process.exit(1)
}

// Playwright lives in the Jait repo's e2e workspace; fall back to a plain resolve.
let chromium
for (const spec of ['playwright', '/home/jakob/jait/tests/e2e/node_modules/playwright/index.mjs']) {
  try { ({ chromium } = await import(spec)); break } catch { /* try next */ }
}
if (!chromium) {
  console.error('Could not load Playwright. Install it with: npm i -D playwright && npx playwright install chromium')
  process.exit(1)
}

const res = await fetch(`${BASE}/api/auth/login`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ username: USER, password: PASS }),
})
if (!res.ok) {
  console.error(`Login failed: HTTP ${res.status} ${await res.text()}`)
  process.exit(1)
}
const token = (await res.json()).access_token
if (!token) {
  console.error('Login succeeded but no access_token came back.')
  process.exit(1)
}
console.log(`Authenticated against ${BASE}`)

// Open the editor panel server-side so the Editor rail button exists at all.
const PROJECT_PATH = process.env.JAIT_PROJECT_PATH
const SESSION_ID = process.env.JAIT_SESSION_ID
async function openEditorPanel() {
  if (!PROJECT_PATH || !SESSION_ID) return
  const r = await fetch(`${BASE}/api/project/open`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify({ path: PROJECT_PATH, sessionId: SESSION_ID, nodeId: 'gateway', openPanel: true }),
  })
  console.log(r.ok ? '  editor panel opened' : `  editor panel open failed: HTTP ${r.status}`)
}

await mkdir(OUT_DIR, { recursive: true })
const stamp = new Date().toISOString().slice(0, 7) // YYYY-MM

const browser = await chromium.launch()
let captured = 0

for (const theme of THEMES) {
  await openEditorPanel()
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 810 },
    deviceScaleFactor: 2,
    colorScheme: theme === 'light' ? 'light' : 'dark',
  })
  const page = await ctx.newPage()
  await page.addInitScript(t => localStorage.setItem('jait-auth-token', t), token)
  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' })

  try {
    await page.waitForSelector('text=Ask anything', { timeout: 20000 })
  } catch {
    console.warn(`  [${theme}] app shell did not settle; capturing whatever rendered`)
  }
  await page.waitForTimeout(WAIT)

  for (const key of WANTED) {
    const view = VIEWS[key]
    if (!view) { console.warn(`  skipping unknown view "${key}"`); continue }
    try {
      if (view.label) {
        await page.getByRole('button', { name: view.label }).first().click()
        await page.waitForTimeout(WAIT)
      }
      const out = join(OUT_DIR, `jait-${key}-${theme}-${stamp}.png`)
      await page.screenshot({ path: out })
      console.log(`  [${theme}] ${key.padEnd(9)} -> ${out}`)
      captured++
    } catch (err) {
      console.warn(`  [${theme}] ${key}: ${err.message.split('\n')[0]}`)
    }
  }
  await ctx.close()
}

await browser.close()
console.log(`\nDone — ${captured} screenshot(s) in ${OUT_DIR}`)
