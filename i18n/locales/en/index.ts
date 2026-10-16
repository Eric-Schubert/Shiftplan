import type { Messages } from "../../types";
import absence from "./absence";
import app from "./app";
import audit from "./audit";
import changelog from "./changelog";
import common from "./common";
import contact from "./contact";
import errors from "./errors";
import excel from "./excel";
import excelTemplate from "./excel-template";
import holidays from "./holidays";
import mail from "./mail";
import member from "./member";
import planner from "./planner";
import primevue from "./primevue";
import push from "./push";
import requests from "./requests";
import settings from "./settings";
import validation from "./validation";

// Same files and keys as the German catalog (each file is checked against it with `satisfies`).
const en = {
  common,
  primevue,
  errors,
  validation,
  excel,
  excelTemplate,
  push,
  app,
  changelog,
  member,
  requests,
  absence,
  planner,
  holidays,
  mail,
  contact,
  audit,
  settings,
} satisfies Messages;

export default en;
