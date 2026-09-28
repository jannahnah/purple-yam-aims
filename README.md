# Purple Yam AIMS

Purple Yam Automated Inventory Management System built with Next.js, Prisma, and PostgreSQL.

## Getting Started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Owner Password Recovery

Owner self-service password recovery uses a 6-digit email verification code followed by a short-lived, one-time reset token.

Configure these server environment variables:

```env
RESEND_API_KEY=...
PASSWORD_RESET_FROM_EMAIL=Purple Yam AIMS <onboarding@resend.dev>
```

For current testing, use `onboarding@resend.dev` as the sender. Resend documents this sender in its test/quickstart examples. For production delivery from a custom address, add and verify a domain in Resend and then change this variable.

Staff (Branch Manager/Cashier) password recovery is intentionally handled by the Owner through User Management. When the Owner resets a staff password, `mustChangePassword` is set to `true`, so the staff member is redirected to the Change Password screen after signing in with the temporary password.
