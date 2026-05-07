export const WORKSPACE_DIRNAME = ".csync";
export const SERVER_FILE_NAME = ".csync/servers.json";
export const DEFAULT_ENVIRONMENTS = ["test", "prod"];
export const DEFAULT_IGNORE = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.csync/**",
  "**/.idea/**",
  "**/.vscode/**",
  ".DS_Store",
  "*.log",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.cache/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/.turbo/**"
];
export const DEFAULT_CONFIG = {
  ignore: DEFAULT_IGNORE,
  serverSource: {
    path: SERVER_FILE_NAME,
    mode: "embedded"
  },
  environments: {}
};
export const DEFAULT_STATE = {
  test: {},
  prod: {}
};
