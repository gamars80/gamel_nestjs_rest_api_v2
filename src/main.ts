import { SentryInterceptor } from './common/interceptor/sentry.interceptor';
import { Logger } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerCustomOptions, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { WinstonModule, utilities } from 'nest-winston';
import * as winston from 'winston'; 
import { TransformInterceptor } from './common/interceptor/transform.interceptor';
import { ConfigService } from '@nestjs/config';
import * as basicAuth from 'express-basic-auth'

async function bootstrap() {
  const port = 3000;
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
  

  // ValidationPipe 전역 적용
  app.useGlobalPipes(
    new ValidationPipe({
      // class-transformer 적용
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new SentryInterceptor(), new TransformInterceptor());

  await app.listen(port);
  Logger.log(`STAGE: ${process.env.STAGE}`);
  Logger.log(`listening on port ${port}`);
}
bootstrap();
