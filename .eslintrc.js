const path = require("path")
const Paths = require("./config/paths")

module.exports = {
  "root": true,
  "env": {
    "browser": true,
    "es6": 6
  },
  "extends": [
    "eslint:recommended",
    "airbnb-base",
    "plugin:react/recommended",
    "plugin:jsx-a11y/recommended",
    "plugin:@typescript-eslint/recommended",
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "ecmaFeatures": {
      "impliedStrict": true,
      "jsx": true
    }
  },
  rules: {
    // window风格的换行(而非unix)
    "linebreak-style": ["error", "windows"],
    // 双引号
    "quotes": ["error", "double"],
    // 缩进2空格
    "indent": ["error", 2],
    // 从不使用分号
    "semi": ["error", "never"],

    // 便于调试, 所以允许console
    "no-console": "off",
    // scss自动生成的scss.d.ts没有使用default, 同时一些utils可能从语义上来说没有default导出, 所以关闭
    "import/prefer-default-export": "off",
    // 有了eslint的缩进规则，所以关闭了typescript-eslint的缩进规则
    "@typescript-eslint/indent": "off",
    // 这条单纯因为不喜欢，所以关闭
    "max-len": "off",
    // 这条嫌麻烦，所以关闭
    "@typescript-eslint/explicit-function-return-type": "off",
    // 省一两下手脚，所以关闭
    "@typescript-eslint/no-parameter-properties": "off",
    // 结合【@typescript-eslint/no-parameter-properties】
    // 用于constructor仅初始化参数的情况
    "no-useless-constructor": "off",
    "no-empty-function": "off",
  },
  "settings": {
    "import/resolver": {
      "webpack": {
        "config": path.resolve(Paths.Root, "config", "webpack.common.config.js")
      }
    },
    "react": {
      "version": "detect",
    }
  },
}