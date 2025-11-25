import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class HealthCheckResponseDto {
  @ApiProperty({
    description: 'Overall health status',
    enum: ['ok', 'error', 'shutting_down'],
  })
  status!: 'ok' | 'error' | 'shutting_down';

  @ApiPropertyOptional({
    description: 'Information about healthy services',
    type: 'object',
    additionalProperties: true,
  })
  info?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Information about unhealthy services',
    type: 'object',
    additionalProperties: true,
  })
  error?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Detailed information about all services',
    type: 'object',
    additionalProperties: true,
  })
  details?: Record<string, any>;
}
