#!/usr/bin/env python3
"""
Aplica o campo *Notes* de App Review Information da App Store Connect.

A Apple pede, em toda rejeição por Guideline 2.1 (Information Needed), que a
informação vá tanto na resposta da Central de Resoluções quanto neste campo — e a
troca de mensagens com a revisão **não** tem API, só o campo. O limite é de 4000
caracteres, checado aqui antes de enviar.

As senhas das contas de revisão não entram no repositório (ver
store-assets/credenciais-de-revisao.md): os textos versionados trazem os marcadores
<<SENHA_ALUNO>>, <<SENHA_INSTRUTOR>> e <<SENHA_ADMIN>>, e este script os preenche
com as senhas que já estão nas notas no ar — a fonte viva delas. Uma variável de
ambiente com o mesmo nome (SENHA_ALUNO etc.) tem precedência, para quando a senha
tiver mudado ou as notas no ar não a trouxerem. O limite de 4000 caracteres é
conferido depois do preenchimento, que é o texto que a Apple recebe.

Uso:
    export ASC_KEY_ID=GUFU9P4YAH
    export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    export ASC_KEY_PATH=~/.appstoreconnect/private_keys/AuthKey_GUFU9P4YAH.p8
    python3 scripts/asc-review-notes.py 1.0.1 store-assets/apple-review-notes.txt [--dry-run]
    python3 scripts/asc-review-notes.py 1.0.1 store-assets/resposta-apple-2.1.md --render

Sem argumento de arquivo, apenas mostra as notas que estão no ar. Com --render,
imprime o arquivo com as senhas preenchidas e não envia nada — é o caminho para
colar a resposta na Central de Resoluções.
"""
import argparse
import os
import re
import sys
import time
from pathlib import Path

import jwt
import requests

BASE = "https://api.appstoreconnect.apple.com"
APP_ID = "6748928194"
LIMITE_NOTAS = 4000

# Marcador de senha nos textos versionados -> conta de revisão a que ele pertence.
CONTAS_DE_REVISAO = {
    "SENHA_ALUNO": "revisor.loja@lepoti.tech",
    "SENHA_INSTRUTOR": "revisor.instrutor@lepoti.tech",
    "SENHA_ADMIN": "revisor.admin@lepoti.tech",
}


def preencher_senhas(texto, notas_no_ar):
    """Troca cada marcador pela senha da conta, lida do ambiente ou das notas no ar."""
    for nome, email in CONTAS_DE_REVISAO.items():
        marcador = f"<<{nome}>>"
        if marcador not in texto:
            continue
        senha = os.environ.get(nome)
        if not senha:
            # Nas notas a linha da conta é "<papel>: <email> / <senha>".
            achado = re.search(re.escape(email) + r"\s*/\s*(\S+)", notas_no_ar)
            senha = achado.group(1) if achado else None
        if not senha:
            sys.exit(f"Sem senha para {email}: as notas no ar não a trazem. Defina {nome} no ambiente.")
        texto = texto.replace(marcador, senha)

    # Marcador com nome errado não pode chegar à Apple como texto literal.
    sobra = re.search(r"<<SENHA_[A-Z_]*>>", texto)
    if sobra:
        sys.exit(f"Marcador sem conta correspondente: {sobra.group(0)}")
    return texto


def token_asc():
    key_id = os.environ.get("ASC_KEY_ID")
    issuer = os.environ.get("ASC_ISSUER_ID")
    caminho = os.environ.get("ASC_KEY_PATH")
    faltando = [n for n, v in [("ASC_KEY_ID", key_id), ("ASC_ISSUER_ID", issuer),
                               ("ASC_KEY_PATH", caminho)] if not v]
    if faltando:
        sys.exit("Faltam variáveis de ambiente: " + ", ".join(faltando))

    chave = Path(os.path.expanduser(caminho)).read_text()
    agora = int(time.time())
    return jwt.encode({"iss": issuer, "iat": agora, "exp": agora + 1200,
                       "aud": "appstoreconnect-v1"},
                      chave, algorithm="ES256", headers={"kid": key_id, "typ": "JWT"})


class ASC:
    def __init__(self):
        self.h = {"Authorization": f"Bearer {token_asc()}", "Content-Type": "application/json"}

    def _check(self, r, oque):
        if r.status_code >= 400:
            try:
                for e in r.json().get("errors", []):
                    print(f"  ! {e.get('title')}: {e.get('detail')}", file=sys.stderr)
            except ValueError:
                print(f"  ! {r.text[:500]}", file=sys.stderr)
            sys.exit(f"Falhou: {oque} (HTTP {r.status_code})")
        return r.json() if r.text else {}

    def get(self, caminho, **params):
        return self._check(requests.get(f"{BASE}{caminho}", headers=self.h, params=params, timeout=60),
                           f"GET {caminho}")

    def patch(self, caminho, corpo):
        return self._check(requests.patch(f"{BASE}{caminho}", headers=self.h, json=corpo, timeout=60),
                           f"PATCH {caminho}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("versao", help="versão como aparece na loja, ex.: 1.0.1")
    ap.add_argument("arquivo", nargs="?", help="arquivo de texto com as notas")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--render", action="store_true",
                    help="só imprime o arquivo com as senhas preenchidas, sem enviar nada")
    args = ap.parse_args()
    if args.render and not args.arquivo:
        sys.exit("--render precisa de um arquivo.")

    asc = ASC()
    versoes = asc.get(f"/v1/apps/{APP_ID}/appStoreVersions",
                      **{"filter[versionString]": args.versao, "limit": 5}).get("data", [])
    if not versoes:
        sys.exit(f"Versão {args.versao} não encontrada.")
    versao = versoes[0]
    print(f"versão {args.versao} ({versao['id']}) — estado {versao['attributes'].get('appStoreState')}")

    detalhe = asc.get(f"/v1/appStoreVersions/{versao['id']}/appStoreReviewDetail").get("data")
    if not detalhe:
        sys.exit("Esta versão não tem App Review Detail.")
    atual = detalhe["attributes"].get("notes") or ""

    if not args.arquivo:
        print(f"\n--- notas no ar ({len(atual)} caracteres) ---\n{atual}")
        return

    novas = preencher_senhas(Path(args.arquivo).read_text().strip(), atual)
    if args.render:
        print(novas)
        return

    print(f"notas atuais: {len(atual)} caracteres | novas: {len(novas)} caracteres")
    if len(novas) > LIMITE_NOTAS:
        sys.exit(f"As notas têm {len(novas)} caracteres e o limite da Apple é {LIMITE_NOTAS}.")
    if novas == atual:
        print("Nada a fazer: o texto já está aplicado.")
        return
    if args.dry_run:
        print("--dry-run: nada foi enviado.")
        return

    asc.patch(f"/v1/appStoreReviewDetails/{detalhe['id']}",
              {"data": {"type": "appStoreReviewDetails", "id": detalhe["id"],
                        "attributes": {"notes": novas}}})
    conferencia = asc.get(f"/v1/appStoreVersions/{versao['id']}/appStoreReviewDetail")
    aplicado = conferencia["data"]["attributes"].get("notes") or ""
    print("aplicado." if aplicado == novas else "ATENÇÃO: o que voltou difere do que foi enviado.")


if __name__ == "__main__":
    main()
