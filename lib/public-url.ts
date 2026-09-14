export function publicOrigin(request: Request) {
  const explicit = process.env.APP_URL?.trim();
  if (explicit) return new URL(explicit).origin;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const requestUrl = new URL(request.url);
  const host = forwardedHost || request.headers.get("host") || requestUrl.host;

  // If Vercel served a deployment-specific hostname, use the project's stable
  // production hostname for auth callbacks and cookies. Custom domains are left
  // alone unless APP_URL is explicitly configured.
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionHost && host.endsWith(".vercel.app") && host !== productionHost) {
    return `https://${productionHost}`;
  }

  const protocol = forwardedProto || requestUrl.protocol.replace(":", "") || "https";
  return `${protocol}://${host}`;
}
