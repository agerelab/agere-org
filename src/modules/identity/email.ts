// Transactional email adapter (PRD-01 §6.1). One interface; the provider is chosen by env. Until a
// provider is configured (PRD-00 decision), messages are written to the server log so local
// development shows the verification and reset links.
export type OutgoingEmail = { to: string; subject: string; text: string };
export type EmailSender = (msg: OutgoingEmail) => Promise<void>;

const logSender: EmailSender = async (msg) => {
  console.log(`\n[email] to ${msg.to}\n[email] ${msg.subject}\n${msg.text}\n`);
};

let sender: EmailSender = logSender;

export function setEmailSender(s: EmailSender | undefined) {
  sender = s ?? logSender;
}

export function sendEmail(msg: OutgoingEmail) {
  return sender(msg);
}
