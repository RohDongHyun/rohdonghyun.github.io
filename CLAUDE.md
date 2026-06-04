# rohdonghyun.github.io

Quartz 5 기반 개인 지식 저장소. **AI Agent가 초안을 작성하고 사람이 검수해 발행**하는 흐름이 목적이다.

라이브 사이트: https://rohdonghyun.github.io

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

### 프론트매터 (필수)

```yaml
---
title: 글 제목
date: 2026-06-04        # YYYY-MM-DD
tags:
  - paper-summary
  - rl
---
```

- `posts/`에 있는 글은 `title`과 `date` 필수.
- `drafts/`에서는 `date` 생략 가능 (검수 시 사람이 채움).

### 카테고리 태그 (이 중에서 1개 이상)

- `rl` — 강화학습
- `scheduling` — 스케줄링 (특히 산업/제조 최적화)
- `agent` — AI Agent 시스템 (Claude, OpenAI, MCP 등)
- `llm` — LLM 일반
- `paper-summary` — 논문 요약 (반드시 본문 첫 줄에 arXiv 또는 DOI 링크)
- `note` — 그 외 학습/메모

### 수식

- KaTeX 사용. 인라인 `$...$`, 블록 `$$...$$`.
- `\\` 줄바꿈은 KaTeX 호환 표기. AMS `align*` 환경 가능.
- 화학식이 필요하면 `latex.ts`에 `mhchem` import 추가 (현재 미설정).

### 링크

- 같은 사이트 내부 링크는 위키링크: `[[posts/hello]]`.
- 외부 링크는 일반 마크다운: `[arXiv](https://arxiv.org/abs/xxxx.yyyyy)`.

## 로컬 워크플로 (Windows PowerShell)

```powershell
npm ci                       # 의존성 설치 (최초 1회 + lockfile 변경 시)
npx quartz plugin install    # 플러그인 설치 (최초 1회 + quartz.lock.json 변경 시)
npx quartz build --serve     # 로컬 미리보기 (http://localhost:8080)
npx quartz build             # 정적 빌드만 (public/ 생성)
```

`public/`과 `node_modules/`, `.quartz/`는 `.gitignore` 적용.

## 배포

`main` 브랜치에 push → GitHub Actions가 `npm ci` → `quartz plugin install` → `quartz build` → `public/`을 GitHub Pages로 업로드.

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
