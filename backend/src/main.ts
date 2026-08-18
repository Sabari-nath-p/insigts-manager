import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const apiPrefix = configService.get<string>('apiPrefix') || 'api';
  app.setGlobalPrefix(apiPrefix);

  app.enableCors({
    origin: configService.get<string>('corsOrigin'),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // Prisma has no equivalent of TypeORM's column-level `select: false` + @Exclude() pattern —
  // sensitive fields (User.password, file blobs) are kept out of responses by never selecting
  // them in the first place (explicit `select` on every general-purpose query), enforced in each
  // service rather than via a global response-stripping interceptor.

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Insights API')
    .setDescription('Company Management Tool - REST API documentation')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document);

  const port = configService.get<number>('port') || 3001;
  await app.listen(port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`Insights API running on http://localhost:${port}/${apiPrefix}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger docs at http://localhost:${port}/${apiPrefix}/docs`);
}
bootstrap();
