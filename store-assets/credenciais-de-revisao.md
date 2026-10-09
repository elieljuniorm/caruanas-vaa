# Credenciais de revisão das lojas

Contas criadas **no ambiente de produção** (`https://iako.lepoti.tech`) para a análise
da Google e da Apple — uma por perfil, porque a listagem das duas lojas anuncia recursos
de aluno, instrutor e administrador.

| Perfil | E-mail | Onde está a senha |
|---|---|---|
| Aluno | `revisor.loja@lepoti.tech` | `store.config.json` (`apple.review.demoPassword`) e `eas.json` (perfil `simulator`) |
| Instrutor | `revisor.instrutor@lepoti.tech` | notas de revisão da App Store Connect e *Acesso ao app* do Play Console |
| Administrador | `revisor.admin@lepoti.tech` | notas de revisão da App Store Connect e *Acesso ao app* do Play Console |

As senhas ficam fora deste arquivo de propósito: `store.config.json` está no `.gitignore`
pelo mesmo motivo, e a conta de administrador tem poder real sobre o banco do clube.
A fonte viva delas é `appStoreReviewDetail.notes` na App Store Connect.

O aluno está matriculado na turma **"Canoagem - Turma Demonstracao"** (id 2), criada em
20/09/2026 com aulas diárias e janela de check-in de 48h — ou seja, **o check-in fica
sempre aberto**, em qualquer fuso. Ele foi desmatriculado da turma real de propósito: o
painel do aluno mostra a aula cronologicamente mais próxima, e a turma real (06:00, com
check-in só das 04:00 às 05:30) apareceria no lugar, com o botão bloqueado. O instrutor
está vinculado às duas turmas, e o aluno tem plano ativo e uma fatura de R$ 1,00 vencendo
em 04/11 — vencimento longe é obrigatório, porque fatura vencida bloqueia o check-in.

## Por que as contas do seed não servem

Em produção o `.env` tem `SEED_DEMO_DATA=false`: o `DatabaseSeeder` cria só o
`admin@lepoti.tech`, com a senha de `SUPER_ADMIN_PASSWORD`, e **não** cria
`instructor@lepoti.tech` nem `student@lepoti.tech`. A senha `Senha@123` é o fallback que
só existe em dev e sandbox.

Foi exatamente isso que derrubou a revisão da vc 19 no Google Play em 18/09/2026: os
*Detalhes de login* do Play Console ainda tinham a trinca do seed, que funcionava enquanto
as builds falavam com o sandbox. A vc 19 foi a primeira a apontar para produção, e as três
credenciais passaram a devolver 404 (usuário inexistente) ou 422 (senha inválida).

**Ao subir um clube novo, criar as contas de revisão junto** — pela API, com
`POST /v1/user/create` autenticado como administrador (`codeRole` 1 = admin,
2 = instrutor, 3 = aluno).

## Google Play Console

`Política e programas > Conteúdo do app > Acesso ao app` → *Todas ou algumas
funcionalidades são restritas*. Uma entrada por perfil, com nome, usuário, senha e as
instruções abaixo.

> **O campo de instruções aceita no máximo 500 caracteres** — bem menos que as notas de
> revisão da Apple, que cabem 4000. Os textos abaixo já estão dentro do limite (498, 231
> e 236); o roteiro longo que vale para a Apple não cabe aqui.
>
> **Reentrar os três textos no console** depois da turma de demonstração de 20/09/2026: a
> versão anterior explicava a janela de check-in fechada, que não vale mais para a conta
> do revisor.

**1. Aluno — perfil principal** (498 caracteres)

```
Conta de aluno na turma "Canoagem - Turma Demonstracao".
Se aparecer a tela de aceite dos Termos e da Privacidade, marque as duas caixas e toque em "Aceitar e continuar".
Em Treino, o check-in desta turma fica sempre aberto: toque em "Fazer Check-In" a qualquer hora; "Cancelar check-in" desfaz.
Em Faturas ha uma cobranca de R$ 1,00; "Pagar" abre o Mercado Pago no navegador, nao e preciso pagar.
Em Perfil > icone medico, a declaracao de saude pede consentimento destacado (LGPD) antes de salvar.
```

**2. Instrutor** (231 caracteres)

```
Conta de instrutor, vinculada as duas turmas do clube: confirma a presenca dos alunos nas aulas e consulta as declaracoes de saude da turma.
Para trocar de perfil, use "Sair" no menu lateral e entre com outra das contas informadas.
```

**3. Administrador** (236 caracteres)

```
Conta de administrador: cria turmas, horarios e planos, gera as aulas do periodo, cadastra e exclui usuarios e acompanha as cobrancas dos alunos.
Para trocar de perfil, use "Sair" no menu lateral e entre com outra das contas informadas.
```

Depois: `Visão geral da publicação` → **Enviar alterações para revisão**. Não é preciso
build nova — a mesma vc 19 é reanalisada.

> A API do Google Play (`androidpublisher`) **não** expõe a seção *Acesso ao app*; esse
> passo é obrigatoriamente pelo console. A conta de serviço em `~/key.json`
> (`eas-service-account@`) também não tem permissão no console — quem publica é a
> `eas-play-publisher@`, cuja chave fica nos servidores do EAS.

## App Store Connect

As notas de revisão são aplicadas por API e espelhadas em `store.config.json`:

```bash
python3 scripts/asc-review-notes.py 1.0.1 store-assets/apple-review-notes.txt
```

**Reescritas em inglês em 20/09/2026** (3996 de 4000 caracteres), depois da rejeição por
*Guideline 2.1 — Information Needed*. A Apple pede a informação nos dois lugares: no campo
*Notes* e numa resposta na Central de Resoluções — e **a troca de mensagens com a revisão
não tem API**, só o campo. A resposta pronta, o que foi feito em produção para sustentá-la
e o roteiro do vídeo obrigatório estão em `resposta-apple-2.1.md` e
`roteiro-video-apple.md`.
