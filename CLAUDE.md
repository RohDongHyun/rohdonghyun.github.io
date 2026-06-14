# rohdonghyun.github.io

Quartz 5 기반 개인 지식 저장소. **AI Agent 또는 웹(Pages CMS)에서 글을 작성해 바로 발행**하는 흐름이 목적이다. 별도 초안(draft) 단계 없이 `content/posts/`에 쓰면 즉시 웹에 노출된다. 공개 전 검수가 필요하면 `private: true`로 두고(암호화된 채로 웹에서 확인) 준비되면 해제한다.

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
├── images/           업로드 이미지 (Pages CMS가 여기에 저장, /images/* 로 서빙)
└── posts/            발행된 글 (사이트에 노출)
    ├── foundations/  카테고리: 학술 기초 지식
    ├── insights/     카테고리: 세미나·기사·글 신지식
    └── papers/       카테고리: 논문 요약
        └── <date>-<slug>.md
.pages.yml            Pages CMS 설정 (웹 편집·이미지 업로드)
quartz/               Quartz 5 엔진 (수정 금지)
quartz.config.yaml    사이트 설정 (수정 가능)
quartz.config.default.yaml  업스트림 기본값 참조용
scripts/build.mjs     배포 빌드 + 카테고리 강제 검증 / 비공개 글 암호화
.github/workflows/deploy.yml  Pages 자동 배포
```

- 글은 항상 `content/posts/<category>/<date>-<slug>.md` 에 바로 쓴다. 초안 폴더는 더 이상 쓰지 않는다.
- 파일명 슬러그는 영문 kebab-case (`2026-06-14-llm-agent-trends.md`). 제목은 한국어여도 파일명은 영문.
- 각 카테고리 폴더의 `index.md`는 explorer에 표시되는 폴더 이름(`title`)을 결정한다. 건드리지 말 것.

## 카테고리와 태그

글 하나는 **카테고리 1개**(아래 3개 중 하나로 제한)와 **태그(1개 이상, 값은 자유)**를 가진다. `scripts/build.mjs`가 발행글(`posts/`)에 대해 빌드 시 "카테고리 폴더가 유효한지 + 태그가 1개 이상인지"를 강제하며, 위반 시 빌드가 실패한다. 태그 값 자체는 검증하지 않는다.

### 카테고리 (폴더로 표현, 정확히 1개)

글이 속한 폴더가 곧 카테고리다. 별도 frontmatter 필드는 없다. 어느 카테고리인지는 **writer-agent가 글 내용으로 판단**한다.

- `foundations` — 학교나 학술계에서 보편적으로 다루는 기초 지식. 널리 통용되어 별도 출처가 필요 없는 내용.
- `insights` — 세미나·기사·블로그 등에서 얻은 비교적 최신의 지식. Fresh하지만 빠르게 바뀌거나 잊히기 쉬운 내용.
- `papers` — 개별 논문 요약·정리.

### 태그 (frontmatter `tags`, 1개 이상, 값 자유)

태그 값은 자유롭게 만들 수 있다(빌드가 값을 제한하지 않음). 다만 난립을 막기 위해 자주 쓰는 태그는 재사용한다. 대표 태그:

- `AI Scheduling` — 강화학습, 모방학습 등 AI 기술 기반 스케줄링 및 디스패칭 (특히 반도체 FAB)
- `AI Agent` — AI Agent 시스템·아키텍처·트렌드

이 둘은 Pages CMS 태그 입력란에서 제안으로 뜬다. 필요하면 새 태그를 그 자리에서 입력하면 된다.

> 예: AI Agent에 관한 세미나 요약 글 → 카테고리 `insights` (= `posts/insights/`에 저장) / 태그 `AI Agent`.

> 카테고리(폴더) 목록을 늘리려면 이 문서, `scripts/build.mjs`의 `CATEGORIES`, `.pages.yml`의 컬렉션을 함께 수정한다. 태그는 자유 입력이라 코드 수정이 필요 없다.

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
  - AI Agent            # 1개 이상 (값 자유)
---
```

- 모든 글은 `title`, `date`, `tags`(1개 이상) 필수.
- 공개 전 검수가 필요하면 `private: true`를 추가 (아래 '비공개 글').
- 카테고리는 frontmatter가 아니라 **저장 폴더**로 표현한다 (위 '카테고리와 태그' 참조).

### 수식

- KaTeX 사용. 인라인 `$...$`, 블록 `$$...$$`.
- `\\` 줄바꿈은 KaTeX 호환 표기. AMS `align*` 환경 가능.
- 화학식이 필요하면 `latex.ts`에 `mhchem` import 추가 (현재 미설정).

### 링크 포맷

- 같은 사이트 내부 링크는 위키링크: `[[posts/insights/2026-06-04-llm-agent-horizons]]`.
- 외부 링크는 일반 마크다운: `[arXiv](https://arxiv.org/abs/xxxx.yyyyy)`.

## 글 작성 워크플로 (Subagent)

사용자의 요청은 주로 아래 4가지 유형이다. Main Agent는 유형을 판별해 자료 수집 → 작성 → 검토 순으로 위임한다.

| 요청 유형 | 자료 수집 에이전트 | 핵심 입력 |
|---|---|---|
| **(A) 논문 URL을 주고 상세 설명** 요청 | `search-agent` (mode: paper-deep-dive) | arXiv/DOI/논문 URL |
| **(B) 키워드를 주고 최신·임팩트 큰 논문 목록 요약** 요청 | `search-agent` (mode: paper-roundup) | 키워드 + (선택) 기간/개수 |
| **(C) PPT/슬라이드 내용 요약** 요청 | `ppt-agent` | PDF 절대 경로 |
| **(D) 키워드(특히 AI Agent)의 최신 trend 검색** 요청 | `search-agent` (mode: trend-scan) | 키워드 |

절차:

1. **자료 수집** — 위 표대로 필요한 에이전트만 (병렬 가능) 호출. (B)는 보통 papers 카테고리, (A)도 papers, (C)·(D)는 내용에 따라 insights.
2. **작성** → `writer-agent` (수집 결과를 `materials`로 전달). 카테고리를 판단해 `content/posts/<category>/YYYY-MM-DD-<slug>.md`에 **직접** 작성. 공개 전 검수가 필요한 글이면 `private: true`를 넣는다.
3. **검토·교정** → `review-agent` (작성된 `posts/<category>/<file>.md`를 직접 revise).
4. Main은 최종 파일 경로(라이브 URL 포함)와 review의 변경 요약·의문점을 사용자에게 보고. 사용자는 웹에서 확인 후 필요하면 `private`를 해제하거나 직접 수정.

각 subagent의 도구 권한과 시스템 프롬프트는 `.claude/agents/`에서 관리한다.

## 웹 편집 (Pages CMS)

사람이 직접 쓸 때는 [Pages CMS](https://app.pagescms.org)에서 웹으로 편집한다 (`.pages.yml`이 설정). 이미지를 본문에 붙여넣으면 `content/images/`에 커밋되고 `/images/...` 링크가 자동 삽입된다. 저장하면 main에 직접 커밋 → 자동 배포.

- 본문 에디터는 rich-text(WYSIWYG)라 KaTeX 수식·위키링크를 변형할 수 있다. 수식·내부링크 많은 글은 저장 후 `.md`를 확인할 것.
- 파일명은 생성 시 날짜+제목 기반 기본값이 뜨며, 영문 kebab-case 슬러그로 고쳐 쓴다.

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
3. 결과물을 `content/posts/<category>/YYYY-MM-DD-<slug>.md` 로 저장 (검수 전이면 `private: true`).
4. `.github/workflows/auto-draft.yml` — `schedule: cron`으로 매일 1회 실행, 생성된 글을 PR로 올린다. (직접 push 금지 — 검수 단계 강제)
5. 사람이 PR을 검토하고 머지 (필요 시 `private` 해제).

Anthropic API 키는 GitHub Secrets `ANTHROPIC_API_KEY`로 보관 예정.

## Quartz 5 관련 메모

- 설정은 YAML (`quartz.config.yaml`). v4의 TypeScript 설정과 다르다.
- 플러그인은 GitHub에서 별도로 받아오므로 `npx quartz plugin install`이 필수.
- 업스트림(`jackyzha0/quartz`)의 v5 변경사항을 가져오려면 `quartz/` 디렉토리를 통째로 교체하는 것이 가장 안전.
