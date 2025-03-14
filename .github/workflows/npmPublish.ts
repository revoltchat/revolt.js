import { build, emptyDir } from "jsr:@deno/dnt";
import pkg from "../../deno.json" with { type: "json" };
import tsc from "../../tsconfig.json" with { type: "json" };

await emptyDir("npm");

await build({
  entryPoints: ["src/index.ts"],
  esModule: true,
  outDir: "npm",
  scriptModule: false,
  shims: {},
  skipNpmInstall: true,
  skipSourceOutput: true,
  test: false,
  package: {
    name: "revolt.js",
    version: pkg.version,
    type: "module",
    module: "lib/index.js",
    types: "lib/index.d.ts",
    repository: {
      type: "git",
      url: "git+https://github.com/revoltchat/revolt.js.git",
    },
    author: "Paul Makles <insrt.uk>",
    license: "MIT",
    description: "Library for interacting with the Revolt API.",
    dependencies: Object.fromEntries(
      Object.values(pkg.imports).map((dep) => {
        dep = dep.replace("npm:", "");

        const lastAtIndex = dep.lastIndexOf("@");
        return [dep.slice(0, lastAtIndex), dep.slice(lastAtIndex + 1)];
      }),
    ),
    engines: {
      node: ">=22.0.0",
    },
  },
  compilerOptions: {
    ...tsc.compilerOptions,
    lib: ["ES2022", "DOM"],
    target: "ES2022",
  },
  postBuild() {
    Deno.renameSync("npm/esm", "npm/lib");
    Deno.removeSync("npm/.npmignore");
    Deno.copyFileSync("README.md", "npm/README.md");
    Deno.copyFileSync("LICENSE", "npm/LICENSE");

    const messageEmbedCode = Deno.readTextFileSync(
      "npm/lib/classes/MessageEmbed.js",
    ).replace(
      'import * as dntShim from "../_dnt.shims.js";\n',
      "",
    ).replace("dntShim.dntGlobalThis", "globalThis");

    Deno.writeTextFileSync("npm/lib/classes/MessageEmbed.js", messageEmbedCode);

    Deno.removeSync("npm/lib/_dnt.shims.js");
    Deno.removeSync("npm/lib/_dnt.shims.d.ts");
  },
});
