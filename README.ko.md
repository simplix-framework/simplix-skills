# SimpliX Skills

[English](README.md) | 한국어

SimpliX 스택(SimpliX Spring Boot 프레임워크, Searchable JPA, simplix-react와 UI 키트) 위에서 작업하는 에이전트용 스킬 모음입니다. Claude Code와 Codex가 같은 파일을 읽습니다.

## 플러그인

| 플러그인 | 용도 | 스킬 |
| --- | --- | --- |
| `simplix` | 스택으로 만든 애플리케이션 작업 | `simplix`(진입점), `backend`, `searchable-jpa`, `frontend`, `frontend-e2e`, `mockup`, `init` |
| `simplix-dev` | 프레임워크 저장소와 이 저장소 작업 | `framework-docs`, `simplix-react-docs`, `bugfix`, `sync-skills` |

스킬 이름은 Claude Code와 Codex에서 모두 `<플러그인>:<스킬>` 형식입니다. 예: `simplix:backend`.

## 설치

체크아웃에서 플러그인을 링크로 연결합니다. 체크아웃에서 고친 내용이 바로 반영됩니다.

```bash
node tools/install.mjs claude        # 각 플러그인을 Claude Code의 스킬 폴더에 연결
node tools/install.mjs codex         # 각 스킬을 ~/.agents/skills에 연결
node tools/install.mjs status
```

체크아웃을 마켓플레이스로 등록해 Claude Code나 Codex가 사본을 설치하게 할 수도 있습니다.

```bash
node tools/install.mjs claude --marketplace
node tools/install.mjs codex --marketplace
```

`node tools/install.mjs remove claude`와 `node tools/install.mjs remove codex`는 링크를 제거합니다. `--plugin <이름>`을 지정하면 해당 플러그인에만 적용합니다.

| | Claude Code | Codex |
| --- | --- | --- |
| 스킬 | ✔ | ✔ |
| 세션 시작 시 프로젝트 구성요소 안내 | ✔ | Codex가 플러그인 훅을 실행하는 경우 |
| 핸드북을 읽지 않은 편집을 거부하는 게이트 | ✔ | Codex가 플러그인 훅을 실행하는 경우 |
| 브라우저 점검용 하위 에이전트 | ✔ (`screen-auditor`) | 스킬의 지시문을 하위 에이전트에 전달 |

훅은 Claude Code와 Codex의 이벤트에 맞춰 작성했고 각 문서에 정의된 입력 형식으로 테스트합니다. 실제 실행은 Claude Code에서 확인했습니다. Codex 명령줄 도구는 측정 시점(0.171.0 버전, `codex exec`)에 플러그인 훅을 실행하지 않았으므로, Codex로 작업하는 프로젝트에서는 `simplix:init`이 기록하는 라우팅 블록으로 안내합니다.

## 핸드북을 프레임워크와 일치시키는 방법

핸드북에는 프레임워크에 관한 사실이 들어 있습니다. 타입 이름, 애노테이션 속성, 설정 키, 명령과 옵션, 패키지, 버전, 상세 내용이 있는 문서 경로입니다. 이 사실을 릴리스 라인별로 고정한 커밋의 프레임워크 소스와 모두 대조합니다.

| 파일 | 내용 |
| --- | --- |
| `frameworks.json` | 프레임워크 저장소, 릴리스 라인, 핸드북과 프레임워크의 대응 |
| `frameworks.lock.json` | 핸드북을 검증한 릴리스 라인별 커밋 |
| `tools/external-names.txt` | 핸드북에 나오지만 어느 프레임워크에도 속하지 않는 이름 |

```bash
node tools/check.mjs            # 구조 검사 후, 잠금 커밋 기준으로 모든 사실 대조
node tools/check.mjs --latest   # 최신 커밋 기준 대조와 잠금이 뒤처진 라인 보고
node tools/changes.mjs --fetch  # 잠금 이후 각 프레임워크의 변경 목록
node tools/lock.mjs --latest    # 새 커밋에서 검사가 통과할 때만 잠금 이동
```

검사는 Git 객체로 프레임워크를 읽으므로 프레임워크 체크아웃이 필요하고, 그 체크아웃의 브랜치는 바꾸지 않습니다. 기본 위치는 이 저장소 옆에 저장소 이름으로 있는 폴더이며, `--frameworks <폴더>`로 다른 위치를 지정합니다. SimpliX 생성기의 도움말을 실행해 명령을 대조하므로 SimpliX 체크아웃의 `simplix-cli`에서 `npm ci`를 한 번 실행해 두어야 합니다.

프레임워크가 릴리스되면 정기 검사가 잠금이 뒤처졌다고 보고합니다. 이후 절차는 `simplix-dev:sync-skills`에 있습니다. 변경 목록을 읽고, 핸드북을 고치고, 검사한 뒤 잠금을 옮깁니다.

## 구조

```text
.claude-plugin/marketplace.json     Claude Code 마켓플레이스
.agents/plugins/marketplace.json    Codex 마켓플레이스
plugins/<plugin>/
  plugin.json                       Claude Code와 Codex가 읽는 매니페스트
  .claude-plugin/plugin.json        Claude Code 매니페스트(같은 이름과 버전)
  skills/<skill>/SKILL.md           스킬. 필요에 따라 references/, scripts/, assets/ 포함
  hooks/                            세션 시작 안내와 게이트
  agents/                           Claude Code 하위 에이전트
tools/                              검사, 변경 목록, 잠금, 설치 도구
```

## 개발

```bash
node --test            # 도구, 훅, 스킬 스크립트의 테스트
node tools/check.mjs   # 지적 사항 없이 끝나야 함
```

이 저장소를 고칠 때 지켜야 할 규칙은 `AGENTS.md`에 있습니다.

## 라이선스

SimpleCORE License 1.0 (SCL-1.0)을 적용합니다. 전문은 [LICENSE](LICENSE), 한국어 번역은 [LICENSE_KO](LICENSE_KO)에 있습니다. 핸드북이 다루는 프레임워크에는 각 프레임워크의 라이선스가 적용됩니다.
