/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access */
import { ObservationResponseBase } from './base-observation.service';
import { parseObservationFileIds } from './observation-utils.helper';

export function buildObservationResponse<
  TResponse extends ObservationResponseBase,
>(
  observation: {
    id: string;
    observation: string;
    fileIds: unknown;
    companyId: string;
    createdBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  } & Record<string, unknown>,
  subjectKey: string,
): TResponse {
  const fileIds = parseObservationFileIds(observation.fileIds);

  const result: any = {
    id: observation.id,
    [subjectKey]: (observation as any)[subjectKey],
    observation: observation.observation,
    companyId: observation.companyId,
    createdAt: observation.createdAt,
    updatedAt: observation.updatedAt,
  };

  if (fileIds) {
    result.fileIds = fileIds;
  }

  if (observation.createdBy) {
    result.createdBy = observation.createdBy;
  }

  return result as TResponse;
}
