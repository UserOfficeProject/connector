import { logger } from '@user-office-software/duo-logger';
import { MessageBroker } from '@user-office-software/duo-message-broker';
import { MessageProperties } from 'amqplib';
import { container } from 'tsyringe';

import type { SyncProposalQueueConsumer as VisaConsumer } from './syncProposalQueueConsumer';
import { Tokens } from '../../../../config/Tokens';
import { ExperimentDataSource } from '../../../../datasources/visa/ExperimentDataSource';
import { ExperimentUserDataSource } from '../../../../datasources/visa/ExperimentUserDataSource';
import { InstrumentDataSource } from '../../../../datasources/visa/InstrumentDataSource';
import { ProposalDataSource } from '../../../../datasources/visa/ProposalDataSource';
import { UserDataSource } from '../../../../datasources/visa/UserDataSource';
import { Event } from '../../../../models/Event';
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import {
  Experiment,
  Instrument,
  Proposal,
  User,
} from '../../../../models/Visa';
import { VisitMessage } from '../../oneidentity/utils/interfaces/VisitMessage';
import { QueueConsumer } from '../../QueueConsumer';
import { ProposalUser } from '../../scicat/scicatProposal/dto';

jest.mock('@user-office-software/duo-logger');
jest.mock('../../QueueConsumer');

const proposalDataSource: jest.Mocked<ProposalDataSource> = {
  get: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
const experimentDataSource: jest.Mocked<ExperimentDataSource> = {
  getByProposalId: jest.fn(),
  create: jest.fn(),
};
const experimentUserDataSource: jest.Mocked<ExperimentUserDataSource> = {
  create: jest.fn(),
  delete: jest.fn(),
  getAllUsersByExperimentId: jest.fn(),
};
const instrumentDataSource: jest.Mocked<InstrumentDataSource> = {
  get: jest.fn(),
  getByShortCode: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};
const userDataSource: jest.Mocked<UserDataSource> = {
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

function proposalUser(id: number, oidcSub: string): ProposalUser {
  return {
    id,
    oidcSub,
    firstName: 'First',
    lastName: 'Last',
    email: `${oidcSub}@EXAMPLE.ORG`,
    institution: { id: 1, name: 'Institution', verified: true },
  };
}

function visaUser(oidcSub: string): User {
  return new User(oidcSub, '', `${oidcSub}@example.org`, '', '', '1', '', 1);
}

function proposalMessage(): ProposalMessageData {
  return {
    proposalPk: 42,
    shortCode: 'P42',
    title: 'Proposal',
    abstract: 'Abstract',
    callId: 1,
    submitted: true,
    newStatus: 'ACCEPTED',
    instruments: [{ id: 1, shortCode: 'INST', allocatedTime: 1 }],
    proposer: proposalUser(1, 'PROPOSER'),
    members: [proposalUser(2, 'MEMBER')],
    dataAccessUsers: [proposalUser(3, 'DATA')],
    visitors: [proposalUser(4, 'VISITOR')],
  };
}

function visitMessage(proposal = proposalMessage()) {
  return {
    id: 'visit-id',
    visitorId: 'VISITOR',
    startAt: '2026-11-01T00:00:00Z',
    endAt: '2026-11-02T00:00:00Z',
    proposal,
  } satisfies VisitMessage;
}

describe('Visa SyncProposalQueueConsumer', () => {
  let SyncProposalQueueConsumer: typeof VisaConsumer;
  let consumer: VisaConsumer;
  const properties = {} as MessageProperties;
  const visaProposal = new Proposal(42, 'P42', '', 'Abstract', 'Proposal');
  const experiment = new Experiment('42', '', '', 1, 42);
  const originalStatuses = process.env.VISA_SYNCING_TRIGGERING_STATUSES;

  beforeAll(() => {
    // Load the consumer with its status configuration, which is read at import time.
    process.env.VISA_SYNCING_TRIGGERING_STATUSES = 'ACCEPTED';
    ({ SyncProposalQueueConsumer } = require('./syncProposalQueueConsumer'));
  });

  afterAll(() => {
    if (originalStatuses === undefined) {
      delete process.env.VISA_SYNCING_TRIGGERING_STATUSES;
    } else {
      process.env.VISA_SYNCING_TRIGGERING_STATUSES = originalStatuses;
    }
  });

  beforeEach(() => {
    jest.resetAllMocks();
    jest.spyOn(QueueConsumer.prototype, 'start').mockResolvedValue();
    container.registerInstance(
      Tokens.VisaProposalDataSource,
      proposalDataSource
    );
    container.registerInstance(
      Tokens.VisaExperimentDataSource,
      experimentDataSource
    );
    container.registerInstance(
      Tokens.VisaExperimentUserDataSource,
      experimentUserDataSource
    );
    container.registerInstance(
      Tokens.VisaInstrumentDataSource,
      instrumentDataSource
    );
    container.registerInstance(Tokens.VisaUserDataSource, userDataSource);
    proposalDataSource.get.mockResolvedValue(visaProposal);
    proposalDataSource.create.mockResolvedValue(visaProposal);
    experimentDataSource.getByProposalId.mockResolvedValue(experiment);
    experimentDataSource.create.mockResolvedValue(experiment);
    instrumentDataSource.getByShortCode.mockResolvedValue(
      new Instrument(1, 'INST', 'INST')
    );
    userDataSource.create.mockImplementation(async (user) =>
      visaUser(user.oidcSub)
    );
    experimentUserDataSource.getAllUsersByExperimentId.mockResolvedValue([
      ...['proposer', 'member', 'data', 'visitor', 'stale'].map(visaUser),
    ]);
    consumer = new SyncProposalQueueConsumer({} as MessageBroker);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses the configured queue and exchange names', () => {
    jest.replaceProperty(process, 'env', {
      ...process.env,
      VISA_QUEUE_NAME: 'visa-queue',
      USER_OFFICE_CORE_EXCHANGE_NAME: 'user-office-exchange',
    });

    expect(consumer.getQueueName()).toBe('visa-queue');
    expect(consumer.getExchangeName()).toBe('user-office-exchange');
  });

  it('serializes membership reconciliation', () => {
    expect(SyncProposalQueueConsumer.prototype['getPrefetch']()).toBe(1);
  });

  it.each([Event.VISIT_CREATED, Event.VISIT_UPDATED, Event.VISIT_DELETED])(
    'reconciles all current members on %s without requiring a proposal status',
    async (event) => {
      const message = visitMessage();
      delete message.proposal.newStatus;

      await consumer.onMessage(event, message, properties);

      expect(proposalDataSource.create).not.toHaveBeenCalled();
      expect(
        userDataSource.create.mock.calls.map(([user]) => user.oidcSub)
      ).toEqual(['proposer', 'member', 'data', 'visitor']);
      expect(userDataSource.create).toHaveBeenCalledWith(
        expect.objectContaining({
          oidcSub: 'visitor',
          email: 'visitor@example.org',
        })
      );
      expect(experimentUserDataSource.create).toHaveBeenCalledWith({
        experimentId: '42',
        userId: 'visitor',
      });
      expect(experimentUserDataSource.create).toHaveBeenCalledTimes(4);
      expect(experimentUserDataSource.delete).toHaveBeenCalledTimes(1);
      expect(experimentUserDataSource.delete).toHaveBeenCalledWith({
        experimentId: '42',
        userId: 'stale',
      });
    }
  );

  it('removes a deleted visitor who no longer belongs to the proposal', async () => {
    const proposal = proposalMessage();
    proposal.visitors = [];

    await consumer.onMessage(
      Event.VISIT_DELETED,
      visitMessage(proposal),
      properties
    );

    expect(experimentUserDataSource.delete).toHaveBeenCalledWith({
      experimentId: '42',
      userId: 'visitor',
    });
  });

  it.each(['proposer', 'members', 'dataAccessUsers'] as const)(
    'retains a deleted visitor who still belongs through %s',
    async (role) => {
      const proposal = proposalMessage();
      const visitor = proposalUser(4, 'VISITOR');
      if (role === 'proposer') {
        proposal.proposer = visitor;
      } else {
        proposal[role].push(visitor);
      }
      proposal.visitors = [];

      await consumer.onMessage(
        Event.VISIT_DELETED,
        visitMessage(proposal),
        properties
      );

      expect(experimentUserDataSource.create).toHaveBeenCalledWith({
        experimentId: '42',
        userId: 'visitor',
      });
      expect(experimentUserDataSource.delete).not.toHaveBeenCalledWith({
        experimentId: '42',
        userId: 'visitor',
      });
    }
  );

  it.each([Event.VISIT_CREATED, Event.VISIT_UPDATED, Event.VISIT_DELETED])(
    'does not onboard a proposal from %s',
    async (event) => {
      proposalDataSource.get.mockResolvedValue(null);

      await consumer.onMessage(event, visitMessage(), properties);

      expect(proposalDataSource.get).toHaveBeenCalledWith(42);
      expect(proposalDataSource.create).not.toHaveBeenCalled();
      expect(experimentDataSource.create).not.toHaveBeenCalled();
      expect(userDataSource.create).not.toHaveBeenCalled();
      expect(experimentUserDataSource.delete).not.toHaveBeenCalled();
      expect(logger.logInfo).toHaveBeenCalledWith(
        'Skipping Visa visit synchronization: proposal has not been synced to Visa; visit events only update existing proposals',
        { proposalPk: 42, type: event }
      );
    }
  );

  it('rejects invalid visit messages', async () => {
    await expect(
      consumer.onMessage(Event.VISIT_CREATED, {}, properties)
    ).rejects.toThrow('Invalid Visit message');
    expect(proposalDataSource.get).not.toHaveBeenCalled();
  });

  it('rejects invalid embedded proposals before changing Visa', async () => {
    const message = visitMessage();
    message.proposal.title = '';

    await expect(
      consumer.onMessage(Event.VISIT_UPDATED, message, properties)
    ).rejects.toThrow('Proposal title is missing');
    expect(proposalDataSource.get).not.toHaveBeenCalled();
  });

  it('rejects an invalid proposal event before changing Visa', async () => {
    await expect(
      consumer.onMessage(
        Event.PROPOSAL_UPDATED,
        { ...proposalMessage(), title: '' },
        properties
      )
    ).rejects.toThrow('Proposal title is missing');

    expect(proposalDataSource.get).not.toHaveBeenCalled();
    expect(userDataSource.create).not.toHaveBeenCalled();
  });

  it('rejects a proposal with no proposer before changing Visa', async () => {
    await expect(
      consumer.onMessage(
        Event.PROPOSAL_UPDATED,
        { ...proposalMessage(), proposer: undefined },
        properties
      )
    ).rejects.toThrow('Proposal proposer is missing');

    expect(proposalDataSource.get).not.toHaveBeenCalled();
  });

  it('handles visit payloads without optional visitor or data-access lists', async () => {
    const message = {
      ...visitMessage(),
      proposal: {
        ...proposalMessage(),
        visitors: undefined,
        dataAccessUsers: undefined,
      },
    };

    await consumer.onMessage(Event.VISIT_UPDATED, message, properties);

    expect(
      userDataSource.create.mock.calls.map(([user]) => user.oidcSub)
    ).toEqual(['proposer', 'member']);
    expect(experimentUserDataSource.delete).toHaveBeenCalledWith({
      experimentId: '42',
      userId: 'visitor',
    });
  });

  it('propagates synchronization failures for message retry', async () => {
    const error = new Error('Database unavailable');
    const message = visitMessage();
    userDataSource.create.mockRejectedValueOnce(error);

    await expect(
      consumer.onMessage(Event.VISIT_CREATED, message, properties)
    ).rejects.toThrow('Database unavailable');
    expect(experimentUserDataSource.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['proposal lookup', () => proposalDataSource.get],
    ['experiment creation', () => experimentDataSource.create],
    ['experiment lookup', () => experimentDataSource.getByProposalId],
    ['membership creation', () => experimentUserDataSource.create],
    [
      'membership lookup',
      () => experimentUserDataSource.getAllUsersByExperimentId,
    ],
  ] as const)(
    'propagates %s failures without removing members',
    async (_stage, getOperation) => {
      const error = new Error('Database unavailable');
      getOperation().mockRejectedValueOnce(error);

      await expect(
        consumer.onMessage(Event.VISIT_UPDATED, visitMessage(), properties)
      ).rejects.toThrow(error);
      expect(experimentUserDataSource.delete).not.toHaveBeenCalled();
    }
  );

  it('propagates membership deletion failures for retry', async () => {
    const error = new Error('Deletion failed');
    experimentUserDataSource.delete.mockRejectedValueOnce(error);

    await expect(
      consumer.onMessage(Event.VISIT_DELETED, visitMessage(), properties)
    ).rejects.toThrow(error);
  });

  it.each([Event.PROPOSAL_UPDATED, Event.PROPOSAL_STATUS_ACTION_EXECUTED])(
    'continues to sync eligible proposals on %s',
    async (event) => {
      await consumer.onMessage(event, proposalMessage(), properties);

      expect(userDataSource.create).toHaveBeenCalledTimes(4);
    }
  );

  it.each([Event.PROPOSAL_UPDATED, Event.PROPOSAL_STATUS_ACTION_EXECUTED])(
    'still onboards new proposals and instruments on %s',
    async (event) => {
      proposalDataSource.get.mockResolvedValue(null);
      instrumentDataSource.getByShortCode.mockResolvedValue(null);
      instrumentDataSource.create.mockResolvedValue(
        new Instrument(1, 'INST', 'INST')
      );
      const message = proposalMessage();

      await consumer.onMessage(event, message, properties);

      expect(proposalDataSource.create).toHaveBeenCalledWith(
        expect.objectContaining({ proposalPk: 42 })
      );
      expect(instrumentDataSource.create).toHaveBeenCalledWith({
        id: 1,
        name: 'INST',
      });
      expect(experimentDataSource.create).toHaveBeenCalledWith({
        proposalPk: 42,
        instrumentId: 1,
      });
      expect(experimentUserDataSource.create).toHaveBeenCalledTimes(4);
    }
  );

  it.each(['DRAFT', undefined])(
    'ignores proposal events with an ineligible or missing status: %s',
    async (newStatus) => {
      await consumer.onMessage(
        Event.PROPOSAL_UPDATED,
        { ...proposalMessage(), newStatus },
        properties
      );

      expect(proposalDataSource.get).not.toHaveBeenCalled();
      expect(userDataSource.create).not.toHaveBeenCalled();
    }
  );

  it('does not onboard proposals when triggering statuses are unconfigured', async () => {
    const environment = { ...process.env };
    delete environment.VISA_SYNCING_TRIGGERING_STATUSES;
    jest.replaceProperty(process, 'env', environment);

    await jest.isolateModulesAsync(async () => {
      const { SyncProposalQueueConsumer: UnconfiguredConsumer } =
        jest.requireActual<typeof import('./syncProposalQueueConsumer')>(
          './syncProposalQueueConsumer'
        );
      const unconfiguredConsumer = new UnconfiguredConsumer(
        {} as MessageBroker
      );

      await expect(
        unconfiguredConsumer.onMessage(
          Event.PROPOSAL_UPDATED,
          proposalMessage(),
          properties
        )
      ).resolves.toBeUndefined();
    });
  });

  it('ignores unrelated events', async () => {
    await consumer.onMessage(Event.PROPOSAL_ACCEPTED, {}, properties);

    expect(proposalDataSource.get).not.toHaveBeenCalled();
  });
});
