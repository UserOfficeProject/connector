import { SynapseService } from './SynapseService';
import { ProposalUser } from '../../queue/consumers/scicat/scicatProposal/dto';

const serverName = process.env.SYNAPSE_SERVER_NAME;
/**
 * Produces a synapse user id from a member
 * @param member Member to produce synapse user id from
 * @param skipPrePostfix If true, the @ and :serverName will not be added
 * @returns Synapse user id
 */
export async function produceSynapseUserId(
  member: ProposalUser,
  synapseService?: SynapseService,
  skipPrePostfix: boolean = false
): Promise<string> {
  // NOTE: It normalize the oidcSub to replace special characters and make it lowercase
  // This is done to enture that the oidcSub can be used as a valid synapse user id
  const normalizedMember = {
    ...member,
    oidcSub: member.oidcSub
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase(),
  };

  if (synapseService) {
    const user =
      (await synapseService.getUserByOidcSub(normalizedMember.oidcSub)) ||
      (await synapseService.getUserByEmail(normalizedMember.email));

    if (user) {
      return skipPrePostfix
        ? user.user_id.replace(/^@|:ess$/g, '')
        : user.user_id;
    }
  }

  if (skipPrePostfix) {
    return normalizedMember.oidcSub;
  }

  return `@${normalizedMember.oidcSub}:${serverName}`;
}
