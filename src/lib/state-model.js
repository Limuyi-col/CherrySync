export function normalizeStateShape(state, environments) {
  const next = {};

  for (const [envName, environment] of Object.entries(environments || {})) {
    const servers = environment.servers || [];
    const envState = state?.[envName];
    next[envName] = {};

    if (isLegacyFileMap(envState)) {
      const firstServer = servers[0];
      if (firstServer) {
        next[envName][firstServer.id] = { ...envState };
      }
    }

    if (envState && typeof envState === "object") {
      for (const server of servers) {
        const serverState = envState[server.id];
        next[envName][server.id] = serverState && typeof serverState === "object" ? { ...serverState } : next[envName][server.id] || {};
      }
    } else {
      for (const server of servers) {
        next[envName][server.id] = {};
      }
    }
  }

  return next;
}

export function collectEffectiveStateForEnvironment(state, envName) {
  const envState = state?.[envName];
  if (!envState || typeof envState !== "object") {
    return {};
  }

  const effective = {};
  for (const serverState of Object.values(envState)) {
    if (!serverState || typeof serverState !== "object") {
      continue;
    }
    for (const [filePath, digest] of Object.entries(serverState)) {
      if (!(filePath in effective)) {
        effective[filePath] = [];
      }
      effective[filePath].push(digest);
    }
  }
  return effective;
}

export function isFullySyncedAcrossServers(envState, filePath, digest, serverIds) {
  return serverIds.every((serverId) => envState?.[serverId]?.[filePath] === digest);
}

export function hasFileOnAnyServer(envState, filePath) {
  return Object.values(envState || {}).some((serverState) => serverState && typeof serverState === "object" && filePath in serverState);
}

function isLegacyFileMap(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const firstValue = Object.values(value)[0];
  return typeof firstValue === "string" || typeof firstValue === "undefined";
}
