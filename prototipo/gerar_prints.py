"""Gera os prints de cada tela do protótipo (celular e computador).

Uso: python prototipo/gerar_prints.py
Requer: pip install playwright (usa o Google Chrome já instalado).
"""
from pathlib import Path
from playwright.sync_api import sync_playwright

PASTA = Path(__file__).parent
URL = (PASTA / "index.html").resolve().as_uri() + "?print=1"
SAIDA = PASTA / "telas"

TELAS = [
    ("T01-inicio", "#/"),
    ("T02-vitrine", "#/animais"),
    ("T03-ficha-animal", "#/animal/apolo"),
    ("T04-como-adotar", "#/como-adotar"),
    ("T05-perguntas-frequentes", "#/perguntas"),
    ("T06-como-ajudar", "#/ajude"),
    ("T07-privacidade", "#/privacidade"),
    ("T08-login", "#/admin/login"),
    ("T09-painel", "#/admin"),
    ("T10-cadastrar-animal", "#/admin/novo"),
    ("T11-editar-animal", "#/admin/editar/apolo"),
    ("T12-perdidos", "#/perdidos"),
    ("T13-anunciar-perdido", "#/perdidos/novo"),
    ("T13b-anuncio-enviado", "#/perdidos/enviado"),
    ("T14-moderar-perdidos", "#/admin/perdidos"),
    ("T15-textos-do-site", "#/admin/textos"),
    ("T16-perguntas-frequentes-admin", "#/admin/textos/perguntas"),
    ("T17-editar-item", "#/admin/textos/perguntas/perguntas-0"),
    ("T18-editar-como-adotar", "#/admin/textos/como-adotar"),
    ("T19-editar-pagina-inicial", "#/admin/textos/inicio"),
    ("T20-editar-como-ajudar", "#/admin/textos/ajude"),
    ("T21-anuncio-equipe", "#/admin/perdidos/novo"),
    ("T22-mais", "#/admin/mais"),
    ("T23-dados-da-ong", "#/admin/ong"),
    ("T24-protetores", "#/admin/protetores"),
    ("T17b-editar-foto-historia", "#/admin/textos/inicio_fotos/inicio_fotos-0"),
]

TAMANHOS = {"celular": (390, 844), "computador": (1280, 800)}

SAIDA.mkdir(exist_ok=True)
with sync_playwright() as p:
    navegador = p.chromium.launch(channel="chrome")
    for nome_tam, (w, h) in TAMANHOS.items():
        pagina = navegador.new_page(viewport={"width": w, "height": h}, device_scale_factor=2 if w < 500 else 1)
        for nome, rota in TELAS:
            pagina.goto(URL + rota)
            pagina.wait_for_load_state("networkidle")
            pagina.wait_for_timeout(400)
            # elementos fixos viram estáticos para o print de página inteira
            pagina.add_style_tag(content=".fixed:not(#modal),.sticky{position:static!important}.backdrop-blur{backdrop-filter:none!important}")
            pagina.screenshot(path=str(SAIDA / f"{nome}-{nome_tam}.png"), full_page=True)
            print("ok", nome, nome_tam)
        pagina.close()
    navegador.close()
