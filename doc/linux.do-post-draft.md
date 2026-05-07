---

> ⚠️  重要提醒：linux.do 严禁 AI 生成/润色的内容。以下帖子仅作**素材和思路参考**，请务必用你自己的语言重写后再发布。如果直接复制粘贴，会被删帖封号。

---

## 发帖注意事项

| 规则     | 操作                                                                |
| -------- | ------------------------------------------------------------------- |
| **标签** | 发帖时选 `#开源推广`                                                |
| **模板** | 点击编辑器 toolbar 最右侧 `+` → 插入模板 → 选择「开源推广发帖模板」 |
| **图片** | Logo 用 L 站自带上传，不要用外部图床                                |
| **友链** | 需要在 README 或项目页挂上 linux.do 友链                            |
| **群**   | 禁止挂 QQ/微信群                                                    |

---

以下为帖子素材草稿，请改写后使用：

---

## 标题

别再为了上测试环境而提交垃圾 commit 了——CherrySync：一个带状态追踪的多环境代码同步 CLI

## 正文

先问各位佬一个问题 🙋

你们有没有经历过这种循环：

```
改了一行 CSS → git commit -m "fix css"
推到测试环境看了一眼 → 不对，再改
git commit -m "try again"
推到测试 → 还是不对
git commit -m "really fix this time"
```

一天下来，Git 历史里躺了十几个 "fix"、"tmp"、"test"，真正的功能 commit 被淹没在垃圾里。PR reviewer 看着你 30 个 commit 怀疑人生。

这就是我写 **CherrySync** 的原因。

---

### 这是个什么工具

一句话：**类似 git status + git push，但是目标不是 Git 仓库，而是你的服务器**

```
csync status test    # 看看哪些文件改了还没同步到测试环境
csync push test      # 勾选你要传的文件，直接 SFTP 上传
```

不需要 commit，不需要 push 到 GitHub，不需要服务器装 Git。你只管改代码，觉得能看了就 `csync push test` 传到测试环境上看效果。等真的改好了，再正经写一个 commit。

---

### 它跟 rsync / scp / IDE 插件的区别在哪

用过 rsync 的都知道，rsync 的对比维度是「时间戳 + 文件大小」。这有两个问题：

1. **你不知道该同步什么**——改了一堆文件忘了哪些动过，rsync 一股脑全传
2. **你不知道上次传到哪了**——传成功没有？有没有漏？rsync 不知道

CherrySync 的做法不一样：

- **自己维护一份 state.json**，记录每个环境每台服务器上每个文件的 MD5 哈希
- `csync status test` 一跑，立刻告诉你哪些文件 Add / Modify / Delete
- **环境之间是隔离的**——同一个文件，已经推到 test 但没推到 prod，两个环境的状态互不干扰
- **多台服务器独立追踪**——3 台 prod 机器，推了 2 台第 3 台断了？下次 status 还会提醒你

这不是 rsync 的替代品，是 rsync **缺的那一层状态感知**。

---

### 几个让我自己都觉得很爽的功能

**1. 推送前远端 Diff**

```bash
csync diff test src/config.php
```

它会把**服务器上实际的文件**通过 SFTP 拉下来，跟你的本地版本做 diff——

万一有人在服务器上直接修过 bug（你懂的），你在覆盖之前能看见。

**2. 推送前自动备份 + 一键回滚**

```bash
csync push prod --backup
# 出问题了？
csync rollback prod
```

推之前自动把远端文件下载到 `.csync/backups/`，部署炸了能秒回滚。

**3. 环境漂移检测**

```bash
csync drift test prod
```

直接告诉你：测试环境和生产环境有哪些文件不一致。再也不怕「我以为两个环境一样结果线上炸了」。

**4. 推送后健康检查 + 自动重启服务**

```bash
csync push prod \
  --health-url https://example.com/health \
  --post-command "sudo systemctl reload nginx"
```

文件上传完 → 自动请求 health endpoint → 返回 200 才算成功 → 自动执行 reload。一条命令全搞定。

**5. 并行推送到多台服务器**

生产环境 4 台机器，原来是串行一个一个传。现在是并发推，速度快了 N 倍。

---

### 适合谁用

- 用 SFTP 部署的 WordPress / PHP 项目
- 没有 CI/CD 的小团队或个人项目
- 需要频繁在测试环境预览效果的开发场景
- 生产环境有多台独立服务器需要同步的
- 不想为了"上测试环境看看"而提交垃圾 commit 的人

不适合的场景：

- 已经有完整 CI/CD 流水线的团队（可以直接在 pipeline 里集成，但不是刚需）
- 用 Docker/K8s 做部署的（那是另一套体系）

---

### 安装 & 快速开始

```bash
npm install -g cherrysync

cd your-project
csync init
# 编辑 .csync/servers.json 填入你的服务器信息
csync servers import
csync status test
csync push test
```

详细文档：[GitHub](https://github.com/Limuyi-col/CherrySync)

---

### 技术栈

Node.js + Commander + ssh2-sftp-client + fast-glob。纯 ESM，无构建步骤，读了源码就能改。

---

### 最后

这个工具是我自己日常开发中遇到痛点后写的，目前功能已经比较完整（init / status / diff / push / dry-run / drift / rollback / consistency / watch 一共 9 个命令）。

如果你也在被「为了上测试环境而提交垃圾 commit」或者「多台服务器手动同步」折磨，欢迎试试看。好用的话给个 ⭐ 支持一下，遇到问题直接提 issue。

项目地址：https://github.com/Limuyi-col/CherrySync

---

> ⚠️ 再次提醒：以上内容需要你自己重写，不要直接复制粘贴到 L 站。论坛明确规定禁止 AI 生成内容，被举报会删帖封号。
