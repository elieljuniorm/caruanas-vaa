#!/usr/bin/env python3
"""
Mostra o estado do app no Google Play: tracks, releases, bundles enviados.

Só lê. A API do Play não deixa consultar tracks fora de uma edição, então o
script abre uma e a **descarta no fim** — sem `commit`, nada do que ele faz
chega à loja. Serve para responder, sem abrir o console, perguntas do tipo
"o release da vc 19 sobreviveu à rejeição?" ou "qual versão está no interno?".

Uso:
    export PLAY_KEY_PATH=~/.config/lepoti/play/play-publisher-lepoti-tech.json
    python3 scripts/play-estado.py [--package tech.lepoti.caruanasvaa]

A chave é a `play-publisher@lepoti-tech.iam.gserviceaccount.com` e **não está na
máquina de desenvolvimento** — ela vive no `hedgehog`, no caminho acima, que é o
valor padrão de `PLAY_KEY_PATH`. Rode o script de lá. Não confundir com a
`~/key.json` (`eas-service-account@caruanasvaa-app`), que devolve 403 aqui, nem
com a `eas-play-publisher@`, cuja chave só existe nos servidores do EAS.

O que a API **não** expõe: *Conteúdo do app > Acesso ao app*. Credenciais de
revisão e instruções de teste só existem no console — de todo o Conteúdo do app,
a `androidpublisher v3` só publica o formulário de Segurança de Dados. Não
procure por aqui.
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

import jwt
import requests

PACOTE_PADRAO = "tech.lepoti.caruanasvaa"
CHAVE_PADRAO = "~/.config/lepoti/play/play-publisher-lepoti-tech.json"
ESCOPO = "https://www.googleapis.com/auth/androidpublisher"
BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications"


def token_play(caminho_chave):
    caminho = Path(os.path.expanduser(caminho_chave))
    if not caminho.exists():
        sys.exit(f"Chave não encontrada em {caminho}. "
                 "Ela fica no hedgehog; aponte PLAY_KEY_PATH para o arquivo certo.")
    cred = json.loads(caminho.read_text())
    agora = int(time.time())
    assertion = jwt.encode(
        {"iss": cred["client_email"], "scope": ESCOPO, "aud": cred["token_uri"],
         "iat": agora, "exp": agora + 3600},
        cred["private_key"], algorithm="RS256")
    resposta = requests.post(cred["token_uri"], timeout=60, data={
        "grant_type": "urn:ietf:params:oauth:grant-type:jwt-bearer",
        "assertion": assertion}).json()
    if "access_token" not in resposta:
        sys.exit(f"Falha ao trocar o JWT por token: {resposta}")
    return resposta["access_token"], cred["client_email"]


def checar(r, oque):
    if r.status_code >= 400:
        # O 403 aqui quase sempre é conta de serviço sem convite no Play
        # Console, não escopo errado — o erro da Google não distingue os dois.
        try:
            print(f"  ! {r.json()['error']['message']}", file=sys.stderr)
        except Exception:
            print(f"  ! {r.text[:300]}", file=sys.stderr)
        sys.exit(f"Falhou: {oque} (HTTP {r.status_code})")
    return r.json() if r.text else {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--package", default=PACOTE_PADRAO, help=f"padrão: {PACOTE_PADRAO}")
    ap.add_argument("--chave", default=os.environ.get("PLAY_KEY_PATH", CHAVE_PADRAO),
                    help=f"caminho da chave JSON (padrão: {CHAVE_PADRAO})")
    args = ap.parse_args()

    token, conta = token_play(args.chave)
    h = {"Authorization": f"Bearer {token}"}
    api = f"{BASE}/{args.package}"
    print(f"{args.package} — autenticado como {conta}")

    edicao = checar(requests.post(f"{api}/edits", headers=h, timeout=60), "abrir edição")["id"]
    try:
        tracks = checar(requests.get(f"{api}/edits/{edicao}/tracks", headers=h, timeout=60),
                        "listar tracks")
        for t in tracks.get("tracks", []):
            print(f"\ntrack '{t['track']}':")
            lancamentos = t.get("releases") or []
            if not lancamentos:
                print("  (sem releases)")
            for r in lancamentos:
                partes = [f"status={r.get('status')}", f"nome={r.get('name')}",
                          f"versionCodes={r.get('versionCodes')}"]
                if r.get("userFraction") is not None:
                    partes.append(f"userFraction={r['userFraction']}")
                if r.get("countryTargeting"):
                    partes.append(f"países={r['countryTargeting']}")
                print("  " + "  ".join(partes))

        bundles = checar(requests.get(f"{api}/edits/{edicao}/bundles", headers=h, timeout=60),
                         "listar bundles")
        print("\nbundles enviados:", [b["versionCode"] for b in bundles.get("bundles", [])])

        detalhes = checar(requests.get(f"{api}/edits/{edicao}/details", headers=h, timeout=60),
                          "detalhes")
        print("detalhes:", detalhes)
    finally:
        # Edição aberta e não descartada fica bloqueando a próxima; o delete é
        # o que mantém o script seguro de rodar quantas vezes quiser.
        requests.delete(f"{api}/edits/{edicao}", headers=h, timeout=60)
        print("\n(edição descartada — nada foi enviado à loja)")


if __name__ == "__main__":
    main()
