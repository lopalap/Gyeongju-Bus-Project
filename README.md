[최종 보고서] Gyeongju Bus Live: 지능형 실시간 버스 정보 시스템
1. 실험의 목적과 범위
목적: 경주시 공공 데이터를 실시간으로 정제하여 사용자에게 최적화된 도착 정보를 제공하고, Web Notification API를 활용해 도착 전 능동적 알림을 제공하는 풀스택 시스템 구축.

범위 (포함):

경주시 버스 노선/정류장 실시간 위치 및 도착 정보 연동.

MariaDB 기반의 사용자 정류장 즐겨찾기 저장 및 관리.

브라우저 기반 실시간 푸시 알림 로직 (도착 3분 전).

범위 (불포함): 결제 시스템, 노선 최단 거리 길 찾기 알고리즘

2.1 유스케이스 다이어그램
<img width="961" height="960" alt="12" src="https://github.com/user-attachments/assets/dc230aad-2d54-4c7e-aad0-57ccd51d352b" />


2.2 주요 기능 명세
실시간 조회: 공공데이터 API를 통해 1초 단위로 버스 위치와 잔여 시간을 갱신하여 지도에 표시.

개인화 저장: 사용자가 등록한 정류장 정보를 DB에 영구 저장하여 재접속 시 즉시 노출.

지능형 알림: 클라이언트 측에서 잔여 시간을 실시간 계산하여 특정 임계값(180초) 도달 시 즉시 알림 생성.

3. 설계

3.1 프로그램 구조 (Architecture)
시스템 아키텍처: 클라이언트-서버 구조로 설계.

Frontend: React를 사용하여 컴포넌트 기반의 UI를 구성하고, 사용자 인터랙션 처리.

Backend: Node.js와 Express를 활용하여 공공 API 데이터를 가공하여 클라이언트에 제공하는 REST API 서버 구축.

Database: MariaDB를 연동하여 정류장 메타데이터 및 사용자별 즐겨찾기 정보 관리.

3.2 핵심 알고리즘 (Algorithm)
본 서비스의 핵심인 '실시간 도착 감지 및 알림 발송' 알고리즘은 다음과 같습니다.

알고리즘 명칭: 도착 임박 데이터 필터링 및 푸시 알림 트리거 로직

설명: API로부터 받은 수많은 버스 데이터 중, 사용자가 설정한 조건(도착 3분 전)에 부합하는 데이터를 초 단위로 계산하여 알림을 발생시킴.

// [Pseudo Code] 도착 알림 로직
WHILE (service_is_active) DO
    SET current_bus_data = FETCH_FROM_BUS_API() // 실시간 API 호출
    
    FOR EACH bus_info IN current_bus_data DO
        // 도착 예정 시간이 180초(3분) 이하인지 검사
        IF (bus_info.arrival_time <= 180 AND bus_info.is_notified == FALSE) THEN
            EXECUTE Web_Notification_Push("버스 도착 임박 알림")
            SET bus_info.is_notified = TRUE // 중복 알림 방지 플래그 설정
        END IF
    END FOR
    
    WAIT 10 SECONDS // API 부하 방지를 위한 갱신 주기 설정
END WHILE

4. 구현 (구현 환경 및 API)
개발 환경: VS Code, Git

언어 및 프레임워크: JavaScript (ES6+), React.js, Node.js, Express

데이터베이스: MariaDB (MySQL 호환)

사용 API:

국토교통부: 경주시 버스 도착 정보 공공 API

Kakao: Maps SDK (지도 렌더링 및 마커 오버레이)

Web Notification API (브라우저 푸시 알림)

5. 실험 (테스트 데이터 및 결과)
테스트 시나리오:
웹 접속, 로그인/로그아웃
웹 어플리케이션에 접속, 로그인/로그아웃 기능이 제대로 작동하고 있는지 확인한다. 로그인하지 않은 경우 로그인 화면만 띄워진다.

웹 브라우저 실행
웹 어플리케이션 접속
<img width="564" height="586" alt="image" src="https://github.com/user-attachments/assets/f5dfd1c0-66bc-4707-8db0-3e726e238896" />
<img width="555" height="189" alt="image" src="https://github.com/user-attachments/assets/02ac4bb1-f02a-45a7-a6c8-e3b22a6974fc" />
<img width="575" height="467" alt="image" src="https://github.com/user-attachments/assets/d663abb4-2969-48c0-9139-1add71226d8f" />


<img width="2559" height="1277" alt="image" src="https://github.com/user-attachments/assets/634b5e4f-0942-445c-84e2-2aaeb2376444" />


국민건강보험.정보고등학교 정류장을 대상으로 즐겨찾기 버스 도착 정보 요청.
<img width="2559" height="1439" alt="image" src="https://github.com/user-attachments/assets/b253e789-1c81-4228-88e1-6ab384afdea9" />

결과:

API 응답 속도: 평균 200ms 이내 데이터 수신 및 파싱 성공.

알림 정확도: 잔여 시간 180초 도달 시 즉시 브라우저 우측 하단에 알림 팝업 발생 확인.

지도 정합성: API의 위도/경도 데이터와 카카오맵 마커 위치 일치율 100%.


6. 결론
본 프로젝트는 기존 상용 지도 서비스가 제공하는 단순 조회 기능을 넘어, 풀스택 웹 아키텍처를 직접 설계하고 구현하는 데 성공했습니다. 특히 공공 API의 원천 데이터를 자체 서버에서 정제하고, Web Notification API를 통한 실시간 이벤트 처리를 구현함으로써 공학적인 해결 능력을 증명했습니다.
