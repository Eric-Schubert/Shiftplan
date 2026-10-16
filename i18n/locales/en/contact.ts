import type de from "../de/contact";

// Contact form on the imprint page. The labels and notices around it are legal texts (components/legal).
export default {
  form: {
    nameMissing: "Please enter your name.",
    nameShort: "The name needs at least {min} characters.",
    replyToMissing: "Please enter an email address or phone number.",
    replyToShort: "The reply contact is too short.",
    subjectShort: "The subject needs at least {min} characters.",
    messageMissing: "Please enter a message.",
    messageShort: "The message needs at least {min} characters.",
    remaining: "{remaining} more characters before you can send.",
    storedNote: "Your details are stored to process the request.",
    sendFailed: "The message could not be sent.",
  },
} satisfies typeof de;
