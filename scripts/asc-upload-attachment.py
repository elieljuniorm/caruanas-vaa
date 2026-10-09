#!/usr/bin/env python3
"""
Sobe um anexo para App Review Information (o vídeo que a Apple pede na Guideline 2.1).

O fluxo é o mesmo das screenshots: reservar (a Apple devolve as *upload operations*),
mandar os bytes em cada pedaço e confirmar com o checksum MD5. Sem a confirmação o
anexo fica preso em `AWAITING_UPLOAD` e não aparece para o revisor.

Uso:
    export ASC_KEY_ID=GUFU9P4YAH
    export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    export ASC_KEY_PATH=~/.appstoreconnect/private_keys/AuthKey_GUFU9P4YAH.p8
    python3 scripts/asc-upload-attachment.py 1.0.1 demo.mp4 [--substituir]

`--substituir` apaga os anexos que já existirem na versão antes de subir o novo.
"""
import argparse
import hashlib
import os
import sys
import time
from pathlib import Path

import jwt
import requests

BASE = "https://api.appstoreconnect.apple.com"
APP_ID = "6748928194"


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

    def post(self, caminho, corpo):
        return self._check(requests.post(f"{BASE}{caminho}", headers=self.h, json=corpo, timeout=120),
                           f"POST {caminho}")

    def patch(self, caminho, corpo):
        return self._check(requests.patch(f"{BASE}{caminho}", headers=self.h, json=corpo, timeout=60),
                           f"PATCH {caminho}")

    def delete(self, caminho):
        r = requests.delete(f"{BASE}{caminho}", headers=self.h, timeout=60)
        if r.status_code >= 400:
            print(f"  ! não consegui apagar {caminho} (HTTP {r.status_code})", file=sys.stderr)


def enviar_bytes(operacoes, dados):
    """Executa as upload operations que a Apple devolveu, na ordem."""
    for i, op in enumerate(operacoes, 1):
        cabecalhos = {h["name"]: h["value"] for h in op.get("requestHeaders", [])}
        pedaco = dados[op["offset"]:op["offset"] + op["length"]]
        r = requests.request(op["method"], op["url"], headers=cabecalhos, data=pedaco, timeout=600)
        if r.status_code >= 400:
            sys.exit(f"Falha ao enviar o pedaço {i}/{len(operacoes)} (HTTP {r.status_code})")
        print(f"  pedaço {i}/{len(operacoes)} enviado ({len(pedaco)/1_048_576:.1f} MB)")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("versao", help="versão como aparece na loja, ex.: 1.0.1")
    ap.add_argument("arquivo", help="o vídeo (ou documento) a anexar")
    ap.add_argument("--substituir", action="store_true", help="apaga os anexos existentes antes")
    args = ap.parse_args()

    caminho = Path(args.arquivo)
    if not caminho.is_file():
        sys.exit(f"Arquivo não encontrado: {caminho}")
    dados = caminho.read_bytes()
    print(f"{caminho.name}: {len(dados)/1_048_576:.1f} MB")

    asc = ASC()
    versoes = asc.get(f"/v1/apps/{APP_ID}/appStoreVersions",
                      **{"filter[versionString]": args.versao, "limit": 5}).get("data", [])
    if not versoes:
        sys.exit(f"Versão {args.versao} não encontrada.")
    versao = versoes[0]
    detalhe = asc.get(f"/v1/appStoreVersions/{versao['id']}/appStoreReviewDetail").get("data")
    if not detalhe:
        sys.exit("Esta versão não tem App Review Detail.")
    print(f"versão {args.versao} ({versao['id']}) — estado {versao['attributes'].get('appStoreState')}")

    existentes = asc.get(f"/v1/appStoreReviewDetails/{detalhe['id']}/appStoreReviewAttachments").get("data", [])
    print(f"anexos existentes: {len(existentes)}")
    if existentes and args.substituir:
        for a in existentes:
            asc.delete(f"/v1/appStoreReviewAttachments/{a['id']}")
            print(f"  apagado {a['id']}")

    reserva = asc.post("/v1/appStoreReviewAttachments", {
        "data": {
            "type": "appStoreReviewAttachments",
            "attributes": {"fileSize": len(dados), "fileName": caminho.name},
            "relationships": {"appStoreReviewDetail": {
                "data": {"type": "appStoreReviewDetails", "id": detalhe["id"]}}},
        }
    })["data"]

    enviar_bytes(reserva["attributes"]["uploadOperations"], dados)

    asc.patch(f"/v1/appStoreReviewAttachments/{reserva['id']}", {
        "data": {"type": "appStoreReviewAttachments", "id": reserva["id"],
                 "attributes": {"uploaded": True,
                                "sourceFileChecksum": hashlib.md5(dados).hexdigest()}}
    })

    final = asc.get(f"/v1/appStoreReviewAttachments/{reserva['id']}")["data"]["attributes"]
    print(f"estado do anexo: {final.get('assetDeliveryState', {}).get('state')} — {final.get('fileName')}")


if __name__ == "__main__":
    main()
