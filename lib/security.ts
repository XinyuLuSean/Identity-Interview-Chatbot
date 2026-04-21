import { createHmac, timingSafeEqual } from "crypto";

type SignedTokenPayload = {
  iat: number;
  [key: string]: unknown;
};

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function createSignature(payloadSegment: string, secret: string) {
  return createHmac("sha256", secret).update(payloadSegment).digest("base64url");
}

export function getAppSecuritySecret() {
  const configuredSecret = process.env.APP_SESSION_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_SESSION_SECRET is not configured.");
  }

  return "development-only-identity-session-secret";
}

export function timingSafeEqualString(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function issueSignedToken(payload: Record<string, unknown>) {
  const tokenPayload: SignedTokenPayload = {
    ...payload,
    iat: Date.now(),
  };
  const payloadSegment = base64UrlEncode(JSON.stringify(tokenPayload));
  const signatureSegment = createSignature(payloadSegment, getAppSecuritySecret());

  return `${payloadSegment}.${signatureSegment}`;
}

export function verifySignedToken<T extends SignedTokenPayload>(
  token: string | undefined,
  maxAgeMs: number,
): T | null {
  if (!token) {
    return null;
  }

  const [payloadSegment, signatureSegment] = token.split(".");
  if (!payloadSegment || !signatureSegment) {
    return null;
  }

  const expectedSignature = createSignature(payloadSegment, getAppSecuritySecret());
  if (!timingSafeEqualString(signatureSegment, expectedSignature)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(payloadSegment)) as T;
    if (typeof payload.iat !== "number") {
      return null;
    }

    if (Date.now() - payload.iat > maxAgeMs) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
