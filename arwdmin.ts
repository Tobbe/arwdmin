// Run me with
// npx @digitak/esrun arwdmin.ts

import fs from "fs";
import path from "path";
import ejs from "ejs";
import type { DMMF } from "@prisma/generator-helper";

import { updateRoutes } from "./routes";
import {
  getModelFields,
  getModelNames,
  getModelNameVariants,
  ModelNameVariants,
} from "./schema";
import { prettify } from "./prettier";

function ejsRender(template: string, data: any) {
  // Return type of render depends on opts.async. We're not specifying it, and
  // it defaults to `false`, so we know the return type will be `string`
  return prettify(ejs.render(template, data, {}) as string, 'ts');
}

console.log("aRWdmin v0.1.0");

const rwRoot = findRwRoot(path.join(process.cwd(), "..", "acm-admin"));
const modelNames = await getModelNames(rwRoot);
const pagesPath = createArwdminPagesDir(rwRoot);
const layoutPath = createArwdminLayoutDir(rwRoot);
await createModelPages(rwRoot, pagesPath, modelNames);
createLayout(layoutPath, modelNames);
updateRoutes(rwRoot, modelNames);

function findRwRoot(dir = process.cwd()): string {
  if (fs.existsSync(path.join(dir, "redwood.toml"))) {
    return dir;
  }

  return findRwRoot(dir.split(path.sep).slice(0, -1).join(path.sep));
}

function createArwdminPagesDir(rwRoot: string) {
  // TODO: read 'web' name from redwood.toml
  const pagesPath = path.join(rwRoot, "web", "src", "pages", "Arwdmin");

  // TODO: Prompt if this dir already exists if this is the first time running
  // aRWdmin
  // Begin by deleting to make sure we're removing pages for models that the
  // user has removed
  fs.rmSync(pagesPath, { recursive: true, force: true });
  fs.mkdirSync(pagesPath);

  return pagesPath;
}

// TODO: Skip (and warn) models that don't have an id column
// TODO: Test with pokemon.
//       Test with DVD (all-caps model).
//       Test with QRCode (partly all-caps).
//       Test with single-character model names, both upper- and lowercase
async function createModelPages(
  rwRoot: string,
  pagesPath: string,
  modelNames: string[]
) {
  for (const modelName of modelNames) {
    console.log("Creating pages for", modelName);
    const fields = await getModelFields(rwRoot, modelName);

    const modelNameVariants = getModelNameVariants(modelName);

    const modelListPage = generateModelListPage({
      pascalCasePluralName: modelNameVariants.pascalCasePluralModelName,
    });
    const modelListCell = generateModelListCell(modelNameVariants, fields);
    const modelListComponent = generateModelListComponent(modelNameVariants);
    // const modelPage = generateModelComponent(modelNameVariants);
    // const modelCell = generateModelComponent(modelNameVariants);
    // const modelComponent = generateModelComponent(modelNameVariants);

    fs.mkdirSync(
      path.join(
        pagesPath,
        modelNameVariants.pascalCaseModelName,
        modelNameVariants.pascalCasePluralModelName + "Page"
      ),
      { recursive: true }
    );

    fs.writeFileSync(
      path.join(
        pagesPath,
        modelNameVariants.pascalCaseModelName,
        modelNameVariants.pascalCasePluralModelName + "Page",
        modelNameVariants.pascalCasePluralModelName + "Page.tsx"
      ),
      modelListPage
    );

    fs.writeFileSync(
      path.join(
        pagesPath,
        modelNameVariants.pascalCaseModelName,
        modelNameVariants.pascalCasePluralModelName + "Page",
        modelNameVariants.pascalCasePluralModelName + ".tsx"
      ),
      modelListComponent
    );

    fs.writeFileSync(
      path.join(
        pagesPath,
        modelNameVariants.pascalCaseModelName,
        modelNameVariants.pascalCasePluralModelName + "Page",
        modelNameVariants.pascalCasePluralModelName + "Cell.tsx"
      ),
      modelListCell
    );
  }
}

function generateModelListPage({
  pascalCasePluralName,
}: {
  pascalCasePluralName: string;
}): string {
  const template: string = fs.readFileSync("./modelListPage.ejs", "utf-8");

  return ejsRender(template, { model: { pascalCasePluralName } });
}

function generateModelListCell(
  { modelName, pluralModelName, camelCasePluralModelName }: ModelNameVariants,
  modelFields: DMMF.Field[]
) {
  const model = {
    name: modelName,
    pluralName: pluralModelName,
    camelPluralName: camelCasePluralModelName,
  };

  const template = fs.readFileSync("./modelListCell.ejs", "utf-8");

  return ejsRender(template, { model, modelFields });
}

function generateModelListComponent({
  modelName,
  pascalCasePluralModelName,
  pascalCaseModelName,
  camelCaseModelName,
  camelCasePluralModelName,
}: ModelNameVariants) {
  const model = {
    name: modelName,
    pluralName: pascalCasePluralModelName,
    pascalName: pascalCaseModelName,
    camelName: camelCaseModelName,
    camelPluralName: camelCasePluralModelName,
  };

  // TODO: Make sure the sr-only css class exists
  const template = fs.readFileSync("./modelListComponent.ejs", "utf-8");

  return ejsRender(template, { model });
}

function generateLayout(modelNames: string[]) {
  const template: string = fs.readFileSync("./layout.ejs", "utf-8");

  return ejsRender(template, {
    pluralModelNames: modelNames.map(
      (name) => getModelNameVariants(name).pascalCasePluralModelName
    ),
  });
}

function createArwdminLayoutDir(rwRoot: string) {
  // TODO: read 'web' name from redwood.toml
  const layoutPath = path.join(
    rwRoot,
    "web",
    "src",
    "layouts",
    "ArwdminLayout"
  );

  // TODO: Prompt if this dir already exists if this is the first time running
  // aRWdmin
  if (!fs.existsSync(layoutPath)) {
    fs.mkdirSync(layoutPath, { recursive: true });
  }

  return layoutPath;
}

// TODO: Filter models first, then pass the same list here and to `createModelPages`
function createLayout(layoutPath: string, modelNames: string[]) {
  const layout = generateLayout(modelNames);

  fs.writeFileSync(path.join(layoutPath, "ArwdminLayout.tsx"), layout);
}
