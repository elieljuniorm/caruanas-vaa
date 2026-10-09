# Resposta à rejeição Guideline 2.1 — Information Needed (19/09/2026)

Submissão `136b5ec9-cd5e-4437-a65d-057084539fc3`, versão 1.0.1 (build 21), estado
`REJECTED` / `UNRESOLVED_ISSUES`.

A rejeição é o pedido padrão de informações que a Apple faz a conta de desenvolvedor
**sem histórico de revisão** — não aponta defeito observado no app. Ela exige duas
coisas: **responder na Central de Resoluções** com seis itens e **repetir a mesma
informação no campo *Notes*** de *App Review Information*. O item 1 é o caro: vídeo
gravado em **aparelho físico**.

A API da App Store Connect **não expõe a troca de mensagens com a revisão** — colar a
resposta é manual. O campo *Notes* é aplicado por API (`scripts/asc-review-notes.py`).

**As senhas das contas de revisão não estão neste arquivo**, pela mesma regra de
`credenciais-de-revisao.md`: aparecem como `<<SENHA_ALUNO>>`, `<<SENHA_INSTRUTOR>>` e
`<<SENHA_ADMIN>>`. Para colar, gere o texto já preenchido com as senhas das notas no ar:

```bash
python3 scripts/asc-review-notes.py 1.0.1 store-assets/resposta-apple-2.1.md --render
```

---

## Resposta para colar na Central de Resoluções

> Hello,
>
> Thank you for the review. All the requested information is below, and the same
> information has been added to the Notes field of the App Review Information section.
>
> **1. Screen recording**
>
> A screen recording captured on a physical iPhone 15 Pro Max running the latest
> version of iOS is attached to the App Review Information of this version. It begins
> with launching the app and covers the typical user flow:
>
> - signing in with the demo member account;
> - the home screen, the class check-in, the membership fee screen and the payment
>   page opening in the browser;
> - the health declaration and its dedicated consent;
> - the privacy screen: exporting all personal data, withdrawing the health-data
>   consent and requesting account and data deletion;
> - signing out and signing in as an instructor (confirming member attendance);
> - signing out and signing in as the club administrator, including **creating a
>   member account and then deleting it** — the only account creation and deletion
>   flows that exist in the app (see item below).
>
> **Account creation and deletion.** The app has no public sign-up. Accounts are
> created by the club's administration on behalf of its members, which makes them
> accounts managed by an organisation rather than accounts the user creates. Within
> the app, the administrator both creates (Usuários > Cadastrar) and deletes
> (Usuários > delete) member accounts, and both flows are in the recording. A member
> can request deletion of their account and personal data directly from the app, in
> Menu > Privacidade > "Solicitar exclusão de dados", which opens a pre-filled message
> to our data protection officer; from that same screen the member can also export all
> of their personal data and withdraw the health-data consent.
>
> **User-generated content.** The app has none. Members cannot post content, there is
> no chat, no comments and no profiles visible to other members. The only editorial
> content ("Notícias") is published by the club's administration. No content reporting
> or blocking mechanism is therefore required.
>
> **Paid content or features.** The only payment in the app is the club's monthly
> membership fee, which pays for in-person canoe training at a physical location — a
> real-world service, outside the scope of in-app purchase (Guideline 3.1.3(e)). It is
> processed by Mercado Pago, a Brazilian payment provider, in the browser. No digital
> content or digital service is sold in the app. The demo member account has an open
> fee of R$ 1.00 so that the flow can be inspected; completing the payment is not
> necessary for the review.
>
> **2. Purpose of the app and target audience**
>
> Caruanas Va'a is the member app of an outrigger canoe (va'a) club in Belém, Brazil.
> Its audience is the club's members, its instructors and its administration. The club is
> a consumer sports club open to the general public — anyone can join it and become a
> member — so this is a consumer app, not an internal tool for a company or its
> employees.
>
> The problem it solves: a canoe seats a fixed number of paddlers, so each training
> session has a hard limit on attendance. Clubs manage this today with paper lists and
> group chats, which produces overbooked sessions, members who travel to the club and
> cannot paddle, attendance that nobody can audit, and membership fees tracked by hand.
> The app gives each member a reliable seat reservation within a time window defined by
> the club, shows their own attendance and fees, and keeps the health declaration the
> club is required to collect before physical activity. Instructors confirm who
> actually attended; the administration manages classes, schedules, plans, members and
> billing.
>
> **3. Instructions and credentials**
>
> There is no public sign-up, so we provide one demo account per role. To switch roles,
> use "Sair" (sign out) in the side menu and sign in with another account.
>
> - Member: revisor.loja@lepoti.tech / <<SENHA_ALUNO>>
> - Instructor: revisor.instrutor@lepoti.tech / <<SENHA_INSTRUTOR>>
> - Administrator: revisor.admin@lepoti.tech / <<SENHA_ADMIN>>
>
> Suggested walkthrough with the member account:
>
> 1. **Início** (home): the next class, the fee status and the club's news.
> 2. **Treino** (training): tap "Fazer Check-In" to reserve a seat. Check-in is only
>    open inside a window set by the club; we have created the class "Canoagem - Turma
>    Demonstração", whose window is always open, so that you can complete a check-in at
>    any time and from any time zone. "Cancelar check-in" undoes it.
> 3. **Faturas** (fees): one open fee of R$ 1.00. "Pagar" opens the Mercado Pago
>    payment page in the browser. Payment is not required.
> 4. **Perfil** (profile) > medical icon: the health declaration. Before it can be
>    submitted, the app asks for a separate, explicit consent to process health data,
>    as required by the Brazilian data protection law (LGPD). Submission is blocked
>    without that consent — this is the expected behaviour, not a failure.
> 5. Side menu > **Privacidade**: privacy policy and terms, "Baixar meus dados"
>    (export all personal data), withdrawing the health-data consent, and "Solicitar
>    exclusão de dados" (request account and data deletion).
>
> With the instructor account: confirm member attendance for a class and consult the
> health declarations of that class. With the administrator account: create classes,
> schedules and plans, generate the sessions of a period, create and delete member
> accounts, and follow the members' fees.
>
> **4. External services used to deliver core functionality**
>
> - Our own backend API, https://iako.lepoti.tech, hosted in São Paulo, Brazil, behind
>   Cloudflare. It holds all of the app's data and is operated by us.
> - **Mercado Pago** — payment processing for the club's membership fees.
> - **Expo Push Notification Service** and the Apple Push Notification service — push
>   notifications about classes and fees.
> - **Sentry** — crash and error reporting.
>
> The app uses no AI services, no advertising, no analytics or tracking SDKs, no
> third-party sign-in and no data brokers. Camera and photo library access is used only
> for the profile picture; document access only to attach a medical certificate in PDF.
> The app does not collect location.
>
> **5. Regional differences**
>
> There are none: the app behaves identically in every region. Its interface is in
> Brazilian Portuguese only, the club operates in Brazil, and class times are shown in
> the club's local time (UTC−3).
>
> **6. Regulated industry or protected third-party material**
>
> The app operates in no regulated industry and contains no protected third-party
> material. It is the membership app of a sports club; it provides no medical service
> and no medical advice.
>
> It does collect one category of sensitive data: a health self-declaration by the
> member, and optionally a medical certificate issued by the member's own physician,
> which the club requires before physical activity. This is governed by the Brazilian
> data protection law (LGPD, Law 13.709/2018), and the app complies with it: consent
> for health data is asked separately and explicitly from the consent to the terms and
> the privacy policy, the server refuses the declaration without it, the data is
> encrypted at rest with AES-256-GCM, and the member can withdraw the consent, export
> all of their data and request deletion from inside the app.
>
> Privacy policy: https://lepoti.tech/poti-clubes/privacidade/
> Terms of use: https://lepoti.tech/poti-clubes/termos/
> Data protection officer: dpo@lepoti.tech
>
> Thank you,
> Pedro Nascimento — Le Poti Tecnologia LTDA

---

## O que foi feito no ambiente de produção para sustentar a resposta

Sem esses dados o revisor (e a própria gravação) esbarrava em tela vazia: a turma real
treina 06:00 seg/qua/sex e 07:00 sáb, com check-in aberto só de 04:00 a 05:30 (UTC−3).

| Mudança | Por quê |
|---|---|
| Turma `Canoagem - Turma Demonstracao` (id 2), aulas diárias 09:00, `startCheckIn` 2880 min / `endCheckIn` 1 min | Janela de 48h em aula diária = check-in **sempre aberto**, em qualquer fuso |
| 61 aulas geradas (20/09 a 19/11) | Cobre a revisão inteira sem precisar regerar |
| `revisor.loja@` matriculado na turma demo e **desmatriculado da turma real** | O dashboard escolhe a aula cronologicamente mais próxima; a turma real roubaria a vez e mostraria o botão bloqueado |
| `revisor.instrutor@` matriculado nas duas turmas | Instrutor = matrícula com papel de instrutor; sem isso as telas dele vinham vazias |
| Plano Mensal atribuído ao aluno | "Aulas restantes no mês" deixa de ser nulo (16) |
| Fatura de R$ 1,00 vencendo em 04/11 | Tela de Faturas com conteúdo. **Vencimento longe é obrigatório**: fatura vencida bloqueia o check-in (`CheckinService` → "Usuário possui fatura em atraso") |
| Fatura de R$ 180,00 (gerada pela atribuição do plano) cancelada | Vencia em 27/09 — viraria OVERDUE no meio da revisão e bloquearia o check-in |
| `gateway_data` da fatura 2 corrigido à mão | Ver a seção de bug abaixo |

Reverter, depois da aprovação: cancelar a fatura 2, remover o plano, apagar a turma 2
(`DELETE /v1/class/delete/2`) e rematricular `revisor.loja@` na turma 1.

## Bug de produção encontrado no caminho (não corrigido)

Toda fatura criada em produção é gravada **sem link de pagamento**, e o botão "Pagar"
responde "Link de pagamento não disponível".

- `MercadoPagoService.createInvoice` lê `ticketUrl`/`qrCode` da resposta de criação do
  pagamento. Com as credenciais `APP_USR-` de produção esses campos vêm **nulos** —
  mas existem na consulta seguinte (`GET /v1/payments/{id}` devolve `ticket_url` e
  `qr_code` normalmente). No sandbox, com credenciais `TEST-`, vêm preenchidos na
  criação; por isso nunca apareceu.
- `InvoiceService.verifyPayment` piora: ao atualizar o status, regrava `gatewayData`
  com `null, null, null` nos três campos — apaga o link se ele existir.

Correção sugerida: reconsultar o pagamento quando `transaction_data` vier vazio na
criação, e preservar os campos existentes no `verifyPayment`. Exige deploy em `main`.
