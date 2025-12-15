export function parseObservationFileIds(
  fileIds: unknown,
): string[] | undefined {
  if (!fileIds) {
    return undefined;
  }

  if (typeof fileIds === 'string') {
    try {
      return JSON.parse(fileIds) as string[];
    } catch {
      return [];
    }
  }

  if (typeof fileIds === 'object') {
    return fileIds as string[];
  }

  return undefined;
}
