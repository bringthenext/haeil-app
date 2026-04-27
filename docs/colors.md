# Design Tokens

해일 앱의 색상, 간격, radius, border 값은 `lib/tokens.ts`를 기준으로 관리한다.
화면 컴포넌트에서는 가능한 한 직접 hex 값이나 임의 숫자를 쓰지 않고, 의미 기반 토큰을 사용한다.

## Color Structure

### `palette`
브랜드/중립 색상의 원본 팔레트다. 컴포넌트에서 직접 쓰기보다 `semanticColors`에 연결하기 위한 재료로 둔다.

### `semanticColors.light`
현재 라이트 테마의 의미 기반 색상이다.
다크모드나 테마컬러 변경을 추가할 때는 이 레이어를 먼저 확장한다.

대표 의미:

| Token | Purpose |
|---|---|
| `accent`, `accentStrong`, `accentSubtle`, `accentBorder` | 메인 액션, 선택, 오늘 강조 |
| `textPrimary`, `textSecondary`, `textTertiary`, `textMuted`, `textDisabled` | 텍스트 위계 |
| `page`, `pageMuted` | 화면 배경 |
| `surface`, `surfacePressed`, `surfaceMuted`, `surfaceRaised` | 카드, 바텀시트, 입력면 |
| `border`, `borderMuted`, `borderSubtle`, `divider` | 구분선과 외곽선 |
| `overlay`, `overlaySoft` | 모달/딤 배경 |
| `danger`, `warning` | 상태 색상 |

### `colors`
기존 코드와 Tailwind 이름을 유지하기 위한 앱 내부 alias다.
새 컴포넌트에서는 `colors.primary`, `colors.foreground`, `colors.surface`, `colors.borderSubtle`처럼 의미가 드러나는 이름을 우선 사용한다.

## Theme Guidance

다크모드나 테마컬러 변경을 추가할 때는:

1. `semanticColors.dark` 또는 테마별 semantic map을 추가한다.
2. 현재 테마를 선택하는 helper를 만들고, 컴포넌트는 계속 semantic token만 참조하게 둔다.
3. `palette` 직접 참조를 화면 컴포넌트에 늘리지 않는다.
4. 토/일 색상 같은 지역권 UX 관습은 기본값으로 강제하지 않는다. 필요하면 사용자가 켤 수 있는 설정으로 분리한다.

## Spacing, Radius, Border

`spacing`, `radius`, `borderWidth`도 `lib/tokens.ts`에 정의되어 있다.

| Group | Usage |
|---|---|
| `spacing` | gap, padding, margin, fixed-size controls |
| `radius` | card, chip, modal, full round controls |
| `borderWidth` | hairline, thin, medium, thick border |

반복되는 UI는 숫자 값을 직접 쓰기보다 토큰을 우선 사용한다.
정말 한 화면에만 필요한 측정값은 허용하되, 같은 값이 두 번 이상 반복되면 토큰화 또는 공통 컴포넌트화를 검토한다.
