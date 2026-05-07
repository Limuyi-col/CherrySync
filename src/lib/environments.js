export function normalizeEnvironments(environments) {
  const normalized = {};

  for (const [envName, environment] of Object.entries(environments || {})) {
    normalized[envName] = normalizeEnvironment(environment, envName);
  }

  return normalized;
}

export function normalizeEnvironment(environment, fallbackName) {
  if (!environment || typeof environment !== "object") {
    throw new Error(`Invalid environment configuration: ${fallbackName}`);
  }

  if (Array.isArray(environment.servers)) {
    const servers = environment.servers.map((server, index) => normalizeServer(server, `${fallbackName}-${index + 1}`));
    if (servers.length === 0) {
      throw new Error(`Environment has no servers: ${fallbackName}`);
    }
    return {
      ...environment,
      servers,
    };
  }

  return {
    servers: [normalizeServer(environment, fallbackName)],
  };
}

export function normalizeServer(server, fallbackId) {
  if (!server || typeof server !== "object") {
    throw new Error(`Invalid server configuration: ${fallbackId}`);
  }

  const id = server.id || server.name || fallbackId;
  if (!server.host || !server.username || !server.remotePath) {
    throw new Error(`Server is missing required fields: ${id}`);
  }

  return {
    ...server,
    id,
    name: server.name || id,
    port: server.port ?? 22,
  };
}

export function getEnvironmentServers(environment) {
  return normalizeEnvironment(environment, "environment").servers;
}
