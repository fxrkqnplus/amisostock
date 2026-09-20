import noBareJsxText from './no-bare-jsx-text.mjs';
import noHardcodedPath from './no-hardcoded-path.mjs';

export default {
  meta: { name: '@amisostock/eslint-local-rules' },
  rules: {
    'no-hardcoded-path': noHardcodedPath,
    'no-bare-jsx-text': noBareJsxText,
  },
};
