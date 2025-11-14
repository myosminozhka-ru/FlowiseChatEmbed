module.exports = {
    root: true,
    extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'prettier', 'plugin:solid/typescript'],
    plugins: ['@typescript-eslint', 'solid'],
    parser: '@typescript-eslint/parser',
    ignorePatterns: ['**/*.md'],
    env: {
        node: true,
        es2021: true
    },
    rules: {
        '@next/next/no-img-element': 'off',
        '@next/next/no-html-link-for-pages': 'off',
        'solid/no-innerhtml': 'off',
        '@typescript-eslint/no-namespace': 'off',
        '@typescript-eslint/no-explicit-any': 'off'
    },
    overrides: [
        {
            files: ['server.js', '*.js'],
            env: {
                node: true,
                es2021: true
            },
            parserOptions: {
                ecmaVersion: 2021,
                sourceType: 'module'
            }
        }
    ]
}
