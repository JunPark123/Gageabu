# 가계부 프로젝트

1. 둘 만의 가계부 개발을 목표로 각자 서버와 클라이언트를 연습!
2. 최종 목표는 서버(리눅스)와 클라이언트(윈도우,앱 등)로 나눌 예정!

#서버
 - 클라,DB와 통신하여 데이터를 송,수신 할 수 있어야 함

 리눅스가 최종 목표지만 개발하는 시간이 많이 소요 된다면 윈도우로 변경 가능

#클라
 - 단순히 데이터 조회, 저장, 삭제 커맨드만 날리는 구조! UI 쪽의 비중이 더 클 듯?
 
 윈도우, 리눅스 모두 구동이 가능한 응용프로그램으로 가야함
 모바일 앱(안드로이드,IOS)로 가야함

 모든 플랫폼에서 구동해야하므로 최대한 간단하게 개발하는게 좋을듯!



 #클라(Mobile App)
1. 개발환경 구축


# 기록
25.04.12
- Add 버튼 이미지 수정
1. 앱에서 추가할 때 시간이 이상하게 저장되는 문제 : 기본 UTC 시간 설정이 한국 시간과 9시간 차이로 문제 발생
  - 함수 사용하여 수정 완료(일단)
2. 지출 목록에 오늘 날짜만 보이게 하기
  - 오늘만 보기 버튼을 새로고침과 동일한 라인에 왼쪽에 위치하도록 추가
  - 오늘만 보기 버튼 클릭 시 오늘만 보기 버튼이 전체 내역 보기로 변경
  - 오늘만 보기 버튼 클릭 시 오늘 날짜의 내역 리스트들만 표현
  - 전체 내역 보기 클릭 시 전체 내역 리스트 표현
3. 편집 버튼 헤더에서 제거하고 상단에 위치하도록 수정


25.04.05  //앱을 주로 수정하여 서버 표시 없는 경우 앱만 수정
1. 최신화(add화면에서 Home으로 이동했을 때, 새로고침 버튼 클릭했을 때, Home 화면 밑으로 스와이프 했을 때)
2. 삭제 기능
   1) 서버 : delete() 추가
   2) 앱 : Home 화면에서 삭제
      2-1) 각 리스트 왼쪽으로 스와이프해서 삭제
         - 왼쪽으로 스와이프 했을 때 여러개 표현되는 것 하나만 표현되도록 수정
         - 스와이프 시 새로운 스와이프 먼저 실행하고 기존 스와이프 해제하는 것을 기존 스와이프 해제 후 새로운 것 표현하도록 수정
         - 스와이프 후 삭제 이외의 다른 부분 클릭했을 때 스와이프 해제되도록 기능 개선
         - 스와이프 후 add, Explore등 다른 화면으로 이동 시 스와이프 해제되도록 기능 개선
         - 스와이프 후 화면 갱신 스와이프와 새로고침 버튼 클릭 시 스와이프 해제되도록 기능 개선
      2-2) 편집 버튼 눌러서 여러개 한 번에 삭제
         - 상단바(헤더) 부분의 오른쪽에 편집 버튼 표현
         - 편집 버튼 클릭 시 편집 버튼이 취소 버튼으로 변경, 상단 왼쪽에 삭제 버튼 생성
         - 편집 버튼 클릭 시 각 리스트에 체크 박스 표현
         - 삭제 버튼 클릭 시 체크 리스트 모두 삭제
         - IOS와 Android 화면 동일하도록 수정


25.03
.NET Server : 앱 연동 완료
.Mobile App(React) : 조회, 추가 기능


# 다음에 할 것
1. 로그인 기능
   1) 서버 : 
   2) 앱 : 
@@ 2. 지출 목록에 오늘 날짜만 보이게 하기
3. 오늘의 총 지출 금액 표현하기
4. 날짜 검색하기 -> 검색한 날짜 지출 목록에 표현, 총 지출 금액도 표현
5. 월(Month) 검색 -> 리스트 없이 그 달의 지출 금액만 표현
6. 지출 내역 수정 -> Home의 지출 리스트에서 지출 내역 수정 가능하도록
@@ 7. 앱에서 추가할 때 시간이 이상하게 저장되는 문제
7-2. 시간 설정을 IDT가 아닌 서버와 클라 협의하여 수정하기
8. 다른 IP 사용할 때도 저장되도록
9. id가 자동으로 저장될 때 지금 저장되어 있는 마지막 id에 이어지도록
10. 입금 추가
   1) (3,4번의)오늘의 총 지출은 입금이 있을 경우 총 입금도 표현
   2) (5번의)그 달의 지출은 입금 지출 모두 표현하고 총 사용 금액(입금-지출 금액)도 표현
11. 밑으로 떙기는 새로고침 및 리스트 확인 스와이프 개선
12. UI 꾸미기
13. Mobile 앱 소스 리펙토링
14. 어플화
    


# 패키지 설치 내역
npx expo install react-native-gesture-handler(삭제 스와이프 할 때 설치함)
npm install @react-native-community/checkbox (체크박스)

# cmd 명령어
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass(보안 풀기)
npx expo start -c

