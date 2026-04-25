const LOCAL_DATABASE_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function getDefaultSchema() {
  return process.env.DATABASE_SCHEMA ?? 'mixmart';
}

function readUrlFromEnv(name: 'DATABASE_URL' | 'DIRECT_URL') {
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

function isLocalDatabaseHost(hostname: string) {
  return LOCAL_DATABASE_HOSTS.has(hostname) || hostname.endsWith('.local');
}

function readRequiredDatabaseUrl() {
  const databaseUrl = readUrlFromEnv('DATABASE_URL');

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required.');
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

function resolveRuntimeDatabaseUrl() {
  const databaseUrl = readRequiredDatabaseUrl();

  return applyRuntimePoolerDefaults(
    applyTlsCompatibilityDefaults(applySharedConnectionDefaults(databaseUrl)),
  );
}

function resolveDirectDatabaseUrl() {
  const databaseUrl = readUrlFromEnv('DIRECT_URL') ?? readRequiredDatabaseUrl();

  return applyTlsCompatibilityDefaults(
    applySharedConnectionDefaults(databaseUrl),
  );
}

export function getDirectDatabaseUrl() {
  return resolveDirectDatabaseUrl().toString();
}

export function getDatabaseConnection() {
  const databaseUrl = resolveRuntimeDatabaseUrl();
  const schema = databaseUrl.searchParams.get('schema') ?? getDefaultSchema();

  databaseUrl.searchParams.delete('schema');

  return {
    connectionString: databaseUrl.toString(),
    schema,
  };
}
