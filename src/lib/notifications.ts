/**
 * Email + SMS abstraction. In dev we log to console; in prod swap drivers
 * for Postmark + Twilio (each with a BAA executed for HIPAA).
 */

export interface EmailDriver {
  send(args: { to: string; subject: string; body: string }): Promise<void>;
}
export interface SMSDriver {
  send(args: { to: string; body: string }): Promise<void>;
}

class ConsoleEmail implements EmailDriver {
  async send({ to, subject, body }: { to: string; subject: string; body: string }) {
    // eslint-disable-next-line no-console
    console.log(`[EMAIL → ${to}] ${subject}\n${body}\n`);
  }
}

class ConsoleSMS implements SMSDriver {
  async send({ to, body }: { to: string; body: string }) {
    // eslint-disable-next-line no-console
    console.log(`[SMS → ${to}] ${body}`);
  }
}

let _email: EmailDriver | null = null;
let _sms: SMSDriver | null = null;

export function getEmail(): EmailDriver {
  if (_email) return _email;
  const driver = process.env.EMAIL_DRIVER ?? "console";
  if (driver === "console") {
    _email = new ConsoleEmail();
    return _email;
  }
  throw new Error(`Email driver not implemented: ${driver}`);
}

export function getSMS(): SMSDriver {
  if (_sms) return _sms;
  const driver = process.env.SMS_DRIVER ?? "console";
  if (driver === "console") {
    _sms = new ConsoleSMS();
    return _sms;
  }
  throw new Error(`SMS driver not implemented: ${driver}`);
}
