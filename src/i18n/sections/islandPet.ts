export interface IslandPetText {
  title: string;
  states: {
    idle: string;
    notice: string;
    agentAttention: string;
    agentWorking: string;
    focused: string;
    music: string;
  };
}

export const zhCN: IslandPetText = {
  title: "岛仔",
  states: {
    idle: "陪你发会儿呆",
    notice: "有新消息啦",
    agentAttention: "Agent 等你处理",
    agentWorking: "Agent 正在工作",
    focused: "陪你专注",
    music: "正在听歌",
  },
};

export const en: IslandPetText = {
  title: "Island pet",
  states: {
    idle: "Keeping you company",
    notice: "New notification",
    agentAttention: "Agent needs your attention",
    agentWorking: "Agent is working",
    focused: "Focusing with you",
    music: "Listening to music",
  },
};
