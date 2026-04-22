# 해일 Native (haeil-native)

## 프로젝트 개요
- 앱명: 해일 (해야할 일 / tsunami)
- 모토: 할일이 재난처럼 몰려오지만 잘 처리해나가자
- 플랫폼: iOS / Android / Web (Expo Universal App)
- 반응형: 모바일 우선, 태블릿·맥 지원
- 관련 레포: `../haeil` (웹 Next.js 버전 — 레퍼런스 및 향후 웹 배포용)

## 기술 스택
- Expo SDK 54 (managed workflow)
- expo-router v4 (file-based routing)
- NativeWind v4 (Tailwind CSS 문법)
- TypeScript
- Supabase (Auth + DB) — AsyncStorage 기반 세션
- react-native-reanimated v3
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
| T03 | Inbox — Item 분류 (Envelope로) | 🔲 |
| T04 | Inbox — 완료 탭 (완료 paper 목록) | ✅ 완료 |
| T05 | Papers — Envelope 관리 | 🔲 |
| T06 | Papers — Draft Card 완료 (오늘날짜 rename + wave) | ✅ 완료 |
| T07 | Papers — Paper 완료 (Wave 생성) | ✅ 완료 |
| T08 | Papers — 완료 탭 & 즐겨찾기 ★ | ✅ 완료 |
| T09 | 새 Wave (즐겨찾기 복제) | 🔲 |
| T10 | Schedule 화면 | 🔲 |
| T11 | Me — Dashboard & Challenges | 🔲 |
| T12 | 네비게이션 & 공통 | ✅ 완료 |

### 인증 정책
- 로그인 필수 아님 — 비로그인으로 바로 inbox 사용 가능 (로컬 저장)
- 설정(me 탭 > ⚙) 에서 로그인/회원가입 진입
- 로그인 시 로컬 데이터 → 서버 연동 (오프라인 sync는 MVP 이후)

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

## 환경 변수
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
`.env.local`에 설정 (Expo는 `EXPO_PUBLIC_` 접두사 필수)

## 개발 명령어
- `npm start` : Expo 개발 서버 (Expo Go로 확인)
- `npm run ios` : iOS 시뮬레이터
- `npm run android` : Android 에뮬레이터
- `npm run web` : 웹 브라우저 (Mac 확인용)
