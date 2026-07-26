import {
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsInt,
  Matches,
} from 'class-validator';

export class CreateStreamDto {
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug must be lowercase alphanumeric + dash',
  })
  slug?: string;
}

export class UpdateStreamDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  slug?: string;
}

export class StartPkDto {
  @IsInt()
  streamAId!: number;

  @IsInt()
  streamBId!: number;
}
