const VISIBLE_ATTRIBUTES = new Set([
  'alt',
  'title',
  'placeholder',
  'aria-label',
  'aria-description',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'label',
  'description',
  'tooltip',
  'helperText',
  'emptyMessage',
  'loadingText',
  'errorMessage',
  'children',
]);

function isButtonInputValue(node) {
  const opening = node.parent;
  if (node.name.name !== 'value' || opening.name.type !== 'JSXIdentifier')
    return false;
  if (opening.name.name !== 'input') return false;

  const typeAttribute = opening.attributes.find(
    (attribute) =>
      attribute.type === 'JSXAttribute' && attribute.name.name === 'type',
  );
  const typeValue =
    typeAttribute?.value?.type === 'Literal'
      ? typeAttribute.value.value
      : typeAttribute?.value?.expression?.value;
  return ['button', 'submit', 'reset'].includes(typeValue);
}

export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require translated JSX text and user-facing attributes.',
    },
    schema: [],
    messages: {
      bareText: 'Use t() for user-facing JSX text (K5).',
    },
  },
  create(context) {
    function checkRenderedExpression(node) {
      if (!node) return;

      switch (node.type) {
        case 'Literal':
          if (typeof node.value === 'string' && node.value.trim()) {
            context.report({ node, messageId: 'bareText' });
          }
          break;
        case 'TemplateLiteral':
          if (
            node.quasis.some((part) =>
              (part.value.cooked ?? part.value.raw).trim(),
            )
          ) {
            context.report({ node, messageId: 'bareText' });
          }
          break;
        case 'ConditionalExpression':
          checkRenderedExpression(node.consequent);
          checkRenderedExpression(node.alternate);
          break;
        case 'LogicalExpression':
          if (node.operator !== '&&') checkRenderedExpression(node.left);
          checkRenderedExpression(node.right);
          break;
        case 'BinaryExpression':
          if (node.operator === '+') {
            checkRenderedExpression(node.left);
            checkRenderedExpression(node.right);
          }
          break;
        case 'SequenceExpression':
          checkRenderedExpression(node.expressions.at(-1));
          break;
        case 'TSAsExpression':
        case 'TSSatisfiesExpression':
        case 'TSNonNullExpression':
          checkRenderedExpression(node.expression);
          break;
      }
    }

    return {
      JSXText(node) {
        if (node.value.trim()) context.report({ node, messageId: 'bareText' });
      },
      JSXExpressionContainer(node) {
        if (
          node.parent.type === 'JSXElement' ||
          node.parent.type === 'JSXFragment'
        ) {
          checkRenderedExpression(node.expression);
        }
      },
      JSXAttribute(node) {
        if (
          !VISIBLE_ATTRIBUTES.has(node.name.name) &&
          !isButtonInputValue(node)
        )
          return;

        checkRenderedExpression(
          node.value?.type === 'JSXExpressionContainer'
            ? node.value.expression
            : node.value,
        );
      },
    };
  },
};
