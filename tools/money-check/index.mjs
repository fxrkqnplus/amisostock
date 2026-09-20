import {
  cli,
  model,
  names,
  properties,
  sources,
  ts,
  walk,
} from '../gate-support.mjs';

const monetary =
  /(?:amount|price|cost|profit|loss|balance|revenue|fee|money|notional|valuation|total)/i;
const arithmetic = new Set([
  ts.SyntaxKind.PlusToken,
  ts.SyntaxKind.MinusToken,
  ts.SyntaxKind.AsteriskToken,
  ts.SyntaxKind.SlashToken,
  ts.SyntaxKind.PercentToken,
  ts.SyntaxKind.AsteriskAsteriskToken,
  ts.SyntaxKind.PlusEqualsToken,
  ts.SyntaxKind.MinusEqualsToken,
  ts.SyntaxKind.AsteriskEqualsToken,
  ts.SyntaxKind.SlashEqualsToken,
]);
export function check(root) {
  const paths = sources(root);
  const { program, checker } = model(paths);
  const violations = [];
  let candidates = 0;
  for (const file of paths) {
    const source = program.getSourceFile(file);
    if (source.parseDiagnostics.length) throw new Error(`Cannot parse ${file}`);
    const fail = (node, message) =>
      violations.push(
        `${names(root, [file])[0]}:${source.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${message}`,
      );
    walk(source, (node) => {
      if (
        (ts.isVariableDeclaration(node) ||
          ts.isPropertyDeclaration(node) ||
          ts.isPropertySignature(node) ||
          ts.isParameter(node)) &&
        node.name &&
        monetary.test(node.name.getText(source))
      ) {
        candidates++;
        const type = checker.getTypeAtLocation(node);
        if (type.flags & ts.TypeFlags.NumberLike)
          fail(node, 'money: number monetary field');
        if (
          ts.isVariableDeclaration(node) &&
          !properties(checker, node).has('currency')
        )
          fail(node, 'money: monetary value must carry { amount, currency }');
      }
      if (
        ts.isObjectLiteralExpression(node) ||
        ts.isTypeLiteralNode(node) ||
        ts.isInterfaceDeclaration(node)
      ) {
        const members = node.properties ?? node.members;
        const keys = new Set(
          members
            .filter((member) => member.name)
            .map((member) => member.name.text),
        );
        if (keys.has('amount')) {
          candidates++;
          if (!keys.has('currency'))
            fail(node, 'money: amount without currency');
          for (const member of members) {
            if (
              member.name?.text === 'amount' &&
              checker.getTypeAtLocation(member).flags & ts.TypeFlags.NumberLike
            )
              fail(member, 'money: numeric amount');
          }
        }
      }
      if (ts.isCallExpression(node)) {
        const name = node.expression.getText(source);
        // Conversion APIs are prohibited throughout product source: aliases cannot make floats safe.
        if (
          /(?:^|\.)parseFloat$|(?:\.|\[['"])(?:toFixed)(?:['"]\])?$/.test(name)
        ) {
          candidates++;
          fail(node, `money: ${name}`);
        }
      }
      if (
        ts.isBinaryExpression(node) &&
        arithmetic.has(node.operatorToken.kind)
      ) {
        let context = node;
        while (
          context.parent &&
          !ts.isStatement(context.parent) &&
          !ts.isSourceFile(context.parent)
        )
          context = context.parent;
        if (monetary.test(context.getText(source))) {
          candidates++;
          const operands = [
            checker.getTypeAtLocation(node.left),
            checker.getTypeAtLocation(node.right),
          ];
          if (
            operands.some(
              (type) =>
                type.flags &
                (ts.TypeFlags.NumberLike |
                  ts.TypeFlags.Any |
                  ts.TypeFlags.Unknown),
            )
          )
            fail(node, 'money: number or unverified arithmetic');
        }
      }
    });
  }
  return {
    files: names(root, paths),
    rules: 4,
    candidates,
    violations,
    note: candidates
      ? 'parasal adaylar tarandı (AST + tip bilgisi)'
      : 'kaynaklar tarandı; parasal alan=0; ürün para sözleşmesine bakılmadı (henüz yok)',
  };
}
await cli(import.meta, 'money', check);
