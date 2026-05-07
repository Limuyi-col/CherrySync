import prompts from "prompts";

export async function selectServersForEnvironment(environment, envName, options = {}) {
  const servers = environment.servers || [];
  if (servers.length === 0) {
    throw new Error(`Environment has no servers: ${envName}`);
  }

  if (options.serverId) {
    const matched = servers.find((server) => server.id === options.serverId || server.name === options.serverId);
    if (!matched) {
      throw new Error(`Unknown server in [${envName}]: ${options.serverId}`);
    }
    return [matched];
  }

  if (servers.length === 1 || !process.stdout.isTTY) {
    return servers;
  }

  const response = await prompts(
    {
      type: "multiselect",
      name: "selected",
      message: `Select target server(s) for [${envName}]`,
      choices: servers.map((server) => ({
        title: `${server.id} (${server.username}@${server.host}:${server.remotePath})`,
        value: server.id,
        selected: true,
      })),
      instructions: false,
      min: 1,
    },
    {
      onCancel: () => {
        throw new Error("Operation cancelled.");
      },
    },
  );

  return servers.filter((server) => response.selected.includes(server.id));
}

export async function selectSingleServer(environment, envName, options = {}) {
  const selected = await selectServersForEnvironment(environment, envName, options);
  if (selected.length === 1) {
    return selected[0];
  }

  if (!process.stdout.isTTY) {
    return selected[0];
  }

  const response = await prompts(
    {
      type: "select",
      name: "serverId",
      message: `Select one server for [${envName}]`,
      choices: selected.map((server) => ({
        title: `${server.id} (${server.username}@${server.host}:${server.remotePath})`,
        value: server.id,
      })),
      initial: 0,
    },
    {
      onCancel: () => {
        throw new Error("Operation cancelled.");
      },
    },
  );

  return selected.find((server) => server.id === response.serverId) || selected[0];
}
