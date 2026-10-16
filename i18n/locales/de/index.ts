import common from "./common";
import errors from "./errors";
import excel from "./excel";
import primevue from "./primevue";
import push from "./push";
import validation from "./validation";

// One namespace per file, so keys read „namespace.key“, e.g. t("common.meta.description").
const de = { common, primevue, errors, validation, excel, push };

export default de;
