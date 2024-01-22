/**
 * All faculty list
 */
export const FACULTY_LIST = [
  "เกษตร",
  "บริหารธุรกิจ",
  "ประมง",
  "มนุษยศาสตร์",
  "วนศาสตร์",
  "วิทยาศาสตร์",
  "วิศวกรรมศาสตร์",
  "ศึกษาศาสตร์",
  "เศรษฐศาสตร์",
  "สถาปัตยกรรมศาสตร์",
  "สังคมศาสตร์",
  "สัตวแพทยศาสตร์",
  "อุตสาหกรรมเกษตร",
  "เทคนิคการสัตวแพทย์",
  "สิ่งแวดล้อม",
  "แพทยศาสตร์",
  "พยาบาลศาสตร์",
  "สหวิทยาการจัดการและเทคโนโลยี",
  "วิทยาลัยบูรณาการศาสตร์",
  "โครงการจัดตั้งวิทยาลัยนานาชาติ",
];

/**
 * Regular expression for email validation
 */
export const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;

/**
 * roles
 */
export const ROLES = {
  ADMIN: "Admin",
  USER: "User",
};

/**
 * tables in the database
 */
export const TABLES = {
  BAN_LOG: "banlogs",
  EVENT: "events",
  EVENT_TYPE: "eventtypes",
  FRIEND_REQUEST: "friendrequests",
  LOGIN_LOG: "loginlogs",
  PARTICIPATION: "participations",
  USER: "users",
};

/**
 * event sort types
 */
export const EVENT_SORT_TYPES = {
  MOST_RECENTLY_CREATED: 0,
  MOST_RECENT_START_DATE: 1,
  MOST_PARTICIPANTS: 2,
};