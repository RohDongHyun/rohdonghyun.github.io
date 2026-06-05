# rohdonghyun.github.io

Quartz 5 기반 개인 지식 저장소. **AI Agent가 초안을 작성하고 사람이 검수해 발행**하는 흐름이 목적이다.

라이브 사이트: https://rohdonghyun.github.io

## 나는 누구인가

- SK Hynix MES에서 반도체 제조 시스템 스케줄링/Dispatching 로직 개발 담당. 팀 내 AI 과제 리딩 중.
- KAIST 산업공학과에서 '이산사건시스템에서의 시간 제어'로 박사 학위 취득. AI(ML/DL/RL/LLM) 등에 있어서 석사 수준의 지식을 가지고 있음.
- 주요 관심 분야: AI Agent를 이용한 업무 자동화, 강화학습/모방학습 기반 스케줄링/디스패칭 로직 개발.
- 선호 언어: 한국어 (영문 출처는 원문 유지)

## 디렉토리 구조

```
content/
├── index.md          홈 페이지
├── posts/            발행된 글 (사이트에 노출)
└── drafts/           초안 (ignorePatterns로 빌드 제외)
quartz/               Quartz 5 엔진 (수정 금지)
quartz.config.yaml    사이트 설정 (수정 가능)
quartz.config.default.yaml  업스트림 기본값 참조용
.github/workflows/deploy.yml  Pages 자동 배포
```

- `content/drafts/**` 는 `quartz.config.yaml`의 `ignorePatterns`로 빌드에서 제외된다.
- AI Agent가 생성한 글은 항상 `content/drafts/` 에 먼저 들어간다. 사람이 검수 후 `content/posts/` 로 옮긴다.

## 글 작성 규칙
- 논문 참조 또는 요약 시 arXiv 또는 DOI 링크 첨부.
- 일반 대학생이 이해할 수 있는 수준으로 풀어서 설명. 가능하면 예시를 넣어도 좋음.
- 할루시네이션이 없는지 작성 후 검토 필요.

### 프론트매터 (필수)

```yaml
---
title: 글 제목
date: 2026-06-04        # YYYY-MM-DD
tags:
  - AI Scheduling
---
```

- `posts/`에 있는 글은 `title`과 `date` 필수.
- `drafts/`에서는 `date` 생략 가능 (검수 시 사람이 채움).

### 카테고리 태그 (이 중에서 1개 선택)

- `AI Scheduling` — 강화학습, 모방학습 등 AI 기술 기반 스케줄링 및 디스패칭 (특히 반도체 FAB)
- `AI Agent` — 반도체 FAB 스케줄링 업무 위한 AI Agent 시스템

### 수식

- KaTeX 사용. 인라인 `$...$`, 블록 `$$...$$`.
- `\\` 줄바꿈은 KaTeX 호환 표기. AMS `align*` 환경 가능.
- 화학식이 필요하면 `latex.ts`에 `mhchem` import 추가 (현재 미설정).

### 링크 포맷

- 같은 사이트 내부 링크는 위키링크: `[[posts/hello]]`.
- 외부 링크는 일반 마크다운: `[arXiv](https://arxiv.org/abs/xxxx.yyyyy)`.

## 글 작성 워크플로 (Subagent)

사용자가 "X 주제로 글 써줘"라고 하거나 PDF 첨부와 함께 글 작성을 요청하면 Main Agent는 다음 순서로 위임한다.

1. **자료 수집** (필요한 것만 병렬 호출)
   - 웹 자료 필요 → `search-agent`
   - 슬라이드 PDF 첨부 → `ppt-agent` (PDF 절대 경로 전달)
2. **초안 작성** → `writer-agent` (수집 결과를 `materials`로 전달). `content/drafts/YYYY-MM-DD-<slug>.md` 생성.
3. **검토·교정** → `review-agent` (`drafts/<file>.md`를 직접 revise)
4. Main은 최종 파일 경로와 review의 변경 요약·의문점을 사용자에게 보고. 사용자가 검수 후 `content/posts/`로 이동.

각 subagent의 도구 권한과 시스템 프롬프트는 `.claude/agents/`에서 관리한다.

## 로컬 워크플로 (Windows PowerShell)

```powershell
npm ci                       # 의존성 설치 (최초 1회 + lockfile 변경 시)
npx quartz plugin install    # 플러그인 설치 (최초 1회 + quartz.lock.json 변경 시)
npx quartz build --serve     # 로컬 미리보기 (http://localhost:8080) — 비공개 글은 평문으로 보임
npm run build                # 배포용 빌드 (public/ 생성, 비공개 글 암호화)
```

`public/`과 `node_modules/`, `.quartz/`, `.env`는 `.gitignore` 적용.

## 비공개 글

frontmatter에 `private: true`를 추가하면 본문이 AES-256-GCM으로 빌드 시 암호화된다. 제목/태그/링크는 listings·RSS·sitemap에 그대로 노출되고 본문만 잠긴다.

```yaml
---
title: 비공개 메모
date: 2026-06-05
tags:
  - note
private: true
---
```

비밀번호는 환경변수 `PRIVATE_POSTS_PASSWORD`에서 읽는다. 글의 frontmatter에는 비밀번호를 적지 않는다 (공개 repo에 새는 것 방지).

- **로컬**: 프로젝트 루트의 `.env`(gitignored)에 `PRIVATE_POSTS_PASSWORD=...` 한 줄 추가
- **CI**: GitHub Secrets에 같은 이름으로 등록 (`Settings → Secrets and variables → Actions`)

`npm run build`가 호출되면 `scripts/build.mjs`가 `content/`를 OS 임시 디렉토리에 복제하고 `private: true` 글의 frontmatter에 `password:`를 주입한 뒤 quartz에 그 디렉토리를 빌드시킨다. 원본 `content/`는 절대 수정되지 않는다.

브라우저에서 비공개 글에 접근하면 비밀번호 입력 UI가 뜨고, 한 번 입력하면 `localStorage`에 캐싱되어 동일 비밀번호의 다른 비공개 글도 자동 해제된다. 우하단의 **🔒 로그아웃** 버튼으로 캐시를 비울 수 있다 (콘솔에서 `privateLogout()` 호출과 동등).

## 배포

`main` 브랜치에 push → GitHub Actions가 `npm ci` → `quartz plugin install` → `npm run build` → `public/`을 GitHub Pages로 업로드.

Settings → Pages 의 Source는 **GitHub Actions**여야 한다 (Deploy from branch가 아님).

## Phase 2 로드맵 (현재 미구현)

자동 발행 파이프라인은 다음 작업이 끝나야 동작한다:

1. `scripts/fetch_arxiv.py` — arXiv API에서 지정 카테고리(`cs.LG`, `cs.AI` 등)의 최근 논문 메타데이터를 가져온다.
2. `scripts/summarize.py` — Claude API로 논문 PDF/abstract를 요약해 Markdown으로 변환.
3. 결과물을 `content/drafts/YYYY-MM-DD-<slug>.md` 로 저장.
4. `.github/workflows/auto-draft.yml` — `schedule: cron`으로 매일 1회 실행, 생성된 draft를 PR로 올린다. (직접 push 금지 — 검수 단계 강제)
5. 사람이 PR을 검토하고 `posts/`로 이동 후 머지.

Anthropic API 키는 GitHub Secrets `ANTHROPIC_API_KEY`로 보관 예정.

## Quartz 5 관련 메모

- 설정은 YAML (`quartz.config.yaml`). v4의 TypeScript 설정과 다르다.
- 플러그인은 GitHub에서 별도로 받아오므로 `npx quartz plugin install`이 필수.
- 업스트림(`jackyzha0/quartz`)의 v5 변경사항을 가져오려면 `quartz/` 디렉토리를 통째로 교체하는 것이 가장 안전.
