// Run me with
// npx @digitak/esrun arwdmin.ts

import fs from "fs";
import path from "path";
import ejs from "ejs";
import prismaSdk from "@prisma/sdk";
import pascalcase from "pascalcase";
import camelcase from "camelcase";

import { pluralize } from "./lib/rwPluralize";

function ejsRender(template: string, data: any) {
  // Return type of render depends on opts.async. We're not specifying it, and
  // it default to `false`, so we know the return type will be `string`
  return ejs.render(template, data, {}) as string;
}

const { getDMMF } = prismaSdk;

console.log("aRWdmin v0.1.0");

const rwRoot = findRwRoot(path.join(process.cwd(), "..", "acm-admin"));
const modelNames = await getModelNames(rwRoot);
const pagesPath = createArwdminPagesDir(rwRoot);
const layoutPath = createArwdminLayoutDir(rwRoot);
await createModelPages(pagesPath, modelNames);
createLayout(layoutPath, modelNames);
updateRoutes(rwRoot, modelNames);

/*
 * Returns the DMMF defined by `prisma` resolving the relevant `schema.prisma` path.
 */
function getSchemaDefinitions(rwRoot: string) {
  // TODO: read 'api' name from redwood.toml
  const schemaPath = path.join(rwRoot, "api", "db", "schema.prisma");

  return getDMMF({ datamodelPath: schemaPath });
}

async function getModelNames(rwRoot: string) {
  const schema = await getSchemaDefinitions(rwRoot);
  const modelNames: string[] = [];

  for (const model of schema.datamodel.models) {
    modelNames.push(model.name);
  }

  return modelNames;
}

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
function createModelPages(pagesPath: string, modelNames: string[]) {
  for (const modelName of modelNames) {
    console.log("Creating pages for", modelName);

    const modelNameVariants = getModelNameVariants(modelName);

    const modelListPage = generateModelListPage({
      pascalCasePluralName: modelNameVariants.pascalCasePluralModelName,
    });
    const modelListCell = generateModelListCell(modelNameVariants);
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

interface ModelNameVariants {
  modelName: string;
  pluralModelName: string;
  camelCaseModelName: string;
  camelCasePluralModelName: string;
  pascalCaseModelName: string;
  pascalCasePluralModelName: string;
}

function getModelNameVariants(modelName: string): ModelNameVariants {
  return {
    modelName,
    pluralModelName: pluralize(modelName),
    camelCaseModelName: camelcase(modelName),
    camelCasePluralModelName: pluralize(camelcase(modelName)),
    pascalCaseModelName: pascalcase(modelName),
    pascalCasePluralModelName: pluralize(pascalcase(modelName)),
  };
}

function generateModelListPage({
  pascalCasePluralName,
}: {
  pascalCasePluralName: string;
}): string {
  const template: string = fs.readFileSync("./modelListPage.ejs", "utf-8");

  return ejsRender(template, { model: { pascalCasePluralName } });
}

function generateModelListCell({
  modelName,
  pluralModelName,
  camelCasePluralModelName,
}: ModelNameVariants) {
  const model = {
    name: modelName,
    pluralName: pluralModelName,
    camelPluralName: camelCasePluralModelName,
  };

  const template = fs.readFileSync("./modelListCell.ejs", "utf-8");

  return ejsRender(template, { model });
}

function generateModelListComponent({
  modelName,
  pluralModelName,
  camelCaseModelName,
  camelCasePluralModelName,
}: ModelNameVariants) {
  const model = {
    name: modelName,
    pluralName: pluralModelName,
    camelName: camelCaseModelName,
    camelPluralName: camelCasePluralModelName,
  };

  // TODO: Make sure the sr-only css class exists
  const template = fs.readFileSync("./modelListComponent.ejs", "utf-8");

  return ejsRender(template, { model });
}

function updateRoutes(rwRoot: string, modelNames: string[]) {
  let routesPath = path.join(rwRoot, "web", "src", "Routes.tsx");

  if (!fs.existsSync(routesPath)) {
    console.error("No Routes.tsx file found");
    process.exit(1);
    // TODO: For when we support JS projects:
    // routesPath = path.join(rwRoot, "web", "src", "Routes.js");
  }

  console.log("About to update", routesPath);

  const routesFileLines = fs.readFileSync(routesPath).toString().split("\n");

  const hasArwdminLayoutImport = !!routesFileLines.find((line) =>
    /^\s*import ArwdminLayout from/.test(line)
  );

  if (!hasArwdminLayoutImport) {
    // First look for Layout imports
    let existingImportIndex = findLastIndex(routesFileLines, (line) =>
      /^\s*import .+Layout\b.* from/.test(line)
    );

    if (existingImportIndex === -1) {
      // Didn't find any Layout imports. Let's look for any kind of import
      existingImportIndex = findLastIndex(routesFileLines, (line) =>
        /^\s*import .+ from/.test(line)
      );
    }

    routesFileLines.splice(
      existingImportIndex + 1,
      0,
      "import ArwdminLayout from 'src/layouts/ArwdminLayout'"
    );
  }

  const rwjsRouterImportIndex = routesFileLines.findIndex((line) =>
    /from '@redwoodjs\/router'/.test(line)
  );
  const rwjsRouterImportLine = routesFileLines[rwjsRouterImportIndex];

  if (!rwjsRouterImportLine) {
    console.error("Couldn't find @redwoodjs/router import");
    process.exit(1);
  }

  if (!/\bSet\b/.test(rwjsRouterImportLine)) {
    const insertIndex = rwjsRouterImportLine.lastIndexOf("}");
    routesFileLines[rwjsRouterImportIndex] = rwjsRouterImportLine
      .split("")
      .splice(insertIndex, 0, ", Set ")
      .join("");
  }

  const arwdminLayoutSetStartIndex = routesFileLines.findIndex((line) =>
    /<Set wrap={ArwdminLayout}>/.test(line)
  );

  if (arwdminLayoutSetStartIndex >= 0) {
    const arwdminLayoutSetEndIndex = routesFileLines.findIndex(
      (line, index) =>
        index > arwdminLayoutSetStartIndex && /<\/Set>/.test(line)
    );

    routesFileLines.splice(
      arwdminLayoutSetStartIndex,
      arwdminLayoutSetEndIndex - arwdminLayoutSetStartIndex + 1
    );
  }

  const routerEndIndex = routesFileLines.findIndex((line) =>
    /^\s*<\/Router>/.test(line)
  );
  const indent =
    "  " + routesFileLines[routerEndIndex]?.match(/^(\s*)/)?.[1] ?? "";

  let arwdminRoutesBeginIndex = routerEndIndex - 1;

  // If the "notfound" page is currently last, let's keep it there
  if (
    /^\s*<Route\s.*\snotfound\s/.test(routesFileLines[routerEndIndex - 1] || "")
  ) {
    arwdminRoutesBeginIndex--;
  }

  routesFileLines.splice(
    arwdminRoutesBeginIndex,
    0,
    `${indent}<Set wrap={ArwdminLayout}>`,
    ...modelNames.map((name) => {
      const modelNames = getModelNameVariants(name);
      const routeName = modelNames.camelCasePluralModelName;
      const pluralName = modelNames.pluralModelName;
      return `${indent}  <Route path="/arwdmin/${routeName}" page={Arwdmin${name}${pluralName}Page} name="arwdmin${pluralName}" />`;
    }),
    `${indent}</Set>`
  );

  console.log("New routes file", routesFileLines);
  fs.writeFileSync(routesPath, routesFileLines.join("\n"));
}

/**
 * Returns the index of the last element in the array where predicate is true, and -1
 * otherwise.
 * @param array The source array to search in
 * @param predicate find calls predicate once for each element of the array, in descending
 * order, until it finds one where predicate returns true. If such an element is found,
 * findLastIndex immediately returns that element index. Otherwise, findLastIndex returns -1.
 *
 * From https://stackoverflow.com/a/53187807/88106
 */
function findLastIndex<T>(
  array: Array<T>,
  predicate: (value: T, index: number, obj: T[]) => boolean
): number {
  let l = array.length;

  while (l--) {
    const arrayElement = array[l];
    if (arrayElement !== undefined && predicate(arrayElement, l, array)) {
      return l;
    }
  }

  return -1;
}

function generateLayout(modelNames: string[]) {
  const template: string = fs.readFileSync("./layout.ejs", "utf-8");
  console.log("pluralModelNames", modelNames.map(pluralize));

  return ejsRender(template, { pluralModelNames: modelNames.map(pluralize) });
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
