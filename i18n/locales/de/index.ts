import absence from "./absence";
import app from "./app";
import changelog from "./changelog";
import common from "./common";
import errors from "./errors";
import excel from "./excel";
import member from "./member";
import primevue from "./primevue";
import requests from "./requests";
import validation from "./validation";

// One namespace per file, so keys read „namespace.key“, e.g. t("common.meta.description").
const de = {
  common,
  primevue,
  errors,
  validation,
  excel,
  app,
  changelog,
  member,
  requests,
  absence,
};

export default de;
