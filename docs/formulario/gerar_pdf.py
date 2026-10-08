"""Gera o PDF do formulário de adoção a partir do FORMULARIO_ADOCAO.md.

Uso: python docs/formulario/gerar_pdf.py
O MD é a fonte de verdade: edite o MD e gere o PDF de novo.
"""
import re
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether, Image

PASTA = Path(__file__).parent
MD = PASTA / "FORMULARIO_ADOCAO.md"
PDF = PASTA / "Formulario_Adocao_SOS_Patas.pdf"
RAIZ = PASTA.parent.parent  # docs/formulario -> raiz do repositório
LOGO = RAIZ / "prototipo" / "assets" / "logo.png"

AZUL, AZUL_ESC, AZUL_CLARO = colors.HexColor("#1F3E9C"), colors.HexColor("#152B70"), colors.HexColor("#E8EDFB")
CINZA = colors.HexColor("#64748B")

st = {
    "titulo": ParagraphStyle("t", fontName="Helvetica-Bold", fontSize=17, leading=21, textColor=AZUL_ESC),
    "sub": ParagraphStyle("s", fontName="Helvetica", fontSize=9.5, leading=13, textColor=CINZA),
    "secao": ParagraphStyle("se", fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=colors.white),
    "perg": ParagraphStyle("p", fontName="Helvetica-Bold", fontSize=10.5, leading=14, textColor=AZUL_ESC),
    "tipo": ParagraphStyle("ti", fontName="Helvetica-Oblique", fontSize=8.5, leading=11, textColor=CINZA),
    "opc": ParagraphStyle("o", fontName="Helvetica", fontSize=10, leading=14, leftIndent=40, firstLineIndent=-26),
    "nota": ParagraphStyle("n", fontName="Helvetica-Oblique", fontSize=9, leading=12, textColor=colors.HexColor("#7A4A00"), leftIndent=14),
    "aviso": ParagraphStyle("a", fontName="Helvetica", fontSize=9.5, leading=13, textColor=AZUL_ESC),
}


def fmt(t):
    t = t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    t = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", t)
    t = t.replace("🟦", '<font color="#1F3E9C" size="8"><b>[pedido do grupo]</b></font>')
    t = re.sub(r"\s\*$", ' <font color="#E02A2F">*</font>', t)
    return t


texto = MD.read_text(encoding="utf-8")
corpo = texto.split("<!-- inicio-formulario -->")[1].split("<!-- fim-formulario -->")[0]

story = []
cab = Table([[Image(str(LOGO), 1.6 * cm, 1.6 * cm),
              [Paragraph("Formulário de Interesse em Adoção", st["titulo"]),
               Paragraph("SOS Patas · Passos/MG · Versão 1 para validação no grupo", st["sub"])]]],
            colWidths=[2 * cm, 14 * cm])
cab.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
story += [cab, Spacer(1, 8)]
aviso = Table([[Paragraph("<b>Como ajudar:</b> leia as perguntas e responda no grupo o que <b>tirar, mudar ou acrescentar</b>. "
                          "Os itens com <font color='#E02A2F'>*</font> são obrigatórios. As marcadas como <b>[pedido do grupo]</b> vieram das sugestões de vocês. "
                          "No site, as respostas serão de toque (escolha), para facilitar no celular.", st["aviso"])]], colWidths=[16 * cm])
aviso.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), AZUL_CLARO), ("BOX", (0, 0), (-1, -1), 0, AZUL_CLARO),
                           ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                           ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8)]))
story += [aviso, Spacer(1, 6)]

bloco, tipo_atual = [], ""


def fecha_bloco():
    global bloco
    if bloco:
        story.append(KeepTogether(bloco + [Spacer(1, 7)]))
    bloco = []


for linha in corpo.splitlines():
    l = linha.rstrip()
    if l.startswith("## "):
        fecha_bloco()
        faixa = Table([[Paragraph(fmt(l[3:]), st["secao"])]], colWidths=[16 * cm])
        faixa.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), AZUL), ("LEFTPADDING", (0, 0), (-1, -1), 8),
                                   ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5)]))
        bloco = [Spacer(1, 6), faixa, Spacer(1, 6)]  # fica junto da primeira pergunta da seção
    elif l.startswith("### "):
        if not (len(bloco) == 3 and isinstance(bloco[1], Table)):
            fecha_bloco()
        bloco.append(Paragraph(fmt(l[4:]), st["perg"]))
    elif l.startswith("Tipo:"):
        tipo_atual = l[5:].strip()
        bloco.append(Paragraph(fmt(tipo_atual), st["tipo"]))
        if tipo_atual.startswith(("texto", "telefone")):
            linhas = 3 if "longo" in tipo_atual else 1
            campo = Table([[""]] * linhas, colWidths=[16 * cm], rowHeights=[18] * linhas)
            campo.setStyle(TableStyle([("LINEBELOW", (0, 0), (-1, -1), 0.6, colors.HexColor("#CBD5E1"))]))
            bloco.append(campo)
    elif l.startswith("- "):
        marca = "[&nbsp;&nbsp;]" if ("múltipla" in tipo_atual or "caixas" in tipo_atual) else "(&nbsp;&nbsp;)"
        bloco.append(Paragraph(f'<font name="Courier-Bold" color="#1F3E9C">{marca}</font>&nbsp;{fmt(l[2:])}', st["opc"]))
    elif l.startswith("> "):
        bloco.append(Paragraph(fmt(l[2:]), st["nota"]))
fecha_bloco()


def rodape(c, d):
    c.setFont("Helvetica", 8)
    c.setFillColor(CINZA)
    c.drawString(2.5 * cm, 1.2 * cm, "SOS Patas · Formulário de Interesse em Adoção · rascunho v1")
    c.drawRightString(A4[0] - 2.5 * cm, 1.2 * cm, f"página {d.page}")


SimpleDocTemplate(str(PDF), pagesize=A4, leftMargin=2.5 * cm, rightMargin=2.5 * cm, topMargin=1.8 * cm, bottomMargin=2 * cm,
                  title="Formulário de Interesse em Adoção – SOS Patas").build(story, onFirstPage=rodape, onLaterPages=rodape)
print("ok", PDF)
