import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone.js';
import utc from 'dayjs/plugin/utc.js';

dayjs.extend(utc);
dayjs.extend(timezone);

export const PKT_TZ = 'Asia/Karachi';
export const PKT_FORMAT = 'YYYY-MM-DD HH:mm';

export const pktNow = () => dayjs().tz(PKT_TZ);

export const pktDayBounds = (input) => {
  const base = input ? dayjs.tz(input, PKT_TZ) : pktNow();
  return {
    start: base.startOf('day').toDate(),
    end: base.endOf('day').toDate(),
  };
};

export const formatPKT = (input, format = PKT_FORMAT) => {
  if (!input) return null;
  const dt = dayjs(input);
  if (!dt.isValid()) return null;
  return dt.tz(PKT_TZ).format(format);
};
