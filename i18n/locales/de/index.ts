import absence from "./absence";
import app from "./app";
import audit from "./audit";
import changelog from "./changelog";
import common from "./common";
import errors from "./errors";
import excel from "./excel";
import excelTemplate from "./excel-template";
import holidays from "./holidays";
import member from "./member";
import planner from "./planner";
import primevue from "./primevue";
import push from "./push";
import requests from "./requests";
import settings from "./settings";
import validation from "./validation";

// One namespace per file, so keys read „namespace.key“, e.g. t("common.meta.description").
const de = {
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
  audit,
  settings,
};

export default de;
