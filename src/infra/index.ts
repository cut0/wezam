import { createWeztermCli, type WeztermCli } from "./wezterm-cli.ts";
import { createEditor, type Editor } from "./editor.ts";

export type Infra = {
  weztermCli: WeztermCli;
  editor: Editor;
};

export const createInfra = (): Infra => ({
  weztermCli: createWeztermCli(),
  editor: createEditor(),
});
