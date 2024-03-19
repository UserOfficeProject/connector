import { MoodleMessageData } from '../../../models/MoodleMessage';

export function validateMoodleMessage(
  moodleMessage: MoodleMessageData
): ValidMoodleMessageData {
  if (!moodleMessage.enrolled_user_id) {
    throw new Error('Property userid is missing');
  }

  if (!moodleMessage.course_short_name) {
    throw new Error('Property courseid is missing');
  }

  return {
    enrolled_user_id: moodleMessage.enrolled_user_id,
    course_short_name: moodleMessage.course_short_name,
  };
}

// NOTE:
// context can be: instrument_shortCode, course_id
// item can be: (proposal_shortCode, user_id)
export type ValidMoodleMessageData = {
  enrolled_user_id: string;
  course_short_name: string;
};
