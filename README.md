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

## 🚀 Deploy
Para fazer o deploy do aplicativo para as lojas, utilize os seguintes comandos:

##### iOS:
```bash
eas submit --platform ios --profile production
```

##### Android — Internal Testing (build + submit em um comando):
```bash
eas build --platform android --profile preview --auto-submit
```
Sobe o AAB no track `internal` do Play Console como **draft release** (rascunho). A Service Account usada é `eas-play-publisher@caruanasvaa-app.iam.gserviceaccount.com`, gerenciada via `eas credentials -p android`.

Para os testers receberem o build, é necessário promover o rascunho manualmente no Play Console:

1. https://play.google.com/console → app **Caruanas Va'a**
2. Menu lateral: **Test and release → Testing → Internal testing**
3. Aba **Releases**, clique em **Edit release** no draft que apareceu com o `versionCode` novo
4. Preencha **Release notes** em `pt-BR` (campo `<pt-BR>...</pt-BR>`)
5. **Save** → **Next** → **Save and review release** → **Start rollout to Internal testing**

Após o rollout, os testers internos recebem a atualização em alguns minutos.

> Por que draft? O Play Console rejeita submissões com status `completed` que não trazem release notes. O fluxo de draft mantém o build automatizado e deixa as notas para o passo final manual — que naturalmente envolve descrever o que mudou.

##### Android — Produção:
```bash
eas build --platform android --profile production --auto-submit
```
O profile `production` em `eas.json` usa `releaseStatus: completed` e exige release notes pré-configuradas (ainda não automatizadas — preencha no Play Console no fluxo de release ou adicione `releaseNotes` em `submit.production.android` antes de rodar).