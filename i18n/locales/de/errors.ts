import absences from "./errors-absences";
import auth from "./errors-auth";
import common from "./errors-common";
import contact from "./errors-contact";
import holidays from "./errors-holidays";
import member from "./errors-member";
import push from "./errors-push";
import requests from "./errors-requests";
import shiftplan from "./errors-shiftplan";
import staff from "./errors-staff";
import team from "./errors-team";

// API error messages, one file per feature. The full key (errors.<feature>.<name>) is the
// `data.code` of the error response, so keys stay stable once released.
export default { absences, auth, common, contact, holidays, member, push, requests, shiftplan, staff, team };
