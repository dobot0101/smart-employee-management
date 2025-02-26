import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SystemAdminService } from './users/system-admin.service';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS 설정이 필요하다면
  app.enableCors();

  // API 글로벌 프리픽스가 필요하다면 (예: /api)
  // app.setGlobalPrefix('api');

  // 시스템 어드민 계정 생성 확인
  const systemAdminService = app.get(SystemAdminService);
  await systemAdminService.ensureSystemAdminExists();

  // Swagger 설정 추가
  const config = new DocumentBuilder()
    .setTitle('API 문서')
    .setDescription('API 설명')
    .setVersion('1.0')
    // .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
bootstrap(); 