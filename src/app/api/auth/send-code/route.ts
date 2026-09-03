import { NextResponse } from "next/server";
import { generateCode, signCode } from "@/lib/email-code";
import { sendMail } from "@/lib/mail";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "请输入有效的邮箱地址" },
        { status: 400 }
      );
    }

    // 生成验证码并签名（邮箱统一小写存储）
    const normalizedEmail = email.trim().toLowerCase();
    const code = generateCode();
    const { token } = signCode(normalizedEmail, code);

    try {
      await sendMail({
        to: normalizedEmail,
        subject: "Foxity 注册验证码",
        text: `你的 Foxity 注册验证码是：${code}，10 分钟内有效。`,
        html: `
          <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <h2 style="color:#425a7a;">Foxity 注册验证码</h2>
            <p>你好！</p>
            <p>你的注册验证码是：</p>
            <p style="font-size:28px;font-weight:700;letter-spacing:4px;color:#f2aa72;text-align:center;padding:16px 0;">${code}</p>
            <p style="color:#9ca7b7;font-size:13px;">验证码 10 分钟内有效，请勿泄露给他人。</p>
            <p style="color:#9ca7b7;font-size:13px;">如果不是你本人操作，请忽略此邮件。</p>
          </div>
        `,
      });
    } catch (err: any) {
      console.error("Send mail error:", err);
      return NextResponse.json(
        { error: "验证码发送失败，请稍后重试" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: "验证码已发送", token });
  } catch (error: any) {
    console.error("Send-code error:", error);
    return NextResponse.json(
      { error: "发送失败", details: error?.message },
      { status: 500 }
    );
  }
}
