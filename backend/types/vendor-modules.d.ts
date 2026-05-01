// backend/types/vendor-modules.d.ts
declare module "nodemailer" {
  type TransportOptions = {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user?: string | undefined;
      pass?: string | undefined;
    };
    logger?: boolean;
    debug?: boolean;
  };

  type TransporterLike = {
    verify: () => Promise<void>;
    sendMail: (mail: Record<string, unknown>) => Promise<unknown>;
  };

  const nodemailer: {
    createTransport: (opts: TransportOptions) => TransporterLike;
  };
  export default nodemailer;
}

declare module "html-to-text" {
  export function htmlToText(
    html: string,
    options?: Record<string, unknown>,
  ): string;
}

declare module "jsdom" {
  export class JSDOM {
    constructor(html?: string);
    window: any;
  }
}

declare module "nodemailer/lib/nodemailer.js" {
  const nodemailer: unknown;
  export default nodemailer;
}

declare module "html-to-text/lib/html-to-text.mjs" {
  export function htmlToText(
    html: string,
    options?: Record<string, unknown>,
  ): string;
}

declare module "jsdom/lib/api.js" {
  export class JSDOM {
    constructor(html?: string);
    window: any;
  }
}
