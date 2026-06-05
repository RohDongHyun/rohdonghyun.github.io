#!/usr/bin/env node
import fs from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"
import { fileURLToPath } from "node:url"
import { parse as parseYaml, stringify as stringifyYaml } from "yaml"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const SOURCE_DIR = path.join(root, "content")
const BUILD_DIR = path.join(os.tmpdir(), `quartz-build-${process.pid}`)
const PUBLIC_DIR = path.join(root, "public")
const ENV_FILE = path.join(root, ".env")
const PASSWORD_KEY = "encrypted-pages-passwords"

async function loadDotenv() {
  try {
    const text = await fs.readFile(ENV_FILE, "utf8")
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i)
      if (!m) continue
      const [, k, rawV] = m
      const v = rawV.replace(/^["'](.*)["']$/, "$1")
      if (process.env[k] === undefined) process.env[k] = v
    }
  } catch (e) {
    if (e.code !== "ENOENT") throw e
  }
}

async function copyDir(src, dst) {
  await fs.mkdir(dst, { recursive: true })
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dst, entry.name)
    if (entry.isDirectory()) await copyDir(s, d)
    else if (entry.isFile()) await fs.copyFile(s, d)
  }
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

async function injectPasswords(dir, password) {
  const privates = []
  async function walk(d) {
    for (const entry of await fs.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name)
      if (entry.isDirectory()) await walk(p)
      else if (entry.isFile() && entry.name.endsWith(".md")) {
        const text = await fs.readFile(p, "utf8")
        const m = text.match(FRONTMATTER_RE)
        if (!m) continue
        let fm
        try {
          fm = parseYaml(m[1]) ?? {}
        } catch {
          continue
        }
        if (fm.private !== true) continue
        if (!password) {
          throw new Error(
            `'${path.relative(root, p)}' has 'private: true' but PRIVATE_POSTS_PASSWORD is not set.`,
          )
        }
        delete fm.private
        fm.password = password
        const newFm = stringifyYaml(fm).trimEnd()
        const rest = text.slice(m[0].length)
        await fs.writeFile(p, `---\n${newFm}\n---\n${rest}`)
        privates.push(path.relative(dir, p))
      }
    }
  }
  await walk(dir)
  return privates
}

const AUTH_SCRIPT = `<script>(function(){var K=${JSON.stringify(PASSWORD_KEY)};try{var s=localStorage.getItem(K);if(s&&!sessionStorage.getItem(K))sessionStorage.setItem(K,s);}catch(e){}var orig=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){orig.call(this,k,v);if(this===sessionStorage&&k===K){try{localStorage.setItem(k,v);}catch(e){}}};window.privateLogout=function(){try{localStorage.removeItem(K);sessionStorage.removeItem(K);}catch(e){}location.reload();};function mount(){if(!localStorage.getItem(K))return;if(document.getElementById('private-logout-btn'))return;var b=document.createElement('button');b.id='private-logout-btn';b.type='button';b.textContent='\u{1F513} 로그아웃';b.style.cssText='position:fixed;bottom:1rem;right:1rem;z-index:9999;padding:0.5rem 0.9rem;background:var(--secondary,#284b63);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:0.85rem;box-shadow:0 2px 6px rgba(0,0,0,0.15);';b.onclick=window.privateLogout;document.body.appendChild(b);}document.addEventListener('DOMContentLoaded',mount);document.addEventListener('nav',mount);})();</script>`

async function injectAuthScript(dir) {
  let count = 0
  async function walk(d) {
    for (const entry of await fs.readdir(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name)
      if (entry.isDirectory()) await walk(p)
      else if (entry.isFile() && entry.name.endsWith(".html")) {
        const text = await fs.readFile(p, "utf8")
        if (text.includes("id=\"private-logout-btn\"") || text.includes(PASSWORD_KEY + "\"")) {
          if (text.includes("privateLogout")) continue
        }
        const out = text.replace(/<\/head>/i, `${AUTH_SCRIPT}</head>`)
        if (out !== text) {
          await fs.writeFile(p, out)
          count++
        }
      }
    }
  }
  await walk(dir)
  return count
}

async function main() {
  await loadDotenv()
  const password = process.env.PRIVATE_POSTS_PASSWORD

  console.log("[build] preparing content build directory…")
  await fs.rm(BUILD_DIR, { recursive: true, force: true })
  await copyDir(SOURCE_DIR, BUILD_DIR)
  const privates = await injectPasswords(BUILD_DIR, password)
  if (privates.length > 0) {
    console.log(`[build] encrypting ${privates.length} private post(s):`)
    for (const p of privates) console.log(`  - ${p}`)
  } else {
    console.log("[build] no private posts found")
  }

  console.log("[build] running quartz build…")
  const passThrough = process.argv.slice(2)
  const result = spawnSync(
    "npx",
    ["quartz", "build", "-d", BUILD_DIR, ...passThrough],
    { cwd: root, stdio: "inherit", shell: true },
  )
  await fs.rm(BUILD_DIR, { recursive: true, force: true })
  if (result.status !== 0) process.exit(result.status ?? 1)

  console.log("[build] injecting auth script into HTML…")
  const n = await injectAuthScript(PUBLIC_DIR)
  console.log(`[build] patched ${n} HTML file(s)`)
}

main().catch((e) => {
  console.error("[build] failed:", e.message)
  process.exit(1)
})
