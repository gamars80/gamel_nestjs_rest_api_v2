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
    프로바이더로 생성할 객체를 동적으로 구성 가능
    이미 사용예
      auth.module.ts에
      {
        provide: APP_GUARD, //nest에서 제공해주는 예약어 APP_GUARD 고유 인젝션 토큰 지정
        useClass: JwtAuthGuard, //전역으로 사용하기 위해 클래스 프로바이드 선언
      },

  3.팩토리 프로바이더
    사용해야할 프로바이더 객체를 동적으로 구성 가능
    provide , useFactory 라는 속성 가짐

- 커스텀 프로바이더 활용한 테스트 코드 작성
    test code 작성을 위한 클래스 프로바이더
    jest에서 절대경로 인식을 위한 package.json에 jest 항목에 매퍼 경로 추가
      "moduleNameMapper": {
        "^src/(.*)$": "<rootDir>/$1"
      }
    유저 서비스에 테스트 할수 있는 spec.ts 생성
      findOneBy test가 가능한 Mock용 레포지토리 생성

      describe('User', () => {
        let userService: UserService;

        beforeEach(async () => {
            const module: TestingModule = await Test.createTestingModule({
                providers: [
                    UserService,
                    {
                        provide: getRepositoryToken(User),
                        useClass: MockRepository, //클래스 프로바이더 이제 UserService는 mock용 레포지토리를 바라본다
                    }
                ]
            }).compile();

          
            userService = module.get<UserService>(UserService);
        })

        it('should', async () => {
            const email = 'gamel@gmail.com';
            const result = await userService.findOneByEmail(email);
        })
      })
    
    테스트 돌려본다 npm run test

- msa를 염두한 설계중 모듈에 대해
    모듈이란 각각의 도메인 현재로는 user , auth, video, common등등
    이러한 모듈들이 모여 하나의 서비스를 이룬다
    추후 msa관점에서 일부 도메인의 모듈이 커지면 해당 도메인을 하나의 마이크로 서비스로 분리할 수 있다

- 동적모듈을 활용해서 config 모듈 구성
    모듈이 생성될때 동적으로 어떤 변수들이 정해지는 동적모듈을 활용하면 실행환경에 따라 서버에 설정된 환경변수를 관리할 수 있는 config모듈을 만들 수 있다
    nest에서 제공하는 패키지 설치
      npm i --save @nestjs/config

    app.module.ts에 imports
      ConfigModule.forRoot({
        isGlobal: true,
        load: []
      }),

    커스텀 컨피그 파일
      의미 있는 단위로 묶어서 처리하기 위함
      src> config 폴더 생성 postgres.config.ts
        export default registerAs('postgres', () => ({
          host: process.env.POSTGRES_HOST || 'localhost',
          port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5434,
          database: process.env.POSTGRES_DATABASE || 'postgres',
          username: process.env.POSTGRES_USERNAME || 'postgres',
          password: process.env.POSTGRES_PASSWORD || 'postgres'
      }))

    app.module.ts 수정
      TypeOrm.forRoot를 forRootAsync로 변경해서 
      TypeOrmModule.forRootAsync({ 
        inject: [ConfigService], //inject프로퍼티 설정 (타입orm모듈이 처음 init이 될때 필요한 것들을 주입받아서 쓸 수 있게함 ) , ConfigService 주입

        //useFactory를 이용해서 동적 구성
        //TypeOrm관련된 옵션들을 리턴해주게 됨
        useFactory: async (configService : ConfigService) => {
          let obj: TypeOrmModuleOptions = {
            type: 'postgres',
            host: configService.get('postgres.host'), //postgres.config.ts의 접두어 이용 
            port: configService.get('postgres.port'),
            database: configService.get('postgres.database'),
            username: configService.get('postgres.username'),
            password: configService.get('postgres.password'),
            autoLoadEntities: true
          };

          //좀더 튜닝
          //실행환경에 따라 추가하고 싶은 싱크로나이징과 쿼리 로깅
          //로컬에서는 엔티티를 수정할경우 싱크로 나이징이 유리할수도 있어서
          //configService는 앱이 띄워질때 주어지는 환경 변수들에 대해서도 접근해서 가져올수 있음
          if(configService.get('STAGE') === 'local') { //로컬에서만 되게 조심
            console.log('Sync Postgres')
            obj = Object.assign(obj, {
              synchronize: true,
              logging: true
            })
          }
        }
      }),


      ConfigModule.forRoot({
        isGlobal: true,
        load: [postgresConfig] //postgres.config.ts를 load하게 설정
      }),

    package.json에 start:dev에 STAGE 환경변수 추가
      //윈도우일경우 cross-env를 붙혀줘야 한다
      "start:dev": "cross-env STAGE=local nest start --watch"

    jwt secret도 환경 설정해보기
      config > jwt.config.ts 생성
        export default registerAs('jwt', () => ({
            secret : process.env.JWT_SECRET || 'temp secret'
        }))
      
      app.modul.ts에
        ConfigModule.forRoot({
          isGlobal: true,
          load: [postgresConfig, jwtConfig] //load에 jwtConfig 같이 로드되게 추가
        }),

    
    




