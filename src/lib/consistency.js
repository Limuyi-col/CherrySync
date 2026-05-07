export function checkConsistency(state, envName, environment) {
  const envState = state[envName] ?? {};
  const servers = environment.servers || [];

  if (servers.length <= 1) {
    return { consistent: true, issues: [], serverCount: servers.length };
  }

  const issues = [];
  const allFiles = new Set();

  for (const server of servers) {
    const serverState = envState[server.id] ?? {};
    for (const filePath of Object.keys(serverState)) {
      allFiles.add(filePath);
    }
  }

  for (const filePath of [...allFiles].sort()) {
    const serverStatus = [];
    let referenceDigest = null;
    let isConsistent = true;

    for (const server of servers) {
      const digest = envState[server.id]?.[filePath] ?? null;
      serverStatus.push({ serverId: server.id, digest });

      if (digest === null) {
        isConsistent = false;
      } else if (referenceDigest === null) {
        referenceDigest = digest;
      } else if (digest !== referenceDigest) {
        isConsistent = false;
      }
    }

    if (!isConsistent) {
      issues.push({
        path: filePath,
        type: "inconsistent",
        servers: serverStatus,
      });
    }
  }

  for (const server of servers) {
    const serverState = envState[server.id] ?? {};
    const serverFiles = new Set(Object.keys(serverState));

    for (const otherServer of servers) {
      if (otherServer.id === server.id) continue;
      const otherState = envState[otherServer.id] ?? {};
      const otherFiles = new Set(Object.keys(otherState));

      for (const filePath of [...otherFiles].sort()) {
        if (
          !serverFiles.has(filePath) &&
          !issues.some((i) => i.path === filePath)
        ) {
          issues.push({
            path: filePath,
            type: "missing",
            servers: servers.map((s) => ({
              serverId: s.id,
              digest: envState[s.id]?.[filePath] ?? null,
            })),
          });
        }
      }
    }
  }

  const uniqueIssues = [];
  const seen = new Set();
  for (const issue of issues) {
    if (!seen.has(issue.path)) {
      seen.add(issue.path);
      uniqueIssues.push(issue);
    }
  }

  return {
    consistent: uniqueIssues.length === 0,
    issues: uniqueIssues,
    serverCount: servers.length,
  };
}
