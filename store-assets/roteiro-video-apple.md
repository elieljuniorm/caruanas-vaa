# Roteiro da gravação para a App Review (Guideline 2.1)

A Apple exige **aparelho físico, iOS na última versão, começando pelo lançamento do
app**. Simulador não serve: além da regra explícita, o `.app` de simulador vem do perfil
`simulator`, que autentica sozinho (`EXPO_PUBLIC_SCREENSHOT_MODE`) — seria um binário
diferente do que está em revisão.

Alvo: **4 a 5 minutos**, retrato, sem girar o aparelho. **Gravar entre 09:00 e 21:00
(horário de Brasília)** — ver "Por que o horário importa".

> Revisado em 25/09/2026 contra o código do app e o estado de produção. Os rótulos abaixo
> são os que aparecem na tela; a versão de 20/09 tinha cinco que não batiam.

## Antes de gravar

1. iPhone 15 Pro Max com o iOS atualizado (*Ajustes > Geral > Atualização de Software*).
2. TestFlight → Caruanas Va'a → instalar a **1.0.1 (21)**, que é o build em revisão
   (válido no TestFlight até 12/12/2026).
3. **Entrar e sair uma vez** com qualquer conta de revisão (menu lateral > Sair): o
   primeiro login pede permissão de notificação, e é melhor responder fora do vídeo. A
   gravação tem que começar pela tela de login.
4. *Ajustes > Central de Controle* → adicionar **Gravação de Tela**.
5. Ligar o **Foco/Não Perturbe** — notificação entrando no meio da gravação atrapalha.
6. Conferir que o app de e-mail tem conta configurada: "Solicitar exclusão da conta" abre
   um `mailto:`.
7. Senhas à mão: estão nas notas de revisão da ASC e em `store.config.json` (fora do git).
   Os arquivos versionados trazem só marcadores — `python3 scripts/asc-review-notes.py
   1.0.1 store-assets/resposta-apple-2.1.md --render` mostra o texto com elas preenchidas.

## Roteiro

| Tempo | Onde | O que fazer |
|---|---|---|
| 0:00 | Tela de início do iOS | Começar a gravação **aqui** e tocar no ícone do app — a Apple pede que o vídeo comece no lançamento |
| 0:10 | Entrar | `revisor.loja@lepoti.tech` |
| 0:25 | Início | Rolar devagar: próxima aula, situação da fatura, notícias |
| 0:45 | Menu > Treino | **Fazer Check-In** → no painel que abre, **Fazer Check-In** de novo → esperar o selo de confirmado |
| 1:10 | Treino | **Ver Check-In** → **Cancelar Check-In** → confirmar. Mostra o desfazer *e* devolve o estado limpo para o revisor |
| 1:25 | Menu > Faturas | Fatura de R$ 1,00 → **Pagar Agora** → abre o Mercado Pago no navegador → **não pagar** → voltar ao app |
| 1:50 | Menu > Perfil > **Editar perfil** > ícone médico | Declaração de Saúde: rolar até o fim e **mostrar o botão de salvar apagado** — sem o consentimento ele não reage, não há alerta. Marcar o consentimento (o botão acende), preencher **Contato de emergência** com `91999990000` (obrigatório, mínimo 10 dígitos; sem ele o salvar recusa) e salvar |
| 2:25 | Menu > Privacidade | Política e Termos (abrem no navegador — voltar), **Baixar meus dados** (abre a folha de compartilhamento com o arquivo — fechar), **Solicitar exclusão da conta** (abre o e-mail pronto ao DPO — descartar sem enviar) e **Retirar consentimento** → Retirar. Este último só aparece porque o consentimento foi dado em 1:50, e a resposta à Apple promete mostrá-lo |
| 3:00 | Menu > Sair | Entrar como `revisor.instrutor@lepoti.tech` |
| 3:10 | Início > **Check-In Aluno** | Filtro "Hoje" → **Canoagem - Turma Demonstracao** → tocar no aluno → **Check-in Manual** → aparece "Confirmado (Manual)". **Não usar "Check-in Regular"**: a janela da aula de hoje fechou às 08:59 e ele responde com erro na tela |
| 3:30 | Menu > Sair | Entrar como `revisor.admin@lepoti.tech` |
| 3:40 | Início > **Novo Usuário** | Nome `Teste Apple`, e-mail `teste.apple@lepoti.tech`, telefone `91999990000`, tipo **Aluno**, senha `Teste@2026` → cadastrar. O app abre a lista de usuários sozinho |
| 4:05 | **Todos os Usuários** | Tocar em "Teste Apple" → **Excluir Usuário** → **Excluir**. Este é o *account deletion flow* que a Apple listou — sem ele o vídeo fica incompleto |
| 4:20 | Menu > Turmas, Plano, Faturas | Passar rápido pelas telas de gestão |
| 4:35 | — | Parar a gravação |

Os passos de 3:40 e 4:05 são um par: criar e apagar a mesma conta é o que responde
"account registration ... and account deletion flows" sem precisar de build novo. **Dá
para refazer a tomada**: a exclusão aposenta o e-mail (`V9`), então
`teste.apple@lepoti.tech` pode ser cadastrado de novo.

A senha do cadastro exige 8+ caracteres com maiúscula, minúscula, número e um símbolo
dentre `@#$%^&+=` — qualquer outro símbolo reprova.

### Por que o horário importa

- **Depois das 21:00** a tela do instrutor calcula "hoje" pela data UTC
  (`toISOString()`) e passa a mostrar a aula de amanhã — justamente a que o revisor vai
  encontrar. O check-in manual de 3:10 ficaria confirmado nela, e o revisor veria "Ver
  Check-In" no lugar de "Fazer Check-In".
- **Entre 08:59 e 09:00** a próxima aula do aluno é a de hoje, com a janela já fechada.

Das 09:00 às 21:00 o check-in manual cai na aula de hoje, que já passou, e não interfere
no que o revisor encontra (só desconta uma aula do mês: 16 → 15).

## Depois de gravar

Exportar de Fotos (AirDrop ou Arquivos) e me passar o caminho. O anexo vai por API, a
partir do `lepoti`, onde estão a chave da ASC e o script:

```bash
export ASC_KEY_ID=GUFU9P4YAH
export ASC_ISSUER_ID=9155c7a5-27cd-4ace-9fab-1c5d598b8b1e
export ASC_KEY_PATH=~/.appstoreconnect/private_keys/AuthKey_GUFU9P4YAH.p8
python3 scripts/asc-upload-attachment.py 1.0.1 <arquivo.mp4> --substituir
```

Gravação de 4–5 min do 15 Pro Max sai na casa das centenas de MB. Se a reserva do anexo
recusar o tamanho, recomprimir antes:

```bash
ffmpeg -i entrada.mov -vf scale=-2:1280 -c:v libx264 -crf 28 -preset slow -an saida.mp4
```

## O que falta depois do anexo

1. **Acertar os rótulos nas notas e na resposta** antes de reenviar: as duas dizem
   "Solicitar exclusão de dados" (na tela é **"Solicitar exclusão da conta"**), "Usuários >
   Cadastrar" (é **Início > Novo Usuário**), "Usuários > delete" (é **Todos os Usuários >
   Excluir Usuário**) e "Pagar" (é **Pagar Agora**). As notas estão em 3996 de 4000
   caracteres, então a troca exige enxugar outro trecho.
2. Opcional: apagar a declaração de saúde criada no vídeo, para o revisor encontrar o
   fluxo que o passo 4 das notas descreve (formulário novo pedindo consentimento). Sem
   isso ele abre uma declaração já preenchida, em modo de edição.
3. Colar a resposta de `resposta-apple-2.1.md` na **Central de Resoluções** — a API da
   App Store Connect não expõe a troca de mensagens com a revisão.
4. **Reenviar para Revisão do app** na tela de Envio do iOS.

**Prazo:** o Pix da fatura de R$ 1,00 expira em **19/10/2026**. Se a revisão passar dessa
data, "Pagar Agora" abre um pagamento vencido — regerar a cobrança antes.
