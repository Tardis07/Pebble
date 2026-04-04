# Pebble — 现代 PC 邮箱客户端设计文档

## 1. 产品概述

Pebble 是一款以生产力为核心、注重隐私的现代 PC 邮箱客户端。面向开发者和效率极客，提供命令面板驱动的全键盘操作体验，将邮箱升级为个人生产力与项目管理工具。

### 产品画像

| 维度 | 决策 |
|------|------|
| 技术栈 | Tauri + React (TypeScript) + Rust 后端 |
| 邮件协议 | IMAP/SMTP 兜底 + Gmail API + Outlook API |
| 目标用户 | 开发者/极客 > 国内白领 > 跨境外贸 |
| 存储策略 | 本地优先（SQLite） + 可选云同步（WebDAV 等） |
| AI 策略 | MVP 阶段用规则引擎，AI 后续迭代 |
| 开源协议 | AGPL-3.0 |
| 设计风格 | 极简留白、智能标签、双层导航（参考 Doru） |

### MVP 功能范围

1. **命令面板 (Ctrl+K)** — 全键盘操作
2. **智能分类/标签** — 规则引擎自动归类
3. **Kanban 看板视图** — 邮件拖拽到"待办/等待回复/已完成"
4. **Snooze 稍后提醒** — 邮件暂时消失，到时间重新出现
5. **追踪像素拦截** — 隐私防追踪
6. **跨语言翻译** — 划词翻译、双语对照（用户自配置翻译引擎）

### 预留规划

- **自然语言搜索** — 架构预留扩展点，实现推后

---

## 2. 架构设计

### 2.1 整体架构：单体分层

```
┌─ React UI ─────────────────────────┐
│  Views / Components / Stores       │
└──────────┬─────────────────────────┘
           │ Tauri IPC (invoke)
┌──────────▼─────────────────────────┐
│  Rust Core                         │
│  ├─ Mail Engine (IMAP/SMTP/API)    │
│  ├─ Rule Engine (分类/标签)         │
│  ├─ Search Engine (Tantivy)        │
│  ├─ Storage (SQLite via rusqlite)  │
│  ├─ Privacy Guard (像素拦截)       │
│  └─ Translate (用户自配置)          │
└────────────────────────────────────┘
```

选择理由：
- MVP 效率最高，少一层抽象直接写功能
- Rust crate workspace 拆分模块，逻辑隔离但编译为单体
- Tauri IPC 天然隔离前后端
- 未来可平滑演进到插件架构或进程分离

### 2.2 项目结构

```
pebble/
├── src-tauri/                    # Tauri + Rust 后端
│   ├── Cargo.toml                # workspace root
│   ├── crates/
│   │   ├── pebble-core/          # 核心类型、错误定义、trait 接口
│   │   ├── pebble-mail/          # 邮件引擎 (IMAP/SMTP/Gmail API/Outlook API)
│   │   ├── pebble-store/         # SQLite 存储层 (rusqlite)
│   │   ├── pebble-search/        # 全文搜索 (Tantivy)
│   │   ├── pebble-rules/         # 规则引擎 (自动分类/标签)
│   │   ├── pebble-privacy/       # 隐私防护 (追踪像素拦截、HTML 清洗)
│   │   └── pebble-translate/     # 翻译模块 (划词翻译、双语对照)
│   └── src/
│       ├── main.rs               # Tauri 入口
│       ├── commands/             # Tauri IPC command handlers
│       ├── state.rs              # 应用状态管理
│       └── events.rs             # Tauri 事件定义
│
├── src/                          # React 前端
│   ├── app/                      # 路由与布局
│   ├── components/               # 通用 UI 组件
│   ├── features/                 # 功能模块 (按特性组织)
│   │   ├── inbox/                # 收件箱视图
│   │   ├── kanban/               # 看板视图
│   │   ├── command-palette/      # 命令面板
│   │   ├── compose/              # 写邮件
│   │   ├── search/               # 搜索
│   │   └── settings/             # 设置
│   ├── stores/                   # 状态管理 (Zustand)
│   ├── hooks/                    # 自定义 hooks
│   ├── lib/                      # 工具函数、Tauri IPC 封装
│   └── styles/                   # 全局样式、主题
│
├── docs/                         # 文档
├── package.json
└── tauri.conf.json
```

---

## 3. 数据模型

### 3.1 SQLite 核心表

```sql
-- 邮箱账户
accounts
├── id (TEXT PK, UUID)
├── email (TEXT)
├── display_name (TEXT)
├── provider (TEXT: "imap" | "gmail" | "outlook")
├── auth_data (BLOB, AES-256-GCM 加密)
├── sync_state (TEXT, JSON)
├── created_at / updated_at

-- 邮件
messages
├── id (TEXT PK, UUID)
├── account_id (FK → accounts)
├── remote_id (TEXT)                  -- 服务器侧 UID
├── message_id_header (TEXT)          -- RFC 2822 Message-ID（去重、线程用）
├── in_reply_to (TEXT)                -- In-Reply-To header
├── references_header (TEXT)          -- References header（完整引用链）
├── thread_id (TEXT)                  -- 计算得出的会话 ID
├── from_address / from_name (TEXT)
├── to_list / cc_list / bcc_list (TEXT, JSON)
├── subject (TEXT)
├── snippet (TEXT)
├── body_text (TEXT)
├── body_html_raw (TEXT)              -- 原始 HTML（不清洗，渲染时实时处理）
├── has_attachments (BOOLEAN)
├── is_read / is_starred / is_draft (BOOLEAN)
├── date (INTEGER, unix timestamp)
├── raw_headers (TEXT, JSON)
├── remote_version (TEXT, nullable)   -- Gmail historyId / Outlook changeKey / IMAP UIDVALIDITY:UID:MODSEQ
├── is_deleted (BOOLEAN DEFAULT 0)    -- 软删除墓碑
├── deleted_at (INTEGER, nullable)    -- 墓碑过期时间，30 天后物理清理
├── created_at / updated_at

-- 文件夹/标签/分类统一表（适配三种协议模型）
folders
├── id (TEXT PK)
├── account_id (FK → accounts)
├── remote_id (TEXT)                  -- 远端 folder/label/category ID
├── name (TEXT)
├── folder_type (TEXT: "folder" | "label" | "category")
├── role (TEXT, nullable: "inbox" | "sent" | "drafts" | "trash" | "archive" | "spam" | null)
├── parent_id (TEXT, nullable)        -- 文件夹树层级（IMAP 嵌套文件夹）
├── color (TEXT, nullable)            -- Gmail label / Outlook category 颜色
├── is_system (BOOLEAN)               -- 系统级不可删除
├── sort_order (INTEGER)

-- 邮件-文件夹关联（多对多，Gmail 一封邮件可有多个 label）
message_folders
├── message_id (FK → messages)
├── folder_id (FK → folders)
├── PK (message_id, folder_id)

-- 附件
attachments
├── id (TEXT PK)
├── message_id (FK → messages)
├── filename (TEXT)
├── mime_type (TEXT)
├── size (INTEGER)
├── local_path (TEXT, nullable)

-- 用户自定义标签（Pebble 本地标签，与 provider 的 folder/label 独立）
labels
├── id (TEXT PK)
├── name (TEXT)
├── color (TEXT)
├── is_system (BOOLEAN)
├── rule_id (FK → rules, nullable)

message_labels
├── message_id (FK)
├── label_id (FK)

-- 看板状态（独立能力）
kanban_cards
├── message_id (FK → messages, PK)
├── column (TEXT: "todo" | "waiting" | "done")
├── position (INTEGER)
├── created_at / updated_at

-- Snooze 稍后提醒（独立能力，与看板解耦）
snoozed_messages
├── message_id (FK → messages, PK)
├── snoozed_at (INTEGER)              -- 何时设置
├── unsnoozed_at (INTEGER)            -- 何时恢复
├── return_to (TEXT: "inbox" | "kanban:todo" | ...) -- 恢复后出现位置

-- 发件人信任名单（隐私防护：按发件人放行图片加载）
trusted_senders
├── account_id (FK → accounts)
├── email (TEXT)
├── trust_type (TEXT: "images" | "all")
├── created_at

-- 规则引擎
rules
├── id (TEXT PK)
├── name (TEXT)
├── priority (INTEGER)
├── conditions (TEXT, JSON)
├── actions (TEXT, JSON)
├── is_enabled (BOOLEAN)
├── created_at / updated_at
```

### 3.2 关键数据设计决策

- **协议模型适配**：`folders` 表统一承载 IMAP folder、Gmail label、Outlook category，通过 `folder_type` 区分；`message_folders` 多对多关联（Gmail 一封邮件可有多个 label，IMAP 通常一对一）；`role` 字段标记语义角色（inbox/sent/drafts 等），provider 无关
- **线程 (thread_id)**：基于 `message_id_header` / `in_reply_to` / `references_header` 计算；Gmail API 直接返回线程 ID，IMAP 侧自行聚合。新增 `references_header` 存完整引用链，确保断链时仍能恢复线程
- **认证数据加密**：`auth_data` 使用 AES-256-GCM，密钥由 Windows Credential Manager 管理
- **幂等同步与冲突检测**：`remote_version` 字段存储 provider 特定的版本标识（Gmail historyId / Outlook changeKey / IMAP MODSEQ），同步时对比判断是否有远端变更，避免覆盖
- **软删除墓碑**：`is_deleted` + `deleted_at` 实现软删除，远端删除的邮件本地标记而非立即清除，30 天后物理清理。防止同步时因删除邮件导致数据不一致
- **HTML 存储态与渲染态分离**：`body_html_raw` 存储原始 HTML 不做清洗；渲染时由 `pebble-privacy` 实时清洗，根据用户隐私设置和 `trusted_senders` 决定是否放行外部资源
- **Snooze 与 Kanban 解耦**：两个独立表，互不干扰。用户可以「Snooze 但不进看板」，也可以「看板中的邮件加 Snooze」。看板「已完成」列超 7 天自动清理仅影响 `kanban_cards`，不影响 `snoozed_messages`
- **规则条件 JSON 格式**：

```json
{
  "operator": "AND",
  "conditions": [
    { "field": "from_address", "op": "contains", "value": "@github.com" },
    { "field": "subject", "op": "matches", "value": "\\[.*\\] Issue #.*" }
  ]
}
```

- **搜索索引独立**：Tantivy 索引存储在单独目录，损坏可从 SQLite 重建

---

## 4. Rust 后端模块设计

### 4.1 模块依赖关系

```
pebble-core          ← 所有模块依赖（类型定义、trait、错误）
    ▲
    ├── pebble-store      ← 存储层实现
    ├── pebble-mail       ← 邮件收发（依赖 pebble-store）
    ├── pebble-search     ← 全文索引（依赖 pebble-store）
    ├── pebble-rules      ← 规则引擎（依赖 pebble-store）
    ├── pebble-privacy    ← HTML 清洗/像素拦截（无状态，纯函数）
    └── pebble-translate  ← 翻译（依赖外部 API）
```

### 4.2 pebble-core：核心 Trait

```rust
// === 基础能力 === 所有 provider 必须实现
trait MailTransport: Send + Sync {
    async fn authenticate(&mut self, credentials: &AuthCredentials) -> Result<()>;
    async fn fetch_messages(&self, query: &FetchQuery) -> Result<FetchResult>;
    async fn send_message(&self, message: &OutgoingMessage) -> Result<()>;
    /// 增量同步：返回自上次游标以来的所有变更（新邮件、flag变化、移动、删除）
    async fn sync_changes(&self, since: &SyncCursor) -> Result<ChangeSet>;
    /// 查询 provider 支持的能力
    fn capabilities(&self) -> ProviderCapabilities;
}

// 增量同步变更集
struct ChangeSet {
    new_messages: Vec<RawMessage>,
    flag_changes: Vec<FlagChange>,       // 已读、星标等状态变化
    moved: Vec<MoveChange>,              // 邮件在文件夹/标签间移动
    deleted: Vec<RemoteId>,              // 远端已删除
    cursor: SyncCursor,                  // 下次同步起点
}

// === 能力层 === 按 provider 特性可选实现
trait FolderProvider {                   // IMAP, Outlook
    async fn list_folders(&self) -> Result<Vec<Folder>>;
    async fn move_message(&self, id: &RemoteId, to: &FolderId) -> Result<()>;
}

trait LabelProvider {                    // Gmail
    async fn list_labels(&self) -> Result<Vec<Label>>;
    async fn modify_labels(&self, id: &RemoteId, add: &[LabelId], remove: &[LabelId]) -> Result<()>;
}

trait CategoryProvider {                 // Outlook
    async fn list_categories(&self) -> Result<Vec<Category>>;
    async fn set_categories(&self, id: &RemoteId, categories: &[CategoryId]) -> Result<()>;
}

trait DraftProvider {                    // Gmail, Outlook (IMAP 用 Drafts folder 模拟)
    async fn save_draft(&self, draft: &DraftMessage) -> Result<RemoteId>;
    async fn update_draft(&self, id: &RemoteId, draft: &DraftMessage) -> Result<()>;
    async fn discard_draft(&self, id: &RemoteId) -> Result<()>;
}

// 运行时能力查询，前端据此决定 UI 展示
struct ProviderCapabilities {
    has_labels: bool,        // Gmail → 显示标签管理
    has_folders: bool,       // IMAP, Outlook → 显示文件夹树
    has_categories: bool,    // Outlook → 显示分类管理
    has_push: bool,          // Gmail watch / Outlook subscriptions
    has_threads: bool,       // Gmail 原生线程 vs 其他需计算
}

// 搜索引擎接口（预留自然语言搜索扩展）
trait SearchEngine: Send + Sync {
    async fn index_message(&self, message: &Message) -> Result<()>;
    async fn search(&self, query: &SearchQuery) -> Result<Vec<SearchHit>>;
    async fn rebuild_index(&self) -> Result<()>;
}

enum SearchQuery {
    Structured(StructuredQuery),    // MVP: 字段级过滤
    // NaturalLanguage(String),     // 未来: 自然语言
}

// 统一错误类型
#[derive(thiserror::Error, Debug, Serialize)]
enum PebbleError {
    #[error("Authentication failed: {0}")]
    Auth(String),
    #[error("Network error: {0}")]
    Network(String),
    #[error("Storage error: {0}")]
    Storage(String),
    #[error("Sync error: {0}")]
    Sync(String),
    #[error("Rule error: {0}")]
    Rule(String),
    #[error("Translate error: {0}")]
    Translate(String),
}
```

### 4.3 pebble-mail：邮件引擎

```
pebble-mail/
├── src/
│   ├── lib.rs
│   ├── provider/
│   │   ├── mod.rs          # MailProvider trait 的工厂函数
│   │   ├── imap.rs         # IMAP/SMTP 实现 (async-imap + lettre)
│   │   ├── gmail.rs        # Gmail API 实现 (reqwest + OAuth2)
│   │   └── outlook.rs      # Outlook/Graph API 实现
│   ├── sync.rs             # 增量同步调度器
│   ├── parser.rs           # MIME 解析 (mail-parser crate)
│   └── thread.rs           # 会话线程聚合算法
```

**增量同步策略（按 provider 区分）：**

- **IMAP**：双阶段同步
  - 轻量轮询（默认 60s / IDLE 推送）：UIDNEXT 检测新邮件
  - 全量对账（默认 15min）：对已知 UID 执行 FETCH FLAGS 检测状态变更；SEARCH 检测删除/移动；多文件夹扫描检测跨文件夹移动（同一 Message-ID 出现在新文件夹）
  - 支持 CONDSTORE 扩展（MODSEQ）时使用 `CHANGEDSINCE` 优化 flag 变更检测
- **Gmail**：`history.list(startHistoryId)` 返回完整变更集（新增、标签变化、删除），天然支持增量
- **Outlook**：`delta query(deltaLink)` 返回完整变更集，天然支持增量

同步调度器配置：轻量轮询间隔、全量对账间隔均用户可调。
MIME 解析：`mail-parser` crate 处理 multipart、内嵌图片、编码转换

### 4.4 pebble-privacy：隐私防护（渲染时清洗）

**核心原则：入库存原始 HTML，渲染时实时清洗。**

同步时 `body_html_raw` 直接入库不做清洗，仅提取 snippet 和 has_attachments。用户打开邮件时，根据隐私设置和发件人信任状态实时清洗渲染。

```rust
struct PrivacyGuard {
    known_trackers: HashSet<String>,  // 已知追踪域名列表
}

enum PrivacyMode {
    Strict,                           // 默认：拦截所有外部资源
    TrustSender(String),              // 信任此发件人：加载图片
    LoadOnce,                         // 仅本次加载图片
}

struct RenderedHtml {
    html: String,                     // 清洗后的安全 HTML
    trackers_blocked: Vec<TrackerInfo>,
    images_blocked: u32,
}

impl PrivacyGuard {
    /// 从 body_html_raw 实时渲染安全 HTML
    /// 根据 privacy_mode 决定是否放行外部资源
    fn render_safe_html(&self, raw_html: &str, mode: &PrivacyMode) -> RenderedHtml;

    /// 检测追踪器（结果可缓存，但不修改源数据）
    fn detect_trackers(&self, raw_html: &str) -> Vec<TrackerInfo>;
}
```

- 默认 `Strict` 模式阻止所有外部图片，替换为占位符
- 用户可单封放行（`LoadOnce`）或信任发件人（写入 `trusted_senders` 表，后续自动放行）
- 内置常见追踪服务域名（Mailchimp、HubSpot、SendGrid 等），支持用户自定义扩展
- 原始 HTML 完整保留，任何时候都能切换隐私策略

### 4.5 pebble-rules：规则引擎

```rust
struct RuleEngine {
    rules: Vec<Rule>,  // 按 priority 排序
}

impl RuleEngine {
    fn evaluate(&self, message: &Message) -> Vec<RuleAction>;
}

enum RuleAction {
    AddLabel(LabelId),
    MoveToFolder(String),
    MarkRead,
    Archive,
    SetKanbanColumn(KanbanColumn),
}

enum ConditionField { From, To, Subject, Body, HasAttachment, Domain }
enum ConditionOp { Contains, NotContains, Equals, Matches(Regex), StartsWith, EndsWith }
```

### 4.6 pebble-translate：翻译模块（用户自配置）

```rust
enum TranslateProvider {
    DeepLX {
        endpoint: String,           // 用户自建的 DeepLX 服务地址
    },
    DeepL {
        api_key: String,
        use_free_api: bool,
    },
    TranslateAPI {
        endpoint: String,           // 通用翻译 API
        api_key: Option<String>,
        source_lang_field: String,
        target_lang_field: String,
    },
    LLMOpenAI {
        endpoint: String,           // 兼容 OpenAI 的任意服务
        api_key: String,
        model: String,
        mode: LLMMode,
    },
}

enum LLMMode {
    Completions,   // /v1/chat/completions
    Responses,     // /v1/responses
}

trait Translator: Send + Sync {
    async fn translate(&self, text: &str, from: &str, to: &str) -> Result<TranslateResult>;
}

struct TranslateResult {
    translated: String,
    segments: Vec<BilingualSegment>,  // 逐段对照
}
```

- 所有翻译配置加密存储
- LLM 模式内置优化翻译 prompt
- 翻译结果按原文哈希本地缓存
- LLM 翻译自动分段，支持双语对照视图

### 4.7 Tauri IPC Command 层

```rust
#[tauri::command]
async fn list_messages(account_id: String, folder_id: String, page: u32) -> Result<PagedMessages>;

#[tauri::command]
async fn search_messages(query: SearchQuery) -> Result<Vec<SearchHit>>;

#[tauri::command]
async fn move_to_kanban(message_id: String, column: KanbanColumn) -> Result<()>;

#[tauri::command]
async fn snooze_message(message_id: String, until: i64, return_to: String) -> Result<()>;

#[tauri::command]
async fn unsnooze_message(message_id: String) -> Result<()>;

#[tauri::command]
async fn get_rendered_html(message_id: String, privacy_mode: PrivacyMode) -> Result<RenderedHtml>;

#[tauri::command]
async fn trust_sender(account_id: String, email: String, trust_type: String) -> Result<()>;

#[tauri::command]
async fn get_provider_capabilities(account_id: String) -> Result<ProviderCapabilities>;

#[tauri::command]
async fn execute_command(command: PaletteCommand) -> Result<CommandResult>;
```

- 所有 command 返回 `Result<T>`，错误统一序列化
- 前端封装为类型安全 `api.ts`，后续可用 `tauri-specta` 自动生成
- 前端根据 `ProviderCapabilities` 动态调整 UI（Gmail 显示标签管理，IMAP 显示文件夹树）

---

## 5. React 前端架构

### 5.1 布局结构

```
┌──────────────────────────────────────────────────┐
│  Title Bar (Tauri 自定义标题栏，无边框窗口)         │
├────────┬─────────────────────────────────────────┤
│        │  Toolbar (搜索栏 + 操作按钮)              │
│  Side  ├─────────────────────────────────────────┤
│  bar   │                                         │
│        │  Main Content                           │
│ ┌────┐ │  ├─ Inbox (邮件列表)                     │
│ │导航│ │  ├─ Kanban (看板视图)                     │
│ │视图│ │  ├─ Message Detail (阅读邮件)             │
│ │标签│ │  ├─ Compose (写邮件)                      │
│ │文件│ │  └─ Settings (设置)                       │
│ │夹  │ │                                         │
│ └────┘ │                                         │
├────────┴─────────────────────────────────────────┤
│  Status Bar (同步状态、账户信息)                    │
└──────────────────────────────────────────────────┘
```

命令面板 Ctrl+K 全局唤出，覆盖在最上层。

### 5.2 Feature 模块

```
src/features/
├── inbox/                  # 收件箱：邮件列表、邮件详情、会话视图
├── kanban/                 # 看板：三列布局、拖拽卡片
├── command-palette/        # 命令面板：模糊搜索、命令注册与执行
├── compose/                # 写邮件：收件人补全、TipTap 富文本
├── search/                 # 搜索：搜索栏、结果列表、高级过滤
├── translate/              # 翻译：划词翻译弹出框、双语对照视图
└── settings/               # 设置：账户、规则、标签、隐私、快捷键、翻译引擎
```

### 5.3 状态管理 (Zustand)

按领域拆分 store slice：

- **MailStore** — 邮件列表、选中状态、文件夹切换、批量操作
- **CommandStore** — 命令面板开关、查询、命令过滤与执行
- **UIStore** — 侧边栏折叠、当前视图、主题、分栏方向

### 5.4 快捷键系统

```typescript
const DEFAULT_KEYBINDINGS = {
  "mod+k":         "command-palette:open",
  "mod+n":         "compose:new",
  "mod+enter":     "compose:send",
  "mod+shift+a":   "mail:archive",
  "e":             "mail:archive",
  "r":             "mail:reply",
  "f":             "mail:forward",
  "s":             "mail:star",
  "j":             "mail:next",
  "k":             "mail:previous",
  "x":             "mail:select",
  "mod+shift+k":   "view:kanban",
  "mod+shift+i":   "view:inbox",
  "/":             "search:focus",
  "h":             "snooze:open",
  "escape":        "modal:close",
};
```

App 根组件统一监听 keydown，分发到 CommandStore.execute()，用户可在设置中自定义。

### 5.5 前端技术选型

| 用途 | 选型 | 理由 |
|------|------|------|
| 状态管理 | Zustand | 轻量、TS 友好、无 boilerplate |
| 路由 | React Router v7 | 成熟稳定 |
| 富文本编辑器 | TipTap | 可扩展、支持 Markdown 快捷输入 |
| 拖拽（看板） | dnd-kit | 现代、性能好、可访问性强 |
| 虚拟列表 | TanStack Virtual | 大量邮件列表性能保障 |
| 样式方案 | Tailwind CSS | 开发者熟悉、极简设计匹配 |
| 图标 | Lucide React | 开源、风格统一、轻量 |
| 国际化 | i18next | 中英双语 UI |
| HTTP | TanStack Query + Tauri invoke | 缓存管理 + IPC 封装 |

---

## 6. 核心用户流程

### 6.1 邮件同步

```
应用启动 → 加载 accounts → 每账户一个 tokio task 并发同步
  │
  SyncWorker:
  1. 读取 sync_state 游标
  2. provider.sync_changes(cursor) → ChangeSet
     ├─ new_messages: MIME 解析 → 存入 messages + message_folders
     ├─ flag_changes: 更新 is_read/is_starred 等
     ├─ moved: 更新 message_folders 关联
     └─ deleted: 标记 is_deleted = true（软删除墓碑）
  3. search.index_messages() (仅新增/变更的)
  4. rules.evaluate() → 自动打标签（仅新邮件）
  5. 更新 sync_state (新游标)
  6. Tauri Event "mail:sync-complete" → 前端刷新
  │
  轻量轮询 → 60s 后 (或 IMAP IDLE 推送)
  全量对账 → 15min 后 (IMAP flag/folder 完整扫描)
```

- 首次同步拉取最近 30 天，后续增量
- 前端监听 `mail:sync-progress`、`mail:sync-complete`、`mail:error`
- HTML 清洗不在同步时执行，`body_html_raw` 原样入库，渲染时实时处理

### 6.2 命令面板

```
Ctrl+K → 弹出面板 → 实时模糊匹配
  ├─ 命令列表（归档、回复、移动...）
  ├─ ">" 前缀：快速操作
  └─ "@" 前缀：搜索联系人
  │
  Enter 执行 → Toast 提示 + Ctrl+Z 撤销
```

### 6.3 Kanban 看板

```
三列：📋 待办 | ⏳ 等待回复 | ✅ 已完成

拖拽卡片 → 乐观更新 kanban_cards → 失败回滚
从收件箱添加：命令面板 "移到看板:待办" 或快捷键
```

### 6.4 Snooze（独立于看板）

```
按 H 或命令面板 → 时间选择（1h/今晚/明早/下周一/自定义）
→ 选择恢复位置（默认"收件箱"，也可选"看板:待办"等）
→ 创建 snoozed_messages 记录，邮件从当前视图隐藏
→ Rust 后台每 30s 检查 unsnoozed_at
→ 到时间：邮件回到 return_to 指定位置 + 系统通知

Snooze 与看板互不干扰：
├─ 可以 Snooze 但不进看板
├─ 看板中的邮件也可以 Snooze
└─ Snooze 状态在邮件列表和看板卡片上都用角标展示
```

### 6.5 追踪像素拦截（渲染时处理）

```
打开邮件 → 前端请求 get_rendered_html(id, Strict)
  → Rust 从 body_html_raw 实时清洗：
    移除 1x1 像素图 + 已知追踪域名 + 危险标签
    外部图片 → 占位符
  → 返回 RenderedHtml { html, trackers_blocked, images_blocked }
→ 顶部横幅 "已拦截 N 个追踪器"
→ 用户点击「加载图片」：
    ├─ 仅本次 → 重新请求 get_rendered_html(id, LoadOnce)
    └─ 信任发件人 → trust_sender() 写入 trusted_senders 表
                   → 重新请求 get_rendered_html(id, TrustSender)
                   → 后续该发件人邮件自动放行
```

### 6.6 翻译

```
划词翻译：选中文字 → TranslatePopover
全文双语：工具栏按钮 → 左右对照视图

翻译引擎设置：
├─ DeepLX (自部署)
├─ DeepL (官方 API)
├─ 翻译 API (自定义)
└─ LLM 大模型 (OpenAI 兼容 completions / responses)

配置项：API 地址、API Key、模型名、接口模式
提供「测试连接」验证配置
```

---

## 7. 非功能性需求

### 7.1 性能目标

| 指标 | 目标值 |
|------|--------|
| 启动 → 可交互 | < 2s |
| 邮件列表滚动 (1000+) | 60fps |
| 本地搜索响应 | < 200ms |
| 视图切换 | < 100ms |
| 内存占用 (1万封缓存) | < 300MB |
| 安装包体积 | < 30MB |

### 7.2 安全设计

- 敏感数据（OAuth Token、API Key）使用 AES-256-GCM 加密，密钥存 Windows Credential Manager
- HTML 渲染在 iframe sandbox 中，默认阻止外部资源
- CSP 策略严格限制
- 附件下载前检查文件类型，警告可执行文件

### 7.3 本地数据目录

```
%APPDATA%/com.pebble.app/
├── config.json              # 非敏感配置
├── db/pebble.db             # SQLite 主数据库
├── index/tantivy/           # 搜索索引
├── cache/avatars/           # 头像缓存
├── cache/attachments/       # 附件缓存
├── logs/pebble.log          # 滚动日志
└── sync/pebble-sync.json   # 云同步配置
```

### 7.4 可选云同步 (WebDAV)

同步内容（仅元数据）：规则配置、标签定义、看板状态、UI 偏好、账户列表（不含密钥）。变更时自动导出 JSON，启动时检查远端版本，冲突以时间戳新者为准并保留冲突副本。

### 7.5 日志

Rust 侧使用 `tracing` crate，前端 IPC 错误统一为 Toast 提示 + 可展开详情，网络错误显示离线状态 + 自动重试。

### 7.6 测试策略

| 层级 | 框架 | 覆盖 |
|------|------|------|
| Rust 单元测试 | cargo test | MIME 解析、规则匹配、HTML 清洗、搜索 |
| Rust 集成测试 | cargo test + 测试样本 | 同步流程、存储读写、跨模块 |
| 前端单元测试 | Vitest | 组件、Store、Hook |
| 前端交互测试 | Vitest + Testing Library | 命令面板、快捷键、拖拽 |
| E2E | Playwright (后续) | 完整用户流程 |

### 7.7 构建与发布

```
pnpm dev              → Vite + Tauri 热重载
pnpm tauri build      → .msi (Windows)，后续 .dmg / .deb / .AppImage

CI/CD (GitHub Actions):
  PR  → cargo test + clippy + vitest + 格式检查
  Tag → 多平台构建 + GitHub Releases 发布
```
