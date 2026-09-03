// 邮件验证码 - 无状态方案（HMAC 签名，无需建表）

import crypto from "crypto";

const CODE_TTL_SEC = 10 * 60; // 10 分钟有效

function getSecret(): string {
  return process.env.EMAIL_CODE_SECRET || "foxity-default-secret-change-me";
}

export function generateCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/**
 * 生成验证码签名 token
 * token = expiresAt.hmac
 */
export function signCode(email: string, code: string): { code: string; token: string } {
  const expiresAt = Math.floor(Date.now() / 1000) + CODE_TTL_SEC;
  const data = `${email}:${expiresAt}:${code}`;
  const hmac = crypto.createHmac("sha256", getSecret()).update(data).digest("hex");
  return { code, token: `${expiresAt}.${hmac}` };
}

/**
 * 校验验证码 token
 */
export function verifyCodeToken(token: string, email: string, code: string): boolean {
  try {
    const dotIdx = token.indexOf(".");
    if (dotIdx < 0) return false;

    const expiresAt = Number(token.substring(0, dotIdx));
    const hmac = token.substring(dotIdx + 1);

    if (!expiresAt || !hmac) return false;
    if (Date.now() / 1000 > expiresAt) return false;

    const data = `${email}:${expiresAt}:${code}`;
    const expectedHmac = crypto
      .createHmac("sha256", getSecret())
      .update(data)
      .digest("hex");

    if (hmac.length !== expectedHmac.length) return false;
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac));
  } catch (e) {
    console.error("verifyCodeToken error:", e);
    return false;
  }
}
