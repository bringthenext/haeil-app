# T15-2 오프라인 큐 — 테스트케이스

## 사전 준비
- 실제 기기(또는 시뮬레이터) 사용 — Expo Go 또는 Dev Build
- 네트워크 차단: iOS → 설정 > Wi-Fi 끄기 + 모바일 데이터 끄기 (비행기 모드)
- Supabase 대시보드 열어두기 (Table Editor → items / papers / envelopes)

---

## TC-01: 오프라인 배너 표시
**목적**: 네트워크 상태가 화면 상단에 반영되는지 확인  
**단계**:
1. 앱 실행 → 상단 배너 없음 확인
2. 비행기 모드 ON
3. 5초 대기 (polling 주기)

**기대값**: 상단에 "오프라인" 배너 노출  
**복구**: 비행기 모드 OFF → 5초 내 배너 사라짐

---

## TC-02: 오프라인 중 inbox draft item 추가
**목적**: addItem이 큐에 적재되고 optimistic UI 동작  
**단계**:
1. 비행기 모드 ON → 배너 확인
2. Inbox → 하단 입력창 → "오프라인 테스트 아이템" 입력 → 제출
3. 목록 즉시 확인
4. 배너에 "1개 대기 중" 표시 확인
5. Supabase 대시보드 → items 테이블 → 방금 아이템 없음 확인

**기대값**: 로컬에는 아이템 보임, 서버에는 없음, 배너 카운트 1  
**복구 검증 (TC-02b)**:
1. 비행기 모드 OFF
2. 5~10초 대기 → 자동 replay
3. Supabase → items에 해당 아이템 등장 확인
4. id가 앱에 표시된 것과 동일한지 확인 (UUID 일치)

---

## TC-03: 오프라인 중 paper item 추가
**목적**: paper 내 item 추가가 큐에 적재됨  
**단계**:
1. 비행기 모드 ON
2. Inbox → active paper 선택 → 아이템 추가 → "paper 오프라인 아이템"
3. 해당 paper 카드 내 목록 즉시 확인

**기대값**: 카드 내 아이템 즉시 보임, 배너 카운트 증가  
**복구 후**: Supabase → items → paper_id 일치하는 레코드 생성 확인

---

## TC-04: 오프라인 중 item 체크
**목적**: toggleItem이 큐에 적재됨  
**단계**:
1. 온라인 상태에서 아이템 1개 생성
2. 비행기 모드 ON
3. 해당 아이템 체크박스 탭
4. 체크 상태 즉시 반영 확인
5. 다시 탭 → 체크 해제 즉시 반영 확인

**기대값**: 체크/해제가 로컬에서 즉시 동작, 배너 카운트 누적  
**복구 후**: Supabase → items → is_checked, checked_at 값 일치 확인

---

## TC-05: 오프라인 중 paper 완료
**목적**: completePaper가 큐에 적재됨  
**단계**:
1. 비행기 모드 ON
2. Inbox의 named paper → "완료" 버튼 탭
3. 해당 paper가 완료 탭으로 이동 확인 (로컬)

**기대값**: UI에서 paper가 completed 처리됨, 서버엔 미반영  
**복구 후**: Supabase → papers → status="completed" 확인

---

## TC-06: 오프라인 중 paper 생성 (Inbox)
**단계**:
1. 비행기 모드 ON
2. Inbox → "새 paper" 추가 → "오프라인 paper"
3. 카드 즉시 생성 확인

**기대값**: 카드 보임, UUID 기반 id 할당, 배너 카운트 증가  
**복구 후**: Supabase → papers → name="오프라인 paper" 레코드 확인

---

## TC-07: 오프라인 중 item 삭제
**단계**:
1. 온라인 상태에서 아이템 생성
2. 비행기 모드 ON
3. 해당 아이템 스와이프→삭제
4. 목록에서 사라짐 확인
5. Toast "삭제되었습니다." 확인

**기대값**: 로컬에서 사라짐, 서버엔 아직 존재  
**복구 후**: Supabase → items → 해당 레코드 삭제 확인

---

## TC-08: 오프라인 중 Schedule 아이템 추가 (optimistic)
**단계**:
1. 비행기 모드 ON
2. Schedule 탭 → 날짜 선택 → 아이템 입력 → 제출
3. 해당 날짜 섹션에 아이템 즉시 등장 확인

**기대값**: 날짜 태그 포함한 아이템이 로컬에 표시  
**복구 후**: Supabase → items → scheduled_date 포함 레코드 확인

---

## TC-09: 오프라인 중 Papers → Envelope 추가
**단계**:
1. 비행기 모드 ON
2. Papers → "새 Envelope" 추가 → "오프라인 봉투"
3. 탭 바에 즉시 추가 확인

**기대값**: Envelope 탭 로컬 생성  
**복구 후**: Supabase → envelopes → name="오프라인 봉투" 확인

---

## TC-10: 연속 오프라인 작업 → 일괄 replay
**목적**: 여러 ops가 순서대로 replay됨  
**단계**:
1. 비행기 모드 ON
2. item 추가 → 체크 → 다른 item 추가 → paper 완료 (4개 op)
3. 배너 "4개 대기 중" 확인
4. 비행기 모드 OFF → 10초 대기

**기대값**: 배너 사라짐, Supabase에 4개 op 모두 반영, 순서 일치

---

## TC-11: 중복 replay 방어 (409 skip)
**목적**: 동일 op가 두 번 replay되어도 데이터 중복 없음  
**단계**:
1. 오프라인 중 addItem 큐잉
2. 수동으로 AsyncStorage에서 큐 복사 (devtools)
3. 복구 후 replay
4. Supabase → items 중복 레코드 없음 확인

**기대값**: 409/23505 에러 → skip 처리, 아이템 1개만 존재

---

## TC-12: 오프라인 중 Envelope 삭제 차단
**단계**:
1. 비행기 모드 ON
2. Papers → Envelope 삭제 시도

**기대값**: Toast "오프라인 중에는 Envelope를 삭제할 수 없어요." 노출, 삭제 안 됨

---

## TC-13: 앱 재시작 후 큐 유지
**목적**: AsyncStorage에 큐가 영속 저장됨  
**단계**:
1. 비행기 모드 ON → 아이템 2개 추가 (큐 2개)
2. 앱 강제 종료
3. 비행기 모드 OFF → 앱 재실행
4. 앱 포그라운드 진입 → replay 트리거

**기대값**: 재시작 후에도 큐가 살아있어 서버에 반영됨

---

## TC-14: replay 3회 실패 → toast + drop
**목적**: 영구 실패 op는 사용자에게 알림 후 드롭  
**방법 (개발자 테스트)**:
1. offlineQueue.ts의 `executeOp`에서 임시로 항상 throw 처리
2. 오프라인 큐잉 후 복구 → replay 3회 실패
3. Toast "오프라인 작업 일부를 동기화하지 못했어요." 노출 확인
4. 큐에서 해당 op 제거 확인 (AsyncStorage 확인)

---

## 온라인 회귀 테스트 (기존 기능 보호)

### TC-R01: 온라인 시 기존 동작 유지
- 온라인 상태에서 addItem / toggleItem / completePaper 등 동작이 기존과 동일한지 확인
- optimistic → server 교체 흐름: 로컬 temp id가 서버 응답 id로 교체됨 (배열에서 깜빡임 없음)

### TC-R02: UUID 충돌 없음
- 같은 시간에 여러 아이템 추가 → id가 모두 다른 UUID 확인 (timestamp 기반 temp id 아님)

### TC-R03: 실패 시 롤백 정상 동작 (온라인)
- 서버 에러 시뮬레이션 → optimistic 상태 롤백 확인 (기존 동작 유지)
