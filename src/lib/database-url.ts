const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

type DatabaseUrlEnvName =
  | 'DATABASE_URL'
  | 'DB_DIRECT_URL'
  | 'DB_POOLER_URL'
  | 'DIRECT_URL'
  | 'TEST_DATABASE_URL';

function getDefaultSchema() {
  if (process.env.NODE_ENV === 'test') {
    return 'public';
  }

  return process.env.DATABASE_SCHEMA ?? 'mixmart';
}

function readUrlFromEnv(name: DatabaseUrlEnvName) {
  const value = process.env[name];

  if (!value) {
    return null;
  }

  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} is not a valid URL.`);
  }
}

function readFirstUrlFromEnv(names: DatabaseUrlEnvName[]) {
  for (const name of names) {
    const databaseUrl = readUrlFromEnv(name);

    if (databaseUrl) {
      return databaseUrl;
    }
  }

  return null;
}

function isLocalDatabaseHost(hostname: string) {
  return LOCAL_DATABASE_HOSTS.has(hostname) || hostname.endsWith('.local');
}

function readRequiredDatabaseUrl() {
  const databaseUrl =
    process.env.NODE_ENV === 'test'
      ? readUrlFromEnv('TEST_DATABASE_URL')
      : readFirstUrlFromEnv(['DB_POOLER_URL', 'DATABASE_URL']);

  if (!databaseUrl) {
    throw new Error(
      process.env.NODE_ENV === 'test'
        ? 'TEST_DATABASE_URL is required.'
        : 'DB_POOLER_URL is required.',
    );
  }

  return databaseUrl;
}

function readRequiredDirectDatabaseUrl() {
  const databaseUrl =
    process.env.NODE_ENV === 'test'
      ? readUrlFromEnv('TEST_DATABASE_URL')
      : readFirstUrlFromEnv(['DB_DIRECT_URL', 'DIRECT_URL']);

  if (!databaseUrl) {
    throw new Error(
      process.env.NODE_ENV === 'test'
        ? 'TEST_DATABASE_URL is required.'
        : 'DB_DIRECT_URL is required.',
    );
  }

  return databaseUrl;
}

function applySharedConnectionDefaults(databaseUrl: URL) {
  if (!databaseUrl.searchParams.get('schema')) {
    databaseUrl.searchParams.set('schema', getDefaultSchema());
  }

  if (
    !databaseUrl.searchParams.get('sslmode') &&
    !isLocalDatabaseHost(databaseUrl.hostname)
  ) {
    databaseUrl.searchParams.set(
      'sslmode',
      process.env.DB_SSLMODE ?? 'require',
    );
  }

  return databaseUrl;
}

function applyTlsCompatibilityDefaults(databaseUrl: URL) {
  const sslMode = databaseUrl.searchParams.get('sslmode');
  const explicitCompat = process.env.DB_USE_LIBPQ_COMPAT;
  const shouldUseLibpqCompat =
    explicitCompat === undefined
      ? process.env.NODE_ENV !== 'production'
      : explicitCompat === 'true';

  // In local/dev environments, this avoids TLS verification issues caused by
  // corporate/self-signed certificate chains while keeping production strict by default.
  if (
    shouldUseLibpqCompat &&
    sslMode === 'require' &&
    !databaseUrl.searchParams.get('uselibpqcompat')
  ) {
    databaseUrl.searchParams.set('uselibpqcompat', 'true');
  }

  return databaseUrl;
}

function applyRuntimePoolerDefaults(databaseUrl: URL) {
  if (databaseUrl.hostname.endsWith('pooler.supabase.com')) {
    if (!databaseUrl.searchParams.get('pgbouncer')) {
      databaseUrl.searchParams.set('pgbouncer', 'true');
    }

    if (!databaseUrl.searchParams.get('connection_limit')) {
      databaseUrl.searchParams.set('connection_limit', '1');
    }
  }

  return databaseUrl;
}

function normalizeDatabaseUrl(databaseUrl: URL) {
  return applyTlsCompatibilityDefaults(
    applySharedConnectionDefaults(databaseUrl),
  );
}

function resolveRuntimeDatabaseUrl() {
  return applyRuntimePoolerDefaults(
    normalizeDatabaseUrl(readRequiredDatabaseUrl()),
  );
}

function resolveDirectDatabaseUrl() {
  return normalizeDatabaseUrl(readRequiredDirectDatabaseUrl());
}

function buildConnectionInfo(databaseUrl: URL) {
  const schema = databaseUrl.searchParams.get('schema') ?? getDefaultSchema();
  const connectionUrl = new URL(databaseUrl.toString());

  connectionUrl.searchParams.delete('schema');

  return {
    connectionString: connectionUrl.toString(),
    schema,
  };
}

export function getDirectDatabaseUrl() {
  return resolveDirectDatabaseUrl().toString();
}

export function getDatabaseConnection() {
  return buildConnectionInfo(resolveRuntimeDatabaseUrl());
}

export function getDirectDatabaseConnection() {
  return buildConnectionInfo(resolveDirectDatabaseUrl());
}
