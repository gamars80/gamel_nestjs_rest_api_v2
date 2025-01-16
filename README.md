# NestJS

## 프로젝트 아키텍쳐

- 응집도 높은 모듈 설계
- 프로덕트 레벨의 서버 사이드 기능 구현
- Github Actions를 활용한 운영 환경 배포
  ![Alt text](./diagram/img/architecture.svg?raw=true)

## 주요 실습 내용

- 회원가입 및 로그인
- 슬라이딩 세션과 리프레쉬 토큰을 활용하여 인증 과정 디벨롭
- Authorizaion(인가) 구현을 통해 유저의 롤에 따른 API 접근
- 비디오 업로드 및 재생, 데이터 확인 API, 비즈니스 로직 작성
- Decorator 활용
- Provider 활용
- Module 활용
- Interceptor를 활용한 요청, 응답 매핑
- TypeORM을 활용하여 Transaction, Index 구현
- 쿼리 분석 및 개선
- Task 스케쥴링을 활용한 메일 전송
- 에러 발생시 슬랙 알람 전송
- 테스트 케이스 작성
- Github Actions를 활용한 CD
  ![Alt text](./diagram/img/sequence.svg?raw=true)

## 기술 스택

- Typescript 4.7.4
- Node.js 18.14.0
- NestJS 9.0.0
- Postgres 14.6
- AWS EC2
- Docker
- Git, Github


## 스터디 정리
- 커스텀 프로바이더
  1.밸류프로바이더
    프로바이더와 유즈밸류 속성
    코드작성 학습
      유저서비스를 대체할 유저목서비스
      user.module.ts에
        //UserMockService 를 만들고 일단 findAll 기능만
        const UserMockService = {
          findAll: () => {
            return 'find mock users'
          }
        }

        providers: [
          {
            provide: UserService, //고유 이름은 그대로 기존의 UserService 인젝션 토큰 지정
            useValue: UserMockService //실제로 정말 사용할 프로바이더는 위에 생성한 유저목서비스 지정
          }
        ],

  2.클래스 프로바이더
    provide와 useClass 속성을 가진다
    프로바이드로 생성할 객체를 동적으로 구성 가능
    이미 사용예
      auth.module.ts에
      {
        provide: APP_GUARD, //nest에서 제공해주는 예약어 APP_GUARD 고유 인젝션 토큰 지정
        useClass: JwtAuthGuard, //전역으로 사용하기 위해 클래스 프로바이드 선언
      },
