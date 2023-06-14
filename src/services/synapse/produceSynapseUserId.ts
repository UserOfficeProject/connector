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
    const { user_id: userIdByOidcSub } = await synapseService.getUserByOidcSub(
      member
    );
    const { user_id: userIdByEmail } = await synapseService.getUserByEmail(
      member
    );

    if (userIdByOidcSub) {
      return skipPrePostfix
        ? userIdByOidcSub.replace(/^@|:ess$/g, '')
        : userIdByOidcSub;
    }
    if (userIdByEmail) {
      return skipPrePostfix
        ? userIdByEmail.replace(/^@|:ess$/g, '')
        : userIdByEmail;
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
