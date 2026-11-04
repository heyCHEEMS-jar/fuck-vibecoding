import { chmod, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { openDatabase, insertActivationKeys } from '../lib/database.mjs'
import { createActivationCode } from '../lib/security.mjs'

const count = Number.parseInt(process.argv[2] || '10', 10)
const batch = process.argv[3] || new Date().toISOString().slice(0, 10)
const output = process.argv[4]
const pepper = process.env.KEY_PEPPER

if (!pepper || pepper.length < 32) throw new Error('请先设置至少 32 位的 KEY_PEPPER')
if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('数量必须是 1–1000 的整数')
if (!/^[\w.-]{1,48}$/.test(batch)) throw new Error('批次名格式不正确')
if (!output) throw new Error('请提供激活码明文输出文件，例如 launch.keys.txt')

const codes = Array.from({ length: count }, createActivationCode)
const db = openDatabase(resolve(process.env.DB_FILE || 'data/mood-terrarium.db'))
insertActivationKeys(db, codes, pepper, batch)
db.close()

const outputFile = resolve(output)
await writeFile(outputFile, codes.join('\n') + '\n', { encoding: 'utf8', mode: 0o600, flag: 'wx' })
await chmod(outputFile, 0o600)
console.log(`已生成 ${codes.length} 枚激活码，明文仅保存于：${outputFile}`)
