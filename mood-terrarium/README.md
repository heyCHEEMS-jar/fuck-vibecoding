# 哈基米吞吞团 · 情绪生态瓶

一个零第三方依赖的中文 H5 解压竞技游戏：玩家可按等级解锁哈基米、企鹅、浣熊、柴犬、鸭子、兔子、小猪和小熊，哈基米可以更换多种装扮，其他动物保留默认造型。在出租屋、办公室和星期一三张地图中与七个机器人同图争抢并吞噬物件。按住屏幕偏移可持续控制方向，轻点停止、双击哈气；动物之间没有实体碰撞，可以自由重叠，大到对手 1.35 倍且深入覆盖后可以吞掉对方，对方 3 秒后以初始体型复活。机器人不会因为玩家更大就主动逃跑。物品按自身配置保持固定尺寸，不随玩家成长而变大。无限竞技随体型分阶段拉远相机，玩家达到体型 ×20 后自动结算，以用时为主要成绩，并保存最快纪录（不计开局倒计时）；全主线通关后解锁。免费用户可反复游玩出租屋，购买后用 Key 注册并解锁后续关卡、换装与云存档。

## 技术

- 前端：原生 HTML / CSS / JavaScript
- 后端：Node.js 内置 `http`、`crypto`、`node:sqlite`
- 数据库：单个 SQLite 文件，WAL 模式
- 依赖：无，无需 `npm install`

要求 Node.js 24 或更高版本。

## 本地运行

1. 复制环境变量示例：

```powershell
Copy-Item .env.example .env
```

2. 编辑 `.env`，把 `KEY_PEPPER` 换成至少 32 位的随机字符串。该值丢失后，已生成的 Key 将无法验证；不要提交到 Git。

3. 启动：

```powershell
node --env-file=.env server.mjs
```

4. 打开 <http://127.0.0.1:3000>。

开发试玩可直接执行 `npm start`，但内置开发 Pepper 仅用于本机界面预览，不能用来生成或销售正式 Key。

## 生成激活码

先确保 `.env` 中的 `KEY_PEPPER` 与服务器一致，再执行：

```powershell
node --env-file=.env scripts/generate-keys.mjs 20 launch-001 launch-001.keys.txt
```

参数依次是：数量、批次名、明文输出文件。脚本会：

- 只把 Key 摘要写入 SQLite；
- 把明文 Key 写入你指定的新文件；
- 如果输出文件已存在则拒绝覆盖；
- 不在终端逐条打印 Key。

`*.keys.txt` 已被 `.gitignore` 排除。将明文文件安全导入电商自动发货系统后，按你的数据保留规则处理本地副本。

## 测试

```powershell
npm test
```

测试覆盖：动物自由重叠与吞噬判定、取消人机逃离、固定物品尺寸、七种其他动物的连续绘制、无限竞技达标结算和计时，以及无效 Key、一次性兑换、注册、登录、会话、云存档和服务端存档边界。

无限竞技的默认目标体型在 `public/runner.js` 的 `INFINITE_TARGET_MASS` 中配置（当前为 20）。

## 生产部署最低清单

- 设置独立且长期保存的 `KEY_PEPPER`，并备份 SQLite 数据库；实际做一次恢复演练。
- Node 只监听 `127.0.0.1`，由 Nginx/Caddy 等反向代理提供 HTTPS。
- HTTPS 环境设置 `NODE_ENV=production`，此时会话 Cookie 自动启用 `Secure`。
- 如果反向代理会传递真实 IP，确认会覆盖客户端提交的头后再设 `TRUST_PROXY=1`。
- 静态资源可在反向代理缓存；`/api/*` 不缓存。
- 给 `data/` 和日志设置磁盘监控；定期清理过期会话。
- 在中国大陆目标网络和手机浏览器实测页面资源、注册、兑换、登录和恢复。
- 正式收费前完成游戏运营、未成年人、备案、虚拟商品类目、站外链接和退款规则的合规核实。

## 目录

```text
public/index.html        生态瓶大厅、结算和账号界面
public/app.js            进度、养成、账号和分享逻辑
public/runner.js         Canvas 单指动作主线
public/assets/           原创哈基米与换装素材
lib/database.mjs        SQLite 与账号/Key/存档
lib/security.mjs        Key、密码和会话摘要
lib/game-data.mjs       服务端存档边界
scripts/generate-keys.mjs
server.mjs              静态服务与 API
test/server.test.mjs
docs/product-brief.md   机会判断与验证方案
```

## API

| 方法 | 路径 | 用途 |
| --- | --- | --- |
| GET | `/api/health` | 健康检查 |
| GET | `/api/session` | 读取当前会话与云存档 |
| POST | `/api/register` | 用 Key 注册并迁移试玩进度 |
| POST | `/api/login` | 登录并加载云存档 |
| POST | `/api/logout` | 注销会话 |
| PUT | `/api/save` | 保存已登录用户进度 |

密码使用 `scrypt`，激活码和会话令牌只保存 SHA-256 摘要。数据库不应暴露公网。
