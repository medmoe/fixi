const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const WEEK = DAY * 7;
const MONTH = DAY * 30;
const YEAR = DAY * 365;

const pluralize = (value: number, unit: string): string => `${value} ${unit}${value === 1 ? "" : "s"} ago`;

/** "3 weeks ago" style relative timestamp — no date library needed for this one format. */
export const formatRelativeDate = (isoDate: string): string => {
    const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);

    if (seconds < MINUTE) return "just now";
    if (seconds < HOUR) return pluralize(Math.floor(seconds / MINUTE), "minute");
    if (seconds < DAY) return pluralize(Math.floor(seconds / HOUR), "hour");
    if (seconds < WEEK) return pluralize(Math.floor(seconds / DAY), "day");
    if (seconds < MONTH) return pluralize(Math.floor(seconds / WEEK), "week");
    if (seconds < YEAR) return pluralize(Math.floor(seconds / MONTH), "month");
    return pluralize(Math.floor(seconds / YEAR), "year");
};
