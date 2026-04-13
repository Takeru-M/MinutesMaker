const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_MUTATION_WINDOW_DAYS = 2;

const normalizeUtcDate = (value: string | Date): number | null => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

export const isWithinMinutesMutationWindow = (meetingDate: string | Date, now: Date = new Date()): boolean => {
  const meetingDateUtc = normalizeUtcDate(meetingDate);
  const currentDateUtc = normalizeUtcDate(now);

  if (meetingDateUtc === null || currentDateUtc === null) {
    return false;
  }

  const deltaDays = Math.floor((currentDateUtc - meetingDateUtc) / MILLISECONDS_PER_DAY);
  return deltaDays >= 0 && deltaDays <= MAX_MUTATION_WINDOW_DAYS;
};
