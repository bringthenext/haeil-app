# 해일 Native (haeil-native)

## 프로젝트 개요
- 앱명: 해일 (해야할 일 / tsunami)
- 플랫폼: iOS / Android / Web (Expo Universal App)
- 반응형: 모바일 우선, 태블릿·맥 지원
- 관련 레포: `../haeil` (웹 Next.js 버전)

## 기술 스택
- Expo SDK 55 (managed workflow) + expo-router
- NativeWind v4 (Tailwind CSS 문법)
- TypeScript
- Supabase (Auth + DB) — AsyncStorage 기반 세션
- react-native-reanimated v4 / react-native-gesture-handler
- lucide-react-native

## 반응형 레이아웃
```
< 768px   mobile   → 하단 탭바, 단일 컬럼
≥ 768px   tablet   → 좌측 사이드바 (w-44)
≥ 1024px  desktop  → 좌측 사이드바 (w-56)
```
- `hooks/useBreakpoint.ts` 로 분기, `app/(app)/_layout.tsx` 에서 처리

## 핵심 개념
- **Item**: 실질적인 할 일 단위. `paper_id=null`이면 inbox draft item
- **Paper**: 루틴/세션 카드. `name=null`이면 draft paper
- **Envelope**: Paper들의 컨테이너
- **Wave**: Paper 완료 이벤트 레코드
- **Inbox**: `paper_id=null`인 item과 `envelope_id=null`인 paper의 UI 뷰 (DB 객체 아님)

### 주요 속성
| 객체 | 속성 | 설명 |
|------|------|------|
| Item | `paper_id` (nullable) | null이면 Inbox draft item |
| Item | `scheduled_date` (nullable) | null이면 날짜 없는 item |
| Paper | `name` (nullable) | null이면 draft paper |
| Paper | `status` | `active` / `completed` |
| Paper | `is_favorite` | 완료 paper + name 있는 경우만 가능 |
| Paper | `envelope_id` (nullable) | null이면 Inbox에 표시 |
| Paper | `parent_paper_id` (nullable) | 복제 원본 추적 |
| Wave | `paper_id` | paper 삭제 후에도 유지 |

### Draft Paper 생성 규칙
- FE에서 `name=null` paper 직접 생성 불가
- 반드시 첫 번째 item 추가 시점에 DB 레코드 생성

## DB 테이블 (`lib/types.ts` 참고)
`profiles` / `envelopes` / `papers` / `items` / `waves` / `user_settings`  
모든 쿼리에 user_id 포함, 소프트 삭제(deleted_at), RLS 적용

## 공통 vs 플랫폼별

### ✅ 공통 (web/native 동일하게 유지)
`lib/types.ts` / `lib/api/auth.ts` / `lib/api/envelopes.ts` / `lib/api/papers.ts` / `lib/api/items.ts` / `lib/api/waves.ts`

**⚠️ lib/api 변경 시 haeil(web) 레포도 동기화 필요**

### 🔀 native 전용
`lib/supabase.ts` (AsyncStorage) / `app/` (expo-router) / `components/` (RN 기반 UI)

## 인증 정책
- 첫 진입 시 Supabase anonymous auth로 비회원 세션 자동 생성
- 설정(me 탭)에서 계정 로그인/회원가입 진입
- 신규 세션에는 기본 envelope 자동 보장
- anonymous → 실계정 마이그레이션: T15-1에서 구현 (선택 UI 방식)

## 태스크 로드맵
> 상세 시나리오는 `docs/TASKS.md` 참고

| ID | 내용 | 상태 |
|---|---|---|
| T01 | 인증 | ✅ |
| T02 | Inbox — Item 추가 | ✅ |
| T03 | Inbox — Item 분류 (Envelope로) | ✅ |
| T04 | Inbox — 완료 탭 | ✅ |
| T05 | Papers — Envelope 관리 | ✅ |
| T06 | Papers — Draft Card 완료 | ✅ |
| T07 | Papers — Paper 완료 (Wave 생성) | ✅ |
| T08 | Papers — 완료 탭 & 즐겨찾기 | ✅ |
| T09 | 새 Wave (즐겨찾기 복제) | ✅ |
| T10 | Schedule 화면 | ✅ |
| T11 | Me — Dashboard & Challenges | ✅ |
| T12 | 반응형·RLS·softDelete | ✅ |
| T13 | 설정 화면 | ✅ |
| T14 | 디자인 시스템화 | ✅ |
| T15 | 데이터 동기화·계정 마이그레이션 | 🚧 (`feat/t15-sync`) |

## 디자인 시스템
- 색상·폰트·spacing·radius는 `lib/tokens.ts` 기준
- 인라인 hex·magic number 직접 사용 금지. 새 값은 token으로 먼저 정의
- `colors` semantic alias 우선, `palette` 직접 참조 지양
- 공통 텍스트 → `components/ui/Text.tsx`, 공통 버튼 → `components/ui/Button.tsx`
- 토큰 변경 시 `docs/colors.md`도 함께 갱신

## 협업 원칙

### 대안 먼저 제안하기
더 나은 라이브러리·아키텍처·UX 대안이 보이면 먼저 짧게 제안하고 확인받은 뒤 진행. 단, 결정된 구현 디테일까지 매번 묻지 않는다.

### 네이티브 패키지 변경은 신중하게
`react-native-reanimated` / `react-native-worklets` / `react-native-gesture-handler`는 NativeWind·Expo와 얽혀 있어 제거·업그레이드 전 영향 범위를 먼저 확인하고 알릴 것.  
과거 사례: reanimated/worklets 제거 → NativeWind(css-interop) 먼저 터짐.

### 드래그·애니메이션 버그
"2번째부터 안 된다" 류는 보통 ref 바인딩이 position 기반인데 key가 재정렬되는 케이스. `springAnims`는 반드시 **item id 기반 Map**으로 인덱싱할 것.

### 응답 스타일
한국어, 짧고 직설적으로. 트레일링 요약·메타 설명 생략. 실망 신호("ㅠㅠ")가 나오면 먼저 상황 정리 후 다음 한 수만 제안.

## React Native 코딩 규칙

### ⚠️ Pressable style 콜백
`style={({ pressed }) => ({ ... })}` 콜백 안에 레이아웃 속성(`flexDirection` 등)을 넣으면 FlatList/ScrollView 내부에서 적용 안 됨.

```tsx
// ❌
<Pressable style={({ pressed }) => ({ flexDirection: "row", backgroundColor: ... })}>

// ✅ 레이아웃은 내부 View로
<Pressable style={({ pressed }) => ({ backgroundColor: ... })}>
  <View style={{ flexDirection: "row", alignItems: "center", padding: 14 }}>
```

### 완료 Paper 내 Item
취소선·회색 처리 없음. `ItemRow`에 `suppressCheckedStyle` prop으로 제어.

## 환경 변수
```
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
```
`.env.local`에 설정 (Expo는 `EXPO_PUBLIC_` 접두사 필수)

## 개발 명령어
```bash
npm start                                              # Expo Go
npm run ios                                            # iOS 시뮬레이터
npm run web                                            # 웹 브라우저
npx expo export --platform web                         # 웹 static export
npx expo run:ios --configuration Release --device <UDID>  # iPhone Release 빌드
```

## Git 브랜치 & PR 규칙

### 브랜치 네이밍
| 용도 | 패턴 | 예시 |
|---|---|---|
| 태스크 기능 | `feat/t{번호}-{키워드}` | `feat/t15-sync` |
| 버그 수정 | `fix/{키워드}` | `fix/drag-reorder` |
| 문서·설정 | `chore/{키워드}` | `chore/claude-md` |

> `codex/` 접두사는 Codex 자동 생성 브랜치 전용

### 새 브랜치 생성 순서
```bash
git checkout main
git pull origin main
git checkout -b feat/tXX-키워드
```

### PR 규칙
- **제목**: `feat: T{번호} 요약` / `fix: 요약` / `chore: 요약`
- **본문**: Summary(무엇·왜) bullet + Test plan 체크리스트
- **단위**: 태스크 기준. 크면 서브태스크(T15-1/T15-2)로 쪼개서 PR 분리
