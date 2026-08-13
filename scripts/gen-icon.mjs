// 一次性脚本：将 public/favicon.svg 渲染为 build/icon.png（512×512，electron-builder 自动转 icns/ico）
import { chromium } from '@playwright/test'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const svg = await readFile(path.join(root, 'public', 'favicon.svg'), 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 512, height: 512 } })
await page.setContent(`<style>html,body{margin:0;padding:0}</style>${svg}`)
const png = await page.screenshot({ omitBackground: false })
await browser.close()

await mkdir(path.join(root, 'build'), { recursive: true })
await writeFile(path.join(root, 'build', 'icon.png'), png)
console.log('build/icon.png 已生成 (512×512)')
