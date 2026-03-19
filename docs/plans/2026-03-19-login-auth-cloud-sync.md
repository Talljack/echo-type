# EchoType 登录认证 & 云同步 & 社交功能 实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 为 EchoType 接入用户登录系统（Google/GitHub OAuth），实现数据云同步、社交功能基础，并为未来付费功能预留架构。

**Architecture:** 使用 Supabase 作为 BaaS（Auth + PostgreSQL + Realtime + Storage）。Web 端通过 `@supabase/ssr` 处理 OAuth 回调；Tauri 桌面端通过 `tauri-plugin-deep-link` 注册 `echotype://` 协议接收 OAuth 回调。本地 Dexie 数据库保留作为离线缓存层，通过增量同步机制与 Supabase PostgreSQL 双向同步。

**Tech Stack:** Supabase (Auth + PostgreSQL + RLS + Realtime), `@supabase/supabase-js`, `@supabase/ssr`, `tauri-plugin-deep-link`, Dexie (本地缓存), Zustand (状态管理), Next.js Middleware (路由保护)

---

## Phase 0: Supabase 项目初始化 & 基础设施

### Task 0.1: 创建 Supabase 项目 & 配置环境变量

**Files:**
- Modify: `.env.example`
- Create: `.env.local` (不提交)
- Modify: `src-tauri/tauri.conf.json`

**Step 1: 创建 Supabase 项目**

1. 访问 https://supabase.com/dashboard → New Project
2. Project name: `echotype`
3. Database password: 生成强密码并保存
4. Region: 选择离目标用户最近的区域（如 Northeast Asia / Tokyo）
5. 记录以下值:
   - Project URL: `https://xxx.supabase.co`
   - Anon Key: `eyJ...`
   - Service Role Key: `eyJ...`（仅用于后端/迁移，不暴露到前端）

**Step 2: 配置 OAuth Providers**

在 Supabase Dashboard → Authentication → Providers:

**Google:**
1. 前往 [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. 创建 OAuth 2.0 Client ID（Web application 类型）
3. Authorized redirect URIs 添加:
   - `https://xxx.supabase.co/auth/v1/callback`（Supabase 回调）
4. 将 Client ID 和 Client Secret 填入 Supabase Dashboard

**GitHub:**
1. 前往 [GitHub Developer Settings](https://github.com/settings/developers) → OAuth Apps → New
2. Application name: `EchoType`
3. Homepage URL: `https://echotype.app`（或你的域名）
4. Authorization callback URL: `https://xxx.supabase.co/auth/v1/callback`
5. 将 Client ID 和 Client Secret 填入 Supabase Dashboard

**Step 3: 更新环境变量**

`.env.example` 中取消 Supabase 注释并扩展:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**Step 4: Commit**

```bash
git add .env.example
git commit -m "chore: add Supabase environment variables"
```

---

### Task 0.2: 安装依赖

**Step 1: 安装 npm 包**

```bash
pnpm add @supabase/supabase-js @supabase/ssr
```

**Step 2: 安装 Tauri deep-link 插件（桌面端 OAuth 回调）**

```bash
cd src-tauri
cargo add tauri-plugin-deep-link
cd ..
```

**Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml src-tauri/Cargo.toml src-tauri/Cargo.lock
git commit -m "chore: add Supabase and Tauri deep-link dependencies"
```

---

### Task 0.3: 创建数据库 Schema（Supabase Migration）

**Files:**
- Create: `supabase/migrations/001_auth_profiles.sql`
- Create: `supabase/migrations/002_user_data.sql`
- Create: `supabase/migrations/003_social.sql`

**Step 1: 初始化 Supabase CLI（如果还没有）**

```bash
pnpm add -D supabase
npx supabase init
npx supabase link --project-ref <your-project-ref>
```

**Step 2: 创建用户 Profile 表**

```sql
-- supabase/migrations/001_auth_profiles.sql

-- 用户 Profile（扩展 auth.users）
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text,
  avatar_url text,
  bio text,
  cefr_level text check (cefr_level in ('A1','A2','B1','B2','C1','C2')),
  streak_days int default 0,
  total_practice_minutes int default 0,
  is_public boolean default true,
  -- 付费功能预留
  plan text default 'free' check (plan in ('free', 'pro', 'team')),
  plan_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 注册时自动创建 profile
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'User'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone"
  on public.profiles for select using (is_public = true);

create policy "Users can view their own profile"
  on public.profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);
```

**Step 3: 创建用户数据同步表**

```sql
-- supabase/migrations/002_user_data.sql

-- 内容库（对应 Dexie contents 表）
create table public.contents (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null,
  category text,
  source text,
  difficulty text,
  tags text[] default '{}',
  data jsonb not null, -- 完整内容数据（text, translation, sentences 等）
  is_shared boolean default false, -- 是否公开分享到社区
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 学习记录（对应 Dexie records 表）
create table public.records (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  content_id text not null,
  module text not null,
  data jsonb not null, -- 完整记录数据（accuracy, wpm, mistakes 等）
  last_practiced timestamptz,
  next_review timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 练习会话（对应 Dexie sessions 表）
create table public.sessions (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  content_id text,
  module text,
  data jsonb not null,
  start_time timestamptz,
  completed boolean default false,
  created_at timestamptz default now()
);

-- 书籍（对应 Dexie books 表）
create table public.books (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  source text,
  data jsonb not null,
  created_at timestamptz default now()
);

-- AI 对话（对应 Dexie conversations 表）
create table public.conversations (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  data jsonb not null,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

-- 同步元数据（跟踪每个客户端的同步状态）
create table public.sync_metadata (
  user_id uuid references auth.users(id) on delete cascade,
  table_name text not null,
  last_synced_at timestamptz default '1970-01-01',
  client_id text not null, -- 区分不同设备
  primary key (user_id, table_name, client_id)
);

-- 索引
create index idx_contents_user on public.contents(user_id);
create index idx_contents_updated on public.contents(updated_at);
create index idx_records_user on public.records(user_id);
create index idx_records_updated on public.records(updated_at);
create index idx_sessions_user on public.sessions(user_id);
create index idx_books_user on public.books(user_id);
create index idx_conversations_user on public.conversations(user_id);

-- RLS for all user data tables
alter table public.contents enable row level security;
alter table public.records enable row level security;
alter table public.sessions enable row level security;
alter table public.books enable row level security;
alter table public.conversations enable row level security;
alter table public.sync_metadata enable row level security;

-- Users can only access their own data
create policy "Users manage own contents" on public.contents
  for all using (auth.uid() = user_id);
create policy "Users manage own records" on public.records
  for all using (auth.uid() = user_id);
create policy "Users manage own sessions" on public.sessions
  for all using (auth.uid() = user_id);
create policy "Users manage own books" on public.books
  for all using (auth.uid() = user_id);
create policy "Users manage own conversations" on public.conversations
  for all using (auth.uid() = user_id);
create policy "Users manage own sync_metadata" on public.sync_metadata
  for all using (auth.uid() = user_id);

-- Shared contents are viewable by everyone
create policy "Shared contents are public" on public.contents
  for select using (is_shared = true);

-- updated_at 自动更新触发器
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger contents_updated_at before update on public.contents
  for each row execute function public.update_updated_at();
create trigger records_updated_at before update on public.records
  for each row execute function public.update_updated_at();
create trigger conversations_updated_at before update on public.conversations
  for each row execute function public.update_updated_at();
```

**Step 4: 创建社交功能表**

```sql
-- supabase/migrations/003_social.sql

-- 学习排行榜（每日/每周统计，由定时任务或 Edge Function 更新）
create table public.leaderboard (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  period text not null check (period in ('daily', 'weekly', 'monthly', 'all_time')),
  period_key text not null, -- '2026-03-19', '2026-W12', '2026-03', 'all'
  total_minutes int default 0,
  total_sessions int default 0,
  accuracy_avg numeric(5,2),
  wpm_avg numeric(5,2),
  streak_days int default 0,
  rank int,
  updated_at timestamptz default now(),
  unique (user_id, period, period_key)
);

-- 学习打卡 / 动态
create table public.activities (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  type text not null check (type in ('practice', 'streak', 'level_up', 'share_content', 'achievement')),
  data jsonb default '{}', -- 动态详细信息
  created_at timestamptz default now()
);

-- 内容点赞
create table public.content_likes (
  user_id uuid references auth.users(id) on delete cascade,
  content_id text references public.contents(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, content_id)
);

-- 用户关注
create table public.follows (
  follower_id uuid references auth.users(id) on delete cascade,
  following_id uuid references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id),
  check (follower_id != following_id)
);

-- RLS
alter table public.leaderboard enable row level security;
alter table public.activities enable row level security;
alter table public.content_likes enable row level security;
alter table public.follows enable row level security;

-- 排行榜公开可读
create policy "Leaderboard is public" on public.leaderboard
  for select using (true);
create policy "System updates leaderboard" on public.leaderboard
  for all using (auth.uid() = user_id);

-- 动态：公开用户的动态公开可读
create policy "Public activities viewable" on public.activities
  for select using (
    exists (select 1 from public.profiles where id = user_id and is_public = true)
  );
create policy "Users manage own activities" on public.activities
  for all using (auth.uid() = user_id);

-- 点赞
create policy "Likes are public" on public.content_likes
  for select using (true);
create policy "Users manage own likes" on public.content_likes
  for insert with check (auth.uid() = user_id);
create policy "Users delete own likes" on public.content_likes
  for delete using (auth.uid() = user_id);

-- 关注
create policy "Follows are public" on public.follows
  for select using (true);
create policy "Users manage own follows" on public.follows
  for insert with check (auth.uid() = follower_id);
create policy "Users delete own follows" on public.follows
  for delete using (auth.uid() = follower_id);

-- 索引
create index idx_leaderboard_period on public.leaderboard(period, period_key, rank);
create index idx_activities_user on public.activities(user_id, created_at desc);
create index idx_content_likes_content on public.content_likes(content_id);
create index idx_follows_following on public.follows(following_id);
```

**Step 5: 推送迁移到 Supabase**

```bash
npx supabase db push
```

**Step 6: Commit**

```bash
git add supabase/
git commit -m "feat: add database schema for auth, sync, and social features"
```

---

## Phase 1: Supabase 客户端 & Auth 基础

### Task 1.1: 创建 Supabase 客户端工具

**Files:**
- Create: `src/lib/supabase/client.ts` （浏览器端 Singleton）
- Create: `src/lib/supabase/server.ts` （Server Component / Route Handler）
- Create: `src/lib/supabase/middleware.ts`（Middleware 中刷新 session）
- Create: `src/lib/supabase/types.ts` （数据库类型）

**Step 1: 生成数据库类型**

```bash
npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts
```

**Step 2: 浏览器端客户端**

```typescript
// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Step 3: 服务端客户端**

```typescript
// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        },
      },
    }
  )
}
```

**Step 4: Middleware 辅助**

```typescript
// src/lib/supabase/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    }
  )

  // 刷新 session（重要：不要移除）
  await supabase.auth.getUser()

  return response
}
```

**Step 5: Commit**

```bash
git add src/lib/supabase/
git commit -m "feat: add Supabase client utilities for browser, server, and middleware"
```

---

### Task 1.2: 创建 Next.js Middleware

**Files:**
- Create: `src/middleware.ts`

**Step 1: 创建 middleware**

```typescript
// src/middleware.ts
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * 匹配所有路由除了:
     * - _next/static, _next/image, favicon.ico
     * - 静态资源
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

**Step 2: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add Next.js middleware for Supabase session refresh"
```

---

### Task 1.3: 创建 Auth Store (Zustand)

**Files:**
- Create: `src/stores/auth-store.ts`

**Step 1: 实现 auth store**

```typescript
// src/stores/auth-store.ts
import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthState {
  user: User | null
  session: Session | null
  loading: boolean
  initialized: boolean

  initialize: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => {
  const supabase = createClient()

  // 监听 auth 状态变化
  supabase.auth.onAuthStateChange((_event, session) => {
    set({ user: session?.user ?? null, session, loading: false })
  })

  return {
    user: null,
    session: null,
    loading: true,
    initialized: false,

    initialize: async () => {
      if (get().initialized) return
      const { data: { session } } = await supabase.auth.getSession()
      set({
        user: session?.user ?? null,
        session,
        loading: false,
        initialized: true,
      })
    },

    signInWithGoogle: async () => {
      const redirectTo = `${window.location.origin}/api/auth/callback/supabase`
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      })
    },

    signInWithGitHub: async () => {
      const redirectTo = `${window.location.origin}/api/auth/callback/supabase`
      await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: { redirectTo },
      })
    },

    signOut: async () => {
      await supabase.auth.signOut()
      set({ user: null, session: null })
    },
  }
})
```

**Step 2: Commit**

```bash
git add src/stores/auth-store.ts
git commit -m "feat: add auth store with Google and GitHub OAuth"
```

---

### Task 1.4: 创建 Supabase Auth 回调路由

**Files:**
- Create: `src/app/api/auth/callback/supabase/route.ts`

**Step 1: 实现回调路由**

```typescript
// src/app/api/auth/callback/supabase/route.ts
import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 认证失败，重定向到登录页并带错误信息
  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}
```

**Step 2: Commit**

```bash
git add src/app/api/auth/callback/supabase/
git commit -m "feat: add Supabase OAuth callback route"
```

---

### Task 1.5: 创建登录页面

**Files:**
- Create: `src/app/login/page.tsx`

**Step 1: 实现登录页面**

```tsx
// src/app/login/page.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInWithGitHub, initialize } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    initialize()
  }, [initialize])

  useEffect(() => {
    if (user && !loading) {
      router.replace('/dashboard')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm space-y-6 p-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900">EchoType</h1>
          <p className="text-slate-500">登录以同步你的学习数据</p>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full h-12 text-base gap-3"
            onClick={signInWithGoogle}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </Button>

          <Button
            variant="outline"
            className="w-full h-12 text-base gap-3"
            onClick={signInWithGitHub}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Continue with GitHub
          </Button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-slate-50 px-2 text-slate-400">或</span>
          </div>
        </div>

        <Button
          variant="ghost"
          className="w-full text-slate-500"
          onClick={() => router.push('/dashboard')}
        >
          跳过登录，仅本地使用
        </Button>

        <p className="text-center text-xs text-slate-400">
          登录即表示你同意我们的服务条款和隐私政策
        </p>
      </div>
    </div>
  )
}
```

**Step 2: Commit**

```bash
git add src/app/login/
git commit -m "feat: add login page with Google and GitHub OAuth buttons"
```

---

### Task 1.6: 在 App Layout 中集成 Auth

**Files:**
- Modify: `src/app/(app)/layout.tsx`
- Modify: `src/app/layout.tsx`

**Step 1: 在 app layout 中初始化 auth store**

在 `src/app/(app)/layout.tsx` 的 `useEffect` 中添加 auth 初始化：

```typescript
// 在现有的 store hydration 列表中添加:
import { useAuthStore } from '@/stores/auth-store'

// 在组件内:
const initializeAuth = useAuthStore((s) => s.initialize)

useEffect(() => {
  initializeAuth()
  // ... 现有的 seed 和 hydrate 逻辑
}, [])
```

**Step 2: Commit**

```bash
git add src/app/(app)/layout.tsx
git commit -m "feat: integrate auth store initialization in app layout"
```

---

## Phase 2: Tauri 桌面端 OAuth 支持

### Task 2.1: 配置 Tauri Deep Link

**Files:**
- Modify: `src-tauri/tauri.conf.json`
- Modify: `src-tauri/src/lib.rs` (或 `main.rs`)
- Modify: `src-tauri/capabilities/default.json`（如果存在）

**Step 1: 配置 deep link 协议**

在 `src-tauri/tauri.conf.json` 中添加:

```json
{
  "plugins": {
    "shell": { "open": true },
    "deep-link": {
      "desktop": {
        "schemes": ["echotype"]
      }
    }
  }
}
```

**Step 2: 在 Rust 端注册插件**

在 `src-tauri/src/lib.rs` 的 builder 中添加:

```rust
tauri::Builder::default()
    .plugin(tauri_plugin_deep_link::init())
    .plugin(tauri_plugin_shell::init())
    // ... 其他插件
```

**Step 3: 添加 capabilities**

创建或修改 `src-tauri/capabilities/default.json`:

```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-open",
    "deep-link:default"
  ]
}
```

**Step 4: Commit**

```bash
git add src-tauri/
git commit -m "feat: configure Tauri deep-link plugin for OAuth callback"
```

---

### Task 2.2: 前端处理 Tauri Deep Link 回调

**Files:**
- Modify: `src/stores/auth-store.ts`

**Step 1: 在 auth store 中处理 deep link**

在桌面端，OAuth 重定向到 `echotype://auth/callback?code=xxx`，需要监听 deep link 事件:

```typescript
// 在 auth-store.ts 中添加 Tauri 桌面端支持

import: async () => {
  // 检测是否在 Tauri 环境
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window

  if (isTauri) {
    // 动态导入 Tauri API
    const { onOpenUrl } = await import('@tauri-apps/plugin-deep-link')
    onOpenUrl((urls) => {
      for (const url of urls) {
        if (url.startsWith('echotype://auth/callback')) {
          const params = new URL(url).searchParams
          const code = params.get('code')
          if (code) {
            const supabase = createClient()
            supabase.auth.exchangeCodeForSession(code)
          }
        }
      }
    })
  }
}
```

**Step 2: 更新 signIn 方法以适配桌面端**

```typescript
signInWithGoogle: async () => {
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window
  const redirectTo = isTauri
    ? 'echotype://auth/callback'
    : `${window.location.origin}/api/auth/callback/supabase`

  const supabase = createClient()
  const { data } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: isTauri,
    },
  })

  if (isTauri && data.url) {
    // 用系统浏览器打开 OAuth 页面
    const { open } = await import('@tauri-apps/plugin-shell')
    await open(data.url)
  }
}
```

GitHub 同理。

**Step 3: Commit**

```bash
git add src/stores/auth-store.ts
git commit -m "feat: add Tauri deep-link OAuth flow for desktop app"
```

---

## Phase 3: 数据云同步

### Task 3.1: 创建同步引擎

**Files:**
- Create: `src/lib/sync/engine.ts`
- Create: `src/lib/sync/types.ts`
- Create: `src/lib/sync/conflict.ts`

**Step 1: 定义同步类型**

```typescript
// src/lib/sync/types.ts
export interface SyncState {
  status: 'idle' | 'syncing' | 'error'
  lastSyncedAt: Date | null
  pendingChanges: number
  error: string | null
}

export interface SyncableTable {
  name: 'contents' | 'records' | 'sessions' | 'books' | 'conversations'
  dexieTable: string
  supabaseTable: string
}

export const SYNCABLE_TABLES: SyncableTable[] = [
  { name: 'contents', dexieTable: 'contents', supabaseTable: 'contents' },
  { name: 'records', dexieTable: 'records', supabaseTable: 'records' },
  { name: 'sessions', dexieTable: 'sessions', supabaseTable: 'sessions' },
  { name: 'books', dexieTable: 'books', supabaseTable: 'books' },
  { name: 'conversations', dexieTable: 'conversations', supabaseTable: 'conversations' },
]
```

**Step 2: 实现冲突解决策略**

```typescript
// src/lib/sync/conflict.ts

// 简单策略：Last-Write-Wins (LWW) 基于 updated_at
export function resolveConflict<T extends { updated_at?: string }>(
  local: T,
  remote: T
): T {
  const localTime = new Date(local.updated_at ?? 0).getTime()
  const remoteTime = new Date(remote.updated_at ?? 0).getTime()
  return remoteTime >= localTime ? remote : local
}
```

**Step 3: 实现同步引擎**

```typescript
// src/lib/sync/engine.ts
import { db } from '@/lib/db'
import { createClient } from '@/lib/supabase/client'
import { SYNCABLE_TABLES, type SyncState } from './types'
import { resolveConflict } from './conflict'
import { nanoid } from 'nanoid'

const CLIENT_ID = (() => {
  if (typeof window === 'undefined') return ''
  let id = localStorage.getItem('echotype_client_id')
  if (!id) {
    id = nanoid()
    localStorage.setItem('echotype_client_id', id)
  }
  return id
})()

export class SyncEngine {
  private supabase = createClient()
  private syncInProgress = false
  private listeners = new Set<(state: SyncState) => void>()
  private state: SyncState = {
    status: 'idle',
    lastSyncedAt: null,
    pendingChanges: 0,
    error: null,
  }

  subscribe(listener: (state: SyncState) => void) {
    this.listeners.add(listener)
    listener(this.state)
    return () => this.listeners.delete(listener)
  }

  private emit(partial: Partial<SyncState>) {
    this.state = { ...this.state, ...partial }
    for (const l of this.listeners) l(this.state)
  }

  async sync(userId: string) {
    if (this.syncInProgress) return
    this.syncInProgress = true
    this.emit({ status: 'syncing', error: null })

    try {
      for (const table of SYNCABLE_TABLES) {
        await this.syncTable(table, userId)
      }
      this.emit({ status: 'idle', lastSyncedAt: new Date(), pendingChanges: 0 })
    } catch (error) {
      this.emit({ status: 'error', error: (error as Error).message })
    } finally {
      this.syncInProgress = false
    }
  }

  private async syncTable(table: typeof SYNCABLE_TABLES[number], userId: string) {
    // 1. 获取上次同步时间
    const { data: meta } = await this.supabase
      .from('sync_metadata')
      .select('last_synced_at')
      .eq('table_name', table.name)
      .eq('client_id', CLIENT_ID)
      .single()

    const lastSyncedAt = meta?.last_synced_at ?? '1970-01-01T00:00:00Z'

    // 2. 拉取远端变更
    const { data: remoteChanges } = await this.supabase
      .from(table.supabaseTable)
      .select('*')
      .eq('user_id', userId)
      .gt('updated_at', lastSyncedAt)

    // 3. 获取本地所有数据
    const localItems = await (db as any)[table.dexieTable].toArray()

    // 4. 合并远端变更到本地（Dexie）
    if (remoteChanges?.length) {
      for (const remote of remoteChanges) {
        const { user_id, ...itemData } = remote
        const local = localItems.find((l: any) => l.id === remote.id)
        if (local) {
          const resolved = resolveConflict(local, itemData)
          await (db as any)[table.dexieTable].put(resolved)
        } else {
          await (db as any)[table.dexieTable].put(itemData)
        }
      }
    }

    // 5. 推送本地变更到远端
    const remoteIds = new Set((remoteChanges ?? []).map((r: any) => r.id))
    const localToUpload = localItems.filter((item: any) => !remoteIds.has(item.id))

    if (localToUpload.length) {
      const rows = localToUpload.map((item: any) => ({
        ...item,
        user_id: userId,
        data: item.data ?? item, // 根据表结构调整
        updated_at: item.updated_at ?? new Date().toISOString(),
      }))

      await this.supabase
        .from(table.supabaseTable)
        .upsert(rows, { onConflict: 'id' })
    }

    // 6. 更新同步元数据
    await this.supabase.from('sync_metadata').upsert({
      user_id: userId,
      table_name: table.name,
      client_id: CLIENT_ID,
      last_synced_at: new Date().toISOString(),
    })
  }
}

export const syncEngine = new SyncEngine()
```

**Step 4: Commit**

```bash
git add src/lib/sync/
git commit -m "feat: implement data sync engine with LWW conflict resolution"
```

---

### Task 3.2: 创建 Sync Store & 自动同步

**Files:**
- Create: `src/stores/sync-store.ts`

**Step 1: 实现 sync store**

```typescript
// src/stores/sync-store.ts
import { create } from 'zustand'
import { syncEngine } from '@/lib/sync/engine'
import { useAuthStore } from './auth-store'
import type { SyncState } from '@/lib/sync/types'

interface SyncStoreState extends SyncState {
  autoSync: boolean
  syncIntervalMs: number
  triggerSync: () => Promise<void>
  startAutoSync: () => void
  stopAutoSync: () => void
}

let autoSyncTimer: ReturnType<typeof setInterval> | null = null

export const useSyncStore = create<SyncStoreState>((set, get) => {
  // 订阅 sync engine 状态变化
  syncEngine.subscribe((state) => set(state))

  return {
    status: 'idle',
    lastSyncedAt: null,
    pendingChanges: 0,
    error: null,
    autoSync: true,
    syncIntervalMs: 5 * 60 * 1000, // 5 分钟

    triggerSync: async () => {
      const user = useAuthStore.getState().user
      if (!user) return
      await syncEngine.sync(user.id)
    },

    startAutoSync: () => {
      if (autoSyncTimer) return
      const { syncIntervalMs, triggerSync } = get()
      // 立即同步一次
      triggerSync()
      autoSyncTimer = setInterval(triggerSync, syncIntervalMs)
    },

    stopAutoSync: () => {
      if (autoSyncTimer) {
        clearInterval(autoSyncTimer)
        autoSyncTimer = null
      }
    },
  }
})
```

**Step 2: Commit**

```bash
git add src/stores/sync-store.ts
git commit -m "feat: add sync store with auto-sync support"
```

---

### Task 3.3: Dexie 表结构适配同步

**Files:**
- Modify: `src/lib/db.ts`

**Step 1: 在 Dexie schema 中添加 updated_at 字段**

新增 version 7，为所有表添加 `updated_at` 索引以支持增量同步:

```typescript
// 在 db.ts 中添加 version 7
db.version(7).stores({
  contents: 'id, type, category, source, difficulty, createdAt, *tags, updated_at',
  records: 'id, contentId, module, lastPracticed, nextReview, updated_at',
  sessions: 'id, contentId, module, startTime, completed, updated_at',
  books: 'id, title, source, createdAt, updated_at',
  conversations: 'id, updatedAt, createdAt, updated_at',
})
```

**Step 2: Commit**

```bash
git add src/lib/db.ts
git commit -m "feat: add updated_at index to Dexie tables for sync support"
```

---

### Task 3.4: 同步 UI 组件

**Files:**
- Create: `src/components/sync/sync-status.tsx`
- Modify: `src/components/sidebar.tsx`（假设 sidebar 存在）

**Step 1: 同步状态指示器**

```tsx
// src/components/sync/sync-status.tsx
'use client'

import { useSyncStore } from '@/stores/sync-store'
import { useAuthStore } from '@/stores/auth-store'
import { Cloud, CloudOff, Loader2, AlertCircle } from 'lucide-react'

export function SyncStatus() {
  const { user } = useAuthStore()
  const { status, lastSyncedAt, triggerSync } = useSyncStore()

  if (!user) return null

  const icon = {
    idle: <Cloud className="w-4 h-4 text-green-500" />,
    syncing: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
  }[status]

  const label = {
    idle: lastSyncedAt ? `Synced ${timeAgo(lastSyncedAt)}` : 'Not synced',
    syncing: 'Syncing...',
    error: 'Sync failed',
  }[status]

  return (
    <button
      onClick={triggerSync}
      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
      title="Click to sync now"
    >
      {icon}
      <span>{label}</span>
    </button>
  )
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  return `${hours}h ago`
}
```

**Step 2: Commit**

```bash
git add src/components/sync/
git commit -m "feat: add sync status indicator component"
```

---

## Phase 4: 设置页面 & 用户 Profile

### Task 4.1: Settings 页面添加账户区域

**Files:**
- Modify: `src/app/(app)/settings/page.tsx`

**Step 1: 添加 Account 区块**

在 Settings 页面顶部添加账户管理区域，展示：
- 已登录：头像 + 显示名称 + 邮箱 + 退出按钮
- 未登录：登录按钮（Google/GitHub）
- 同步状态和手动同步按钮
- 数据统计（云端 vs 本地条目数）

具体 UI 代码取决于现有 Settings 页面结构，在实施时参照 `src/app/(app)/settings/page.tsx` 中现有组件风格实现。

**Step 2: Commit**

```bash
git add src/app/(app)/settings/page.tsx
git commit -m "feat: add account management section to settings page"
```

---

## Phase 5: 社交功能

### Task 5.1: 用户 Profile 页面

**Files:**
- Create: `src/app/(app)/profile/page.tsx` （自己的 profile）
- Create: `src/app/(app)/profile/[userId]/page.tsx` （他人 profile）

**Step 1: 实现 Profile 页面**

展示内容:
- 头像 + 显示名称 + Bio
- CEFR 等级
- 连续学习天数（streak）
- 总练习时间
- 最近学习动态
- 公开分享的内容
- 关注 / 粉丝数

**Step 2: Commit**

```bash
git add src/app/(app)/profile/
git commit -m "feat: add user profile pages"
```

---

### Task 5.2: 排行榜页面

**Files:**
- Create: `src/app/(app)/community/page.tsx`
- Create: `src/app/api/leaderboard/route.ts`

**Step 1: 排行榜 API**

```typescript
// src/app/api/leaderboard/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') ?? 'weekly'
  const periodKey = searchParams.get('key') ?? getCurrentPeriodKey(period)

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('leaderboard')
    .select('*, profiles(display_name, avatar_url, cefr_level)')
    .eq('period', period)
    .eq('period_key', periodKey)
    .order('rank', { ascending: true })
    .limit(50)

  return Response.json(data ?? [])
}

function getCurrentPeriodKey(period: string): string {
  const now = new Date()
  if (period === 'daily') return now.toISOString().slice(0, 10)
  if (period === 'weekly') {
    const week = getISOWeek(now)
    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`
  }
  if (period === 'monthly') return now.toISOString().slice(0, 7)
  return 'all'
}

function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}
```

**Step 2: 社区页面**

展示:
- 日榜 / 周榜 / 月榜切换
- 排名列表：头像、名称、等级、练习时间、准确率、WPM
- 自己的排名高亮

**Step 3: Commit**

```bash
git add src/app/(app)/community/ src/app/api/leaderboard/
git commit -m "feat: add community page with leaderboard"
```

---

### Task 5.3: 内容分享 & 点赞

**Files:**
- Create: `src/app/api/community/contents/route.ts`
- Create: `src/app/api/community/likes/route.ts`
- Modify: 内容详情页（添加分享按钮）

**Step 1: 社区内容 API**

```typescript
// src/app/api/community/contents/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const page = Number(searchParams.get('page') ?? '0')
  const limit = 20

  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('contents')
    .select('id, type, category, difficulty, tags, data, created_at, profiles(display_name, avatar_url)')
    .eq('is_shared', true)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1)

  return Response.json(data ?? [])
}
```

**Step 2: 点赞 API**

```typescript
// src/app/api/community/likes/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { contentId } = await request.json()

  const { error } = await supabase
    .from('content_likes')
    .insert({ user_id: user.id, content_id: contentId })

  if (error?.code === '23505') {
    // 已点赞，取消
    await supabase
      .from('content_likes')
      .delete()
      .eq('user_id', user.id)
      .eq('content_id', contentId)
    return Response.json({ liked: false })
  }

  return Response.json({ liked: true })
}
```

**Step 3: Commit**

```bash
git add src/app/api/community/
git commit -m "feat: add community content sharing and likes API"
```

---

### Task 5.4: 排行榜更新 Edge Function

**Files:**
- Create: `supabase/functions/update-leaderboard/index.ts`

**Step 1: 创建 Edge Function**

```typescript
// supabase/functions/update-leaderboard/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  // 计算每个用户今日的练习统计
  const { data: stats } = await supabase.rpc('calculate_daily_stats', { target_date: today })

  if (stats?.length) {
    // 按 total_minutes 排序并分配 rank
    const ranked = stats
      .sort((a: any, b: any) => b.total_minutes - a.total_minutes)
      .map((s: any, i: number) => ({
        user_id: s.user_id,
        period: 'daily',
        period_key: today,
        total_minutes: s.total_minutes,
        total_sessions: s.total_sessions,
        accuracy_avg: s.accuracy_avg,
        wpm_avg: s.wpm_avg,
        rank: i + 1,
      }))

    await supabase.from('leaderboard').upsert(ranked)
  }

  return new Response(JSON.stringify({ updated: stats?.length ?? 0 }))
})
```

**Step 2: 在 Supabase Dashboard 中设置 Cron 调度**

通过 `pg_cron` 或 Supabase Dashboard → Edge Functions → Cron Trigger:
- 每小时更新一次排行榜

**Step 3: 创建 PostgreSQL 统计函数**

```sql
-- 添加到 migration 中
create or replace function calculate_daily_stats(target_date text)
returns table (
  user_id uuid,
  total_minutes int,
  total_sessions int,
  accuracy_avg numeric,
  wpm_avg numeric
) as $$
  select
    s.user_id,
    coalesce(sum((s.data->>'durationMs')::int) / 60000, 0) as total_minutes,
    count(*) as total_sessions,
    avg((s.data->>'accuracy')::numeric) as accuracy_avg,
    avg((s.data->>'wpm')::numeric) as wpm_avg
  from public.sessions s
  where s.start_time::date = target_date::date
    and s.completed = true
  group by s.user_id
$$ language sql;
```

**Step 4: Commit**

```bash
git add supabase/functions/ supabase/migrations/
git commit -m "feat: add leaderboard update Edge Function and stats query"
```

---

## Phase 6: 付费功能预留架构

### Task 6.1: Plan 检查中间件

**Files:**
- Create: `src/lib/plan.ts`

**Step 1: 实现 plan 检查工具**

```typescript
// src/lib/plan.ts
import { createClient } from '@/lib/supabase/client'

export type PlanType = 'free' | 'pro' | 'team'

export interface PlanLimits {
  maxContents: number
  maxDailySessions: number
  canShareContent: boolean
  canViewLeaderboard: boolean
  advancedAIModels: boolean
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxContents: 100,
    maxDailySessions: 10,
    canShareContent: true,
    canViewLeaderboard: true,
    advancedAIModels: false,
  },
  pro: {
    maxContents: -1, // unlimited
    maxDailySessions: -1,
    canShareContent: true,
    canViewLeaderboard: true,
    advancedAIModels: true,
  },
  team: {
    maxContents: -1,
    maxDailySessions: -1,
    canShareContent: true,
    canViewLeaderboard: true,
    advancedAIModels: true,
  },
}

export async function getUserPlan(): Promise<PlanType> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 'free'

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, plan_expires_at')
    .eq('id', user.id)
    .single()

  if (!profile) return 'free'

  // 检查是否过期
  if (profile.plan_expires_at && new Date(profile.plan_expires_at) < new Date()) {
    return 'free'
  }

  return (profile.plan as PlanType) ?? 'free'
}

export function getPlanLimits(plan: PlanType): PlanLimits {
  return PLAN_LIMITS[plan]
}
```

**Step 2: Commit**

```bash
git add src/lib/plan.ts
git commit -m "feat: add plan limits infrastructure for future monetization"
```

---

## 实施顺序总结

| Phase | 范围 | 预计工作量 |
|-------|------|----------|
| **Phase 0** | Supabase 初始化 + DB Schema | 基础设施 |
| **Phase 1** | Auth 客户端 + OAuth + 登录页 | 核心认证 |
| **Phase 2** | Tauri 桌面端 Deep Link OAuth | 桌面适配 |
| **Phase 3** | 云同步引擎 + 状态管理 | 核心同步 |
| **Phase 4** | Settings 账户管理 UI | 用户体验 |
| **Phase 5** | 社交功能（Profile/排行榜/分享） | 社区功能 |
| **Phase 6** | 付费架构预留 | 未来扩展 |

## 关键设计决策

1. **Supabase 而非自建后端**: 提供 Auth + DB + RLS + Realtime 一站式方案，减少运维成本
2. **Dexie 保留为离线缓存层**: 用户未登录时完全本地使用，登录后双向同步
3. **LWW (Last-Write-Wins) 冲突解决**: 简单可靠，基于 `updated_at` 时间戳
4. **Deep Link 桌面 OAuth**: Tauri 通过 `echotype://` 协议接收 OAuth 回调
5. **RLS 数据隔离**: 所有用户数据通过 PostgreSQL Row Level Security 隔离
6. **Plan 预留**: profiles 表已包含 `plan` 和 `plan_expires_at` 字段
