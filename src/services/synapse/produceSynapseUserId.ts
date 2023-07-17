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
  if (synapseService) {
    const userIdByOidcSub = await synapseService.getUserByOidcSub(member);
    const userIdByEmail = await synapseService.getUserByEmail(member.email);

    if (userIdByOidcSub) {
      return skipPrePostfix
        ? userIdByOidcSub.user_id.replace(/^@|:ess$/g, '')
        : userIdByOidcSub.user_id;
    }
    if (userIdByEmail) {
      return skipPrePostfix
        ? userIdByEmail.user_id.replace(/^@|:ess$/g, '')
        : userIdByEmail.user_id;
    }
  }

  const normalizedId = member.oidcSub
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (skipPrePostfix) {
    return normalizedId;
  }

  return `@${normalizedId}:${serverName}`;
}
