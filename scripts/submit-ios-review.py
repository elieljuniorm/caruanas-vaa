#!/usr/bin/env python3
"""
Dispara a revisão da App Store com liberação MANUAL.

O `eas submit` sobe o binário para o App Store Connect e para por aí — o build
fica disponível no TestFlight, mas nada é enviado para a análise da App Store.
Este script faz o passo seguinte: prepara a versão, anexa o build, marca a
liberação como manual (aprovado ≠ publicado: a publicação espera um clique) e
envia para revisão.

Uso:
    export ASC_KEY_ID=XXXXXXXXXX
    export ASC_ISSUER_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    export ASC_KEY_PATH=~/.appstoreconnect/private_keys/AuthKey_XXXXXXXXXX.p8
    python3 scripts/submit-ios-review.py 1.0.1 [--build 20] [--dry-run]

Sem --build, usa o build processado mais recente daquela versão.
"""
import argparse
import json
import os
import sys
import time
from pathlib import Path

import jwt
import requests

BUNDLE_ID = "tech.lepoti.caruanasvaa"
BASE = "https://api.appstoreconnect.apple.com"


def token_asc():
    key_id = os.environ.get("ASC_KEY_ID")
    issuer = os.environ.get("ASC_ISSUER_ID")
    caminho = os.environ.get("ASC_KEY_PATH")
    faltando = [n for n, v in
                [("ASC_KEY_ID", key_id), ("ASC_ISSUER_ID", issuer), ("ASC_KEY_PATH", caminho)] if not v]
    if faltando:
        sys.exit("Faltam variáveis de ambiente: " + ", ".join(faltando))

    chave = Path(os.path.expanduser(caminho)).read_text()
    agora = int(time.time())
    payload = {"iss": issuer, "iat": agora, "exp": agora + 1200, "aud": "appstoreconnect-v1"}
    return jwt.encode(payload, chave, algorithm="ES256", headers={"kid": key_id, "typ": "JWT"})


class ASC:
    def __init__(self):
        self.h = {"Authorization": f"Bearer {token_asc()}", "Content-Type": "application/json"}

    def _check(self, r, oque):
        if r.status_code >= 400:
            # Os erros da Apple trazem o motivo em detail — é o que diz qual
            # metadado está faltando quando a submissão é recusada.
            try:
                for e in r.json().get("errors", []):
                    print(f"  ! {e.get('title')}: {e.get('detail')}", file=sys.stderr)
            except Exception:
                print(f"  ! {r.text[:500]}", file=sys.stderr)
            sys.exit(f"Falhou: {oque} (HTTP {r.status_code})")
        return r.json() if r.text else {}

    def get(self, caminho, **params):
        return self._check(requests.get(f"{BASE}{caminho}", headers=self.h, params=params, timeout=60),
                           f"GET {caminho}")

    def post(self, caminho, corpo):
        return self._check(requests.post(f"{BASE}{caminho}", headers=self.h, json=corpo, timeout=60),
                           f"POST {caminho}")

    def patch(self, caminho, corpo):
        return self._check(requests.patch(f"{BASE}{caminho}", headers=self.h, json=corpo, timeout=60),
                           f"PATCH {caminho}")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("versao", help="versão como aparece na loja, ex.: 1.0.1")
    ap.add_argument("--build", help="número do build; sem isso usa o mais recente já processado")
    ap.add_argument("--dry-run", action="store_true", help="mostra o que faria, sem submeter")
    args = ap.parse_args()

    asc = ASC()

    apps = asc.get("/v1/apps", **{"filter[bundleId]": BUNDLE_ID})["data"]
    if not apps:
        sys.exit(f"App {BUNDLE_ID} não encontrado nesta conta.")
    app_id = apps[0]["id"]
    print(f"App: {apps[0]['attributes']['name']} ({app_id})")

    # ── build ───────────────────────────────────────────────────────────────
    filtros = {"filter[app]": app_id, "limit": 20, "sort": "-version"}
    if args.build:
        filtros["filter[version]"] = args.build
    builds = asc.get("/v1/builds", **filtros)["data"]
    prontos = [b for b in builds if b["attributes"].get("processingState") == "VALID"]
    if not prontos:
        estados = {b["attributes"]["version"]: b["attributes"].get("processingState") for b in builds[:5]}
        sys.exit(f"Nenhum build processado e válido. Estados recentes: {estados}")
    build = prontos[0]
    print(f"Build: {build['attributes']['version']} (processamento {build['attributes']['processingState']})")

    # ── versão na loja ──────────────────────────────────────────────────────
    versoes = asc.get(f"/v1/apps/{app_id}/appStoreVersions",
                      **{"filter[versionString]": args.versao, "limit": 1})["data"]
    if versoes:
        versao = versoes[0]
        estado = versao["attributes"].get("appStoreState")
        print(f"Versão {args.versao} já existe (estado: {estado})")
        if estado in ("READY_FOR_SALE", "PENDING_DEVELOPER_RELEASE", "IN_REVIEW", "WAITING_FOR_REVIEW"):
            sys.exit(f"A versão já está em {estado} — nada a submeter.")
    else:
        print(f"Versão {args.versao} não existe; criando...")
        if args.dry_run:
            print("[dry-run] criaria a versão e seguiria"); return
        versao = asc.post("/v1/appStoreVersions", {
            "data": {
                "type": "appStoreVersions",
                "attributes": {
                    "platform": "IOS",
                    "versionString": args.versao,
                    # MANUAL: aprovado pela Apple, publica só quando alguém clicar.
                    "releaseType": "MANUAL",
                },
                "relationships": {"app": {"data": {"type": "apps", "id": app_id}}},
            }
        })["data"]
    versao_id = versao["id"]

    if args.dry_run:
        print(f"[dry-run] anexaria o build {build['attributes']['version']} à versão {args.versao},")
        print("[dry-run] marcaria releaseType=MANUAL e enviaria para revisão.")
        return

    # Garante liberação manual mesmo numa versão criada antes.
    asc.patch(f"/v1/appStoreVersions/{versao_id}", {
        "data": {"type": "appStoreVersions", "id": versao_id,
                 "attributes": {"releaseType": "MANUAL"}}
    })
    print("Liberação marcada como MANUAL (aprovado não publica sozinho).")

    asc.patch(f"/v1/appStoreVersions/{versao_id}/relationships/build",
              {"data": {"type": "builds", "id": build["id"]}})
    print("Build anexado à versão.")

    # ── envio para revisão ──────────────────────────────────────────────────
    submissoes = asc.get("/v1/reviewSubmissions",
                         **{"filter[app]": app_id, "filter[state]": "READY_FOR_REVIEW", "limit": 1})["data"]
    if submissoes:
        submissao = submissoes[0]
        print(f"Reaproveitando submissão em aberto ({submissao['id']}).")
    else:
        submissao = asc.post("/v1/reviewSubmissions", {
            "data": {"type": "reviewSubmissions", "attributes": {"platform": "IOS"},
                     "relationships": {"app": {"data": {"type": "apps", "id": app_id}}}}
        })["data"]
        print(f"Submissão criada ({submissao['id']}).")

    asc.post("/v1/reviewSubmissionItems", {
        "data": {"type": "reviewSubmissionItems",
                 "relationships": {
                     "reviewSubmission": {"data": {"type": "reviewSubmissions", "id": submissao["id"]}},
                     "appStoreVersion": {"data": {"type": "appStoreVersions", "id": versao_id}}}}
    })
    print("Versão adicionada à submissão.")

    asc.patch(f"/v1/reviewSubmissions/{submissao['id']}",
              {"data": {"type": "reviewSubmissions", "id": submissao["id"],
                        "attributes": {"submitted": True}}})
    print(f"\n✓ Versão {args.versao} enviada para a análise da Apple, com liberação MANUAL.")
    print("  Quando aprovada, ela fica em 'Pendente de liberação' até alguém publicar.")


if __name__ == "__main__":
    main()
