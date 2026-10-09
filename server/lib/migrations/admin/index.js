import settingsSchema from "./001-settings-schema.js";
import usersSchema from "./002-users-schema.js";
import bootstrapUser from "./003-bootstrap-user.js";
import authStateSchema from "./004-auth-state-schema.js";
import secureDefaultCredentials from "./005-secure-default-credentials.js";
import removeLegacyPasswordSetting from "./006-remove-legacy-password-setting.js";
import contactMessagesSchema from "./007-contact-messages-schema.js";
import teamAccessPushSchema from "./008-team-access-push-schema.js";
import appDevicesSchema from "./009-app-devices-schema.js";
import memberAccessSchema from "./010-member-access-schema.js";
import memberPins from "./011-member-pins.js";
import pushSubscriptionSession from "./012-push-subscription-session.js";

// Order matters: migrations run top to bottom and are recorded by id.
export const ADMIN_MIGRATIONS = [
  settingsSchema,
  usersSchema,
  bootstrapUser,
  authStateSchema,
  secureDefaultCredentials,
  removeLegacyPasswordSetting,
  contactMessagesSchema,
  teamAccessPushSchema,
  appDevicesSchema,
  memberAccessSchema,
  memberPins,
  pushSubscriptionSession,
];
