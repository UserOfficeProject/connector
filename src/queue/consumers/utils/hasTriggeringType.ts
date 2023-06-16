import { Event } from '../../../models/Event';

export const hasTriggeringType = (type: string, types: Event[]) =>
  types.includes(type as Event);
