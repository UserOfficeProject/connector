import { logger } from '@user-office-software/duo-logger';

import { Event } from '../../../../models/Event';
import { ESSOneIdentity } from '../utils/ESSOneIdentity';
import { IdentityType, UID_Person } from '../utils/interfaces/Person';
import {
  OrderState,
  PersonWantsOrgRole,
} from '../utils/interfaces/PersonWantsOrg';
import { VisitMessage } from '../utils/interfaces/VisitMessage';

export async function syncVisitToOneIdentityHandler(
  { startAt, endAt, visitorId }: VisitMessage,
  type: Event
): Promise<void> {
  const oneIdentity = new ESSOneIdentity();
  await oneIdentity.login();

  logger.logInfo('One Identity successfully logged in', {});

  try {
    // Only Science Users' access should be managed!
    const uidPerson = await getScienceUser(oneIdentity, visitorId);
    if (!uidPerson) {
      logger.logInfo('Visitor is not a Science User, skipping', {});

      return;
    }

    if (type === Event.VISIT_CREATED) {
      await createAccessInOneIdentity(oneIdentity, startAt, endAt, visitorId);
    } else if (type === Event.VISIT_DELETED) {
      await removeAccessFromOneIdentity(oneIdentity, startAt, endAt, uidPerson);
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
  const person = await oneIdentity.getPerson({
    oidcSub: centralAccount,
  });

  if (!person) {
    throw new Error('Person not found in One Identity, cannot remove access');
  }

  if (person.CCC_EmployeeSubType === IdentityType.ESSSCIENCEUSER)
    return person.UID_Person;
  else return undefined;
}

async function createAccessInOneIdentity(
  oneIdentity: ESSOneIdentity,
  startAt: string,
  endAt: string,
  centralAccount: string
) {
  // Create site access
  const [pwoSite] = await oneIdentity.createPersonWantsOrg(
    PersonWantsOrgRole.SITE_ACCESS,
    centralAccount,
    toIsoString(startAt),
    toIsoString(endAt)
  );

  logger.logInfo('Site access created in One Identity', {
    UID_PersonWantsOrg: pwoSite.UID_PersonWantsOrg,
  });

  // validFrom in One Identity should be in the future so that the access is not immediately available
  // validFrom is set to 1 hour from now (to avoid time conflicts)
  const validFrom = Date.now() + 60 * 60 * 1000;
  // TODO! read from config
  const validUntil = new Date(endAt).setDate(new Date(endAt).getDate() + 30);

  // Create system access
  // It starts when the message arrives and ends 30 days after the site access ends
  const [pwoSystem] = await oneIdentity.createPersonWantsOrg(
    PersonWantsOrgRole.SYSTEM_ACCESS,
    centralAccount,
    toIsoString(validFrom),
    toIsoString(validUntil),
    pwoSite.UID_PersonWantsOrg // CustomProperty04
  );

  logger.logInfo('System access created in One Identity', {
    UID_PersonWantsOrg: pwoSystem.UID_PersonWantsOrg,
  });
}

async function removeAccessFromOneIdentity(
  oneIdentity: ESSOneIdentity,
  startAt: string,
  endAt: string,
  uidPerson: UID_Person
) {
  // Find person wants orgs for the visitor
  const personWantsOrgs = await oneIdentity.getPersonWantsOrg(uidPerson);

  // Find site access for the visitor
  const siteAccess = personWantsOrgs.find(
    (pwo) =>
      pwo.DisplayOrg === PersonWantsOrgRole.SITE_ACCESS &&
      toIsoString(pwo.ValidFrom) === toIsoString(startAt) &&
      toIsoString(pwo.ValidUntil) === toIsoString(endAt) &&
      pwo.OrderState === OrderState.GRANTED
  );

  if (!siteAccess) {
    throw new Error(
      'Site access not found in One Identity, cannot remove access'
    );
  }

  logger.logInfo('Site access found in One Identity', {
    UID_PersonWantsOrg: siteAccess.UID_PersonWantsOrg,
  });

  // Find system access for the site access (CustomProperty04 is the site access UID)
  const systemAccess = personWantsOrgs.find(
    (pwo) =>
      pwo.CustomProperty04 === siteAccess.UID_PersonWantsOrg &&
      pwo.DisplayOrg === PersonWantsOrgRole.SYSTEM_ACCESS &&
      pwo.OrderState === OrderState.GRANTED
  );

  if (!systemAccess) {
    throw new Error(
      'System access not found in One Identity, cannot remove access'
    );
  }

  logger.logInfo('System access found in One Identity', {
    UID_PersonWantsOrg: systemAccess.UID_PersonWantsOrg,
  });

  // Cancel site and system access
  await oneIdentity.cancelPersonWantsOrg(siteAccess.UID_PersonWantsOrg);
  await oneIdentity.cancelPersonWantsOrg(systemAccess.UID_PersonWantsOrg);

  logger.logInfo('Site and system access cancelled in One Identity', {
    UID_PersonWantsOrg_Site: siteAccess.UID_PersonWantsOrg,
    UID_PersonWantsOrg_System: systemAccess.UID_PersonWantsOrg,
  });
}

function toIsoString(date: string | number) {
  return new Date(date).toISOString();
}
