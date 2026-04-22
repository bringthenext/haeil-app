# 해일 (해야할 일) — 구조 개편 설계 문서

> v2.1 · 작성일: 2026-04-10

---

## 1. 개편 배경 및 목적

기존 구조는 Paper(템플릿)가 메인이 되고 Wave(세션)가 부산물처럼 동작하여, 앱의 모토인 '해야할 일을 해치우는' 경험과 구조적 충돌이 발생했습니다.

**주요 문제점**
- Paper 수정 시 연결된 모든 Wave에 영향 → 일회성 항목 추가 불가
- Wave가 아닌 Paper가 진입점이 되어 사용 흐름이 어색함
- 별도 구현한 '빠른 Todo 공간'만 실제로 사용하게 되는 현상 발생

**개편 목표**
- Inbox를 중심으로 아이템을 빠르게 담고 처리하는 흐름 확립
- Paper를 루틴/세션 단위로 재정의하여 Wave 경험 복원
- Envelope → Paper → Item의 명확한 계층 구조 구축

---

## 2. 핵심 개념 및 데이터 구조

### 2-1. 개념 요약

| 개념 | 역할 | 비고 |
|------|------|------|
| Item | 실질적인 할 일 단위 | `paper_id = null` = Inbox draft item |
| Inbox | `paper_id = null`인 draft item과 `envelope_id = null`인 draft paper의 뷰 | DB 객체 아님, UI 뷰 |
| Paper | 루틴/세션 카드. 완료 가능. | `name = null` = draft paper |
| Envelope | Paper들의 컨테이너. Item 분류 단위. | 생성 시 draft paper 공간 제공 |
| Wave | Paper 완료 이벤트 레코드 | `wave(id, paper_id, completed_at)` |

### 2-2. 주요 속성

| 객체 | 핵심 속성 | 설명 |
|------|-----------|------|
| Item | `paper_id` (nullable) | null이면 Inbox draft item |
| Item | `scheduled_date` (nullable) | 날짜 태그. null이면 날짜 없는 item |
| Paper | `name` (nullable) | null이면 draft paper. 단일 기준. |
| Paper | `status` | `active` / `completed` |
| Paper | `is_favorite` | 완료된 paper만 가능 |
| Paper | `envelope_id` (nullable) | null이면 Inbox에 표시 |
| Paper | `parent_paper_id` (nullable) | 복제 원본 추적 (루틴 계보용) |
| Envelope | `name` | 컨테이너 이름 |
| Wave | `paper_id` | 완료된 paper 참조 |
| Wave | `completed_at` | 완료 일시 |

### 2-3. Wave count 처리

- Wave 레코드는 paper 완료 시 BE에서 생성
- UI상 wave 수는 완료된 paper에만 노출하며, 집계는 FE에서 처리
- paper 삭제 후에도 wave 레코드는 유지되어 카운트 보존
- `parent_paper_id` 체이닝으로 루틴 계보 전체의 wave 집계 가능

---

## 3. Inbox

Inbox는 DB 객체가 아닌 UI 뷰입니다.

| 구분 | 조건 |
|------|------|
| Draft Items | `paper_id = null`인 Item |
| Draft Papers | `envelope_id = null`인 Paper |

**주요 정책**
- Item을 Inbox에서 바로 추가하고 체크 가능
- Draft item은 Envelope를 선택해 분류 가능 → 해당 Envelope의 draft paper로 이동
- Envelope 없는 Paper도 Inbox에서 생성 가능

---

## 4. Paper

### 4-1. Draft Paper

- Draft paper 구분 기준: `name = null` (단일 기준, 별도 `is_draft` 컬럼 없음)
- Envelope 내 draft paper 공간은 항상 UI상 존재
- 실제 DB 레코드는 첫 번째 아이템 추가 시점에 생성
- **FE에서 name null인 paper 직접 생성 불가** (draft paper는 반드시 아이템 추가를 통해서만 생성)
- Envelope 내 항상 최상단 고정
- 즐겨찾기 불가

### 4-2. Draft Paper 완료 처리

- Draft paper 완료 시 → 해당 paper의 `name`을 완료일(`YYYY-MM-DD`)로 자동 부여 후 completed 전환
- 완료와 동시에 새 draft paper DB 레코드를 생성하지 않음
- 다음번에 draft 공간에 아이템을 추가하는 시점에 새 draft paper 레코드 생성
- 사용자 입장에서는 draft 공간이 끊김 없이 항상 존재하는 것처럼 느껴짐

### 4-3. Paper 완료

- 모든 item 체크 여부와 관계없이 수동으로 '완료' 처리 가능
- 완료 시 wave 레코드 생성 (BE), UI상 wave 수 갱신 (FE)
- 완료된 paper는 UI상 별도 구분 (동일 DB, `status` 속성으로 구분)
- 완료된 paper만 즐겨찾기 가능

### 4-4. Paper 복제

- 완료된 paper 복제 → 새로운 active paper 생성
- Item 목록 유지, 체크 상태는 초기화
- `parent_paper_id`에 원본 paper id 저장
- 진행 중인 paper는 복제 불가

### 4-5. 즐겨찾기

- 완료된 paper + `name`이 있는 경우만 즐겨찾기 가능
- 즐겨찾기 목록에서 빠르게 복제하여 새 세션 시작

---

## 5. Envelope

- Paper들의 컨테이너
- 생성 시 draft paper 공간 UI 제공 (DB 레코드는 첫 아이템 추가 시 생성)
- Envelope 내 Paper 순서 조정 가능
- Item을 Envelope로 분류 시 → draft paper로 자동 편입
- Envelope 간 Paper 이동 (추후 논의)

---

## 6. Wave

Wave는 Paper 완료 이벤트를 기록하는 별도 테이블입니다.

| 컬럼 | 설명 |
|------|------|
| `id` | PK |
| `paper_id` | 완료된 paper 참조 (paper 삭제 후에도 레코드 유지) |
| `completed_at` | 완료 일시 |

- UI상 wave 수는 완료된 paper에만 노출
- wave 수 집계는 FE에서 처리
- `parent_paper_id` 체이닝으로 루틴 계보 전체의 누적 wave 집계 가능

---

## 7. 대시보드

Wave 테이블 및 paper/envelope 구조를 활용한 기본 통계를 제공합니다.

- Envelope별 완료된 paper 수
- Envelope별 item 체크 개수
- 루틴별 wave 누적 카운트
- 기간별 완료 통계 (주간, 월간 등)

> 상세 대시보드 기획은 추후 별도 논의.

---

## 8. 추후 논의 필요 사항

- Envelope 간 Paper 이동 정책
- 즐겨찾기 Paper 빠른 접근 UI (홈 화면 배치 등)
- Wave 카운트 UI 표시 방식 및 위치
- 루틴 계보 보기 기능 (`parent_paper_id` 활용)
- 대시보드 상세 기획
- Envelope 단위 scheduled item 뷰 확장

### scheduled_date 정책

- `scheduled_date` (nullable): item에 느슨한 날짜 태그 부여
- null이면 날짜 없는 item (기본)
- 모든 item (inbox + paper 내부)에 적용 가능
- schedule 탭: scheduled_date가 있는 전사 item 날짜별 표시
- inbox/papers 스케줄 탭: 범위를 해당 맥락으로 한정
