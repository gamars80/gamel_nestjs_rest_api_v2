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
  - 1.밸류프로바이더
    - 프로바이더와 유즈밸류 속성
    - 코드작성 학습
      - 유저서비스를 대체할 유저목서비스
        user.module.ts에
        
        UserMockService 를 만들고 일단 findAll 기능만

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

  - 2.클래스 프로바이더
    - provide와 useClass 속성을 가진다
    - 프로바이더로 생성할 객체를 동적으로 구성 가능
    - 이미 사용예
      - auth.module.ts에
          {
            provide: APP_GUARD, //nest에서 제공해주는 예약어 APP_GUARD 고유 인젝션 토큰 지정
            useClass: JwtAuthGuard, //전역으로 사용하기 위해 클래스 프로바이드 선언
          },

  - 3.팩토리 프로바이더
    - 사용해야할 프로바이더 객체를 동적으로 구성 가능
    - provide , useFactory 라는 속성 가짐

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
    - 모듈이란 각각의 도메인 현재로는 user , auth, video, common등등
    - 이러한 모듈들이 모여 하나의 서비스를 이룬다
    - 추후 msa관점에서 일부 도메인의 모듈이 커지면 해당 도메인을 하나의 마이크로 서비스로 분리할 수 있다

- 동적모듈을 활용해서 config 모듈 구성
    - 모듈이 생성될때 동적으로 어떤 변수들이 정해지는 동적모듈을 활용하면 실행환경에 따라 서버에 설정된 환경변수를 관리할 수 있는 config모듈을 만들 수 있다
    - nest에서 제공하는 패키지 설치
      npm i --save @nestjs/config

    - app.module.ts에 imports

        ConfigModule.forRoot({
          isGlobal: true,
          load: []
        }),

    - 커스텀 컨피그 파일
      - 의미 있는 단위로 묶어서 처리하기 위함
      - src> config 폴더 생성 postgres.config.ts

            export default registerAs('postgres', () => ({
              host: process.env.POSTGRES_HOST || 'localhost',
              port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : 5434,
              database: process.env.POSTGRES_DATABASE || 'postgres',
              username: process.env.POSTGRES_USERNAME || 'postgres',
              password: process.env.POSTGRES_PASSWORD || 'postgres'
            }))


    - app.module.ts 수정
      - TypeOrm.forRoot를 forRootAsync로 변경해서 
      
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

      auth.modul.ts에 config 서비스를 주입해서 이용
        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            return {
              global: true,
              secret: configService.get('jwt.secret'),
              signOptions: { expiresIn: '1d' },
            };
          },
        }),

- 인증과 인가에 대해
  인증 : 유저나 디바이스의 신원 증명
    이메일, 패스워드 로그인 기능
  인가 : 유저나 디바이스에 접근권한을 부여하거나 거부
    웹토큰을 이용한 접근
  
  슬라이딩 세션
    토큰 유효기간 종료시 다시 로그인을 거치지 않고 새로운 토큰을 발급하는 방식
  리프레쉬 토큰
    로그인을 대신할 토큰
    동일한 json web token
    엑세스 토큰보다 만료시간 길게
    로그인시 엑세스토큰과 리프레쉬 토큰 같이 발행
    엑세스토큰이 401로 만료시 리스레쉬 토큰 이용
  auth > entity > refresh-token.entity.ts 생성
    User랑 OnetoOne 관계 설정
  
  auth.module.ts imports에 엔티티 TypeOrm 설정
    TypeOrmModule.forFeature([RefreshToken]),

  로그인 결과에 리스레쉬 토큰도 내려주게 추가한다

  리플레시 토큰 관련 기능 구현
    리플레시라는 라우터 핸들러 구현
      엑세스 토큰이 만료시 클라이언트 단에서 뒷단에서 로그인시 발급 받은 리플레시 토큰을 이용하는 api
      헤더에서 넘어온 리프레쉬 토큰으로 db에 있는지 조회
      없으면 어세스토큰과 리프레시 토큰을 다시 생성하여 return

    jwt.auth.guard로 가서 리플레시토큰을 활용해서 엑세스토큰 역활을 할수 있기에 방지차 리팩토링
      //url과 headers에 접근 가능해짐
      const {url, headers} = http.getRequest<Request>();
      const token = /Bearer\s(.+)/.exec(headers['authorization'])[1];
      //디코딩
      const decoded = this.jwtService.decode(token);

      if(url !== '/api/auth/refresh' && decoded['tokenType'] === 'refresh') {
        console.error('accessToken is required');
        throw new UnauthorizedException(); 
      }

  인가 기능에 활용할수 있는 메타 데이터
    메타데이터
      ex: Pubice() 데코레이터
        //SetMetadata 에 특정 키와 밸루로 메타데이터 설정
        export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

      jwt.auth.guard.ts에서도 아래처럼 메타데이터를 reflector를 이용해서 읽을수도 있다
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        
        if (isPublic) {
          return true;
        }


    메타데이터를 이용해 유저에 롤 부여
      user > enum> user.enum.ts 생성
        export enum Role {
            Admin = 'ADMIN',
            User = 'USER'
        }
      
      user.entity.ts 에 role 컬럼 추가
        Column({ type: 'enum', enum: Role })
        role: Role = Role.User;

      롤관련 데코레이터 생성
        common > decorator > role.decorator.ts 생성          
          export const ROLES_KEY = 'roles';
          export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

      user의 findAll에 롤데코레이터 적용해보기
        @Roles(Role.Admin)
        jwt-auth.guard 수정
        reflector 에용해서 메타데이터에서 ROLES_KEY를 가져온다

          const requireRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
            context.getHandler(),
            context.getClass()
          ])

          if( requireRoles ) {
            const userId = decoded['sub'];
            return this.userService.checkUserIsAdmin(userId);

          }


  - 미들웨어와 인터셉터
    라우트 핸들러가 클라이언트의 요청을 처리하기 전 수행하는 컴포넌드
    express의 미들웨어와 동일
    인증, 인가, 로깅, 응답데이터의 변경등
    인증인가: Guard
    요청 : 인터셉터
    access log : 미들웨어

    common > middleware > logger.middleware.ts
      access log에는 보통 http 메소드, url , 응답코드, 응답컨텐츠 길이, 요청한 유저 에이전트, ip 정보등

      @Injectable()
      export class LoggerMiddleware implements NestMiddleware {
          private logger = new Logger('HTTP');

          use(request: Request, response: Response, next: NextFunction): void {
              const {ip, method, originalUrl: url } = request;
              const userAgent = request.get('user-agent') || '';

              response.on('close', () => {
                  const { statusCode } = response;
                  const contentLength = response.get('content-length');
                  this.logger.log(`${mergeWith} ${url}, ${statusCode}, ${contentLength} - ${userAgent} ${ip}}`);
              });

              next();
          }
      }

    루트 모듈인 app.module.ts에 위 미들웨어 적용

      //NestModule 상속받고
      export class AppModule implements NestModule{
        configure(consumer: MiddlewareConsumer): void {
          //모든 라우터에 적용
          consumer.apply(LoggerMiddleware).forRoutes('*');
        }
      }

    nest-winston을 활용한 로깅
      프로덕션 레벨에서는 로컬이 아닌 db나 서드 파티에 남겨야 하므로 편한게 할수 있음
      라이브러리 설치
        npm i nest-winston winston

      부트스랩에 포함된 로깅까지 winston모듈에서 제공하는 로거로 대체하기 위해서는 nest앱을 생성할때부터 별도의 작업 필요
        main.ts 리팩토링
          const app = await NestFactory.create(AppModule, {
            logger: WinstonModule.createLogger({
              transports: [new winston.transports.Console({
                level:process.env.STAGE === 'prod' ? 'info' : 'debug',
                format: winston.format.combine(
                  winston.format.timestamp(),
                  utilities.format.nestLike('Game NestJs Study', { prettyPrint: true })
                )
              })]
            })
          });

      대체한 로거를 사용할 모듈에서 provider로 선언해서 사용할수 있게 함
        app.module.ts에 providers: [Logger], 선언

      logger.middleware.ts가서 수정
     
        @Injectable()
        export class LoggerMiddleware implements NestMiddleware {
            constructor(@Inject(Logger) private readonly logger: LoggerService) {} // 윈스턴 로고 주입

            use(request: Request, response: Response, next: NextFunction): void {
                const {ip, method, originalUrl: url } = request;
                const userAgent = request.get('user-agent') || '';

                response.on('close', () => {
                    const { statusCode } = response;
                    const contentLength = response.get('content-length');
                    this.logger.log(`${mergeWith} ${url}, ${statusCode}, ${contentLength} - ${userAgent} ${ip}}`);
                });

                next();
            }

        }

      리팩토링
        auth.module.ts에 윈스턴 로고 적용해보기
          providers에 Logger 선언

        jwt-auth.guard.ts에 console.error를 윈스턴 로고로 리팩토링
          @Inject(Logger) private logger: LoggerService // 주입

          if(url !== '/api/auth/refresh' && decoded['tokenType'] === 'refresh') {
            const error = new UnauthorizedException('accessToken is required');
            
            this.logger.error(error.message, error.stack);
            throw error;
          }



    인터셉터
      클라이언트 요청에 대해 라우터 핸들러가 처리하기 전 후로 호출되는 nest에 제공하는 모듈
      요청과 응답을 원하는대로 변경가능
      페이징 처리하는 요청 응답값에 page와 size를 자동으로 넣는 인터셉터 구현해보기
      common > interceptor > transform.interceptor.ts
        @Injectable()
        export class TransformInterceptor<T, R> implements NestInterceptor<T, R> {
            intercept(context: ExecutionContext, next: CallHandler): Observable<R> {
                return next.handle().pipe(
                    map((data) => {
                        const http = context.switchToHttp();
                        const request = http.getRequest<Request>();

                        if (Array.isArray(data)) {
                            return {
                                items: data,
                                page: Number(request.query['page'] || 1),
                                size: Number(request.query['size'] || 20)  
                            }
                        }else{
                            return data;
                        }
                    })
                )
            }
        }

      인터셉터 글로벌 적용
        main.ts에 추가
        app.useGlobalInterceptors(new TransformInterceptor());
      

        



      





    
    




