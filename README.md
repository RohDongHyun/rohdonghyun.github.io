# rohdonghyun.github.io

[Quartz 5](https://quartz.jzhao.xyz) 기반 개인 지식 저장소. AI Agent 또는 웹(Pages CMS)에서 글을 작성해 바로 발행하는 흐름이 목적이다.

- **라이브 사이트**: https://rohdonghyun.github.io
- 별도 초안(draft) 단계 없이 `content/posts/`에 쓰면 즉시 웹에 노출된다.
- 공개 전 검수가 필요하면 frontmatter에 `private: true`를 두고(암호화된 채로 웹에서 확인), 준비되면 해제한다.
- `main`에 push하면 GitHub Actions가 빌드 → GitHub Pages로 자동 배포한다.

> 글 작성 규칙·카테고리·태그·subagent 워크플로 등 상세 운영 규칙은 [`CLAUDE.md`](./CLAUDE.md)를 참고.

## 디렉토리 구조

```
content/
├── index.md          홈 페이지
├── images/           업로드 이미지 (/images/* 로 서빙)
└── posts/            발행된 글 (사이트에 노출)
    ├── foundations/  카테고리: 학술 기초 지식
    │   ├── statistics/
    │   ├── optimization-in-learning/
    │   ├── introduction-to-ml/
    │   ├── introduction-to-dl/
    │   └── introduction-to-rl/
    ├── insights/     카테고리: 세미나·기사·글 신지식
    └── papers/       카테고리: 논문 요약
.pages.yml            Pages CMS 설정 (웹 편집·이미지 업로드)
quartz/               Quartz 5 엔진 (수정 금지)
quartz.config.yaml    사이트 설정
scripts/build.mjs     배포 빌드 (카테고리/태그 검증 + 비공개 글 암호화)
.github/workflows/    Pages 자동 배포
```

- 글 경로: `content/posts/<category>/<date>-<slug>.md` (필요 시 `foundations`처럼 세부 폴더로 한 단계 더 분류).
- 파일명 슬러그는 영문 kebab-case (`2026-06-14-llm-agent-trends.md`). 제목은 한국어여도 파일명은 영문.
- 카테고리는 `foundations`, `insights`, `papers` 3개로 제한되며 **저장 폴더로 표현**한다. 각 글은 카테고리 1개 + 태그 1개 이상이 필수다.

## 사전 준비 (최초 1회)

```powershell
npm ci                       # 의존성 설치 (lockfile 변경 시 재실행)
npx quartz plugin install    # 플러그인 설치 (quartz.lock.json 변경 시 재실행)
```

> Node 22 이상 / npm 10.9.2 이상 필요.

## 로컬에서 글 확인하기 (commit 전 미리보기)

```powershell
npx quartz build --serve     # http://localhost:8080
```

- 글을 수정하면 자동으로 다시 빌드되어 브라우저에 반영된다.
- **비공개 글(`private: true`)도 이 모드에서는 평문으로 보인다** (암호화 안 됨). 암호화 동작까지 확인하려면 아래 배포용 빌드를 쓴다.

## 배포용 빌드 (push 전 최종 검증)

```powershell
npm run build                # scripts/build.mjs → public/ 생성
```

- 카테고리/태그 규칙을 검증하고(위반 시 빌드 실패), `private: true` 글을 AES-256-GCM으로 암호화한다.
- 산출물 `public/`은 정적 파일이라 그대로 열어도 되지만, 링크/검색 동작 확인은 위 `--serve` 미리보기가 편하다.
- 수식(KaTeX)·굵게 등 렌더 깨짐을 점검할 때는 **빌드 산출 HTML이 ground truth**다. `public/**/*.html`에서 `class="katex-error"`·잔존 `$$`를 grep해 확인한다 (자세한 주의사항은 `CLAUDE.md`의 '수식'·'마크다운 함정' 참고).

## 비공개 글

frontmatter에 `private: true`를 추가하면 빌드 시 본문이 암호화된다 (제목·태그·링크는 그대로 노출, 본문만 잠김). 비밀번호는 frontmatter가 아니라 환경변수 `PRIVATE_POSTS_PASSWORD`에서 읽는다.

- **로컬**: 프로젝트 루트의 `.env`(gitignored)에 `PRIVATE_POSTS_PASSWORD=...` 한 줄 추가.
- **CI**: GitHub Secrets에 같은 이름으로 등록 (`Settings → Secrets and variables → Actions`).

브라우저에서 비공개 글에 접근하면 비밀번호 입력 UI가 뜨고, 한 번 입력하면 `localStorage`에 캐싱된다. 우하단 **🔒 로그아웃** 버튼으로 캐시를 비울 수 있다.

## 웹 편집 (Pages CMS)

사람이 직접 쓸 때는 [Pages CMS](https://app.pagescms.org)에서 웹으로 편집한다 (`.pages.yml`이 설정). 이미지를 본문에 붙여넣으면 `content/images/`에 커밋되고 `/images/...` 링크가 자동 삽입된다. 저장하면 main에 직접 커밋 → 자동 배포.

- 본문 에디터는 rich-text(WYSIWYG)라 KaTeX 수식·위키링크를 변형할 수 있다. 수식·내부링크 많은 글은 저장 후 `.md`를 확인할 것.

## 배포

`main` 브랜치에 push → GitHub Actions가 `npm ci` → `quartz plugin install` → `npm run build` → `public/`을 GitHub Pages로 업로드. (Settings → Pages 의 Source는 **GitHub Actions**여야 한다.)
