import fs from "fs";
import path from "path";
import { Project, SourceFile, Node, SyntaxKind } from "ts-morph";
import { AppError } from "../utils/errors";
import { DiscoveredRoute, Project as RegisteredProject } from "../utils/types";

const HTTP_METHODS = ["get", "post", "put", "patch", "delete"];

/**
 * Joins a mount prefix and a route path into a single normalized URL path.
 */
function joinRoutePath(prefix: string, subPath: string): string {
  const cleanSub = subPath === "/" ? "" : subPath;
  let combined = `${prefix}/${cleanSub}`;
  combined = combined.replace(/\/+/g, "/");
  if (combined.length > 1 && combined.endsWith("/")) {
    combined = combined.slice(0, -1);
  }
  if (!combined.startsWith("/")) {
    combined = `/${combined}`;
  }
  return combined;
}

/**
 * Builds a map of local identifier name -> resolved absolute file path,
 * based on the import declarations of a source file. Imports that cannot
 * be resolved (e.g. npm packages like "express") are skipped.
 */
function buildImportMap(sourceFile: SourceFile): Map<string, string> {
  const map = new Map<string, string>();

  for (const importDecl of sourceFile.getImportDeclarations()) {
    const resolvedFile = importDecl.getModuleSpecifierSourceFile();
    if (!resolvedFile) continue;

    const resolvedPath = resolvedFile.getFilePath();

    const defaultImport = importDecl.getDefaultImport();
    if (defaultImport) {
      map.set(defaultImport.getText(), resolvedPath);
    }

    const namespaceImport = importDecl.getNamespaceImport();
    if (namespaceImport) {
      map.set(namespaceImport.getText(), resolvedPath);
    }

    for (const named of importDecl.getNamedImports()) {
      const localName = named.getAliasNode()?.getText() ?? named.getName();
      map.set(localName, resolvedPath);
    }
  }

  return map;
}

/**
 * Builds a map of top-level `const X = [...]` array literals in a file,
 * used to detect the common `moduleRoutes.forEach(r => router.use(r.path, r.route))` pattern.
 */
function buildArrayLiteralMap(sourceFile: SourceFile): Map<string, Node[]> {
  const map = new Map<string, Node[]>();

  for (const varStatement of sourceFile.getVariableStatements()) {
    for (const decl of varStatement.getDeclarations()) {
      const initializer = decl.getInitializer();
      if (initializer && Node.isArrayLiteralExpression(initializer)) {
        map.set(decl.getName(), initializer.getElements());
      }
    }
  }

  return map;
}

/**
 * Finds a top-level `const X = { ... }` object literal declaration in a file by name.
 * Used to unwrap namespace-style re-exports like `export const Routes = { v1Routes: v1Router }`.
 */
function findObjectLiteralByName(sourceFile: SourceFile, name: string): Node | null {
  for (const varStatement of sourceFile.getVariableStatements()) {
    for (const decl of varStatement.getDeclarations()) {
      if (decl.getName() !== name) continue;
      const initializer = decl.getInitializer();
      if (initializer && Node.isObjectLiteralExpression(initializer)) {
        return initializer;
      }
    }
  }
  return null;
}

/**
 * Checks whether a name is declared as a top-level variable in a file
 * (used to detect "this identifier is local to the file, not imported").
 */
function isLocalVariable(sourceFile: SourceFile, name: string): boolean {
  for (const varStatement of sourceFile.getVariableStatements()) {
    for (const decl of varStatement.getDeclarations()) {
      if (decl.getName() === name) return true;
    }
  }
  return false;
}

/**
 * Reads a named property's initializer expression off an object literal,
 * supporting both `{ key: value }` and shorthand `{ key }` forms.
 */
function getObjectLiteralPropertyInitializer(
  objectLiteral: Node,
  propName: string
): Node | null {
  if (!Node.isObjectLiteralExpression(objectLiteral)) return null;

  for (const prop of objectLiteral.getProperties()) {
    if (Node.isPropertyAssignment(prop) && prop.getName() === propName) {
      return prop.getInitializer() ?? null;
    }
    if (Node.isShorthandPropertyAssignment(prop) && prop.getName() === propName) {
      return prop.getNameNode();
    }
  }
  return null;
}

/**
 * Resolves a mount target expression (e.g. `SomeRouter`, or `Routes.v1Routes`) to the
 * absolute file path that should be scanned for its routes.
 *
 * Handles three cases:
 * 1. Direct import: `import SomeRouter from './x'` -> `x`'s file.
 * 2. Local declaration: identifier declared in the current file -> the current file itself.
 * 3. Namespace re-export indirection: `Routes.v1Routes` where `Routes` is an object literal
 *    (possibly in another file) whose `v1Routes` property points at yet another imported
 *    router — followed recursively until a concrete file is found.
 */
function resolveMountTarget(
  expr: Node,
  contextFile: SourceFile,
  project: Project,
  depth = 0
): string | null {
  if (depth > 10) return null; // guard against pathological reference chains

  if (Node.isIdentifier(expr)) {
    const name = expr.getText();
    const importMap = buildImportMap(contextFile);

    const importedFile = importMap.get(name);
    if (importedFile) return importedFile;

    if (isLocalVariable(contextFile, name)) {
      return contextFile.getFilePath();
    }

    return null;
  }

  if (Node.isPropertyAccessExpression(expr)) {
    const propName = expr.getName();
    const baseExpr = expr.getExpression();

    if (!Node.isIdentifier(baseExpr)) {
      // Deep chains (a.b.c...): fall back to resolving just the base expression.
      return resolveMountTarget(baseExpr, contextFile, project, depth + 1);
    }

    const baseName = baseExpr.getText();
    const importMap = buildImportMap(contextFile);
    const importedBaseFile = importMap.get(baseName);

    if (importedBaseFile) {
      const baseSourceFile =
        project.getSourceFile(importedBaseFile) ?? project.addSourceFileAtPath(importedBaseFile);

      const objectLiteral = findObjectLiteralByName(baseSourceFile, baseName);
      if (objectLiteral) {
        const propInit = getObjectLiteralPropertyInitializer(objectLiteral, propName);
        if (propInit) {
          return resolveMountTarget(propInit, baseSourceFile, project, depth + 1);
        }
      }

      // Couldn't unwrap the object literal precisely — fall back to scanning the whole file.
      return importedBaseFile;
    }

    // Base is a local object literal in the current file (e.g. `const Routes = {...}` used
    // in the same file it's defined).
    const localObjectLiteral = findObjectLiteralByName(contextFile, baseName);
    if (localObjectLiteral) {
      const propInit = getObjectLiteralPropertyInitializer(localObjectLiteral, propName);
      if (propInit) {
        return resolveMountTarget(propInit, contextFile, project, depth + 1);
      }
    }

    return null;
  }

  return null;
}

/**
 * Walks back through a chained call like `router.route('/x').get(h1).post(h2)` to find
 * the path passed to the originating `.route(path)` call. Each `.get()/.post()/etc` in the
 * chain is itself a CallExpression whose "object" is either the `.route(path)` call or
 * another link further up the same chain.
 */
function findChainedRoutePath(node: Node): string | null {
  if (!Node.isCallExpression(node)) return null;

  const inner = node.getExpression();
  if (!Node.isPropertyAccessExpression(inner)) return null;

  const name = inner.getName();

  if (name === "route") {
    const args = node.getArguments();
    if (args[0] && Node.isStringLiteral(args[0])) {
      return args[0].getLiteralValue();
    }
    return null;
  }

  if (HTTP_METHODS.includes(name)) {
    return findChainedRoutePath(inner.getExpression());
  }

  return null;
}

/**
 * Recursively scans a TypeScript file for Express route registrations:
 * - direct app.get/post/put/patch/delete(path, ...) calls
 * - chained router.route(path).get(...).post(...) calls
 * - router.use(path, importedRouter) mounts, following the import
 * - the common `[{ path, route }].forEach(r => router.use(r.path, r.route))` pattern
 */
function scanFile(
  project: Project,
  filePath: string,
  prefix: string,
  routes: DiscoveredRoute[],
  callStack: Set<string>
): void {
  if (callStack.has(filePath)) return; // cycle guard
  if (!fs.existsSync(filePath)) return;

  callStack.add(filePath);

  const sourceFile =
    project.getSourceFile(filePath) ?? project.addSourceFileAtPath(filePath);

  const importMap = buildImportMap(sourceFile);
  const arrayLiterals = buildArrayLiteralMap(sourceFile);

  const callExpressions = sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression);

  for (const call of callExpressions) {
    const callee = call.getExpression();
    if (!Node.isPropertyAccessExpression(callee)) continue;

    const methodName = callee.getName();
    const args = call.getArguments();

    if (methodName === "forEach") {
      const target = callee.getExpression();
      if (!Node.isIdentifier(target)) continue;

      const elements = arrayLiterals.get(target.getText());
      if (!elements) continue;

      for (const el of elements) {
        if (!Node.isObjectLiteralExpression(el)) continue;

        let subPath: string | null = null;
        let routeExpr: Node | null = null;

        for (const prop of el.getProperties()) {
          if (!Node.isPropertyAssignment(prop)) continue;
          const propName = prop.getName();
          const initializer = prop.getInitializer();
          if (!initializer) continue;

          if (propName === "path" && Node.isStringLiteral(initializer)) {
            subPath = initializer.getLiteralValue();
          }
          if (propName === "route") {
            routeExpr = initializer;
          }
        }

        if (subPath !== null && routeExpr) {
          const resolved = resolveMountTarget(routeExpr, sourceFile, project);
          if (resolved) {
            scanFile(project, resolved, joinRoutePath(prefix, subPath), routes, callStack);
          }
        }
      }
      continue;
    }

    if (HTTP_METHODS.includes(methodName)) {
      const firstArg = args[0];
      if (firstArg && Node.isStringLiteral(firstArg)) {
        routes.push({
          method: methodName.toUpperCase(),
          path: joinRoutePath(prefix, firstArg.getLiteralValue())
        });
      } else {
        const chainedPath = findChainedRoutePath(callee.getExpression());
        if (chainedPath !== null) {
          routes.push({
            method: methodName.toUpperCase(),
            path: joinRoutePath(prefix, chainedPath)
          });
        }
      }
      continue;
    }

    if (methodName === "use") {
      if (args.length === 1) {
        const resolved = resolveMountTarget(args[0], sourceFile, project);
        if (resolved) {
          scanFile(project, resolved, prefix, routes, callStack);
        }
      } else if (args.length >= 2 && Node.isStringLiteral(args[0])) {
        const subPath = args[0].getLiteralValue();
        const resolved = resolveMountTarget(args[1], sourceFile, project);
        if (resolved) {
          scanFile(project, resolved, joinRoutePath(prefix, subPath), routes, callStack);
        }
      }
    }
  }

  callStack.delete(filePath);
}

export function discoverRoutes(registeredProject: RegisteredProject): DiscoveredRoute[] {
  const entryPath = path.join(registeredProject.projectPath, registeredProject.entryFile);

  if (!fs.existsSync(entryPath)) {
    throw new AppError(`Entry file not found: ${entryPath}`, 400);
  }

  const routes: DiscoveredRoute[] = [];

  try {
    const project = new Project({
      skipAddingFilesFromTsConfig: true,
      compilerOptions: {
        allowJs: true
      }
    });

    scanFile(project, entryPath, "", routes, new Set());
  } catch (err) {
    throw new AppError(`Route discovery failed: ${(err as Error).message}`, 500);
  }

  const seen = new Set<string>();
  const uniqueRoutes: DiscoveredRoute[] = [];
  for (const route of routes) {
    const key = `${route.method} ${route.path}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRoutes.push(route);
    }
  }

  return uniqueRoutes;
}
