#!/usr/bin/env python3
# Gera a galeria HTML dos recursos gráficos da Play Store (previews embutidos como data URI).
import base64, io
from PIL import Image

SRC = '/home/pedro/lepotitech/projetos/caruanas/vaa/store-assets/'
OUT = SRC + 'galeria.html'

def datauri(path, w, fmt='JPEG', q=82):
    im = Image.open(path)
    if im.width > w:
        im = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS)
    buf = io.BytesIO()
    if fmt == 'JPEG':
        im.convert('RGB').save(buf, 'JPEG', quality=q, optimize=True)
        mime = 'image/jpeg'
    else:
        im.save(buf, 'PNG', optimize=True)
        mime = 'image/png'
    return f'data:{mime};base64,' + base64.b64encode(buf.getvalue()).decode()

icon = datauri(SRC + 'play-icon-512.png', 256, 'PNG')
feat = datauri(SRC + 'feature-graphic-1024x500.png', 900, 'JPEG', 85)

phone = [
    ('shot-1-inicio.png',      'Início',       'Painel e próxima aula'),
    ('shot-4-turmas.png',      'Turmas',       'Turmas, instrutor e presença'),
    ('shot-2-faturas.png',     'Faturas',      'Mensalidades por aluno'),
    ('shot-3-noticias.png',    'Notícias',     'Destaques do clube'),
    ('shot-5-declaracoes.png', 'Declarações',  'Saúde e aptidão'),
]
phone_uris = [(datauri(SRC + f, 520, 'JPEG', 80), t, s) for f, t, s in phone]

tabs = [
    ('tab-1-inicio.png',      'Início'),
    ('tab-3-turmas.png',      'Turmas'),
    ('tab-2-faturas.png',     'Faturas'),
    ('tab-4-noticias.png',    'Notícias'),
    ('tab-5-declaracoes.png', 'Declarações'),
]
tab_uris = [(datauri(SRC + 'tablet/' + f, 480, 'JPEG', 80), t) for f, t in tabs]

specs = [
    ('Ícone do app', '512 × 512', 'PNG', 'play-icon-512.png', 'Detalhes do app → Ícone'),
    ('Gráfico de destaque', '1024 × 500', 'PNG', 'feature-graphic-1024x500.png', 'Detalhes do app → Gráfico de destaque'),
    ('Capturas · smartphone', '1080 × 2400', 'PNG ×5', 'shot-1…5-*.png', 'Capturas de tela do smartphone'),
    ('Capturas · tablet 7"', '1800 × 2560', 'PNG ×5', 'tablet/tab-1…5-*.png', 'Capturas de tela de tablet de 7"'),
    ('Capturas · tablet 10"', '1800 × 2560', 'PNG ×5', 'tablet/tab-1…5-*.png', 'Capturas de tela de tablet de 10"'),
]

phone_cards = '\n'.join(
    f'''<figure class="shot">
      <div class="phone"><img src="{u}" alt="{t}" loading="lazy"></div>
      <figcaption><span class="shot-t">{t}</span><span class="shot-s">{s}</span></figcaption>
    </figure>''' for u, t, s in phone_uris)

tab_cards = '\n'.join(
    f'''<figure class="shot">
      <div class="tabframe"><img src="{u}" alt="{t}" loading="lazy"></div>
      <figcaption><span class="shot-t">{t}</span></figcaption>
    </figure>''' for u, t in tab_uris)

spec_rows = '\n'.join(
    f'''<tr><td>{a}</td><td class="num">{d}</td><td class="mut">{fm}</td>
        <td><code>{fn}</code></td><td class="mut">{loc}</td><td class="ok">✓ pronto</td></tr>'''
    for a, d, fm, fn, loc in specs)

HTML = f'''<title>Recursos gráficos — Caruanas Va'a</title>
<style>
  :root {{
    --bg:#f6f1ec; --surface:#fffdfb; --surface-2:#f0e8e1; --line:#e4d8ce;
    --text:#231a15; --muted:#7d6f64; --accent:#F24022; --accent-ink:#fff;
    --ok:#1f8a4c; --shadow:0 1px 2px rgba(60,40,25,.06),0 8px 24px rgba(60,40,25,.08);
    --maxw:1080px;
  }}
  @media (prefers-color-scheme:dark) {{
    :root {{
      --bg:#171210; --surface:#221a16; --surface-2:#2b201b; --line:#3a2c25;
      --text:#f3ece7; --muted:#a99a8f; --accent:#FF5a3c; --accent-ink:#1a0f0b;
      --ok:#4ecb7c; --shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px rgba(0,0,0,.35);
    }}
  }}
  :root[data-theme="light"] {{
    --bg:#f6f1ec; --surface:#fffdfb; --surface-2:#f0e8e1; --line:#e4d8ce;
    --text:#231a15; --muted:#7d6f64; --accent:#F24022; --accent-ink:#fff; --ok:#1f8a4c;
    --shadow:0 1px 2px rgba(60,40,25,.06),0 8px 24px rgba(60,40,25,.08);
  }}
  :root[data-theme="dark"] {{
    --bg:#171210; --surface:#221a16; --surface-2:#2b201b; --line:#3a2c25;
    --text:#f3ece7; --muted:#a99a8f; --accent:#FF5a3c; --accent-ink:#1a0f0b; --ok:#4ecb7c;
    --shadow:0 1px 2px rgba(0,0,0,.3),0 10px 30px rgba(0,0,0,.35);
  }}
  * {{ box-sizing:border-box; }}
  body {{
    margin:0; background:var(--bg); color:var(--text);
    font-family:"Segoe UI",system-ui,-apple-system,Roboto,Helvetica,Arial,sans-serif;
    line-height:1.55; -webkit-font-smoothing:antialiased;
  }}
  .wrap {{ max-width:var(--maxw); margin:0 auto; padding:clamp(20px,5vw,56px) clamp(16px,4vw,32px) 72px; }}
  .eyebrow {{ font-size:12px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:var(--accent); margin:0 0 10px; }}
  h1 {{ font-size:clamp(28px,5vw,44px); line-height:1.05; margin:0 0 12px; letter-spacing:-.02em; text-wrap:balance; font-weight:800; }}
  .lead {{ font-size:clamp(15px,2.2vw,18px); color:var(--muted); margin:0; max-width:62ch; }}
  .lead b {{ color:var(--text); font-weight:600; }}
  .path {{ display:inline-flex; gap:8px; align-items:center; margin-top:18px; padding:8px 14px; background:var(--surface); border:1px solid var(--line); border-radius:10px; font-size:13.5px; box-shadow:var(--shadow); }}
  .path code {{ font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace; color:var(--accent); font-size:13px; }}
  h2 {{ font-size:13px; font-weight:700; letter-spacing:.12em; text-transform:uppercase; color:var(--muted); margin:52px 0 6px; }}
  h2 + .sub {{ color:var(--muted); font-size:14px; margin:0 0 18px; padding-bottom:14px; border-bottom:1px solid var(--line); }}
  .brand {{ display:grid; grid-template-columns:1fr; gap:20px; }}
  @media (min-width:720px) {{ .brand {{ grid-template-columns:260px 1fr; }} }}
  .card {{ background:var(--surface); border:1px solid var(--line); border-radius:16px; padding:20px; box-shadow:var(--shadow); }}
  .card .meta {{ margin-top:16px; }}
  .card .k {{ font-weight:700; font-size:15px; margin:0 0 4px; }}
  .card .v {{ color:var(--muted); font-size:13.5px; margin:0; }}
  .card code {{ font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace; font-size:12.5px; color:var(--text); background:var(--surface-2); padding:2px 6px; border-radius:6px; }}
  .icon-frame {{ display:grid; place-items:center; background:var(--surface-2); border-radius:12px; padding:22px; }}
  .icon-frame img {{ width:132px; height:132px; border-radius:26px; box-shadow:var(--shadow); }}
  .feat-frame {{ border-radius:12px; overflow:hidden; border:1px solid var(--line); aspect-ratio:1024/500; }}
  .feat-frame img {{ width:100%; height:100%; object-fit:cover; display:block; }}
  .shots {{ display:grid; grid-template-columns:repeat(auto-fill,minmax(150px,1fr)); gap:22px; }}
  .shots.tablet {{ grid-template-columns:repeat(auto-fill,minmax(190px,1fr)); }}
  .shot {{ margin:0; }}
  .phone, .tabframe {{ border-radius:20px; overflow:hidden; border:1px solid var(--line); background:#000; box-shadow:var(--shadow); }}
  .phone {{ aspect-ratio:1080/2400; }}
  .tabframe {{ aspect-ratio:1800/2560; border-radius:16px; }}
  .phone img, .tabframe img {{ width:100%; height:100%; object-fit:cover; display:block; }}
  figcaption {{ display:flex; flex-direction:column; margin-top:10px; }}
  .shot-t {{ font-weight:700; font-size:14.5px; }}
  .shot-s {{ color:var(--muted); font-size:12.5px; }}
  .tablewrap {{ overflow-x:auto; border:1px solid var(--line); border-radius:14px; box-shadow:var(--shadow); background:var(--surface); }}
  table {{ border-collapse:collapse; width:100%; font-size:14px; min-width:660px; }}
  th {{ text-align:left; font-size:11.5px; letter-spacing:.08em; text-transform:uppercase; color:var(--muted); font-weight:700; padding:14px 16px; border-bottom:1px solid var(--line); }}
  td {{ padding:14px 16px; border-bottom:1px solid var(--line); vertical-align:middle; }}
  tr:last-child td {{ border-bottom:none; }}
  td.num {{ font-variant-numeric:tabular-nums; font-weight:600; white-space:nowrap; }}
  td.mut {{ color:var(--muted); }}
  td code {{ font-family:ui-monospace,"SF Mono",Menlo,Consolas,monospace; font-size:12.5px; color:var(--accent); }}
  td.ok {{ color:var(--ok); font-weight:700; white-space:nowrap; }}
  .notes {{ margin-top:26px; display:grid; gap:12px; }}
  .note {{ display:flex; gap:12px; align-items:flex-start; background:var(--surface); border:1px solid var(--line); border-left:3px solid var(--accent); border-radius:10px; padding:14px 16px; box-shadow:var(--shadow); }}
  .note .dot {{ color:var(--accent); font-weight:800; line-height:1.5; }}
  .note p {{ margin:0; font-size:14px; color:var(--text); }}
  .note p b {{ font-weight:700; }}
  footer {{ margin-top:56px; color:var(--muted); font-size:12.5px; border-top:1px solid var(--line); padding-top:20px; }}
</style>

<div class="wrap">
  <p class="eyebrow">Google Play · versão de teste</p>
  <h1>Recursos gráficos — Caruanas Va'a</h1>
  <p class="lead">Assets prontos para o cadastro da loja da build <b>v1.0.1</b> (Android versionCode <b>11</b> · iOS build <b>13</b>). Ícone e gráfico de destaque gerados a partir da identidade do clube; screenshots capturados do app rodando em <b>smartphone e tablet</b>.</p>
  <span class="path">Arquivos em alta resolução: <code>vaa/store-assets/</code></span>

  <h2>Ícone &amp; gráfico de destaque</h2>
  <p class="sub">Os dois assets de marca exigidos na ficha da loja.</p>
  <div class="brand">
    <div class="card">
      <div class="icon-frame"><img src="{icon}" alt="Ícone do app"></div>
      <div class="meta">
        <p class="k">Ícone do app</p>
        <p class="v">512 × 512 · PNG · sem transparência<br><code>play-icon-512.png</code></p>
      </div>
    </div>
    <div class="card">
      <div class="feat-frame"><img src="{feat}" alt="Gráfico de destaque"></div>
      <div class="meta">
        <p class="k">Gráfico de destaque (feature graphic)</p>
        <p class="v">1024 × 500 · fundo da orla + logo Caruanas Va'a<br><code>feature-graphic-1024x500.png</code></p>
      </div>
    </div>
  </div>

  <h2>Capturas · smartphone</h2>
  <p class="sub">1080 × 2400 · 5 telas · <code>vaa/store-assets/</code></p>
  <div class="shots">
    {phone_cards}
  </div>

  <h2>Capturas · tablet (7" e 10")</h2>
  <p class="sub">1800 × 2560 · layout de tablet real · servem os dois slots (7" e 10") · <code>vaa/store-assets/tablet/</code></p>
  <div class="shots tablet">
    {tab_cards}
  </div>

  <h2>Checklist da Play Console</h2>
  <p class="sub">Todos os recursos gráficos exigidos, prontos.</p>
  <div class="tablewrap">
    <table>
      <thead><tr><th>Recurso</th><th>Dimensão</th><th>Formato</th><th>Arquivo</th><th>Onde cadastrar</th><th>Status</th></tr></thead>
      <tbody>
        {spec_rows}
      </tbody>
    </table>
  </div>

  <div class="notes">
    <div class="note"><span class="dot">›</span><p><b>Tablet: um arquivo serve os dois slots.</b> O 1800×2560 tem proporção 0,70 — dentro do range aceito (entre 9:16 e 16:9) e dentro das faixas de pixel do 7" (320–3840) e do 10" (1080–7680). Suba os mesmos 5 arquivos nos dois campos.</p></div>
    <div class="note"><span class="dot">›</span><p><b>Requisitos atendidos.</b> A Play exige no mínimo 2 capturas por tipo — há 5 de smartphone e 5 de tablet (máx. 8 cada).</p></div>
    <div class="note"><span class="dot">›</span><p><b>Como usar.</b> No Play Console → <b>Detalhes do app / Ficha da loja principal</b>, envie cada arquivo no campo indicado. Originais em <code>vaa/store-assets/</code> (tablet em <code>vaa/store-assets/tablet/</code>).</p></div>
  </div>

  <footer>Capturado do app em execução (emuladores phone + Pixel Tablet, status bar em modo demo) e dos assets em <code>vaa/assets/</code>. Caruanas Va'a — canoagem polinésia e amazônica.</footer>
</div>'''

with open(OUT, 'w', encoding='utf-8') as f:
    f.write(HTML)
print('escrito:', OUT, '(%.0f KB)' % (len(HTML.encode()) / 1024))
