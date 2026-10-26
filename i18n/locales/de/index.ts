// German catalog. The /_i18n/<hash>/ URL of the catalogs hashes only the locale index files, so a change
// here gives it a new address; browsers then ask again instead of reusing an old cached response.
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
  mail,
  contact,
  audit,
  settings,
};

export default de;
