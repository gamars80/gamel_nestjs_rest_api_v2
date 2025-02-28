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

    - package.json에 start:dev에 STAGE 환경변수 추가

          //윈도우일경우 cross-env를 붙혀줘야 한다
          "start:dev": "cross-env STAGE=local nest start --watch"

    - jwt secret도 환경 설정해보기
      config > jwt.config.ts 생성

            export default registerAs('jwt', () => ({
                secret : process.env.JWT_SECRET || 'temp secret'
            }))
      
      app.module.ts에

            ConfigModule.forRoot({
              isGlobal: true,
              load: [postgresConfig, jwtConfig] //load에 jwtConfig 같이 로드되게 추가
            }),

      auth.module.ts에 config 서비스를 주입해서 이용

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
  - 인증 : 유저나 디바이스의 신원 증명
    - 이메일, 패스워드 로그인 기능
  - 인가 : 유저나 디바이스에 접근권한을 부여하거나 거부
    - 웹토큰을 이용한 접근
  
  - 슬라이딩 세션
    - 토큰 유효기간 종료시 다시 로그인을 거치지 않고 새로운 토큰을 발급하는 방식
  - 리프레쉬 토큰
    - 로그인을 대신할 토큰
    - 동일한 json web token
    - 엑세스 토큰보다 만료시간 길게
    - 로그인시 엑세스토큰과 리프레쉬 토큰 같이 발행
    - 엑세스토큰이 401로 만료시 리스레쉬 토큰 이용
  - auth > entity > refresh-token.entity.ts 생성
    - User랑 OnetoOne 관계 설정
  
  - auth.module.ts imports에 엔티티 TypeOrm 설정

        TypeOrmModule.forFeature([RefreshToken]),

  - 로그인 결과에 리스레쉬 토큰도 내려주게 추가한다

  - 리플레시 토큰 관련 기능 구현
    - 리플레시라는 라우터 핸들러 구현
      - 엑세스 토큰이 만료시 클라이언트 단에서 뒷단에서 로그인시 발급 받은 리플레시 토큰을 이용하는 api
      - 헤더에서 넘어온 리프레쉬 토큰으로 db에 있는지 조회
      - 없으면 어세스토큰과 리프레시 토큰을 다시 생성하여 return

    - jwt.auth.guard로 가서 리플레시토큰을 활용해서 엑세스토큰 역활을 할수 있기에 방지차 리팩토링

          //url과 headers에 접근 가능해짐
          const {url, headers} = http.getRequest<Request>();
          const token = /Bearer\s(.+)/.exec(headers['authorization'])[1];
          //디코딩
          const decoded = this.jwtService.decode(token);

          if(url !== '/api/auth/refresh' && decoded['tokenType'] === 'refresh') {
            console.error('accessToken is required');
            throw new UnauthorizedException(); 
          }

  - 인가 기능에 활용할수 있는 메타 데이터
    - 메타데이터
      - ex: Pubice() 데코레이터

            //SetMetadata 에 특정 키와 밸루로 메타데이터 설정
            export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

      - jwt.auth.guard.ts에서도 아래처럼 메타데이터를 reflector를 이용해서 읽을수도 있다

            const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
                context.getHandler(),
                context.getClass(),
            ]);
            
            if (isPublic) {
              return true;
            }


    - 메타데이터를 이용해 유저에 롤 부여
      - user > enum> user.enum.ts 생성

            export enum Role {
                Admin = 'ADMIN',
                User = 'USER'
            }
      
      - user.entity.ts 에 role 컬럼 추가

            Column({ type: 'enum', enum: Role })
            role: Role = Role.User;

      - 롤관련 데코레이터 생성
        - common > decorator > role.decorator.ts 생성       

                export const ROLES_KEY = 'roles';
                export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

      - user의 findAll에 롤데코레이터 적용해보기

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
    - 라우트 핸들러가 클라이언트의 요청을 처리하기 전 수행하는 컴포넌드
    - express의 미들웨어와 동일
    - 인증, 인가, 로깅, 응답데이터의 변경등
    - 인증인가: Guard
    - 요청 : 인터셉터
    - access log : 미들웨어

    - common > middleware > logger.middleware.ts
      - access log에는 보통 http 메소드, url , 응답코드, 응답컨텐츠 길이, 요청한 유저 에이전트, ip 정보등

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

    - 루트 모듈인 app.module.ts에 위 미들웨어 적용

          //NestModule 상속받고
          export class AppModule implements NestModule{
            configure(consumer: MiddlewareConsumer): void {
              //모든 라우터에 적용
              consumer.apply(LoggerMiddleware).forRoutes('*');
            }
          }

    - nest-winston을 활용한 로깅
      - 프로덕션 레벨에서는 로컬이 아닌 db나 서드 파티에 남겨야 하므로 편한게 할수 있음
      - 라이브러리 설치
        npm i nest-winston winston

      - 부트스랩에 포함된 로깅까지 winston모듈에서 제공하는 로거로 대체하기 위해서는 nest앱을 생성할때부터 별도의 작업 필요
        - main.ts 리팩토링

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

      - 대체한 로거를 사용할 모듈에서 provider로 선언해서 사용할수 있게 함
        - app.module.ts에 
                
                providers: [Logger], 선언

      - logger.middleware.ts가서 수정
     
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

      - 리팩토링
        - auth.module.ts에 윈스턴 로고 적용해보기
          providers에 Logger 선언

        - jwt-auth.guard.ts에 console.error를 윈스턴 로고로 리팩토링

                @Inject(Logger) private logger: LoggerService // 주입

                if(url !== '/api/auth/refresh' && decoded['tokenType'] === 'refresh') {
                  const error = new UnauthorizedException('accessToken is required');
                  
                  this.logger.error(error.message, error.stack);
                  throw error;
                }



    - 인터셉터
      - 클라이언트 요청에 대해 라우터 핸들러가 처리하기 전 후로 호출되는 nest에 제공하는 모듈
      - 요청과 응답을 원하는대로 변경가능
      - 페이징 처리하는 요청 응답값에 page와 size를 자동으로 넣는 인터셉터 구현해보기
      - common > interceptor > transform.interceptor.ts

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

      - 인터셉터 글로벌 적용
        main.ts에 추가

              app.useGlobalInterceptors(new TransformInterceptor());

      - 트랜젝션
        - 회원가입 리팩토링
          - 가입시 리프레쉬 토큰도 생성하여 db에 save 추가
          - 트랜잭션 명시적 선언
            - 서비스단에 DataSource 의존성 주입
            - queryRunner를 통한 트랜젝션 시작, 커밋, 릴리즈

                  let error;
                  try{
                    const user = await this.userService.findOneByEmail(email);
                    if (user) throw new BadRequestException();

                    const userEntity = queryRunner.manager.create(User, { email, password});
                    await queryRunner.manager.save(userEntity);

                    const accessToken = this.generateAccessToken(userEntity.id);
                    const refreshToken = this.generateRefreshToken(userEntity.id);
                    const refreshTokenEntity = queryRunner.manager.create(RefreshToken, {
                      user: {id: userEntity.id},
                      token: refreshToken
                    })

                    await queryRunner.manager.save(refreshTokenEntity);
                    await queryRunner.commitTransaction();
                    return {id: userEntity.id, accessToken, refreshToken};

                  }catch(e) {
                    await queryRunner.rollbackTransaction();
                    error = e;
                  }finally{
                    await queryRunner.release();
                    if(error) throw error;
                  }

      - 인덱스 처리
        - 유저 엔티티 활용

              @Column({ unique: true } // unique 속성을 true 주면 자동으로 인덱스로 생성됨

              //또는 데코레이터 활용하여 네이밍
              @Index('user-email-index')


      - 마이그레이션
        - 마이그레이션 cli 사용
        - 패키지 설치
          - npm i -g ts-node
        - package.json에 script 추가

            "typeorm": "ts-node -r ./node_modules/tsconfig-paths/register ./node_modules/typeorm/cli.js -d src/ormconfig.ts"

        - src > ormconfig.ts 파일 생성

              import { DataSource } from "typeorm";

              export const AppDataSource = new DataSource({
                  type: 'postgres',
                  host: 'localhost',
                  port: 5434,
                  database: 'postgres',
                  username: 'postgres',
                  password: 'postgres',
                  entities:[__dirname + '/**/*.entity{.ts,.js}'],
                  synchronize: false,
                  migrations: [__dirname + '/**/migrations/*.entity{.ts,.js}'],
                  migrationsTableName: 'migrations'
              })

        - bash 명령어
          - npm run typeorm migration:generate src/migrations/Init //스키마 파일 생성
          - npm run typeorm migration:run //실제 쿼리 실행

        

      - swagger 기본 보안 적용
        - 스웨거 로그인을 통한 접근
        - 패키지 설치
        - npm i express-basic-auth
        - src > config > swagger.config.ts 생성

              import { registerAs } from "@nestjs/config";

              export default registerAs('swagger', async () => {
                  return {
                      user: process.env.SWAGGER_USER || 'fastcampus',
                      password: process.env.SWAGGER_PASSWORD || 'fastcampus',
                  };
              })

        - app.module.ts에 스웨거 컨피그 로딩 추가

              ConfigModule.forRoot({
                isGlobal: true,
                load: [postgresConfig, jwtConfig, swaggerConfig]
              }),

        - main.ts 추가 및 리팩토링

              const configService = app.get(ConfigService);
              // Swagger
              const SWAGGER_ENVS = ['local', 'dev'];
              const stage = configService.get('STAGE');

              if (SWAGGER_ENVS.includes(stage)) {
                console.log('ddddddd'+configService.get('swagger.user'))
                app.use(
                  ['/docs', '/docs-json'],
                  basicAuth({
                    challenge: true,
                    users: {
                      [configService.get('swagger.user')]: configService.get('swagger.password'),
                    }
                  })
                )

                const config = new DocumentBuilder()
                .setTitle('NestJS project')
                .setDescription('NestJS project API description')
                .setVersion('1.0')
                .addBearerAuth()
                .build();

                const customOptions: SwaggerCustomOptions = {
                  swaggerOptions: {
                    persistAuthorization: true,
                  },
                };
                const document = SwaggerModule.createDocument(app, config);
                SwaggerModule.setup('docs', app, document, customOptions);
              }

        - 유저 비밀번호 hashing 암호화
          - bcrypt 패키징 설치
            - npm i bcrypt
            - npm i -D @types/bcrypt

          - 유저 서비스단의 회원 가입과 로그인 리팩토링

                //회원 가입시 암호화
                const saltRounds = 10;
                const hash = await bcrypt.hash(password, saltRounds);

                //로그인쪽에 비밀번호 비교 수정
                bcrypt.compare(password, user.password);

        - Rate Limit 적용해보기
          - 패키지 설치
            - npm i @nestjs/throttler 
          - app.module.ts에 import

                ThrottlerModule.forRoot([{
                  ttl: 60000,
                  limit: 10,
                }]),

          - throttle 통해 보안 강화
            - 전용 가드 생성
            - common > guard > throttler-behind-proxy.guard.ts 생성

                  import { Injectable } from "@nestjs/common";
                  import { ThrottlerGuard } from "@nestjs/throttler";

                  @Injectable()
                  export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
                      protected async getTracker(req: Record<string, any>): Promise<string> {
                          return req.ips.length ? req.ips[0] : req.ip
                      }
                  }

            - 비디오 컨트롤러에 적용해 보기
              - 전역 선언 

                      @UseGuards(ThrottlerBehindProxyGuard)

              - 개별 선언

                      @Throttle({ default: { limit: 3, ttl: 60000 } })

              - 페이징 같은 case는  스킵

                      @SkipThrottle()
          
          - snentry 모니터링 및 slack 웹훅 알람
            - .env 파일에 센트리 프로젝트 링크 및 슬랙 채널 웹훅 링크 선언
            - 패키징 설치
              - npm i @sentry/node
              - npm i @slack/webhook
            - gitignore에 env 파일 안올라가게
            - 센트리용 config 파일 생성
              - config > sentry.config.ts 생성

                    export  default registerAs('sentry', () => ({
                        dsn: process.env.SENTRY_DSN,
                    }))

              - app.module.ts에 콘피그 추가

                    ConfigModule.forRoot({
                      isGlobal: true,
                      load: [sentryConfig, swaggerConfig, postgresConfig, jwtConfig]
                    }),

            - 센트리용 인터셉터 생성
              - common > interceptor > sentry.interceptor.ts 생성

                    import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
                    import { Observable, catchError } from "rxjs";
                    import { Request as ExpressRequest} from 'express';
                    import * as Sentry from  '@sentry/node'
                    import { IncomingWebhook } from "@slack/webhook";

                    @Injectable()
                    export class SentryInterceptor implements NestInterceptor {
                        intercept(context: ExecutionContext, next: CallHandler<any>): Observable<any> | Promise<Observable<any>> {
                            const http = context.switchToHttp();
                            const request = http.getRequest<ExpressRequest>();
                            const { url } = request;
                            return next.handle().pipe(
                                catchError((error) => {
                                    Sentry.captureException(error);
                                    const webhook = new IncomingWebhook(process.env.SLACK_WEBHOOK);
                                    webhook.send({
                                        attachments: [
                                            {
                                                text: '가멜 nestjs 에러발생',
                                                fields: [
                                                    {
                                                        title: `에러 메세지 발생 : ${error.response?.message} || ${error.message}`,
                                                        value: `URL: ${url}\n${error.stack}`,
                                                        short: false
                                                    },
                                                ],
                                                ts: Math.floor(new Date().getTime() / 1000).toString(),
                                            }
                                        ]
                                    });
                                    throw error;
                                }),
                            );
                        }
                    }

            - main.ts에 센트리 init하고 인터셉터 사용하겠다고 선언

                    //센트리 init
                    Sentry.init({ dsn: configService.get('sentry.dsn')});
                    app.useGlobalInterceptors(new SentryInterceptor(), new TransformInterceptor());


        - health check
          - 패키지 설치
            - npm install @nestjs/terminus@9.1.2
            - 체크에 필요한 모듈과 컨틀롤러 생성
              - nest g module health 
              - nest g controller health
            - health.module.ts에 imports 추가

                  @Module({
                    imports: [TerminusModule],
                    controllers: [HealthController]
                  })

            - health.controller.ts 에 의존성 주입
              - terminus에 제공하는 HealthCheckService 
              - typeORM 관련된 헬스체크를 위해 TypeOrmHealthIndicator 를 통해 db를 찔러봤을때 이상이 없으면 데이터를 받아보는 템플릿 같은

                    @Controller('health')
                    export class HealthController {
                        constructor(private health: HealthCheckService, private db: TypeOrmHealthIndicator) {}

                        @Get()
                        @HealthCheck()
                        @Public()
                        check() {
                            return this.health.check([
                                () => this.db.pingCheck('database')
                            ]);
                        }
                    }

        - CQRS 모델
          - CQRS 패턴에서는 **명령(command)**와 **조회(query)**를 명확하게 분리하여, 데이터 변경 로직과 읽기 전용 로직을 독립적으로 관리합니다.
            - 책임 분리: 데이터 변경과 조회의 로직을 분리함으로써 각각의 복잡도를 줄이고, 코드 유지보수성을 높일 수 있습니다.
            -  비즈니스 로직의 캡슐화: 커맨드 핸들러는 데이터 저장, 검증, 트랜잭션 관리 등의 비즈니스 로직을 한 곳에 집중시켜, 도메인 규칙을 명확하게 구현할 수 있게 합니다.
            -  테스트 용이성: 명령과 조회가 분리되어 있어, 각각을 독립적으로 테스트할 수 있으며, 부수효과를 관리하기 쉽습니다.
            -  확장성: 복잡한 비즈니스 로직이나 이벤트 기반 아키텍처, 분산 시스템 환경에서 커맨드와 쿼리의 분리는 시스템 확장을 보다 유연하게 만듭니다.
          - 데이터를 생성하는 명령과 조회하는 READ를 분리해서 확장성을 높이고 성능을 높히는
          - 조회시의 데이터 모델과 데이터를 생성하는 모델을 다르게 가져간다
          - 데이터를 생성하는 커맨드 구현
            - npm install @nestjs/cqrs@10
          - video.module.ts에 cqrs 모듈 imports에 추가
          - 커맨드 생성
            - video > command > create-video.command.ts

                    import { ICommand } from "@nestjs/cqrs";

                    export class CreateVideoCommand implements ICommand {
                        constructor(
                            readonly userId: string,
                            readonly title: string,
                            readonly mimetype: string,
                            readonly extension: string,
                            readonly buffer: Buffer
                        ) {}
                    }
          - video.controller.ts 리팩토링
            - 기존에는 service를 이용해서 create를 했지만 cqrs패턴을 이용하기 위해 command를 만들고 핸들링을 만든다
            - 리팩토링

                  @ApiBearerAuth()
                  @ApiPostResponse(CreateVideoResDto)
                  @Post()
                  upload(@Body() createVideoReqDto: CreateVideoReqDto, @User() user: UserAfterAuth) {
                    // return this.videoService.create();
                    const { title, video } = createVideoReqDto;
                    const command = new CreateVideoCommand(user.id, video.title,  'vidoe/mp4', 'mp4', Buffer.from(''));
                  }

          - 핸들러 구현
            - video > create-video.handler.ts

                    @Injectable()
                    @CommandHandler(CreateVideoCommand)
                    export class CreateVideoHandler implements ICommandHandler<CreateVideoCommand> {
                        constructor(private dataSource: DataSource) {}

                        async execute(command: CreateVideoCommand): Promise<Video> {
                            const { userId, title, mimetype, extension, buffer } = command;
                            const queryRunner = this.dataSource.createQueryRunner();
                            await queryRunner.startTransaction();
                            let error;

                            try{
                                const user = await queryRunner.manager.findOneBy(User, { id: userId});
                                const video = await queryRunner.manager.save(queryRunner.manager.create(Video, {title, mimetype, user}))

                                await this.uploadVideo(video.id, extension, buffer);
                                await queryRunner.commitTransaction();
                                
                                return video;
                            }catch(e) {
                                await queryRunner.rollbackTransaction();
                                error = e;
                            }finally{
                                await queryRunner.release();
                                if(error) throw error;
                            }
                        }

                        private async uploadVideo(id: string, extension: string, buffer: Buffer) {
                            console.log('upload Video');
                        }
                    }

            - video.module.ts providers에 위 핸들러 추가
              - providers: [VideoService, CreateVideoHandler],
            
            - video.controller.ts에 커맨드 버스 이용 및 핸들러를 이용
            
                    constructor(private readonly videoService: VideoService, private commandBus: CommandBus) {}

                    @ApiBearerAuth()
                    @ApiPostResponse(CreateVideoResDto)
                    @Post()
                    async upload(@Body() createVideoReqDto: CreateVideoReqDto, @User() user: UserAfterAuth): Promise<CreateVideoResDto> {
                      // return this.videoService.create();
                      const { title, video } = createVideoReqDto;
                      const command = new CreateVideoCommand(user.id, video.title,  'video/mp4', 'mp4', Buffer.from(''));
                      const {id} = await this.commandBus.execute(command);
                      return{ id, title };
                    }

          - 이벤트 및 이벤트 핸들러 구현
            - 비디오가 생성시 이벤트를 발생시켜 로그를 남겨본다
            - video > event > video-created.event.ts 생성

                  export class VideCreatedEvent implements IEvent {
                      constructor(readonly id: string) {}
                  }
                
            - video > video-created.handler.ts 생성

                  @Injectable()
                  @EventsHandler(VideoCreatedEvent)
                  export class VideoCreatedHandler implements IEventHandler<VideoCreatedEvent> {
                      handle(event: VideoCreatedEvent) {
                          console.info(`Video Created(id: ${event.id})`);
                      }
                  }

            - video.module.ts providers에 핸들러 추가
            - create-video.handler.ts에 추가 작업
              - EventBus를 이용하여 퍼블리싱 해줘야한다 이벤트가 발생한다
              - constructor(private dataSource: DataSource, private eventBus: EventBus) {} 추가
              
                      await this.uploadVideo(video.id, extension, buffer);
                      await queryRunner.commitTransaction();
                      this.eventBus.publish(new VideoCreatedEvent(video.id)); //추가
                      
            
          - 쿼리 구현
            - 쿼리는 커맨드와 반대로 데이터를 조회하는 용도로 사용
            - video > query > find-videos.query.ts 작성

                  export class FindVideosQuery implements IQuery {
                      constructor(readonly page: number, readonly size: number) {}
                  }

            - 핸들러 생성 find-videos.handler.ts

                  @Injectable()
                  @QueryHandler(FindVideosQuery)
                  export class FindVideosQueryHandler implements IQueryHandler<FindVideosQuery> {
                      constructor(@InjectRepository(Video) private videoRepository: Repository<Video>) {}

                      async execute({page, size}: FindVideosQuery): Promise<any> {
                          const videos = await this.videoRepository.find({ relations: ['user'], skip: (page - 1) * size, take: size});
                          return videos;
                      }
                  }

            - vidoe.module.ts providers에 위 핸들러 추가
            - video.controller.ts의 findAll 함수 리팩토링
              - 마찬가지로 service를 이용하는게 아닌 쿼리핸들러를 이용 QueryBus 이용

                    @ApiBearerAuth()
                    @ApiGetItemsResponse(FindVideoResDto)
                    @SkipThrottle()
                    @Get()
                    async findAll(@Query() { page, size }: PageReqDto): Promise<FindVideoResDto[]> {
                      // return this.videoService.findAll();
                      const findVideosQuery = new FindVideosQuery(page, size);
                      const videos = await this.queryBus.execute(findVideosQuery);
                      return videos.map((id, title, user) => {
                        return {
                          id,
                          title,
                          user: {
                            id: user.id,
                            email: user.email
                          }
                        }
                      })
                    }

        - 파일 업로드
          - video.controller.ts upload 함수 리팩토링 
            - 스웨거에서 폼데이터로 파일을 업로드 할 수 있도록 데코레이터 추가
              - @ApiConsumes('multipart/form-data')
            - 인터셉터 데코레이터 추가
              -  @UseInterceptors(FileInterceptor('video'))
            - nest에서 제공해주는 UploadedFile 데코레이터 활용

                  @UploadedFile(
                    new ParseFilePipeBuilder().addFileTypeValidator({
                      fileType: 'mp4'
                    })
                    .addMaxSizeValidator({
                      maxSize: 5 * 1024 * 1024
                    })
                    .build({
                      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
                    })
                  ) file: Express.Multer.File,

            - file을 통해 mimetype, originalname, buffer, extension등을 구한다
            - upload 함수 구현

                  private async uploadVideo(id: string, extension: string, buffer: Buffer) {
                      console.log('upload Video');
                      const filePath = join(process.cwd(), 'video-storage', `${id}.${extension}`);
                      await writeFile(filePath, buffer);
                  }

            - 다운로드 함수 구현

                  async download(id: string): Promise<{ stream: ReadStream; mimetype: string; size: number }> {
                    const video = await this.videoRepository.findOneBy({ id });
                    if (!video) throw new NotFoundException('No video');

                    await this.videoRepository.update({ id }, { downloadCnt: () => 'download_cnt + 1' });

                    const { mimetype } = video;
                    const extension = mimetype.split('/')[1];
                    const videoPath = join(process.cwd(), 'video-storage', `${id}.${extension}`);
                    const { size } = await stat(videoPath);
                    const stream = createReadStream(videoPath);
                    return { stream, mimetype, size };
                  }


            

          - 스케줄러 구현
            - 스케줄 모듈 설치
              - npm i @nestjs/schedule
              - npm i --save-dev @types/cron

            - analytics.module.ts에 스케줄모듈과 비디오 모듈 imports
              - imports: [ScheduleModule.forRoot(), VideoModule],

            - video.module.ts에 비디오 서비스 exports
              - exports: [VideoService]

            - analytics.service.ts 구현
              - 비디오 서비스 생성자
              - 크론잡 핸들러 등록해보기 비디오 목록을 5개만 가져오는

                    @Cron(CronExpression.EVERY_MINUTE)
                    async handleEmailCron() {
                        Logger.log('Email task called');

                        const videos = await this.videoService.findTop5Download();
                    }

              - 이슈 서버 실행시 에러가 나길래 보니 node버전 문제로 main.ts 최상단에 추가

                    // main.ts 파일의 가장 위에 추가
                    global.crypto = require('crypto');

            
            - 배치를 통한 메일 전송 구현
              - 필요 모듈 설치
                - npm i @nestjs-modules/mailer nodemailer
                  - 버전 문제시 npm install @nestjs-modules/mailer nodemailer --legacy-peer-deps(비추)
                - npm i --save-dev @types/nodemailer
                  - 버전 문제시 npm install --save-dev @types/nodemailer --legacy-peer-deps (비추)
              - - email module 및 service 설치
                 - nest g mo email
                 - nest g s email
                - email.module.ts에 imports

                        imports: [
                          MailerModule.forRootAsync({
                            inject: [ConfigService],
                            useFactory: (configService: ConfigService) => ({
                              transport: {
                                host: 'smtp.gmail.com',
                                port: 587,
                                auth: {
                                  user: configService.get('email'),
                                  pass: configService.get('email.pass')
                                }
                              }
                            }),
                          })
                        ],

                - config 설정 config> email.config.ts 생성

                      export default registerAs('email', () => ({
                          user: process.env.EMAIL_USER,
                          pass: process.env.EMAIL_PASS,
                      }))

                - app.module.ts에 이메일 콘피그 load 선언
                - email.service.ts 구현
                  - email.module.ts에 이메일 서비스 exports 추가

                        @Injectable()
                        export class EmailService {
                            constructor(private readonly mailerService: MailerService) {}

                            async send(videos: Video[]) {
                                const data = videos.map((id, title, downloadCnt) => {
                                    return `<tr><td>${id}</td><td>${title}</td><td>${downloadCnt}</td></tr>`;
                                })

                                await this.mailerService.sendMail({
                                    from: 'gamars803@gmail.com',
                                    to: 'gamars80@gmail.com',
                                    subject:'gamel send email test',
                                    html:`
                                    <table style="border 1px solid black; width: 60%, margin:auto, text-align:center">
                                    <tr><th>id</th><th>title</th><th>download</th></tr>
                                    ${data}</table>
                                    `,
                                })
                            }
                        }

                  - analytics.module.ts에 EmailModule imports 추가
                  - analytics.service.ts에 EmailService 주입
                    - handleEmailCron() 함수에 이메일 전송하기 추가
                      - this.emailService.send(videos);
                


          - test code 작성해보기
            - 비디오 생성 eventBus가 잘 생성되서 비디오가 create되는지 작성해보기

                    
                    class QueryRunner {
                      manager: Manager;
                      constructor(manager: Manager) {
                        this.manager = manager;
                      }
                      async startTransaction() {
                        return;
                      }
                      async commitTransaction() {
                        return;
                      }
                      async rollbackTransaction() {
                        return;
                      }
                      async release() {
                        return;
                      }
                    }

                    class Manager {
                      async findOneBy(user: User, where: { id: string }) {
                        return;
                      }
                      async create(video: Video, options: { title: string; mimetype: string; user: User }) {
                        return video;
                      }
                      async save(video: Video) {
                        return video;
                      }
                    }

                    describe('CreateVideoHandler', () => {
                      let createVideoHandler: CreateVideoHandler;
                      let eventBus: jest.Mocked<EventBus>;

                      const videoId = '3c947f7c-b67a-4890-bd7c-e84a712492d0';

                      beforeAll(async () => {
                        const module = await Test.createTestingModule({
                          providers: [
                            CreateVideoHandler,
                            {
                              provide: DataSource,
                              useValue: {
                                createQueryRunner: jest.fn().mockReturnValue(new QueryRunner(new Manager())),
                              },
                            },
                            {
                              provide: EventBus,
                              useValue: {
                                publish: jest.fn(),
                              },
                            },
                          ],
                        }).compile();

                        createVideoHandler = module.get(CreateVideoHandler);
                        eventBus = module.get(EventBus);
                      });

                      describe('execute', () => {
                        it('should execute CreateVideoHandler', async () => {
                          // Given

                          // When
                          await createVideoHandler.execute(new CreateVideoCommand(videoId, 'test', 'video/mp4', 'mp4', Buffer.from('')));

                          // Then
                          expect(eventBus.publish).toBeCalledTimes(1);
                        });
                      });
                    });

          - 테스트 커버리지
            - npm run test:cov 실행하면 작성한 테스트 코드들에 대해 얼마나 커버가 되어있는지 수치를 분석하고
            - 프로젝트 coverage 폴더에 report를 html로도 생성해줘서 브라우저에서도 한눈에 확인할 수 있다.

          

                


        

    


            

            


            




            




          

                  


          









      

        



      





    
    




