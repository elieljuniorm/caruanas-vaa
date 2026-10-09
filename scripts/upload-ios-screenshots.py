#!/usr/bin/env python3
"""
Envia screenshots para uma versão da App Store.

O upload no App Store Connect é em três tempos — reservar, enviar os bytes nas
operações que a Apple devolve, e confirmar com o checksum. Se parar no meio, a
imagem fica pendurada na versão sem nunca ficar pronta, então o script apaga a
reserva quando o envio falha.

Uso:
    export ASC_KEY_ID=... ASC_ISSUER_ID=... ASC_KEY_PATH=...
    python3 scripts/upload-ios-screenshots.py 1.0.1 pt-BR shots/*.png
    python3 scripts/upload-ios-screenshots.py 1.0.1 pt-BR store-assets/ipad/*.png --tipo APP_IPAD_PRO_3GEN_129
"""
import argparse
import hashlib
import os
import sys
import time
from pathlib import Path

import jwt
import requests

BUNDLE_ID = "tech.lepoti.caruanasvaa"
BASE = "https://api.appstoreconnect.apple.com"
# Slot dos iPhones grandes: aceita 1320x2868 (6,9") e 1290x2796 (6,7").
# O app declara suporte a iPad (UIDeviceFamily 1 e 2), entao a Apple tambem
# exige o slot de iPad de 13": APP_IPAD_PRO_3GEN_129, que aceita 2064x2752.
TIPO_TELA_PADRAO = "APP_IPHONE_67"


def cabecalho():
    key_id, issuer = os.environ["ASC_KEY_ID"], os.environ["ASC_ISSUER_ID"]
    chave = Path(os.path.expanduser(os.environ["ASC_KEY_PATH"])).read_text()
    agora = int(time.time())
    tok = jwt.encode({"iss": issuer, "iat": agora, "exp": agora + 1200, "aud": "appstoreconnect-v1"},
                     chave, algorithm="ES256", headers={"kid": key_id, "typ": "JWT"})
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def checar(r, oque):
    if r.status_code >= 400:
        try:
            for e in r.json().get("errors", []):
                print(f"  ! {e.get('title')}: {e.get('detail')}", file=sys.stderr)
        except Exception:
            print(f"  ! {r.text[:400]}", file=sys.stderr)
        sys.exit(f"Falhou: {oque} (HTTP {r.status_code})")
    return r.json() if r.text else {}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("versao")
    ap.add_argument("locale")
    ap.add_argument("imagens", nargs="+")
    ap.add_argument("--substituir", action="store_true",
                    help="apaga os screenshots já existentes no conjunto antes de enviar")
    ap.add_argument("--tipo", default=TIPO_TELA_PADRAO,
                    help=f"slot de tela na App Store (padrão {TIPO_TELA_PADRAO}; "
                         "iPad de 13\" é APP_IPAD_PRO_3GEN_129)")
    args = ap.parse_args()
    tipo_tela = args.tipo

    h = cabecalho()

    app = checar(requests.get(f"{BASE}/v1/apps", headers=h,
                              params={"filter[bundleId]": BUNDLE_ID}, timeout=60), "apps")["data"][0]
    versoes = checar(requests.get(f"{BASE}/v1/apps/{app['id']}/appStoreVersions", headers=h,
                                  params={"filter[versionString]": args.versao}, timeout=60),
                     "versões")["data"]
    if not versoes:
        sys.exit(f"Versão {args.versao} não existe.")
    versao_id = versoes[0]["id"]

    locs = checar(requests.get(f"{BASE}/v1/appStoreVersions/{versao_id}/appStoreVersionLocalizations",
                               headers=h, timeout=60), "localizações")["data"]
    loc = next((l for l in locs if l["attributes"]["locale"] == args.locale), None)
    if not loc:
        sys.exit(f"Localização {args.locale} não existe na versão {args.versao}.")

    conjuntos = checar(requests.get(f"{BASE}/v1/appStoreVersionLocalizations/{loc['id']}/appScreenshotSets",
                                    headers=h, timeout=60), "conjuntos")["data"]
    conjunto = next((c for c in conjuntos
                     if c["attributes"]["screenshotDisplayType"] == tipo_tela), None)
    if conjunto:
        print(f"Conjunto {tipo_tela} já existe.")
    else:
        conjunto = checar(requests.post(f"{BASE}/v1/appScreenshotSets", headers=h, json={
            "data": {"type": "appScreenshotSets",
                     "attributes": {"screenshotDisplayType": tipo_tela},
                     "relationships": {"appStoreVersionLocalization": {
                         "data": {"type": "appStoreVersionLocalizations", "id": loc["id"]}}}}
        }, timeout=60), "criar conjunto")["data"]
        print(f"Conjunto {tipo_tela} criado.")

    if args.substituir:
        atuais = checar(requests.get(f"{BASE}/v1/appScreenshotSets/{conjunto['id']}/appScreenshots",
                                     headers=h, timeout=60), "listar")["data"]
        for s in atuais:
            requests.delete(f"{BASE}/v1/appScreenshots/{s['id']}", headers=h, timeout=60)
        if atuais:
            print(f"Removidos {len(atuais)} screenshots anteriores.")

    for caminho in args.imagens:
        p = Path(caminho)
        dados = p.read_bytes()
        print(f"\n{p.name} ({len(dados)//1024} KB)")

        reserva = checar(requests.post(f"{BASE}/v1/appScreenshots", headers=h, json={
            "data": {"type": "appScreenshots",
                     "attributes": {"fileSize": len(dados), "fileName": p.name},
                     "relationships": {"appScreenshotSet": {
                         "data": {"type": "appScreenshotSets", "id": conjunto["id"]}}}}
        }, timeout=60), "reservar")["data"]

        try:
            for op in reserva["attributes"]["uploadOperations"]:
                pedaco = dados[op["offset"]:op["offset"] + op["length"]]
                cab = {c["name"]: c["value"] for c in op.get("requestHeaders", [])}
                r = requests.request(op["method"], op["url"], headers=cab, data=pedaco, timeout=300)
                if r.status_code >= 400:
                    raise RuntimeError(f"upload HTTP {r.status_code}")

            checar(requests.patch(f"{BASE}/v1/appScreenshots/{reserva['id']}", headers=h, json={
                "data": {"type": "appScreenshots", "id": reserva["id"],
                         "attributes": {"uploaded": True,
                                        "sourceFileChecksum": hashlib.md5(dados).hexdigest()}}
            }, timeout=120), "confirmar")
            print("  enviado")
        except Exception as e:
            # Reserva sem bytes fica presa na versão e trava a submissão.
            requests.delete(f"{BASE}/v1/appScreenshots/{reserva['id']}", headers=h, timeout=60)
            sys.exit(f"  falhou ({e}); reserva removida")

    print("\nConcluído.")


if __name__ == "__main__":
    main()
