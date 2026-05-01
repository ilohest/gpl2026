// backend/emails/layouts/default.ts
export function wrapDefaultLayout(innerHtml: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta http-equiv="x-ua-compatible" content="ie=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
  </head>
  <body style="margin:0; padding:0; background:#fffef7; font-family:Arial, sans-serif; color:#333;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#fffef7;">
      <tr>
        <td align="center" style="padding:30px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;">
            <tr>
              <td style="background:#fffef7; border:1px solid #333; border-radius:20px; padding:28px; font-size:15px; line-height:1.6;">
                <style>
                  a { color:#daa5a5 !important; font-weight:bold; text-decoration:underline; }
                </style>
                ${innerHtml}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
