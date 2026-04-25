# 해일 Native (haeil-native)

## 프로젝트 개요
- 앱명: 해일 (해야할 일 / tsunami)
- 모토: 할일이 재난처럼 몰려오지만 잘 처리해나가자
- 플랫폼: iOS / Android / Web (Expo Universal App)
- 반응형: 모바일 우선, 태블릿·맥 지원
- 관련 레포: `../haeil` (웹 Next.js 버전 — 레퍼런스 및 향후 웹 배포용)

## 기술 스택
- Expo SDK 55 (managed workflow)
- expo-router SDK 55 계열 (file-based routing)
- NativeWind v4 (Tailwind CSS 문법)
- TypeScript
- Supabase (Auth + DB) — AsyncStorage 기반 세션
- react-native-reanimated v4
- react-native-gesture-handler
- expo-haptics
- lucide-react-native

## 반응형 레이아웃 전략
```
< 768px   mobile   → 하단 탭바, 단일 컬럼
≥ 768px   tablet   → 좌측 사이드바 (w-44), 콘텐츠 영역
≥ 1024px  desktop  → 좌측 사이드바 (w-56), 콘텐츠 영역
```
- `hooks/useBreakpoint.ts` 로 분기
- 레이아웃 전환은 `app/(app)/_layout.tsx` 에서 처리

## 핵심 개념 (web과 동일)
- Item: 실질적인 할 일 단위. `paper_id=null`이면 inbox draft item
- Paper: 루틴/세션 카드. `name=null`이면 draft paper
- Envelope: Paper들의 컨테이너
- Wave: Paper 완료 이벤트 레코드
- Inbox: `paper_id=null`인 item과 `envelope_id=null`인 paper의 UI 뷰 (DB 객체 아님)

### 주요 속성
| 객체 | 속성 | 설명 |
|------|------|------|
| Item | `paper_id` (nullable) | null이면 Inbox draft item |
| Item | `scheduled_date` (nullable) | 날짜 태그. null이면 날짜 없는 item |
| Paper | `name` (nullable) | null이면 draft paper (단일 기준) |
| Paper | `status` | `active` / `completed` |
| Paper | `is_favorite` | 완료된 paper + name 있는 경우만 가능 |
| Paper | `envelope_id` (nullable) | null이면 Inbox에 표시 |
| Paper | `parent_paper_id` (nullable) | 복제 원본 추적 (루틴 계보용) |
| Wave | `paper_id` | 완료된 paper 참조 (paper 삭제 후에도 유지) |
| Wave | `completed_at` | 완료 일시 |

### Draft Paper 생성 규칙
- FE에서 `name=null` paper 직접 생성 불가
- 반드시 첫 번째 item 추가 시점에 DB 레코드 생성
- UI상 draft 공간은 항상 존재하는 것처럼 보이지만 DB에는 아이템 있을 때만 레코드 존재

## DB 테이블 (web과 동일 — lib/types.ts 참고)
- profiles / envelopes / papers / items / waves
- 모든 쿼리에 user_id 포함, 소프트 삭제(deleted_at), RLS 적용

## ─── 공통 vs 플랫폼별 구분 ──────────────────────────────────────

### ✅ 공통 (web/native 동일하게 유지)
| 경로 | 설명 |
|---|---|
| `lib/types.ts` | DB 타입, API 페이로드 타입 |
| `lib/api/auth.ts` | 인증 함수 인터페이스 |
| `lib/api/envelopes.ts` | Envelope CRUD |
| `lib/api/papers.ts` | Paper CRUD |
| `lib/api/items.ts` | Item CRUD |
| `lib/api/waves.ts` | Wave CRUD |

**⚠️ lib/api 변경 시 haeil(web) 레포도 동기화 필요**

### 🔀 플랫폼별 (native 전용)
| 경로 | 설명 |
|---|---|
| `lib/supabase.ts` | AsyncStorage 기반 클라이언트 (web은 @supabase/ssr + cookie) |
| `app/` | expo-router 라우팅 (web은 Next.js App Router) |
| `components/` | RN View/Text 기반 UI (web은 div/span + Tailwind) |
| `hooks/useBreakpoint.ts` | useWindowDimensions 기반 |
| `hooks/useSession.ts` | onAuthStateChange 구독 방식 |

## 폴더 구조
```
app/
├── _layout.tsx              # Root (auth guard, GestureHandler, SafeArea)
├── (auth)/login.tsx         # 로그인 화면
└── (app)/
    ├── _layout.tsx          # 모바일=탭바 / 태블릿·맥=사이드바
    ├── inbox/index.tsx
    ├── papers/index.tsx
    ├── schedule/index.tsx
    └── me/index.tsx

components/
├── layout/
│   ├── Sidebar.tsx          # 태블릿·맥 사이드바
│   └── ScreenLayout.tsx     # 공통 스크린 래퍼
└── haeil/
    ├── ItemRow.tsx
    ├── InputBar.tsx
    ├── DraftCard.tsx
    ├── PaperCard.tsx
    └── ProgressBar.tsx

hooks/
├── useBreakpoint.ts
└── useSession.ts

lib/
├── supabase.ts              # native 전용
├── types.ts                 # ✅ 공통
└── api/                     # ✅ 공통 인터페이스
```

## 태스크 로드맵
> 상세 시나리오는 `docs/TASKS.md` 참고

| ID | 내용 | 상태 |
|---|---|---|
| T01 | 인증 (비로그인 선 사용, 설정에서 로그인) | ✅ 완료 |
| T02 | Inbox — Item 추가 + paper 추가, 날짜/paper 선택 | ✅ 완료 |
| T03 | Inbox — Item 분류 (Envelope로) | 🔜 다음 |
| T04 | Inbox — 완료 탭 (완료 paper 목록) | ✅ 완료 |
| T05 | Papers — Envelope 관리 | 🔜 다음 |
| T06 | Papers — Draft Card 완료 (오늘날짜 rename + wave) | ✅ 완료 |
| T07 | Papers — Paper 완료 (Wave 생성) | ✅ 완료 |
| T08 | Papers — 완료 탭 & 즐겨찾기 ★ | ✅ 완료 |
| T09 | 새 Wave (즐겨찾기 복제) | 🔜 다음 |
| T10 | Schedule 화면 | 🚧 진행 중 (주간 캘린더 + 드래그 리오더 + 주간 스와이프 연동 완료) |
| T11 | Me — Dashboard & Challenges | ✅ 완료 |
| T12 | 반응형 테스트 (모바일·태블릿·맥), RLS 검증, softDelete 등 마무리 | 🔲 |
| T13 | 설정 화면 (계정·로그아웃·탈퇴·한 주 시작·약관) | ✅ 완료 |

### 작업 순서
- **1차** `feat/envelope-wave-schedule`: T03 · T05 · T09
- **2차**: T10 · T11 · T12

### 현재 진행 상황 (2026-04-26 기준)
- T13 (설정 화면): ✅ 완료 (main 머지됨)
- T11 (Me Dashboard & Challenges): ✅ 완료 (main 머지됨)
- Schedule 탭 (T10) 핵심 인터랙션 구현 완료:
  - `WeekCalendarBar` + 월 선택 모달
  - 날짜 섹션별 아이템 리스트 (헤더 + 아이템 단일 배열)
  - 롱탭 드래그 리오더 → 날짜 이동 + 순서 재계산 일괄 반영
  - "오늘" 버튼 항상 노출 (캘린더 바 우측) → 오늘 선택 + 리스트 스크롤
  - 주간 스와이프 시 해당 주 **월요일** 자동 선택 + 리스트 스크롤
  - `dateRange` 동적 확장: 스와이프 타겟이 범위 밖이면 연속 날짜로 prepend/append
- 드래그 리오더 라이브러리: `react-native-gesture-handler` + RN 기본 `Animated`
  - **주의**: Reanimated 4.2.1은 `react-native-css-interop`(NativeWind) 의존이라 제거 금지. 단, Expo Go 호환 이슈로 현재 Reanimated 플러그인은 `babel.config.js`에서 주석 처리됨 (Dev Build에서만 활성화).
  - `SortableList`의 `springAnims`는 반드시 **item key(id) 기반 `Map`**으로 인덱싱할 것. position 배열로 하면 리오더 후 translateY 바인딩이 어긋나 2번째 드래그가 깨짐.

### 인증 정책
- 로그인 필수 아님 — 첫 진입 시 Supabase anonymous auth로 비회원 세션 자동 생성
- 설정(me 탭)에서 계정 로그인/회원가입 진입
- 신규 세션(비회원 포함)에는 기본 envelope `Envelope`를 보장
- anonymous 계정 → 실제 계정 전환/데이터 마이그레이션은 MVP 이후 별도 설계

### Me 화면 구성
- 내부 탭: **dashboard | challenges**
- Dashboard: streak 카드, 이번 주 wave 수, 연간 히트맵, 루틴별 누적 wave
- Challenges: 카테고리별 뱃지 (꾸준함/wave 마스터/루틴 전문가/수집가/히든 챌린지)

### Inbox/Papers 내 스케줄 탭
- inbox 화면과 papers 화면에 각각 **할일 | 스케줄** 내부 탭 존재
- inbox 스케줄: inbox item 한정, papers 스케줄: 해당 envelope 내 item 한정
- 구조는 schedule 탭과 동일하되 범위만 다름

## 디자인 토큰 & 컬러
| 토큰 | 값 | 용도 |
|------|-----|------|
| primary | `#1D9E75` | 메인 액션, 오늘 강조, 체크 |
| primary-dark | `#0F6E56` | wave 수 텍스트, hover |
| primary-light | `#9FE1CB` | 히트맵 l1, 선택 테두리 |
| primary-bg | `#E1F5EE` | 오늘 item 배경, 선택 카드 배경 |
| bg-primary | `#ffffff` | 카드, 바텀시트 |
| bg-secondary | `#f5f5f0` | 화면 배경, input 배경, 비활성 카드 |
| text-primary | `#1a1a1a` | 본문 |
| text-secondary | `#555555` | 서브텍스트 |
| text-tertiary | `#999999` | 플레이스홀더, 라벨 |
| danger | `#E24B4A` | "지남" 표시 |
| star | `#EF9F27` | 즐겨찾기 ★ |

> 참고 문서: `docs/haeil_screens.html` (UI 목업), `docs/haeil_uxui.md` (UX/UI 설계), `docs/haeil_structure_v2.md` (데이터 구조), `docs/TASKS.md` (태스크 상세 시나리오)

## 협업 원칙 (유진 님과 작업 시)

### 1. 시키는 대로만 하지 말고 더 나은 대안 먼저 제안하기
- 유저가 요청한 방식이 있어도, 더 나은 라이브러리·아키텍처·UX 대안이 보이면 **먼저 짧게 제안하고 확인받은 뒤 진행**.
- 구현 중 중요한 분기점(범위 확장, 패키지 추가/제거, 복잡한 상태 설계 등)에서도 A/B 선택지를 제시하고 유저의 판단을 받는다.
- 단, 이미 결정된 자잘한 구현 디테일까지 매번 묻지 말 것. 균형이 중요.

### 2. 네이티브 패키지 변경은 최대한 신중하게
- `react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler` 등은 NativeWind·Expo·빌드 시스템과 얽혀 있어서 섣불리 제거/업그레이드하면 전체가 깨진다.
- 제거·버전 변경 전에 **반드시 영향 범위를 먼저 확인하고 유저에게 알릴 것**. 과거에 reanimated/worklets 제거 → NativeWind(css-interop)가 먼저 터진 사례 있음.
- Expo Go vs Dev Build 차이도 함께 고지할 것 (Expo Go는 번들된 네이티브 모듈 버전에 고정).

### 3. 드래그·애니메이션 이슈는 근본 원인부터 찾기
- "2번째부터 안 된다" 류의 반복 버그는 보통 **ref 바인딩이 position 기반인데 key가 재정렬되는** 케이스. 증상만 보고 다른 라이브러리로 돌리지 말고 바인딩 모델부터 의심.
- `Animated.Value` 같은 네이티브 드라이버 바인딩은 조건부 value 교체 대신 `Animated.add` 등으로 **항상 같은 derived value**를 유지하는 편이 안정적.

### 4. 응답 톤·길이
- 유저는 한국어 선호. 짧고 직설적인 업데이트를 선호하며, 트레일링 요약이나 메타 설명을 싫어함.
- 에러·경고 맥락에서는 "뭘 바꿨고 왜 바꿨는지" 1~2줄로 충분.

### 5. 유저가 "해보자" / "ㅠㅠ" 등으로 동의·실망을 짧게 표현할 때
- 실망 신호("ㅠㅠ", "아 뭐하냐")가 나오면 추가 시도 전에 **먼저 현상황을 정리·복구**하고, 다음 한 수만 제안.
- 동의 신호("해보자", "ㄱㄱ")는 바로 실행하되, 되돌리기 어려운 액션은 여전히 한 번 더 확인.

## React Native 코딩 규칙

### ⚠️ Pressable style 콜백 주의
`Pressable`의 `style={({ pressed }) => ({ ... })}` 콜백 안에 `flexDirection`, `alignItems`, `justifyContent` 등 **레이아웃 속성을 넣으면 FlatList/ScrollView 내부에서 적용되지 않는 버그**가 있다.

**반드시 아래 패턴으로 분리할 것:**
```tsx
// ❌ 잘못된 패턴
<Pressable style={({ pressed }) => ({
  flexDirection: "row",      // 적용 안 됨
  backgroundColor: pressed ? "#f5f5f0" : "#fff",
})}>

// ✅ 올바른 패턴 — 레이아웃은 내부 View, 동적 스타일만 Pressable에
<Pressable style={({ pressed }) => ({
  backgroundColor: pressed ? "#f5f5f0" : "#fff",
})}>
  <View style={{ flexDirection: "row", alignItems: "center", padding: 14 }}>
    {/* 내용 */}
  </View>
</Pressable>
```

### 완료된 Paper 내 Item 렌더링
완료 탭의 paper 내 아이템은 **체크 여부와 무관하게 취소선·회색 처리 없음** (체크 아이콘 + 타임스탬프만 표시).
`ItemRow`에 `suppressCheckedStyle` prop을 전달해 제어한다.

## 환경 변수
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
`.env.local`에 설정 (Expo는 `EXPO_PUBLIC_` 접두사 필수)

## 개발 명령어
- `npm start` : Expo 개발 서버 (Expo Go로 확인)
- `npm run ios` : iOS 시뮬레이터
- `npm run android` : Android 에뮬레이터
- `npm run web` : 웹 브라우저 (Mac 확인용)

## Git 브랜치 작업 순서

**새 브랜치를 딸 때 반드시 이 순서로:**
```bash
git checkout main
git pull origin main   # ← 이걸 빠뜨리면 GitHub에 머지된 최신 코드 없이 브랜치가 생김
git checkout -b feat/xxx
```

GitHub에서 PR 머지 후 로컬 main은 자동으로 업데이트되지 않는다. `git pull origin main` 없이 바로 브랜치를 따면 머지된 커밋이 빠진 낡은 base에서 시작하게 된다.
