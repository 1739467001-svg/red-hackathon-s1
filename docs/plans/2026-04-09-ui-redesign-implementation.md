# UI Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace 20 characters with 40 from card art, full-screen card matrix with FLIP grouping animation, Vercel/Warp pure black-white aesthetic.

**Architecture:** Backend `characters.ts` grows to 40 entries with webp avatars. `phase-executor.ts` grouping adapts to 3-6 per group (7-13 groups). Frontend RosterGrid becomes a single adaptive grid with card face images and group-gap animation. ChatSidebar tabs become dynamic. Color palette shifts to pure cold black-white.

**Tech Stack:** Next.js 16 + React 19 + TailwindCSS 4 + Zustand, NestJS 11 + TypeORM, ImageMagick for asset conversion.

---

### Task 1: Process Card Art Assets

**Files:**
- Create: `frontend/public/avatars/oc-1.webp` through `oc-40.webp`
- Create: `scripts/convert-avatars.sh`

**Step 1: Create conversion script**

```bash
#!/bin/bash
# scripts/convert-avatars.sh
# Maps zip filenames to oc-N.webp, resize to 400px wide, quality 80
SRC="/tmp/card_preview/问卷选手"
DST="frontend/public/avatars"

declare -a FILES=(
  "俯视剑道赛博男生_版本3.jpg"       # oc-1 (原小昝)
  "何晴_精灵女_俯视视角.png"          # oc-2
  "余亮_元素具现_俯视视角.png"        # oc-3
  "#04 吴迪.png"                       # oc-4
  "#05_张振东_机械强化_俯视视角.png"   # oc-5
  "#06_张志远_俯视视角.png"            # oc-6
  "张纪翔_自然融合_俯视特写.png"      # oc-7
  "糌粑_CRT拟人特写_2K.png"           # oc-8
  "何奕-元素具现.png"                  # oc-9
  "何奕分身_俯视特写_2K.png"          # oc-10
  "艾贺-异界神话.png"                  # oc-11
  "鲍子昊-暗物质操控者.png"            # oc-12
  "冯欢-兽灵.png"                      # oc-13
  "金阳-神明级战士.png"                # oc-14
  "朱利戈-机甲人形.png"                # oc-15
  "朱威林-三态混合-超精细渲染.png"    # oc-16
  "王宁-科幻外骨骼战士融合版.png"      # oc-17
  "余江昊-少年黑客融合版.jpg"          # oc-18
  "蒋鲤-人形神话.jpg"                  # oc-19
  "机器人角色_俯视特写_超精细渲染.png" # oc-20
  "#14_孙梦徽_俯视视角.png"            # oc-21
  "#18_邵瑞琪_兽灵_俯视视角.png"      # oc-22
  "#26_洪沐天_异界神话_俯视视角.png"  # oc-23
  "#28_黄熠_造物拟人_俯视视角.png"    # oc-24
  "#30_Zac_俯视特写_超精细渲染.png"   # oc-25
  "#31_霍枵杰_俯视特写_超精细渲染.png"# oc-26
  "#38_吴鑫全_宇宙流浪者_俯视视角.png"# oc-27
  "#39_罗浩安_隐世者_俯视视角.png"    # oc-28
  "#42_彭子傲_时空漂流者_俯视视角.png"# oc-29
  "代代_元素神话_俯视视角.png"        # oc-30
  "桂香伟_元素具现_透明身体_俯视特写.png" # oc-31
  "江昪_兽灵喷火龙_俯视视角.png"      # oc-32
  "李昕悦_写实3D渲染_俯视视角.png"    # oc-33
  "刘宓_超精细俯视特写_2K.jpg"        # oc-34
  "欧洋卉_现代极简魔法师_俯视特写.png"# oc-35
  "王今甫_人形觉醒者_俯视视角.png"    # oc-36
  "伍海玮_人形觉醒者_俯视视角.png"    # oc-37
  "夏力维_3D渲染版_2K.png"            # oc-38
  "叶楚怡_绿衬衫彩虹领带_2K.png"      # oc-39
  "张涛_狐系法术师_俯视视角.png"      # oc-40
)

for i in "${!FILES[@]}"; do
  idx=$((i + 1))
  convert "$SRC/${FILES[$i]}" -resize 400x -quality 80 "$DST/oc-${idx}.webp"
  echo "Converted oc-${idx}.webp"
done
```

**Step 2: Run the conversion**

```bash
chmod +x scripts/convert-avatars.sh
bash scripts/convert-avatars.sh
```

Expected: 40 webp files in `frontend/public/avatars/`, each ~50-200KB.

**Step 3: Remove old jpeg avatars**

```bash
rm -f frontend/public/avatars/oc-*.jpeg
```

**Step 4: Commit**

```bash
git add frontend/public/avatars/ scripts/convert-avatars.sh
git commit -m "assets: convert 40 character card arts to webp avatars"
```

---

### Task 2: Replace Characters Data (Backend)

**Files:**
- Rewrite: `backend/src/data/characters.ts` (all 300 lines)

**Step 1: Write the new 40-character data file**

Rewrite `backend/src/data/characters.ts` with 40 entries. Keep the existing `CharacterData` interface. Each character:
- `id`: `oc-1` through `oc-40`
- `name`: extracted from zip filename (e.g., `俯视剑道赛博男生_版本3.jpg` → `小昝`, `何晴_精灵女_俯视视角.png` → `何晴`)
- `avatarUrl`: `/avatars/oc-N.webp`
- `personality`: assign MBTI types ensuring good distribution across leader/backend/designer/marketing types
- `characterType`, `description`, `skill`, `weapon`, `equipment`, `companion`: generate thematically based on card art style
- `isGenerated`: `false` for all (they're all "real" now)
- `colorPreference`: derive from card art themes

MBTI distribution must ensure balanced grouping:
- ~8-10 leader types (ENTJ, ENFJ, ESTJ, ESTP, ENTP) — enough for 7-13 groups
- ~10-12 backend types (INTJ, INTP, ISTJ, ISTP)
- ~8-10 designer types (ISFP, INFP, INFJ)
- ~8-10 marketing/ops types (ENFP, ESFP, ESFJ)
- Remaining: ISFJ and other front-end types

**Step 2: Verify TypeScript compiles**

```bash
cd backend && npx tsc --noEmit
```

Expected: no errors.

**Step 3: Commit**

```bash
git add backend/src/data/characters.ts
git commit -m "data: replace 20 characters with 40 from card art zip"
```

---

### Task 3: Adapt Grouping Algorithm (Backend)

**Files:**
- Modify: `backend/src/modules/simulation/phase-executor.ts:80-155` (executePhase0 method)
- Modify: `backend/src/modules/simulation/simulation.service.ts:47-51` (groupCount config)

**Step 1: Update executePhase0 for dynamic group sizing**

Replace the fixed `groupCount` parameter with a dynamic algorithm:

```typescript
executePhase0(
  allCharacters: CharacterData[],
  ideas: string[],
): GroupAssignment[] {
  // ... existing role assignment code stays the same (lines 85-120) ...

  // Dynamic group sizing: 3-6 per group
  const targetSize = 5; // prefer 5 per group
  const groupCount = Math.ceil(allCharacters.length / targetSize);
  // Ensure each group has 3-6 members
  // 40 / 5 = 8 groups of 5

  // ... rest of shuffling and splitting stays same ...
  // But change the splitting to handle variable sizes:

  // Distribute members round-robin to ensure even groups
  const groups: GroupAssignment[] = Array.from({ length: groupCount }, (_, g) => ({
    groupId: g + 1,
    idea: ideas[Math.min(g, ideas.length - 1)],
    members: [],
  }));

  withRoles.forEach((m, i) => {
    const gIdx = i % groupCount;
    groups[gIdx].members.push({
      characterId: m.character.id,
      role: m.role,
      isLeader: false,
    });
  });

  // Assign leaders within each group
  for (const group of groups) {
    // Find member with highest leader score
    const sorted = group.members
      .map(m => ({
        ...m,
        score: withRoles.find(w => w.character.id === m.characterId)!.leaderScore
      }))
      .sort((a, b) => b.score - a.score);
    sorted[0].isLeader = true;
    group.members = sorted.map(({ score, ...rest }) => rest);
    // Leader gets PM role
    group.members[0].role = '产品经理';
  }

  return groups;
}
```

**Step 2: Remove hardcoded groupCount from simulation.service.ts**

In `simulation.service.ts:47-51`, change:
```typescript
// Old:
const groupCount = this.configService.get<number>('SIMULATION_GROUP_COUNT', 4);
const groups = phaseExecutor.executePhase0(characters, ideas, groupCount);
// New:
const groups = phaseExecutor.executePhase0(characters, ideas);
```

**Step 3: Verify build**

```bash
cd backend && npx tsc --noEmit
```

**Step 4: Commit**

```bash
git add backend/src/modules/simulation/phase-executor.ts backend/src/modules/simulation/simulation.service.ts
git commit -m "feat: dynamic grouping algorithm for 40 characters, 3-6 per group"
```

---

### Task 4: Update Avatar Helper (Frontend)

**Files:**
- Modify: `frontend/src/lib/avatar.ts` (6 lines → change extension)

**Step 1: Update avatar URL extension**

```typescript
export function getAvatarUrl(agentId: string): string {
  const match = agentId.match(/(\d+)/);
  const num = match ? parseInt(match[1], 10) : 1;
  return `/avatars/oc-${num}.webp`;
}
```

**Step 2: Commit**

```bash
git add frontend/src/lib/avatar.ts
git commit -m "fix: update avatar URLs from jpeg to webp"
```

---

### Task 5: Update Color System (Frontend)

**Files:**
- Modify: `frontend/src/app/globals.css:132-143` (CSS variables)
- Modify: `frontend/src/app/layout.tsx:37` (body inline style)

**Step 1: Update CSS variables in globals.css**

Replace the Roster Screen Design System variables block:

```css
:root {
  --rs-black: #000000;
  --rs-white: #ededed;
  --rs-charcoal: #111111;
  --rs-gray-dark: #222222;
  --rs-gray: #555555;
  --rs-gray-light: #888888;
  --rs-font-display: 'Space Grotesk', sans-serif;
  --rs-font-mono: 'JetBrains Mono', monospace;
}
```

**Step 2: Update body background in layout.tsx**

Change line 37:
```tsx
style={{ background: '#000000', color: '#ededed' }}
```

**Step 3: Commit**

```bash
git add frontend/src/app/globals.css frontend/src/app/layout.tsx
git commit -m "style: update color palette to Vercel/Warp cold black-white"
```

---

### Task 6: Refactor RosterGrid Component (Frontend) — Core task

**Files:**
- Rewrite: `frontend/src/components/RosterGrid.tsx` (488 lines → full rewrite)

**Step 1: Rewrite RosterGrid**

Key changes:
1. Remove SW/HW dual track — single adaptive grid
2. `TOTAL_CELLS = 40` stays, but now all cells are real characters
3. Card face image as background with gradient overlay + white name text at bottom
4. Grid uses `repeat(auto-fill, minmax(100px, 1fr))` with `gap: 4px`, `padding: 12px`
5. After grouping (phase >= 1): cells rearrange by group, insert group labels and wider gap between groups
6. Keep FLIP animation for phase 0→1 transition
7. Keep hover detail card and click-to-flip
8. Remove `TrackColumn` sub-component entirely
9. `loading="lazy"` on images

Grid cell structure:
```tsx
<div className="grid-cell active">
  <div className="card-inner">
    <div className="card-front relative overflow-hidden">
      <img src={cell.avatarUrl} alt={cell.name} className="h-full w-full object-cover" loading="lazy" />
      {/* Gradient overlay at bottom */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-4">
        <span className="block truncate text-center text-xs font-medium" style={{ color: 'var(--rs-white)' }}>
          {cell.name}
        </span>
      </div>
    </div>
    <div className="card-back ...">
      {/* existing back content */}
    </div>
  </div>
</div>
```

For grouped display (phase >= 1), render:
```tsx
<div className="grid w-full gap-6 p-3" style={{ gridTemplateColumns: '1fr' }}>
  {groupedSections.map(group => (
    <div key={group.groupId}>
      {/* Group label */}
      <div className="font-mono mb-2 uppercase" style={{ fontSize: 11, letterSpacing: 3, color: 'var(--rs-gray-light)' }}>
        组 {group.groupId}
      </div>
      {/* Group members grid */}
      <div className="grid gap-1" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))' }}>
        {group.cells.map(cell => renderCell(cell, index))}
      </div>
    </div>
  ))}
</div>
```

**Step 2: Update globals.css — remove TrackColumn-related styles if any**

No dedicated track styles exist in CSS (tracks were purely in JSX), so this is clean.

**Step 3: Verify build**

```bash
cd frontend && npx next build
```

**Step 4: Commit**

```bash
git add frontend/src/components/RosterGrid.tsx
git commit -m "feat: refactor RosterGrid to single full-screen card matrix with card art"
```

---

### Task 7: Dynamic Chat Tabs (Frontend)

**Files:**
- Modify: `frontend/src/components/ChatSidebar.tsx:269` (hardcoded `[1, 2, 3, 4]`)
- Modify: `frontend/src/stores/simulation-store.ts:51` (initial activeGroupTab)

**Step 1: Make tabs dynamic from groups**

In ChatSidebar, replace:
```tsx
// Old (line 269):
{[1, 2, 3, 4].map((groupId) => {
// New:
const groups = useSimulationStore((s) => s.groups);
const groupIds = groups.length > 0
  ? groups.map(g => g.groupId)
  : [];
// ...
{groupIds.map((groupId) => {
```

Add horizontal scroll when many tabs:
```tsx
<div
  className="flex shrink-0 overflow-x-auto"
  style={{ borderBottom: '1px solid var(--rs-gray-dark)' }}
>
```

Tab button: reduce padding for many groups, make font smaller:
```tsx
className="relative shrink-0 cursor-pointer px-2 py-2 text-center transition-all duration-200"
style={{
  fontFamily: 'var(--rs-font-display)',
  fontSize: groupIds.length > 6 ? '0.75rem' : '1rem',
  letterSpacing: '1px',
  minWidth: groupIds.length > 6 ? '48px' : '64px',
  // ...rest stays same
}}
```

**Step 2: Fix initial activeGroupTab**

In `simulation-store.ts`, the initial `activeGroupTab: 1` is fine since groups always start from 1.
But when groups arrive via SSE, auto-set the first tab if needed. No change needed — current code handles this.

**Step 3: Commit**

```bash
git add frontend/src/components/ChatSidebar.tsx
git commit -m "feat: dynamic chat tabs based on actual group count"
```

---

### Task 8: Update Simulation Page Layout (Frontend)

**Files:**
- Modify: `frontend/src/app/simulation/page.tsx:142-161`

**Step 1: Adjust panel split to 65/35**

```tsx
{/* Left panel: Roster Grid (65%) */}
<div className="w-[65%] overflow-auto">
  <RosterGrid ... />
</div>

{/* Right panel: Chat Sidebar (35%) */}
<div
  className="w-[35%] border-l"
  style={{ borderColor: 'var(--rs-gray-dark)' }}
>
  <ChatSidebar />
</div>
```

**Step 2: Commit**

```bash
git add frontend/src/app/simulation/page.tsx
git commit -m "style: adjust simulation page panel ratio to 65/35"
```

---

### Task 9: Update Home Page (Frontend)

**Files:**
- Modify: `frontend/src/app/page.tsx:100,108` (max-w-xl → max-w-2xl)

**Step 1: Widen content areas**

Change all `max-w-xl` to `max-w-2xl` (lines 100, 108, 210).

**Step 2: Commit**

```bash
git add frontend/src/app/page.tsx
git commit -m "style: widen home page content area"
```

---

### Task 10: Update Result Page (Frontend)

**Files:**
- Modify: `frontend/src/app/result/result-content.tsx:131` (max-w-3xl → max-w-5xl)

**Step 1: Widen result container**

Change `max-w-3xl` to `max-w-5xl` (line 131).

**Step 2: Commit**

```bash
git add frontend/src/app/result/result-content.tsx
git commit -m "style: widen result page container"
```

---

### Task 11: Frontend Build Verification

**Step 1: Run lint**

```bash
cd frontend && npx next lint
```

Expected: no errors.

**Step 2: Run build**

```bash
cd frontend && npx next build
```

Expected: successful build, no type errors.

**Step 3: Fix any issues found, commit if needed**

---

### Task 12: Backend Build Verification

**Step 1: Run lint**

```bash
cd backend && npx eslint src/ --ext .ts
```

**Step 2: Run build**

```bash
cd backend && npm run build
```

Expected: successful compilation.

**Step 3: Fix any issues, commit if needed**

---

### Task 13: E2E Testing — Desktop (Playwright)

**Prerequisite:** Both frontend and backend must be running.

Start servers:
```bash
cd backend && npm run start:dev &
cd frontend && npm run dev &
```

**Test 1: Normal Flow (Desktop 1920x1080)**

1. Navigate to `/` — verify home page loads, title "HinH" visible
2. Type "AI创业项目" in first idea input
3. Click "添加更多想法", type "智能硬件" in second input
4. Click "开始模拟" button
5. Verify redirect to `/simulation`
6. Verify 40 character cards appear (all lit, card art images visible)
7. Wait for phase change → verify FLIP animation (cards rearrange into groups)
8. Verify group labels appear above each group section
9. Verify Chat sidebar shows correct number of tabs (7-10)
10. Click different group tabs → verify messages switch
11. Click a character card → verify flip animation shows back details
12. Hover over card → verify detail popup appears
13. Wait for simulation to complete → verify redirect to `/result`
14. Verify result cards show rankings, BP documents, judge scores
15. Click "返回首页" → verify navigation back to `/`

**Test 2: Edge Cases (Desktop)**

1. Submit with empty idea → verify error message "请至少输入一个想法"
2. Try adding more than 4 ideas → verify button disappears at max
3. Remove all ideas except one → verify remove button disappears when only 1 left
4. Navigate directly to `/simulation` without simulationId → verify redirect to `/`
5. Navigate directly to `/result` without data → verify redirect or error display

---

### Task 14: E2E Testing — Mobile (Playwright)

**Test 3: Normal Flow (Mobile 375x812 iPhone viewport)**

Same flow as Test 1 but on mobile viewport:
1. Verify grid adapts (fewer columns, ~3-4 columns instead of 8)
2. Verify chat tabs scroll horizontally on small screen
3. Verify cards are tappable (not just hoverable)
4. Verify result cards work well on narrow screen

**Test 4: Mobile Edge Cases**

1. Verify no horizontal overflow on any page
2. Verify touch interactions work (tap to flip card)
3. Verify tab switching works on touch

---

### Task 15: Backend API Testing

**Test 5: Non-AI API Tests**

1. POST `/api/simulation` with valid ideas → expect 201 with simulationId
2. POST `/api/simulation` with empty array → expect error
3. GET `/api/simulation/:id/status` with valid id → expect groups + phase
4. GET `/api/simulation/:id/status` with invalid id → expect 404
5. GET `/api/simulation/:id/result` with valid completed sim → expect results array
6. GET `/api/simulation/:id/stream` → expect SSE connection opens

**Test 6: AI Integration Tests (Complex Scenarios)**

1. Start simulation with a complex multi-domain idea (e.g., "结合区块链和医疗健康的AI辅助诊断平台")
2. Verify grouping produces valid groups (3-6 members each, each has a leader)
3. Verify Phase 1 discussions are contextually relevant to the idea
4. Verify Phase 2 BP document contains all required fields
5. Verify Phase 3 judge scores are within valid ranges (1-10)
6. Verify total scores are calculated correctly
