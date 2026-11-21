export type NotebookText = {
  sectionLabel: string;
  reminderErrors: Record<"invalid_date" | "invalid_time" | "past_time" | "out_of_range" | "empty_title" | "too_long" | "invalid_characters", string>;
  reminderPreview: (title: string) => string;
  reminderDelivered: string;
  reminderPending: string;
  backToToday: string;
  saveTodayMarkdown: string;
  reviewSaved: string;
  tasksTab: string;
  dailyTab: string;
  openDailyNote: string;
  backToTasks: string;
  progress: string;
  addTaskFor: (date: string) => string;
  addTaskHint: string;
  dailyPlaceholder: string;
  dailyNoteLabel: string;
  pickDate: string;
  clearDate: string;
  dateToday: string;
  dateTomorrow: string;
  upcomingTab: string;
  showUpcoming: (count: number) => string;
  scheduledCount: (count: number) => string;
  noScheduled: string;
  deleteScheduled: (title: string) => string;
  dayToday: string;
  dayYesterday: string;
  dayTomorrow: string;
  /** A day as a short heading: 11月9日 周一 / Mon, Nov 9. */
  formatDay: (date: Date) => string;
  moveToToday: string;
  addTodo: string;
  doneOf: (done: number, total: number) => string;
  restoreTodo: (title: string) => string;
  alreadyToday: string;
  calendarTab: string;
  previousMonth: string;
  nextMonth: string;
  calendarGoToToday: string;
  dayTodos: (date: string, count: number) => string;
  noTodosOnDay: string;
};

const zhTaskCount = (count: number) => `${count} 项待办`;
const enTaskCount = (count: number) => `${count} ${count === 1 ? "task" : "tasks"}`;

export const zhCN: NotebookText = {
  sectionLabel: "任务清单",
  reminderPreview: (title) => `按 Enter 创建提醒：“${title}”，`,
  reminderDelivered: "已提醒",
  reminderPending: "等待提醒",
  reminderErrors: {
    invalid_date: "日期无效，请使用有效的 YYYY-MM-DD。",
    invalid_time: "请填写有效的本地 24 小时时刻，如 9:00。",
    past_time: "提醒时间已经过去，请重新填写。",
    out_of_range: "相对提醒仅支持 1-10080 分钟或 1-168 小时。",
    empty_title: "请补充提醒标题，例如：20分钟后取快递。",
    too_long: "提醒标题最多 120 个字符，输入最多 512 个字符。",
    invalid_characters: "提醒内容不能包含控制字符。",
  },
  backToToday: "回到今天的待办",
  saveTodayMarkdown: "把今天的待办保存为 Markdown",
  reviewSaved: "查看保存过的待办",
  tasksTab: "待办",
  dailyTab: "笔记",
  openDailyNote: "打开今日笔记",
  backToTasks: "回到待办",
  progress: "待办进度",
  addTaskFor: (date) => `添加 ${date} 的待办`,
  addTaskHint: "添加待办，按 Enter 保存",
  dailyPlaceholder: "写下今天的笔记…",
  dailyNoteLabel: "今日笔记",
  pickDate: "选择日期",
  clearDate: "清除日期",
  dateToday: "今天",
  dateTomorrow: "明天",
  upcomingTab: "已安排",
  showUpcoming: (count) => `查看 ${count} 项已安排的待办`,
  scheduledCount: (count) => `${count} 项已安排`,
  noScheduled: "以后还没有安排",
  deleteScheduled: (title) => `删除已安排的待办：${title}`,
  dayToday: "今天",
  dayYesterday: "昨天",
  dayTomorrow: "明天",
  formatDay: (date) => `${date.getMonth() + 1}月${date.getDate()}日 ${"周日周一周二周三周四周五周六".slice(date.getDay() * 2, date.getDay() * 2 + 2)}`,
  moveToToday: "移到今天",
  addTodo: "添加待办",
  doneOf: (done, total) => `${done}/${total} 已完成`,
  restoreTodo: (title) => `把“${title}”加到今天`,
  alreadyToday: "已在今天的列表里",
  calendarTab: "日历",
  previousMonth: "上个月",
  nextMonth: "下个月",
  calendarGoToToday: "回到今天",
  dayTodos: (date, count) => (count > 0 ? `${date}，${zhTaskCount(count)}` : date),
  noTodosOnDay: "这天没有待办",
};

export const en: NotebookText = {
  sectionLabel: "Tasks",
  reminderPreview: (title) => `Press Enter to create a reminder: "${title}",`,
  reminderDelivered: "Reminded",
  reminderPending: "Reminder pending",
  reminderErrors: {
    invalid_date: "Enter a valid date as YYYY-MM-DD.",
    invalid_time: "Enter a valid local 24-hour time, such as 9:00.",
    past_time: "This reminder time has passed. Choose a future time.",
    out_of_range: "Use 1-10080 minutes or 1-168 hours.",
    empty_title: "Add a reminder title, such as: in 20 minutes collect parcel.",
    too_long: "Reminder titles allow 120 characters; full input allows 512.",
    invalid_characters: "Reminder text cannot contain control characters.",
  },
  backToToday: "Back to today's todo list",
  saveTodayMarkdown: "Save today's todo list as markdown",
  reviewSaved: "Review saved todo lists",
  tasksTab: "Tasks",
  dailyTab: "Notes",
  openDailyNote: "Open daily note",
  backToTasks: "Back to tasks",
  progress: "Task progress",
  addTaskFor: (date) => `Add a task for ${date}`,
  addTaskHint: "Add a task, press Enter to save",
  dailyPlaceholder: "Write today's notes...",
  dailyNoteLabel: "Daily note",
  pickDate: "Pick a date",
  clearDate: "Clear date",
  dateToday: "Today",
  dateTomorrow: "Tomorrow",
  upcomingTab: "Upcoming",
  showUpcoming: (count) => `Show ${count} scheduled ${count === 1 ? "task" : "tasks"}`,
  scheduledCount: (count) => `${count} scheduled`,
  noScheduled: "Nothing scheduled for later",
  deleteScheduled: (title) => `Delete scheduled task: ${title}`,
  dayToday: "Today",
  dayYesterday: "Yesterday",
  dayTomorrow: "Tomorrow",
  formatDay: (date) => new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(date),
  moveToToday: "Move to today",
  addTodo: "Add todo",
  doneOf: (done, total) => `${done}/${total} done`,
  restoreTodo: (title) => `Add "${title}" to today`,
  alreadyToday: "Already on today's list",
  calendarTab: "Calendar",
  previousMonth: "Previous month",
  nextMonth: "Next month",
  calendarGoToToday: "Back to today",
  dayTodos: (date, count) => (count > 0 ? `${date}, ${enTaskCount(count)}` : date),
  noTodosOnDay: "No tasks on this day",
};
