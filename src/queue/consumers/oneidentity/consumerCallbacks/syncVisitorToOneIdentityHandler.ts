import { logger } from '@user-office-software/duo-logger';

import { Event } from '../../../../models/Event';
import { ESSOneIdentity } from '../utils/ESSOneIdentity';
import { IdentityType, UID_Person } from '../utils/interfaces/Person';
import {
  OrderState,
  PersonWantsOrgRole,
} from '../utils/interfaces/PersonWantsOrg';
import { VisitorMessage } from '../utils/interfaces/VisitorMessage';

export async function syncVisitorToOneIdentityHandler(
  { startAt, endAt, visitorId }: VisitorMessage,
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

    if (type === Event.VISITOR_CREATED) {
      await createAccessInOneIdentity(oneIdentity, startAt, endAt, visitorId);
    } else if (type === Event.VISITOR_DELETED) {
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
  const [pwo] = await oneIdentity.createSiteAccess(
    PersonWantsOrgRole.SITE_ACCESS,
    centralAccount,
    startAt,
    endAt
  );

  // Create system access
  // It starts when the message arrives and ends 30 days after the visitor leaves
  await oneIdentity.createSiteAccess(
    PersonWantsOrgRole.SYSTEM_ACCESS,
    centralAccount,
    toIsoString(Date.now()),
    toIsoString(new Date(endAt).setDate(30)),
    pwo.UID_PersonWantsOrg // CustomProperty04
  );
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
      pwo.OrderState === OrderState.ASSIGNED
  );

  if (!siteAccess) {
    throw new Error(
      'Site access not found in One Identity, cannot remove access'
    );
  }

  // Find system access for the site access
  const systemAccess = personWantsOrgs.find(
    (pwo) =>
      pwo.CustomProperty04 === siteAccess.UID_PersonWantsOrg &&
      pwo.DisplayOrg === PersonWantsOrgRole.SYSTEM_ACCESS &&
      pwo.OrderState === OrderState.ASSIGNED
  );

  if (!systemAccess) {
    throw new Error(
      'System access not found in One Identity, cannot remove access'
    );
  }

  // Cancel site and system access
  await oneIdentity.cancelSiteAccess(siteAccess.UID_PersonWantsOrg);
  await oneIdentity.cancelSiteAccess(systemAccess.UID_PersonWantsOrg);
}

function toIsoString(date: string | number) {
  return new Date(date).toISOString();
}
