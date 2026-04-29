function readEnv(name, fallback = "") {
  return process.env[name] ?? fallback;
}

function requireEnv(name) {
  const value = readEnv(name);

  if (!value) {
    throw new Error(`Variabile ambiente mancante: ${name}`);
  }

  return value;
}

function normalizePrivateKey() {
  const base64Key = readEnv("SHAREPOINT_PRIVATE_KEY_BASE64");
  if (base64Key) {
    return Buffer.from(base64Key, "base64").toString("utf8").trim();
  }

  const rawKey = readEnv("SHAREPOINT_PRIVATE_KEY");
  if (!rawKey) {
    throw new Error(
      "Serve SHAREPOINT_PRIVATE_KEY oppure SHAREPOINT_PRIVATE_KEY_BASE64 per autenticarsi con il certificato."
    );
  }

  return rawKey.replace(/\\n/g, "\n").trim();
}

function getSharePointAuthConfig() {
  const clientSecret = readEnv("SHAREPOINT_CLIENT_SECRET").trim();

  if (clientSecret) {
    return {
      authMode: "client-secret",
      clientSecret
    };
  }

  return {
    authMode: "certificate",
    thumbprint: requireEnv("SHAREPOINT_THUMBPRINT").replace(/\s+/g, ""),
    privateKey: normalizePrivateKey()
  };
}

function getMediaSigningSecret() {
  const candidate =
    readEnv("MEDIA_SIGNING_SECRET") ||
    readEnv("SHAREPOINT_PRIVATE_KEY_BASE64") ||
    readEnv("SHAREPOINT_PRIVATE_KEY") ||
    readEnv("SHAREPOINT_CLIENT_SECRET") ||
    readEnv("BASIC_AUTH_PASSWORD");

  if (!candidate) {
    throw new Error(
      "Serve MEDIA_SIGNING_SECRET oppure una credenziale server-side SharePoint per firmare i Media URL pubblici."
    );
  }

  return candidate.trim();
}

export function getConfig() {
  return {
    sharePoint: {
      tenantId: requireEnv("SHAREPOINT_TENANT_ID"),
      clientId: requireEnv("SHAREPOINT_CLIENT_ID"),
      ...getSharePointAuthConfig(),
      hostname: readEnv("SHAREPOINT_HOSTNAME", "isaia.sharepoint.com"),
      sitePath: readEnv("SHAREPOINT_SITE_PATH", "/sites/branding"),
      driveName: readEnv("SHAREPOINT_DRIVE_NAME", "Documenti condivisi"),
      baseFolder: readEnv("SHAREPOINT_BASE_FOLDER", "Shared Folder/02_Collezioni")
    },
    pinterest: {
      appId: readEnv("PINTEREST_APP_ID", ""),
      appSecret: readEnv("PINTEREST_APP_SECRET", ""),
      accessToken: readEnv("PINTEREST_ACCESS_TOKEN", ""),
      refreshToken: readEnv("PINTEREST_REFRESH_TOKEN", ""),
      titlePrefix: readEnv("PINTEREST_TITLE_PREFIX", "Isaia Napoli"),
      descriptionPrefix: readEnv("PINTEREST_DESCRIPTION_PREFIX", "ISAIA Napoli"),
      linkUrl: readEnv("PINTEREST_LINK_URL", "https://www.isaia.it/"),
      thumbnailMode: readEnv("PINTEREST_THUMBNAIL_MODE", "blank")
    },
    app: {
      publicOrigin: readEnv("PUBLIC_APP_ORIGIN"),
      mediaSigningSecret: getMediaSigningSecret()
    }
  };
}
