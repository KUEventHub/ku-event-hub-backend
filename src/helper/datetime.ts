interface DateTimeString {
  date: string;
  time: string;
}

export function toDateTimeString(date: Date): DateTimeString {
  return {
    date: date.toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }),
    time: date.toLocaleString("th-TH", {
      timeZone: "Asia/Bangkok",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
  };
}
