import {
  Controller,
  Get,
  Body,
  Patch,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/legged-in.guard';
import { ProfileResponse } from './response/profile.response';
import { BaseResponse } from 'src/common/interface/base-response.interface';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBody, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';

type RequestWithUser = {
  id: number;
};

@Controller('profile')
@UseGuards(JwtAuthGuard)
@ApiTags('Profile')
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  async findMe(
    @Req() req: Request & { user: RequestWithUser },
  ): Promise<BaseResponse<ProfileResponse>> {
    return {
      message: 'Profile fetched successfully',
      data: await this.profileService.findOne(req.user.id),
    };
  }

  @Patch()
  @ApiOperation({ summary: 'Update profile (supports avatar upload)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'John Updated', nullable: true },
        email: { type: 'string', example: 'john.new@example.com', nullable: true },
        phone_number: { type: 'string', example: '089998887770', nullable: true },
        password: { type: 'string', example: 'newpassword123', nullable: true },
        avatar: { type: 'string', format: 'binary', nullable: true },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: diskStorage({
        destination: './public/uploads/photos',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
          return cb(new Error('Invalid file type'), false);
        }
        cb(null, true);
      },
    }),
  )
  async update(
    @Req() req: Request & { user: RequestWithUser },
    @Body() updateProfileDto: UpdateProfileDto,
    @UploadedFile() avatar: Express.Multer.File | undefined,
  ): Promise<BaseResponse<ProfileResponse>> {
    return {
      message: 'Profile updated successfully',
      data: await this.profileService.update(
        req.user.id,
        updateProfileDto,
        avatar?.filename ?? null,
      ),
    };
  }
}
