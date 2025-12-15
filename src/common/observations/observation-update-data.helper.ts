import { Prisma } from '@prisma/client';
import { ObservationUpdateDtoBase } from './base-observation.service';

export function buildObservationUpdateData<
  TUpdateDto extends ObservationUpdateDtoBase,
>(updateDto: TUpdateDto): Record<string, unknown> {
  const updateData: Record<string, unknown> = {};

  if (updateDto.observation !== undefined) {
    updateData.observation = updateDto.observation;
  }

  if (updateDto.fileIds !== undefined) {
    updateData.fileIds =
      updateDto.fileIds && updateDto.fileIds.length > 0
        ? JSON.stringify(updateDto.fileIds)
        : Prisma.JsonNull;
  }

  return updateData;
}
