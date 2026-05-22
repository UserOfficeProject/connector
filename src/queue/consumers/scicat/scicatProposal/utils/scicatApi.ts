import { logger } from '@user-office-software/duo-logger';

import { InstrumentDto } from '../../../../../models/ProposalMessage';
import { UOExperimentDto } from '../../../../../services/userOfficeApi/type/uoExperiment.type';
import {
  UOInstrument,
  UOProposalDto,
} from '../../../../../services/userOfficeApi/type/uoProposal.type';
import {
  getCreateScicatExperimentDto,
  getUpdateScicatExperimentDto,
} from '../mappers/uoToScicatExperiment.mapper';
import {
  getCreateScicatProposalDto,
  getUpdateScicatProposalDto,
} from '../mappers/uoToScicatProposal.mapper';
import {
  CreateScicatProposalDto,
  CreateScicatSampleDto,
  UpdateScicatProposalDto,
  UpdateScicatSampleDto,
} from '../type/scicatProposal.type';

class ScicatApi {
  readonly baseUrl = process.env.SCICAT_BASE_URL;
  readonly scicatToken = process.env.SCICAT_JWT;
  readonly serviceUsername: string;

  constructor() {
    if (!this.baseUrl) {
      throw new Error('SCICAT_BASE_URL is not defined');
    }

    if (!this.scicatToken) {
      throw new Error('SCICAT_JWT is not defined');
    }

    this.serviceUsername = this.getServiceUsername(this.scicatToken);

    logger.logInfo('ScicatApi initialized', {
      baseUrl: this.baseUrl,
      serviceUsername: this.serviceUsername,
    });
  }

  private getServiceUsername(token: string): string {
    try {
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString()
      );
      if (!payload.username) {
        throw new Error('Username not found in token payload');
      }

      return payload.username;
    } catch {
      throw new Error('Failed to decode JWT token');
    }
  }

  async request<TResponse>(
    url: string,
    config: RequestInit
  ): Promise<TResponse> {
    const response = await fetch(url, config);

    const text = await response.text();

    if (!response.ok) {
      throw new Error(text || `HTTP error: ${response.status}`);
    }

    if (!text) return undefined as TResponse;

    return JSON.parse(text) as TResponse;
  }

  async getInstrumentIds(
    instruments: UOInstrument | UOInstrument[]
  ): Promise<string[]> {
    const sciCatAccessToken = this.scicatToken;
    const instrumentArray = Array.isArray(instruments)
      ? instruments
      : [instruments];
    const instrumentNames = instrumentArray.map((inst) => inst.shortCode);

    const instrumentIds = [];

    for (const name of instrumentNames) {
      const instrumentNameLowerCase = name.toLowerCase();

      const filterString = JSON.stringify({
        where: { name: { ilike: instrumentNameLowerCase } },
      });

      const url = `${this.baseUrl}/Instruments?filter=${encodeURIComponent(filterString)}`;

      try {
        const res = await this.request<InstrumentDto[]>(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sciCatAccessToken}`,
          },
        });
        if (res[0].pid) {
          instrumentIds.push(res[0].pid);
        }
      } catch (error) {
        logger.logError(
          `Error fetching instrument ID from scicat for ${name}`,
          {
            error,
          }
        );
      }
    }

    return instrumentIds;
  }

  async checkProposalExists(proposalId: string): Promise<boolean> {
    const url = `${this.baseUrl}/Proposals/${proposalId}`;
    const sciCatAccessToken = this.scicatToken;
    const response = await this.request<string>(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sciCatAccessToken}`,
      },
    }).catch((error) => {
      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.statusCode === 404) {
          return false;
        }
      } catch (reason) {
        logger.logError('Error parsing error message', {
          error,
          reason,
        });
      }
      throw error;
    });

    return Boolean(response);
  }

  async findSampleByLookup(
    sampleLookup: string
  ): Promise<UpdateScicatSampleDto | null> {
    const sciCatAccessToken = this.scicatToken;
    const filter = JSON.stringify({
      where: {
        'sampleCharacteristics.uos_sample_lookup.value': sampleLookup,
      },
    });

    const url = `${this.baseUrl}/Samples/findOne?filter=${encodeURIComponent(filter)}`;

    const response = await this.request<UpdateScicatSampleDto>(url, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sciCatAccessToken}`,
      },
    }).catch((error) => {
      try {
        const parsedError = JSON.parse(error.message);
        if (parsedError.statusCode === 404) return null;
      } catch (reason) {
        logger.logError('Error parsing error message', { error, reason });
      }
      throw error;
    });

    return response ?? null;
  }

  async createProposal(UOProposal: UOProposalDto) {
    const url = `${this.baseUrl}/Proposals`;
    const sciCatAccessToken = this.scicatToken;
    // RabbitMQ message only provides shortCodes (instrument names).
    // To persist proposals with proper references, we resolve those shortCodes to
    // actual Instrument IDs from SciCat and store the instrumentIds in the record.
    const scicatInstrumentIds = await this.getInstrumentIds(
      UOProposal.instruments
    );
    const createProposalDto = getCreateScicatProposalDto(
      UOProposal,
      scicatInstrumentIds
    );

    const createProposalResponse = await this.request<CreateScicatProposalDto>(
      url,
      {
        method: 'POST',
        body: JSON.stringify(createProposalDto),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sciCatAccessToken}`,
        },
      }
    );

    logger.logInfo('Proposal created in SciCat', {
      url,
      proposalId: createProposalDto.proposalId,
      response: createProposalResponse,
    });
  }

  async updateProposal(UOProposal: UOProposalDto) {
    const url = `${this.baseUrl}/Proposals/${UOProposal.proposalId}`;
    const sciCatAccessToken = this.scicatToken;
    // RabbitMQ message only provides shortCodes (instrument names).
    // To persist proposals with proper references, we resolve those shortCodes to
    // actual Instrument IDs from SciCat and store the instrumentIds in the record.
    const scicatInstrumentIds = await this.getInstrumentIds(
      UOProposal.instruments
    );
    const updateProposalDto = getUpdateScicatProposalDto(
      UOProposal,
      scicatInstrumentIds
    );

    const updateProposalResponse = await this.request<UpdateScicatProposalDto>(
      url,
      {
        method: 'PATCH',
        body: JSON.stringify(updateProposalDto),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sciCatAccessToken}`,
        },
      }
    );

    logger.logInfo('Proposal updated in SciCat', {
      url,
      proposalId: UOProposal.proposalId,
      response: updateProposalResponse,
    });
  }

  async createExperiment(UOExperiment: UOExperimentDto) {
    const url = `${this.baseUrl}/Proposals`;
    const sciCatAccessToken = this.scicatToken;
    // RabbitMQ message only provides shortCodes (instrument names).
    // To persist proposals with proper references, we resolve those shortCodes to
    // actual Instrument IDs from SciCat and store the instrumentIds in the record.
    const scicatInstrumentIds = await this.getInstrumentIds(
      UOExperiment.instrument
    );
    const createExperimentDto = getCreateScicatExperimentDto(
      UOExperiment,
      scicatInstrumentIds
    );

    const createExperimentResponse =
      await this.request<CreateScicatProposalDto>(url, {
        method: 'POST',
        body: JSON.stringify(createExperimentDto),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sciCatAccessToken}`,
        },
      });

    // NOTE: UOExperiment.experimentId = proposalId in SciCat for experiments
    logger.logInfo('Experiment created in SciCat', {
      url,
      proposalId: UOExperiment.experimentId,
      response: createExperimentResponse,
    });
  }

  async updateExperiment(UOExperiment: UOExperimentDto) {
    const url = `${this.baseUrl}/Proposals/${UOExperiment.experimentId}`;
    const sciCatAccessToken = this.scicatToken;
    // RabbitMQ message only provides shortCodes (instrument names).
    // To persist proposals with proper references, we resolve those shortCodes to
    // actual Instrument IDs from SciCat and store the instrumentIds in the record.
    const scicatInstrumentIds = await this.getInstrumentIds(
      UOExperiment.instrument
    );
    const updateExperimentDto = getUpdateScicatExperimentDto(
      UOExperiment,
      scicatInstrumentIds
    );

    const updateExperimentResponse =
      await this.request<UpdateScicatProposalDto>(url, {
        method: 'PATCH',
        body: JSON.stringify(updateExperimentDto),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sciCatAccessToken}`,
        },
      });

    // NOTE: UOExperiment.experimentId = proposalId in SciCat for experiments
    logger.logInfo('Experiment updated in SciCat', {
      url,
      proposalId: UOExperiment.experimentId,
      response: updateExperimentResponse,
    });
  }

  async createSample(dto: CreateScicatSampleDto): Promise<void> {
    const sciCatAccessToken = this.scicatToken;
    const url = `${this.baseUrl}/Samples`;

    const createSampleResponse = await this.request<CreateScicatSampleDto>(
      url,
      {
        method: 'POST',
        body: JSON.stringify(dto),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sciCatAccessToken}`,
        },
      }
    );

    logger.logInfo('Sample created in SciCat', {
      url,
      response: createSampleResponse,
    });
  }

  async updateSample(
    sampleId: string,
    dto: UpdateScicatSampleDto
  ): Promise<void> {
    const sciCatAccessToken = this.scicatToken;

    const url = `${this.baseUrl}/Samples/${sampleId}`;

    await this.request<UpdateScicatSampleDto>(url, {
      method: 'PATCH',
      body: JSON.stringify(dto),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${sciCatAccessToken}`,
      },
    });

    logger.logInfo('Sample updated in SciCat', { sampleId });
  }
}

export const scicatApi = new ScicatApi();
