import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';

import { UploadService } from './upload.service';
import { UploadDTO } from './dtos';
import { JwtAuthGuard } from 'src/common/guards';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('file')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadDTO,
  ) {
    return this.uploadService.uploadFile(body.path, file);
  }

  @Post('files')
  @UseInterceptors(FilesInterceptor('files'))
  uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: UploadDTO,
  ) {
    return this.uploadService.uploadFiles(body.path, files);
  }

  @Delete(':key')
  delete(@Param('key') key: string) {
    return this.uploadService.deleteFile(key);
  }
}
