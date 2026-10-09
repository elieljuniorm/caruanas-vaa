# 🚣‍♂️ Va'a App

## Aplicativo móvel de gerenciamento de base de canoagem

Este projeto foi criado utilizando [Expo](https://expo.dev/), uma ferramenta que facilita o desenvolvimento de apps com React Native.

---

## 🛠 Tecnologias

- JavaScript / TypeScript
- Java (API)
- React Native
- Expo

---

## 📦 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- [Node.js](https://nodejs.org/)
- Um emulador Android configurado (via Android Studio) ou o app Expo Go no seu celular físico (disponível na App Store e Play Store)

## 🔧 Instalação

- Copia o arquivo .env.example e renomeia para .env

Clone o projeto e entre na pasta e rode os comandos abaixos na sequência:
```bash
npm install
npx expo start
```

## 📱 Build
Para criar uma versão do aplicativo, execute os seguintes comandos:

##### QA:
```bash
eas build --platform android --profile preview
eas build --platform ios --profile preview
```

##### Produção:
```bash
eas build --platform android --profile production
eas build --platform ios --profile production
```