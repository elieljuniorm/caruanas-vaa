// Mock de expo-file-system para testes
module.exports = {
  cacheDirectory: "file://cache/",
  downloadAsync: jest.fn(),
};
