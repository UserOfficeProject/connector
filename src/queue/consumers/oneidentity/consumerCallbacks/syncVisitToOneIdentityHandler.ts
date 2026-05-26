import process from 'process';

import { logger } from '@user-office-software/duo-logger';

import { Event } from '../../../../models/Event';
import { ProposalMessageData } from '../../../../models/ProposalMessage';
import { collectUsersFromProposalMessage } from '../../utils/collectUsersFromProposalMessage';
import { ESSOneIdentity } from '../utils/ESSOneIdentity';
import { IdentityType, UID_Person } from '../utils/interfaces/Person';
import {
  OrderState,
  PersonWantsOrgRole,
} from '../utils/interfaces/PersonWantsOrg';
import { VisitMessage } from '../utils/interfaces/VisitMessage';

const ONE_IDENTITY_SYSTEM_ACCESS_LASTS_FOR_DAYS = parseInt(
  process.env.ONE_IDENTITY_SYSTEM_ACCESS_LASTS_FOR_DAYS || '30'
);

export async function syncVisitToOneIdentityHandler(
  { id: visitId, startAt, endAt, visitorId: oidcSub, proposal }: VisitMessage,
  type: Event
): Promise<void> {
  const oneIdentity = new ESSOneIdentity();
  await oneIdentity.login();

  logger.logInfo('One Identity successfully logged in', {});

  try {
    // Only Science Users' access should be managed!
    const uidPerson = await getScienceUser(oneIdentity, oidcSub);
    if (!uidPerson) {
      logger.logInfo('Visitor is not a Science User, skipping', {});

      return;
    }

    const uidESet = await oneIdentity.getProposal(proposal);

    if (!uidESet) {
      throw new Error('Proposal not found in One Identity, cannot sync visit');
    }

    if (type === Event.VISIT_CREATED) {
      await createAccessInOneIdentity(
        oneIdentity,
        visitId,
        startAt,
        endAt,
        oidcSub
      );

      // Every visitor should have access to the proposal folders
      await createProposalConnection(oneIdentity, uidESet, uidPerson);
    } else if (type === Event.VISIT_UPDATED) {
      // For simplicity, we will just update the access with the new dates. The update takes place only if the dates are changed.
      await updateAccessInOneIdentity(
        oneIdentity,
        visitId,
        startAt,
        endAt,
        uidPerson,
        oidcSub
      );

      // If the Proposal connection has not been established during Visit Creation, this will be a backup
      await createProposalConnection(oneIdentity, uidESet, uidPerson);
    } else if (type === Event.VISIT_DELETED) {
      await removeAccessFromOneIdentity(oneIdentity, visitId, uidPerson);

      // Remove the connection between the proposal and the visitor
      await removeProposalConnection(
        oneIdentity,
        uidESet,
        uidPerson,
        oidcSub,
        proposal
      );
    }
  } finally {
    await oneIdentity.logout();
    logger.logInfo('One Identity successfully logged out', {});
  }
}

// Find person UID from oidcSub
// If the person is not a science user, return undefined
async function getScienceUser(
  oneIdentity: ESSOneIdentity,
  centralAccount: string
): Promise<UID_Person | undefined> {
  // Find person UID from oidcSub
  const person = await oneIdentity.getPerson(centralAccount);

  if (!person) {
    throw new Error('Person not found in One Identity');
  }

  if (person.CCC_EmployeeSubType === IdentityType.ESSSCIENCEUSER)
    return person.UID_Person;
  else return undefined;
}

async function createAccessInOneIdentity(
  oneIdentity: ESSOneIdentity,
  visitId: string,
  startAt: string,
  endAt: string,
  centralAccount: string
) {
  // Create site access
  const [pwoSite] = await oneIdentity.createPersonWantsOrg(
    PersonWantsOrgRole.SITE_ACCESS,
    centralAccount,
    toIsoString(startAt),
    toIsoString(endAt),
    visitId.toString() // CustomProperty04 - We store the visit ID for the site access to be able to find it later
  );

  logger.logInfo('Site access created in One Identity', {
    UID_PersonWantsOrg: pwoSite.UID_PersonWantsOrg,
  });

  // validFrom in One Identity should be in the future so that the access is not immediately available
  const validFrom = Date.now();
  const validUntil = new Date(endAt).setDate(
    new Date(endAt).getDate() + ONE_IDENTITY_SYSTEM_ACCESS_LASTS_FOR_DAYS
  );

  // Create system access
  const [pwoSystem] = await oneIdentity.createPersonWantsOrg(
    PersonWantsOrgRole.SYSTEM_ACCESS,
    centralAccount,
    toIsoString(validFrom),
    toIsoString(validUntil),
    visitId.toString() // CustomProperty04 - We store the visit ID for the system access to be able to find it later
  );

  logger.logInfo('System access created in One Identity', {
    UID_PersonWantsOrg: pwoSystem.UID_PersonWantsOrg,
  });
}

async function updateAccessInOneIdentity(
  oneIdentity: ESSOneIdentity,
  visitId: string,
  startAt: string,
  endAt: string,
  uidPerson: UID_Person,
  centralAccount: string
) {
  // Find person wants orgs for the visitor
  const personWantsOrgs = await oneIdentity.getPersonWantsOrg(uidPerson);

  // Find site access for the visitor
  const siteAccess = personWantsOrgs.find(
    (pwo) =>
      pwo.DisplayOrg === PersonWantsOrgRole.SITE_ACCESS &&
      pwo.CustomProperty04 === visitId.toString() && // CustomProperty04 is the visit ID for the site access
      pwo.OrderState !== OrderState.ABORTED
  );

  // If there is no existing siteAccess record, new one will be created for both siteAccess and systemAccess.
  if (!siteAccess) {
    logger.logInfo('Site access not found in One Identity, creating access', {
      visitId,
      uidPerson,
    });

    await createAccessInOneIdentity(
      oneIdentity,
      visitId,
      startAt,
      endAt,
      centralAccount
    );

    return;
  }

  const validFrom = toIsoString(startAt);
  const validUntil = toIsoString(endAt);

  // Find system access for the site access (CustomProperty04 is the visit ID)
  const systemAccess = personWantsOrgs.find(
    (pwo) =>
      pwo.CustomProperty04 === visitId.toString() &&
      pwo.DisplayOrg === PersonWantsOrgRole.SYSTEM_ACCESS &&
      pwo.OrderState !== OrderState.UNSUBSCRIBED
  );

  if (!systemAccess) {
    throw new Error(
      'System access not found in One Identity, cannot update access'
    );
  }

  if (
    isSameDateTime(siteAccess.ValidFrom, validFrom) &&
    isSameDateTime(siteAccess.ValidUntil, validUntil)
  ) {
    logger.logInfo(
      'Visit dates unchanged, skipping access update in One Identity',
      {
        UID_PersonWantsOrg: siteAccess.UID_PersonWantsOrg,
        visitId,
      }
    );

    return;
  }

  await oneIdentity.updatePersonWantsOrg(
    siteAccess.UID_PersonWantsOrg,
    validFrom,
    validUntil
  );

  logger.logInfo('Site access updated in One Identity', {
    UID_PersonWantsOrg: siteAccess.UID_PersonWantsOrg,
  });

  const systemAccessValidUntil = toIsoString(
    new Date(endAt).setDate(
      new Date(endAt).getDate() + ONE_IDENTITY_SYSTEM_ACCESS_LASTS_FOR_DAYS
    )
  );

  await oneIdentity.updatePersonWantsOrg(
    systemAccess.UID_PersonWantsOrg,
    validFrom,
    systemAccessValidUntil
  );

  logger.logInfo('System access updated in One Identity', {
    UID_PersonWantsOrg: systemAccess.UID_PersonWantsOrg,
  });
}

async function removeAccessFromOneIdentity(
  oneIdentity: ESSOneIdentity,
  visitId: string,
  uidPerson: UID_Person
) {
  // Find person wants orgs for the visitor
  const personWantsOrgs = await oneIdentity.getPersonWantsOrg(uidPerson);

  // Find site access for the visitor
  const siteAccess = personWantsOrgs.find(
    (pwo) =>
      pwo.DisplayOrg === PersonWantsOrgRole.SITE_ACCESS &&
      pwo.CustomProperty04 === visitId.toString() && // CustomProperty04 is the visit ID for the site access
      pwo.OrderState !== OrderState.ABORTED
  );

  if (!siteAccess) {
    throw new Error(
      'Site access not found in One Identity, cannot remove access'
    );
  }

  await oneIdentity.cancelPersonWantsOrg(siteAccess.UID_PersonWantsOrg);

  logger.logInfo('Site access cancelled in One Identity', {
    UID_PersonWantsOrg: siteAccess.UID_PersonWantsOrg,
  });

  // Find system access for the site access (CustomProperty04 is the visit ID)
  const systemAccess = personWantsOrgs.find(
    (pwo) =>
      pwo.CustomProperty04 === visitId.toString() &&
      pwo.DisplayOrg === PersonWantsOrgRole.SYSTEM_ACCESS &&
      pwo.OrderState !== OrderState.UNSUBSCRIBED
  );

  if (!systemAccess) {
    throw new Error(
      'System access not found in One Identity, cannot remove access'
    );
  }

  await oneIdentity.cancelPersonWantsOrg(systemAccess.UID_PersonWantsOrg);

  logger.logInfo('System access cancelled in One Identity', {
    UID_PersonWantsOrg: systemAccess.UID_PersonWantsOrg,
  });
}

async function createProposalConnection(
  oneIdentity: ESSOneIdentity,
  uidESet: string,
  uidPerson: string
) {
  // Check if the connection already exists
  // If connection already exists, no need to create it again, reasons could be:
  // - The visitor is a member of the proposal
  // - The visitor has been added to the proposal in the past
  const exists = (await oneIdentity.getProposalPersonConnections(uidESet)).some(
    (c) => c.UID_Person === uidPerson
  );

  if (exists) {
    logger.logInfo('Connection already exists, skipping', {
      uidPerson,
      uidESet,
    });
  } else {
    await oneIdentity.connectPersonToProposal(uidESet, uidPerson);
    logger.logInfo('Connection created between proposal and visitor', {
      uidPerson,
      uidESet,
    });
  }
}

async function removeProposalConnection(
  oneIdentity: ESSOneIdentity,
  uidESet: string,
  uidPerson: string,
  oidcSub: string,
  proposal: ProposalMessageData
) {
  const isMember = collectUsersFromProposalMessage(proposal).some(
    (m) => m.oidcSub === oidcSub
  );

  if (isMember) {
    // [proposer, members, dataAccessUsers, visitors] should always have access to the proposal
    logger.logInfo('Visitor is a proposal member, skipping removal', {
      uidPerson,
      uidESet,
    });
  } else {
    await oneIdentity.removeConnectionBetweenPersonAndProposal(
      uidESet,
      uidPerson
    );
    logger.logInfo('Connection removed between proposal and visitor', {
      uidPerson,
      uidESet,
    });
  }
}

function toIsoString(date: string | number) {
  const parsedDate = new Date(date);

  if (isNaN(parsedDate.getTime())) {
    throw new Error(`Invalid date provided to toIsoString: ${date}`);
  }

  return parsedDate.toISOString();
}

function isSameDateTime(left: string, right: string) {
  const leftTime = new Date(left).getTime();
  const rightTime = new Date(right).getTime();

  if (isNaN(leftTime) || isNaN(rightTime)) {
    return left === right;
  }

  return leftTime === rightTime;
}
