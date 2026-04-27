import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { authenticator } from "otplib";
import { prisma } from "./lib/db";
import { decryptPHI } from "./lib/crypto";
import { audit } from "./lib/audit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: { signIn: "/sign-in" },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        totp: { label: "TOTP code", type: "text" },
      },
      async authorize(creds) {
        const email = String(creds?.email ?? "").toLowerCase().trim();
        const password = String(creds?.password ?? "");
        const totp = creds?.totp ? String(creds.totp) : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) return null;
        const ok = await bcrypt.compare(password, user.passwordHash);
        if (!ok) {
          await audit({ action: "auth.failed", metadata: { email } });
          return null;
        }
        if (user.totpSecret) {
          const secret = decryptPHI(user.totpSecret);
          if (!secret) return null;
          if (!totp || !authenticator.verify({ token: totp, secret })) {
            await audit({ userId: user.id, action: "auth.mfa_failed" });
            return null;
          }
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        await audit({ userId: user.id, action: "auth.login" });
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? user.email,
          role: user.role,
        } as never;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { id: string; role: string };
        token.id = u.id;
        token.role = u.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string; role?: string }).id = token.id as string;
        (session.user as { id?: string; role?: string }).role = token.role as string;
      }
      return session;
    },
  },
});
