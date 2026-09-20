function isApplicationPath(value) {
  return (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//')
  );
}

function isBasePathArgument(node) {
  const parent = node.parent;
  return (
    parent?.type === 'CallExpression' &&
    parent.callee.type === 'Identifier' &&
    parent.callee.name === 'basePath' &&
    parent.arguments[0] === node
  );
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require basePath() for application paths rooted at /.',
    },
    schema: [],
    messages: {
      hardcodedPath: 'Use basePath() for an absolute application path (K6).',
    },
  },
  create(context) {
    function check(node, value) {
      if (isApplicationPath(value) && !isBasePathArgument(node)) {
        context.report({ node, messageId: 'hardcodedPath' });
      }
    }

    return {
      Literal(node) {
        check(node, node.value);
      },
      TemplateLiteral(node) {
        check(node, node.quasis[0]?.value.cooked ?? node.quasis[0]?.value.raw);
      },
    };
  },
};
