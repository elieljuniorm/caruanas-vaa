module.exports = function (api) {
    const isTest = api.cache.using(() => process.env.NODE_ENV === 'test');
    return {
        presets: ['babel-preset-expo'],
        // Em ambiente de teste o @env é resolvido via moduleNameMapper do Jest
        // (src/__mocks__/env.js), sem precisar do plugin de dotenv
        plugins: isTest ? [] : [
            ['module:react-native-dotenv', {
                moduleName: '@env',
                path: '.env',
                safe: false,
                allowUndefined: false
            }]
        ],
    };
};
