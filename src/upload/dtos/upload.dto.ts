import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class UploadDTO {
  @ApiProperty({ example: '10-24-2025/images/conversations/1' })
  @IsString()
  @IsNotEmpty()
  path: string;
}
