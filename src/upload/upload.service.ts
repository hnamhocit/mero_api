import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { BadRequestException, Injectable } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';

import { PrismaService } from 'src/prisma/prisma.service';
import { s3 } from 'src/common/config';

@Injectable()
export class UploadService {
  constructor(private readonly prisma: PrismaService) {}

  private getDownloadURL(key: string) {
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  }

  async uploadFile(path: string, file: Express.Multer.File) {
    const ext = file.originalname.split('.').pop();
    const key = `${path}/${uuidv4()}.${ext}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3.send(command);

    return {
      url: this.getDownloadURL(key),
      key,
    };
  }

  uploadFiles = async (path: string, files: Express.Multer.File[]) => {
    const results = await Promise.all(
      files.map(async (file) => {
        const fileId = uuidv4();
        const ext = file.originalname.split('.').pop();
        const key = `${path}/${fileId}.${ext}`;

        const command = new PutObjectCommand({
          Bucket: process.env.AWS_BUCKET_NAME!,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        });

        await s3.send(command);

        return { key, url: this.getDownloadURL(key) };
      }),
    );

    return results;
  };

  deleteFile = async (key: string) => {
    const command = new DeleteObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
    });

    await s3.send(command);

    return null;
  };
}
