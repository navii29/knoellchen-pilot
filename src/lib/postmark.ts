import { ServerClient } from "postmark";

let _client: ServerClient | null = null;

export const postmark = (): ServerClient => {
  if (_client) return _client;
  const token = process.env.POSTMARK_SERVER_TOKEN;
  if (!token) {
    throw new Error(
      "POSTMARK_SERVER_TOKEN fehlt — E-Mail-Versand nicht möglich. In .env.local hinzufügen."
    );
  }
  _client = new ServerClient(token);
  return _client;
};

export type SendArgs = {
  from: string;
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  attachments?: Array<{
    name: string;
    contentBase64: string;
    contentType: string;
  }>;
  replyTo?: string;
};

export const sendEmail = async (args: SendArgs) => {
  const c = postmark();
  return c.sendEmail({
    From: args.from,
    To: args.to,
    Subject: args.subject,
    HtmlBody: args.htmlBody,
    TextBody: args.textBody,
    ReplyTo: args.replyTo,
    MessageStream: "outbound",
    Attachments: args.attachments?.map((a) => ({
      Name: a.name,
      Content: a.contentBase64,
      ContentType: a.contentType,
      ContentID: null,
    })),
  });
};
