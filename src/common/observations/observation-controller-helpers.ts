import { applyDecorators, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../auth/guards/permissions.guard';

export const ACCESS_DENIED_RESPONSE = {
  status: 403,
  description: 'Access denied',
} as const;

export const OBSERVATION_NOT_FOUND_RESPONSE = {
  status: 404,
  description: 'Observation not found',
} as const;

export const OBSERVATION_DELETED_SUCCESS_RESPONSE = {
  status: 200,
  description: 'Observation deleted successfully',
} as const;

export function UseObservationGuards() {
  return applyDecorators(
    UseGuards(ThrottlerGuard, JwtAuthGuard, PermissionsGuard),
  );
}
