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
- Item: 실질적인 할 일 단위. paper_id=null이면 inbox draft item
- Paper: 루틴/세션 카드. name=null이면 draft paper
- Envelope: Paper들의 컨테이너. 신규 계정엔 'Envelop' 기본 생성
- Wave: Paper 완료 이벤트 레코드
- Inbox: paper_id=null인 item과 envelope_id=null인 paper의 뷰

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
| ID | 내용 | 상태 |
|---|---|---|
| T01 | 프로젝트 초기화, 설정, 폴더 구조, 공통 API | ✅ 완료 |
| T02 | 네비게이션 (탭바/사이드바 반응형) | ✅ 완료 (기본 구조) |
| T03 | Auth 화면 (로그인, 세션 guard) | ✅ 완료 |
| T04 | 공통 컴포넌트 (ProgressBar, ItemRow, InputBar, DraftCard, PaperCard) | 🔲 |
| T05 | Inbox 화면 | 🔲 |
| T06 | Papers 화면 | 🔲 |
| T07 | Schedule 화면 | 🔲 |
| T08 | Me 화면 | 🔲 |
| T09 | 플랫폼 polish (햅틱, 키보드, 제스처, 태블릿 2컬럼) | 🔲 |

## 메인 컬러
#1D9E75

## 환경 변수
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
`.env.local`에 설정 (Expo는 `EXPO_PUBLIC_` 접두사 필수)

## 개발 명령어
- `npm start` : Expo 개발 서버 (Expo Go로 확인)
- `npm run ios` : iOS 시뮬레이터
- `npm run android` : Android 에뮬레이터
- `npm run web` : 웹 브라우저 (Mac 확인용)
