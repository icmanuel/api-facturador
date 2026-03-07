import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Certificate } from '../../entities/certificate.entity';
import { CertificatesController } from './certificates.controller';
import { CertificatesService } from './certificates.service';
import { CryptoService } from '../../common/services/crypto.service';

@Module({
  imports: [TypeOrmModule.forFeature([Certificate])],
  controllers: [CertificatesController],
  providers: [CertificatesService, CryptoService],
  exports: [CertificatesService, CryptoService],
})
export class CertificatesModule {}
