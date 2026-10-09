# Recursos gráficos — Play Store (Caruanas Va'a)

Assets para a ficha da loja, gerados da build **v1.0.1** (Android versionCode 11 · iOS build 13).
Screenshots capturados do app rodando no emulador; ícone e feature graphic gerados de `../assets/`.

Prévia visual: abra `galeria.html` (ou regenere com `python3 build_gallery.py`).

## Onde cadastrar (Google Play Console → Detalhes do app / Ficha da loja principal)

| Arquivo | Dimensão | Campo |
|---|---|---|
| `play-icon-512.png` | 512×512 | Ícone do app |
| `feature-graphic-1024x500.png` | 1024×500 | Gráfico de destaque |
| `shot-1…5-*.png` | 1080×2400 | Capturas de tela do smartphone |
| `tablet/tab-1…5-*.png` | 1800×2560 | Capturas de tela de tablet de **7"** e de **10"** |

**Os mesmos 5 arquivos de `tablet/` servem os dois slots (7" e 10")**: proporção 0,70 está no range aceito
(entre 9:16 e 16:9) e a resolução 1800×2560 cabe nas faixas do 7" (320–3840px) e do 10" (1080–7680px).
Screenshots de smartphone (1080×2400, proporção 0,45) **não** servem para tablet.

## Notas
- Telas capturadas no perfil admin (o usuário semeado `student@lepoti.tech` não existe no sandbox; aluno novo
  mostraria telas vazias). Dados reais: turmas com instrutor, faturas por nome, notícias com foto, declarações.
- Status bar limpa via demo mode do Android; tablet capturado forçando orientação portrait (o app é portrait-locked).
