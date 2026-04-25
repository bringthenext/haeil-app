# 해일 네이티브 — 태스크 로드맵

> 플랫폼: iOS / Android / Mac (Expo Universal App)  
> 모바일 우선, 태블릿·맥 지원

---

## 진행 현황

| ID | 내용 | 상태 |
|---|---|---|
| T01 | 인증 | ✅ 완료 |
| T02 | Inbox — Item 추가 (핵심) | ✅ 완료 |
| T03 | Inbox — Item 분류 (Envelope로) | 🔜 다음 |
| T04 | Inbox — 완료 탭 | ✅ 완료 |
| T05 | Papers — Envelope 관리 | 🔜 다음 |
| T06 | Papers — Draft Card 완료 (오늘날짜 rename + wave) | ✅ 완료 |
| T07 | Papers — Paper 완료 (Wave 생성) (핵심) | ✅ 완료 |
| T08 | Papers — 완료 탭 & 즐겨찾기 | ✅ 완료 |
| T09 | 새 Wave (즐겨찾기 복제) | 🔜 다음 |
| T10 | Schedule 화면 | 🚧 진행 중 (핵심 인터랙션 완료, 세부 시나리오 검증 남음) |
| T11 | Me — Dashboard & Challenges | ✅ 완료 |
| T12 | 반응형 테스트 · RLS 검증 · softDelete 등 마무리 | 🚧 빌드 검증 완료, 세부 검증 남음 |
| T13 | 설정 화면 | ✅ 완료 |

---

### T01. 인증 ✅

| # | 시나리오 | 검증 포인트 |
| --- | --- | --- |
| T01-1 | 앱 첫 진입 — 비로그인으로 바로 사용 | inbox 화면 노출, 로그인 없이 사용 가능 |
| T01-2 | 설정 > 로그인/회원가입 진입 | Supabase Auth 로그인 화면 |
| T01-3 | 로그인 성공 후 | inbox 복귀, 데이터 연동 |
| T01-4 | 로그아웃 | 로컬 상태 초기화, 비로그인 모드 복귀 |

---

### T02. Inbox — Item 추가 (핵심)

| # | 시나리오 | 검증 포인트 |
| --- | --- | --- |
| T02-1 | 하단 입력창에 텍스트 입력 | draft card에 미리보기(흐릿) 표시 |
| T02-2 | 전송 | draft card 최상단에 item 추가 |
| T02-3 | 날짜 태그 없이 추가 | `scheduled_date = null`, 주간 캘린더 바 변화 없음 |
| T02-4 | "오늘" 날짜 태그 후 추가 | `scheduled_date = today`, 캘린더 바 오늘 dot 표시 |
| T02-5 | item 체크 | 체크 → 하단으로 이동 + 타임스탬프 표시 |
| T02-6 | 체크 해제 | 미체크 영역 상단으로 복귀 |
| T02-7 | 11번째 item 추가 | 처음 10개만 표시, "N개 더보기" 버튼 |
| T02-8 | "N개 더보기" 탭 | 나머지 펼침 |

---

### T03. Inbox — Item 분류 (Envelope로)

| # | 시나리오 | 검증 포인트 |
| --- | --- | --- |
| T03-1 | item 우측 ⊹ 아이콘 탭 | 바텀시트: "어느 envelope로 분류할까요?" + envelope 목록 |
| T03-2 | envelope 선택 | item이 해당 envelope의 draft paper로 이동, inbox에서 사라짐 |
| T03-3 | item 꾹 누르기 | 동일 바텀시트 |

---

### T04. Inbox — 완료 탭

| # | 시나리오 | 검증 포인트 |
| --- | --- | --- |
| T04-1 | 우상단 "완료" 탭 전환 | draft card 사라짐, 완료 paper 목록만 표시 |
| T04-2 | 완료 paper 구성 확인 | 이름 + 완료 시각 + item 목록 |
| T04-3 | "활성" 탭 복귀 | draft card + 활성 paper 복귀 |

---

### T05. Papers — Envelope 관리

| # | 시나리오 | 검증 포인트 |
| --- | --- | --- |
| T05-1 | envelope 탭 우측 + 탭 | envelope 추가 |
| T05-2 | 새 envelope 선택 | draft card만 있는 빈 상태 |
| T05-3 | envelope 간 스와이프 | 좌우 슬라이드로 이동 |

---

### T06. Papers — Draft Card (Envelope 내)

| # | 시나리오 | 검증 포인트 |
| --- | --- | --- |
| T06-1 | draft card에서 "항목 추가" | item 최상단 추가 |
| T06-2 | 첫 item 추가 시 | DB에 paper 레코드 생성 (`name = null`) |
| T06-3 | draft card 항상 최상단 고정 확인 | 스크롤해도 순서 변경 불가 |

---

### T07. Papers — Paper 완료 (Wave 생성) (핵심)

| # | 시나리오 | 검증 포인트 |
| --- | --- | --- |
| T07-1 | paper 탭 → 펼침 | 초록 테두리, item 목록, 하단 footer 노출 |
| T07-2 | item 부분 체크 상태에서 "완료" 탭 | 완료 처리 가능 (전체 체크 불필요) |
| T07-3 | 완료 처리 후 | wave 레코드 생성, paper `status = completed` 전환 |
| T07-4 | draft paper 완료 시 | `name`이 완료일(`YYYY-MM-DD`)로 자동 설정 |
| T07-5 | 완료 후 draft 공간 | 비어 있는 draft card UI 유지 (다음 item 추가 전까지 DB 레코드 없음) |

---

### T08. Papers — 완료 탭 & 즐겨찾기

| # | 시나리오 | 검증 포인트 |
| --- | --- | --- |
| T08-1 | 완료 탭 전환 | draft card·추가 버튼 없음 |
| T08-2 | ★ 탭 즐겨찾기 토글 | `is_favorite` 즉시 전환 |
| T08-3 | draft paper 완료본 확인 | ★ 토글 불가 (`name`이 날짜 자동부여된 경우는 가능) |
| T08-4 | 완료 paper 꾹 누르기 | 바텀시트: 복제해서 시작 / 삭제 |

---

### T09. 새 Wave (즐겨찾기 복제)

| # | 시나리오 | 검증 포인트 |
| --- | --- | --- |
| T09-1 | "새 wave" 버튼 탭 | 즐겨찾기 바텀시트: 이름 + 항목 미리보기 + wave 수 |
| T09-2 | 즐겨찾기 paper 선택 | item 목록 유지, 체크 초기화, 새 active paper 생성 |
| T09-3 | 복제본 `parent_paper_id` | 원본 paper id 참조 |

---

### T10. Schedule 화면

| # | 시나리오 | 검증 포인트 | 상태 |
| --- | --- | --- | --- |
| T10-1 | schedule 탭 진입 | 주간 캘린더 바 + 날짜별 그룹 스크롤, 진입 시 오늘 섹션으로 자동 스크롤 | ✅ |
| T10-2 | 캘린더 바 날짜 탭 | 해당 날짜 섹션으로 앵커 스크롤 (필터 아님, 전체 표시 유지) | ✅ |
| T10-3 | 오늘 날짜 강조 | 초록색 | ✅ |
| T10-4 | 지난 날짜 표시 | 흐릿 + "지남" | ✅ |
| T10-5 | item에 출처 표시 | inbox / envelope 이름 표시 | ✅ |
| T10-6 | 하단 입력창에서 item 추가 | paper 지정 선택 가능, 미지정 시 inbox | ✅ |
| T10-7 | "오늘" 버튼 상시 노출 | 캘린더 바 우측에 항상 보임, 탭 시 오늘 선택 + 해당 섹션 스크롤 | ✅ |
| T10-8 | 주간 스와이프 | momentum 종료 시 해당 주 월요일 자동 선택 + 섹션 스크롤 | ✅ |
| T10-9 | dateRange 동적 확장 | 스와이프 타겟이 기본 범위(오늘 ±3~6일) 밖이면 연속 날짜로 prepend/append | ✅ |
| T10-10 | 롱탭 드래그 리오더 | item을 길게 눌러 날짜 간 이동 + 같은 날짜 내 순서 변경 | ✅ |
| T10-11 | 드래그 반복 안정성 | 두 번째·세 번째 드래그도 동일하게 작동 (springAnim key 기반 바인딩) | ✅ |
| T10-12 | 월 선택 모달 | 월 탭 → 바텀시트 → 특정 월로 점프 | ✅ |
| T10-13 | inbox/papers 내부 스케줄 탭 | schedule과 동일 구조, 범위만 해당 envelope/inbox 한정 | 🔲 |
| T10-14 | 빈 날짜 섹션 UX | 아이템 없는 날짜의 헤더·입력 흐름 정리 | 🔲 |

---

### T11. Me — Dashboard ✅

| # | 시나리오 | 검증 포인트 |
| --- | --- | --- |
| T11-1 | streak 카드 | item 체크일 기준 연속 일수, 최장 기록, 최근 30일 |
| T11-2 | 이번 주 카드 | wave 수 + 지난 주 대비 증감 |
| T11-3 | 연간 히트맵 | wave 수 기준, 좌우 스크롤, 월 라벨, 셀 탭 시 wave 목록 팝오버 |
| T11-4 | 루틴별 누적 wave | envelope별 bar chart |
| T11-5 | 연도 네비게이터 | 미래 연도 이동 불가 |
| T11-6 | 인사이트 카드 | streak/wave 기반 동적 문구 |
| T11-7 | Challenges 탭 | 카테고리별 뱃지(31개), 달성/미달성 구분 |
| T11-8 | 히든 뱃지 | 일반 뱃지 5/10/15/20개 달성 시 해금 |

---

---

### T13. 설정 화면 ✅

> 브랜치: `feat/settings` → main 머지  
> 약관·개인정보·라이선스는 인앱 텍스트 페이지.

**구현 파일**
- `app/(app)/settings/index.tsx` — 메인 설정 화면
- `app/(app)/settings/terms.tsx` — 서비스 이용약관
- `app/(app)/settings/privacy.tsx` — 개인정보 처리방침
- `app/(app)/settings/licenses.tsx` — 오픈소스 라이선스
- `lib/api/profile.ts` — `getProfile` / `updateUsername` / `requestAccountDeletion(reason?)` / `cancelDeletion`
- `lib/api/settings.ts` — `getSettings` / `updateWeekStartDay`
- `hooks/useWeekStart.ts` — `user_settings`에서 week_start_day 읽기, `reload()` 노출
- `app/(auth)/login.tsx` — 이름 입력(회원가입), 탈퇴 복구(`cancelDeletion`), Apple 로그인 버튼(stub)
- `app/index.tsx` — 로그아웃 후 anonymous 재생성 방지 (`SKIP_ANONYMOUS_KEY` 플래그)

**DB 변경**
```sql
-- user_settings 테이블 (앱 환경설정)
CREATE TABLE user_settings (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  week_start_day text NOT NULL DEFAULT 'mon' CHECK (week_start_day IN ('mon', 'sun')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- profiles 테이블 추가 컬럼
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deletion_reason text;
```

| # | 시나리오 | 검증 포인트 | 상태 |
| --- | --- | --- | --- |
| T13-1 | 설정 화면 진입 (me 탭 우상단 톱니바퀴) | 계정·앱 설정·법적 고지·앱 정보 섹션 노출 | ✅ |
| T13-2 | 계정 섹션 — 이름 편집, 이메일/로그인 방법 표시 | 인라인 편집 + Toast, Google/이메일 구분 | ✅ |
| T13-3 | 로그아웃 | 확인 Alert → signOut → 로그인 화면 이동 | ✅ |
| T13-4 | 회원 탈퇴 | 사유 입력 모달 → 2단계 확인 → 30일 유예 비활성화 → login 이동 | ✅ |
| T13-5 | 한 주 시작 기준 토글 (월/일) | `user_settings.week_start_day` 저장, Schedule 탭 포커스 시 반영 | ✅ |
| T13-6 | 서비스 이용약관 | 인앱 텍스트 페이지 push | ✅ |
| T13-7 | 개인정보 처리방침 | 인앱 텍스트 페이지 push | ✅ |
| T13-8 | 오픈소스 라이선스 | 인앱 텍스트 페이지 push | ✅ |
| T13-9 | 앱 버전 표시 | 하드코딩 `1.0.0` | ✅ |
| T13-10 | 비회원 상태 분기 | me 탭 — dashboard/challenges 잠금, 로그인 유도. 설정은 동작 | ✅ |
| T13-11 | Apple 로그인 버튼 (iOS 전용, stub) | 버튼 UI 노출, 실제 구현은 별도 작업 | ✅ |

---

### T12. 반응형 테스트 · RLS 검증 · softDelete 등 마무리

| # | 시나리오 | 검증 포인트 | 상태 |
| --- | --- | --- | --- |
| T12-0 | 첫 빌드 검증 | `tsc`, web static export, iOS simulator Debug, 실제 iPhone Release 직접 설치/실행 | ✅ |
| T12-1 | 모바일 레이아웃 (< 768px) | 하단 탭바, 단일 컬럼, 콘텐츠 넘침 없음 | 🔲 |
| T12-2 | 태블릿 레이아웃 (≥ 768px) | 좌측 사이드바(w-44) + 콘텐츠 영역 전환 확인 | 🔲 |
| T12-3 | 맥 레이아웃 (≥ 1024px) | 좌측 사이드바(w-56) + 콘텐츠 영역 전환 확인 | 🔲 |
| T12-4 | 모든 쿼리에 `user_id` 포함 | RLS 통과 여부 (다른 계정 데이터 접근 불가) | 🔲 |
| T12-5 | 소프트 삭제 | 삭제 시 `deleted_at` 설정, 목록에서 제외 확인 | 🔲 |
| T12-6 | 비로그인 → 로그인 시 데이터 연동 | 로컬 데이터 서버 마이그레이션 | 🔲 |

**T12-0 기록 (`codex/first-build`)**
- `npx tsc --noEmit` 통과
- `npx expo export --platform web` 통과, `dist/` 생성
- iOS simulator Debug 빌드/실행 통과
- 실제 iPhone Release 빌드/설치/실행 통과. Release 앱은 JS bundle 포함이라 Metro 서버 없이 실행 가능
- iOS 빌드를 위해 `react-native-worklets@0.7.4`로 고정 (`react-native-reanimated@4.2.1`과 호환)
