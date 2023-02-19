import { ProposalUser } from '../../queue/consumers/scicat/scicatProposal/dto';

const serverName = process.env.SYNAPSE_SERVER_NAME;
/**
 * Produces a synapse user id from a member
 * @param member Member to produce synapse user id from
 * @param skipPrePostfix If true, the @ and :serverName will not be added
 * @returns Synapse user id
 */
export function produceSynapseUserId(
  member: ProposalUser,
  skipPrePostfix: boolean = false
): string {
  const normalizedId = member.oidcSub
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (skipPrePostfix) {
    return normalizedId;
  }

  return `@${normalizedId}:${serverName}`;
}
