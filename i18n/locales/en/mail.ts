import type de from "../de/mail";

// Mails to the operator, written in the instance's language. User input goes in as parameters.
export default {
  contact: {
    subject: "Contact request from {name}",
    heading: "New contact request via the shift planner",
    id: "Contact ID: {id}",
    received: "Received: {date}",
    name: "Name: {name}",
    replyTo: "Reply contact: {replyTo}",
    subjectLine: "Subject: {subject}",
    message: "Message:",
  },
} satisfies typeof de;
