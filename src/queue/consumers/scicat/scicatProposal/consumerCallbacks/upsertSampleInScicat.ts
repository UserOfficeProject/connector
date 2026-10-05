import { logger } from '@user-office-software/duo-logger';

import { UOExperimentDto } from '../../../../../services/userOfficeApi/type/uoExperiment.type';
import {
  getCreateScicatSampleDto,
  getUpdateScicatSampleDto,
} from '../mappers/uoToScicatExperiment.mapper';
import { scicatApi } from '../utils/scicatApi';

export const upsertSamplesInScicat = async (experiment: UOExperimentDto) => {
  const samples = experiment.experimentSafety?.samples ?? [];

  for (const sample of samples) {
    const sampleLookup = `${experiment.experimentId}-${sample.sampleId}`;
    const existingSample = await scicatApi.findSampleByLookup(sampleLookup);

    if (existingSample) {
      const existingHash =
        existingSample.sampleCharacteristics?.['sample_hash']?.value;
      const dto = getUpdateScicatSampleDto(sample, experiment);
      const newHash = dto.sampleCharacteristics?.['sample_hash']?.value;

      if (existingHash === newHash) {
        continue;
      }

      logger.logInfo('Sample changed, updating...', {
        sampleId: existingSample.sampleId,
      });
      await scicatApi.updateSample(existingSample.sampleId!, dto);
    } else {
      logger.logInfo('Sample does not exist yet, creating...', {});
      const dto = getCreateScicatSampleDto(sample, experiment);
      await scicatApi.createSample(dto);
    }
  }
};
