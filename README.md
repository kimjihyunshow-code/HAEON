# 해온 HAEON — 최신 실행 안내

업데이트: 2026-10-19. 가상의 프리미엄 한국 전통주 브랜드 웹사이트입니다.
HTML/CSS/JavaScript 프런트엔드와 Python 표준 라이브러리 기반 로컬 회원 서버로 구성됩니다.

## 실행

회원가입·로그인까지 확인하려면 압축을 모두 풀고 server.py가 있는 폴더에서 실행합니다.

```powershell
python server.py serve
```

Python 3.10 이상이 필요합니다. http://127.0.0.1:8000/ 로 접속하고 Ctrl+C로 종료합니다.
포트를 바꾸려면 python server.py serve --port 8001을 실행합니다.
관리자 계정은 같은 폴더에서 python server.py create-admin으로 생성합니다.

디자인·장바구니만 확인하려면 haeon 폴더에서 node serve.cjs를 실행하고
http://127.0.0.1:4173/ 에 접속합니다. 이 정적 서버와 VS Code Live Server에는 회원 API가 없습니다.
file:// 직접 열기는 세션 저장소·외부 주소 검색의 브라우저 차이 때문에 권장하지 않습니다.
Google Fonts와 카카오 주소 검색은 인터넷 연결이 필요합니다. 이미지·영상은 프로젝트에 포함됩니다.

## 페이지

| 파일 | 역할 |
|---|---|
| index.html | 제품 히어로, 이미지·영상 3열 모자이크 |
| brand.html | STORY / IDEAL 브랜드 소개 |
| brand-detail.html | STORY / MEANING 브랜드 아이덴티티 |
| craft.html | 재료와 5단계 주조 과정 |
| taste.html | 풍미와 페어링 가이드 |
| shop.html | 4종 컬렉션, ACCOUNT·BAG 연결 |
| product-detail.html | id=375, 750, gift, mini 상품 상세·추천 상품 |
| cart.html | 수량 변경·삭제·상품 합계 |
| checkout.html | 배송 정보·주소 검색·결제 방식 선택·결제 전 확인 |
| account.html | 로컬 회원가입·로그인·로그아웃 |
| admin-members.html | 관리자 회원 조회·활성 상태 관리 |
| orders.html | 실제 주문이 없는 주문내역 안내 |
| terms.html / privacy.html | 이용약관·개인정보 안내 초안 |

## 현재 기능과 범위

- 모바일 헤더: 왼쪽 여백과 브랜드 메뉴 사이 간격 조정, STORY 하위 메뉴 제공.
- 모자이크는 모바일에서도 화면 너비에 맞는 3열 배치이며 가로 스크롤이 필요하지 않습니다.
- ACCOUNT는 계정 화면, BAG은 장바구니 패널을 엽니다.
- 상품·수량은 sessionStorage의 haeon-demo-cart-v1에 저장됩니다. 같은 탭에서 유지되며 서버 주문 기록은 만들지 않습니다.
- 주문서는 카카오 주소 검색으로 우편번호·주소를 입력하고 동·호수는 직접 입력합니다. 검색이 실패하면 수동 입력할 수 있습니다.
- 카카오 검색어는 카카오 서비스로 전송됩니다. 주문서의 배송 정보는 주문 서버나 저장소에 저장하지 않습니다.
- 결제 전 확인은 체험 안내창만 엽니다. 결제창 연결·카드번호 입력·주문 접수·구매 완료는 없습니다.
- 회원가입은 별개로 Python 서버에서 실제 SQLite 계정을 저장합니다. 회원 기능과 구매 체험을 혼동하지 마세요.

## 상품 데이터

수정 위치: js/commerce.js의 CATALOG. 모두 시안 가격입니다.

| ID | 구성 | 가격 | 이미지 (assets/images/experience/) |
|---|---|---:|---|
| 375 | 375ml | 22,000원 | 375ml.png |
| 750 | 750ml | 38,000원 | 750ml.png |
| gift | 750ml + 백자잔 2개 | 58,000원 | 750ml_set.png |
| mini | 100ml 4병 + 전용 잔 2개 | 42,000원 | 100ml_set.png |

배송비는 미정이며 표시 합계는 상품 금액입니다.

## 유지보수

공통 헤더·푸터는 14개 HTML에 직접 들어 있습니다. 공통 수정 시 전체 페이지를 확인하세요.
헤더는 css/header.css, 푸터는 css/footer.css, 구매 UI는 css/commerce.css와 js/commerce.js,
주소 검색은 js/postcode.js에서 관리합니다. 페이지별 스타일은 별도 CSS에 있습니다.
이미지 경로는 ASSET_STRUCTURE.md, 구매 흐름은 COMMERCE_DEMO_README.md, 점검 결과는 MOBILE_QA.md를 참고하세요.

푸터 정보: 대표자 김해온 / 인천광역시 강화군 / 전통주 제조 및 브랜드 기획 / hello@haeon.example.

## 회원 DB

server.py 첫 실행 시 data/members.sqlite3가 생성됩니다. 기존 DB가 있다면 덮어쓰기 전에 백업하세요.
DB는 웹 폴더 밖에 보관하고 공개 배포 ZIP에 포함하지 마세요. HAEON_DB_PATH 환경변수로 경로를 바꿀 수 있습니다.
이 버전의 구매 기능은 체험용이며 회원 서버는 로컬 개발용입니다.

