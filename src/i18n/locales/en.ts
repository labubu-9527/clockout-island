import * as clock from "../sections/clock.ts";
import * as deviceNotices from "../sections/deviceNotices.ts";
import * as islandPet from "../sections/islandPet.ts";
import * as weather from "../sections/weather.ts";
import type { Translations } from "../types";
import * as common from "../sections/common.ts";
import * as messages from "../sections/messages.ts";
import * as qq from "../sections/qq.ts";
import * as wechat from "../sections/wechat.ts";
import * as mail from "../sections/mail.ts";
import * as translator from "../sections/translator.ts";
import * as island from "../sections/island.ts";
import * as agent from "../sections/agent.ts";
import * as notebook from "../sections/notebook.ts";
import * as archive from "../sections/archive.ts";
import * as music from "../sections/music.ts";
import * as todo from "../sections/todo.ts";
import * as clipboard from "../sections/clipboard.ts";
import * as fileShelf from "../sections/fileShelf.ts";
import * as settings from "../sections/settings/index.ts";

const en: Translations = {
  deviceNotices: deviceNotices.en,
  clock: clock.en,
  islandPet: islandPet.en,
  localeLabel: "English",
  localeTag: "en",

  common: common.en,
  messages: messages.en,
  qq: qq.en,
  wechat: wechat.en,
  mail: mail.en,
  translator: translator.en,

  island: island.en,

  agent: agent.en,

  notebook: notebook.en,

  archive: archive.en,

  music: music.en,

  todo: todo.en,

  clipboard: clipboard.en,

  fileShelf: fileShelf.en,

  weather: weather.en,
  settings: settings.en,
};

export default en;
