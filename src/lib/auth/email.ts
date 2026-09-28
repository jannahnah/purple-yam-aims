const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendPasswordResetCodeEmail({
  to,
  code,
}: {
  to: string;
  code: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.PASSWORD_RESET_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error(
      "Password reset email is not configured. Set RESEND_API_KEY and PASSWORD_RESET_FROM_EMAIL."
    );
  }

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Purple Yam AIMS Password Reset Code",
      text: [
        "A password reset was requested for your Purple Yam AIMS Owner account.",
        "",
        `Verification code: ${code}`,
        "",
        "This code expires in 10 minutes.",
        "If you did not request this, you can ignore this email.",
      ].join("\n"),
    }),
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(
      `Password reset email failed (${response.status}): ${message || "Unknown error"}`
    );
  }
}
