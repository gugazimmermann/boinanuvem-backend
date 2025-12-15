import {
  Body,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { GetCurrentUser } from '../../auth/decorators/current-user.decorator';
import type { CurrentUser } from '../../auth/decorators/current-user.decorator';

export interface BaseObservationControllerConfig<
  TCreateDto,
  TUpdateDto,
  TResponse,
> {
  createPath: string;
  listPath: string;
  getPath: string;
  updatePath: string;
  deletePath: string;

  createSummary: string;
  listSummary: string;
  getSummary: string;
  updateSummary: string;
  deleteSummary: string;

  subjectParamName: string;

  // Swagger DTO types can be passed from concrete controllers if needed
  createDtoType?: new () => TCreateDto;
  updateDtoType?: new () => TUpdateDto;
  responseDtoType?: new () => TResponse;
}

export abstract class BaseObservationController<
  TCreateDto,
  TUpdateDto,
  TResponse,
> {
  protected constructor(
    protected readonly service: {
      create(
        userId: string,
        subjectId: string,
        createDto: TCreateDto,
      ): Promise<TResponse>;
      findAllBySubjectId(
        userId: string,
        subjectId: string,
      ): Promise<TResponse[]>;
      findOne(userId: string, id: string): Promise<TResponse>;
      update(
        userId: string,
        id: string,
        updateDto: TUpdateDto,
      ): Promise<TResponse>;
      remove(userId: string, id: string): Promise<{ message: string }>;
    },
    protected readonly config: BaseObservationControllerConfig<
      TCreateDto,
      TUpdateDto,
      TResponse
    >,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async baseCreate(
    @GetCurrentUser() user: CurrentUser,
    @Param() params: Record<string, string>,
    @Body() createDto: TCreateDto,
  ) {
    const subjectId = params[this.config.subjectParamName];
    return this.service.create(user.id, subjectId, createDto);
  }

  @Get()
  async baseFindAll(
    @GetCurrentUser() user: CurrentUser,
    @Param() params: Record<string, string>,
  ) {
    const subjectId = params[this.config.subjectParamName];
    return this.service.findAllBySubjectId(user.id, subjectId);
  }

  @Get(':id')
  async baseFindOne(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.service.findOne(user.id, id);
  }

  @Put(':id')
  async baseUpdate(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
    @Body() updateDto: TUpdateDto,
  ) {
    return this.service.update(user.id, id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async baseRemove(
    @GetCurrentUser() user: CurrentUser,
    @Param('id') id: string,
  ) {
    return this.service.remove(user.id, id);
  }
}
