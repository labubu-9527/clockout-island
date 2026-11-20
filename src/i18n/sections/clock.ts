export interface ClockText {
  name: string;
  title: string;
  hourFormat: string;
  hour12: string;
  hour24: string;
  period: string;
  periodNone: string;
  periodAmPm: string;
  periodDetailed: string;
  showSeconds: string;
  preview: string;
  localTime: string;
  am: string;
  pm: string;
  dawn: string;
  earlyMorning: string;
  morning: string;
  noon: string;
  afternoon: string;
  evening: string;
  night: string;
}

export const zhCN: ClockText = {
  name: "时间",
  title: "时间格式", hourFormat: "小时制", hour12: "12 小时", hour24: "24 小时",
  period: "时段", periodNone: "无", periodAmPm: "上午 / 下午", periodDetailed: "详细",
  showSeconds: "显示秒数", preview: "实时预览", localTime: "使用系统本地时间",
  am: "上午", pm: "下午", dawn: "凌晨", earlyMorning: "早上", morning: "上午",
  noon: "中午", afternoon: "下午", evening: "晚上", night: "深夜",
};

export const en: ClockText = {
  name: "Clock",
  title: "Time format", hourFormat: "Hour format", hour12: "12-hour", hour24: "24-hour",
  period: "Day period", periodNone: "None", periodAmPm: "AM / PM", periodDetailed: "Detailed",
  showSeconds: "Show seconds", preview: "Live preview", localTime: "Uses your system's local time",
  am: "AM", pm: "PM", dawn: "Night", earlyMorning: "Morning", morning: "Morning",
  noon: "Noon", afternoon: "Afternoon", evening: "Evening", night: "Night",
};
