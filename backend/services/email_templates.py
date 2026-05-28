"""
PRONOKIF — Branded email templates.

Outlook-strict table layout, dark/light mode via prefers-color-scheme,
VML bulletproof buttons, PronoKif brand identity with hosted logo.
"""

from __future__ import annotations

import html
import os
from typing import NamedTuple


class EmailContent(NamedTuple):
    subject: str
    text: str
    html_body: str


def _frontend_url() -> str:
    return os.environ.get("FRONTEND_URL", "https://pronokif.eu").rstrip("/")


def _logo_url(variant: str = "white-red") -> str:
    return f"{_frontend_url()}/brand/pronokif-v1/logo-pronokif-markdown-{variant}.png"


def _safe(url: str) -> str:
    return html.escape(url, quote=True)


# ── Outlook VML button ─────────────────────────────────────────────────────


def _vml_button(url: str, label: str, width: int = 280) -> str:
    safe_url = _safe(url)
    safe_label = html.escape(label)
    return (
        f'<!--[if mso]>'
        f'<v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" '
        f'xmlns:w="urn:schemas-microsoft-com:office:word" '
        f'href="{safe_url}" '
        f'style="height:50px;v-text-anchor:middle;width:{width}px;" '
        f'arcsize="16%" stroke="f" fillcolor="#E10600">'
        f'<w:anchorlock/>'
        f'<center style="color:#ffffff;font-family:Arial,sans-serif;'
        f'font-size:15px;font-weight:bold;letter-spacing:1px;">'
        f'{safe_label}</center>'
        f'</v:roundrect><![endif]-->'
        f'<!--[if !mso]><!-->'
        f'<a href="{safe_url}" style="display:inline-block;'
        f"background-color:#E10600;color:#ffffff;"
        f"padding:14px 36px;border-radius:8px;text-decoration:none;"
        f"font-family:Arial,Helvetica,sans-serif;font-size:15px;"
        f'font-weight:700;letter-spacing:1px;text-align:center;">'
        f"{safe_label}</a>"
        f"<!--<![endif]-->"
    )


# ── Code block (league code / invitation code) ────────────────────────────


def _code_block(code: str, label: str) -> str:
    safe_code = html.escape(code)
    safe_label = html.escape(label)
    return (
        '<table role="presentation" border="0" cellpadding="0" cellspacing="0" '
        'width="100%" style="margin:0 0 24px;">'
        "<tr>"
        '<td align="center">'
        f'<p style="margin:0 0 8px;color:#5F6673;font-family:Arial,Helvetica,'
        f"sans-serif;font-size:11px;letter-spacing:2px;"
        f'text-transform:uppercase;" class="text-muted">{safe_label}</p>'
        '<table role="presentation" border="0" cellpadding="0" cellspacing="0">'
        "<tr>"
        '<td class="code-bg" style="background-color:#1A1D24;'
        "border:2px dashed #E10600;border-radius:8px;"
        'padding:16px 36px;text-align:center;">'
        f'<span style="font-family:\'Courier New\',monospace;font-size:28px;'
        f"font-weight:700;color:#F4F4F4;letter-spacing:6px;"
        f'">{safe_code}</span>'
        "</td>"
        "</tr>"
        "</table>"
        "</td>"
        "</tr>"
        "</table>"
    )


# ── Base layout ────────────────────────────────────────────────────────────


def _render(
    *,
    preheader: str,
    title: str,
    paragraphs: list[str],
    button_url: str,
    button_label: str,
    fine_print: str,
    code: str | None = None,
    code_label: str = "TON CODE",  # already FR
    admin: bool = False,
) -> str:
    safe_preheader = html.escape(preheader)
    safe_title = html.escape(title)
    logo_dark = _safe(_logo_url("white-red"))
    logo_light = _safe(_logo_url("black-red"))
    home_url = _safe(_frontend_url())

    body_html = "\n".join(
        f'<p style="margin:0 0 16px;color:#c5ccd6;'
        f"font-family:Arial,Helvetica,sans-serif;font-size:15px;"
        f'line-height:1.6;mso-line-height-rule:exactly;" class="text-body">'
        f"{p}</p>"
        for p in paragraphs
    )

    code_html = _code_block(code, code_label) if code else ""

    admin_badge = ""
    if admin:
        admin_badge = (
            '<table role="presentation" border="0" cellpadding="0" '
            'cellspacing="0" style="margin:0 0 16px;"><tr>'
            '<td style="background-color:#E10600;border-radius:4px;'
            'padding:4px 12px;">'
            '<span style="font-family:Arial,Helvetica,sans-serif;'
            "font-size:10px;font-weight:700;color:#ffffff;"
            'letter-spacing:2px;text-transform:uppercase;">'
            "DIRECTION DE COURSE</span></td></tr></table>"
        )

    return f"""<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>{safe_title}</title>
<!--[if mso]>
<noscript><xml><o:OfficeDocumentSettings><o:AllowPNG/><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript>
<style>table{{border-collapse:collapse;}}</style>
<![endif]-->
<style>
:root{{color-scheme:dark light;supported-color-schemes:dark light;}}
body,table,td{{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;}}
table{{border-collapse:collapse;mso-table-lspace:0pt;mso-table-rspace:0pt;}}
img{{-ms-interpolation-mode:bicubic;border:0;outline:none;text-decoration:none;}}
a{{color:#E10600;}}

@media (prefers-color-scheme:light){{
.email-bg{{background-color:#F4F4F4!important;}}
.card-bg{{background-color:#FFFFFF!important;border-color:#E0E0E0!important;}}
.stripe-bg{{background-color:#C00500!important;}}
.text-title{{color:#1A1D24!important;}}
.text-body{{color:#4A4F5C!important;}}
.text-muted{{color:#7f8a99!important;}}
.footer-text{{color:#7f8a99!important;}}
.logo-dark{{display:none!important;max-height:0!important;overflow:hidden!important;}}
.logo-light{{display:block!important;max-height:none!important;}}
.code-bg{{background-color:#F5F5F5!important;color:#1A1D24!important;}}
.code-bg span{{color:#1A1D24!important;}}
.divider-line{{border-color:#E0E0E0!important;}}
}}

[data-ogsc] .email-bg{{background-color:#0B0D12!important;}}
[data-ogsc] .card-bg{{background-color:#121418!important;border-color:#2a3442!important;}}
[data-ogsc] .text-title{{color:#F4F4F4!important;}}
[data-ogsc] .text-body{{color:#c5ccd6!important;}}
[data-ogsc] .logo-dark{{display:block!important;max-height:none!important;}}
[data-ogsc] .logo-light{{display:none!important;max-height:0!important;overflow:hidden!important;}}

@media only screen and (max-width:600px){{
.email-container{{width:100%!important;}}
.card-inner{{padding:24px 20px!important;}}
}}
</style>
</head>
<body style="margin:0;padding:0;word-spacing:normal;background-color:#0B0D12;" class="email-bg">
<div style="display:none;font-size:1px;color:#0B0D12;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">{safe_preheader}</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#0B0D12;" class="email-bg">
<tr><td align="center" style="padding:32px 16px;">

<!--[if mso]><table role="presentation" border="0" cellpadding="0" cellspacing="0" width="560" align="center"><tr><td><![endif]-->
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;" class="email-container">

<!-- LOGO -->
<tr><td align="center" style="padding:0 0 28px;">
<a href="{home_url}" style="text-decoration:none;">
<!--[if !mso]><!-->
<img src="{logo_dark}" alt="PronoKif" width="180" style="display:block;width:180px;height:auto;" class="logo-dark">
<img src="{logo_light}" alt="PronoKif" width="180" style="display:none;width:180px;height:auto;max-height:0;overflow:hidden;mso-hide:all;" class="logo-light">
<!--<![endif]-->
<!--[if mso]><img src="{logo_dark}" alt="PronoKif" width="180" style="display:block;width:180px;height:auto;"><![endif]-->
</a>
</td></tr>

<!-- CARD -->
<tr><td>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#121418;border:1px solid #2a3442;border-radius:12px;" class="card-bg">
<!-- Red accent stripe -->
<tr><td style="height:4px;background-color:#E10600;font-size:0;line-height:0;border-radius:12px 12px 0 0;" class="stripe-bg">&nbsp;</td></tr>
<tr><td style="padding:32px 36px;" class="card-inner">

{admin_badge}

<h1 style="margin:0 0 20px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:26px;font-weight:900;color:#F4F4F4;letter-spacing:0.5px;mso-line-height-rule:exactly;line-height:1.25;" class="text-title">{safe_title}</h1>

{body_html}

{code_html}

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:8px 0 0;">
<tr><td align="center">{_vml_button(button_url, button_label)}</td></tr>
</table>

<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin:28px 0 0;">
<tr><td class="divider-line" style="border-top:1px solid rgba(255,255,255,0.08);padding:16px 0 0;">
<p style="margin:0;color:#5F6673;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;mso-line-height-rule:exactly;" class="text-muted">{fine_print}</p>
</td></tr>
</table>

</td></tr>
</table>
</td></tr>

<!-- FOOTER -->
<tr><td align="center" style="padding:28px 0 0;">
<p style="margin:0 0 6px;font-family:'Arial Black',Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2.5px;color:#5F6673;mso-line-height-rule:exactly;line-height:1.4;" class="footer-text">PRONOSTIQUE. DÉFIE. <span style="color:#E10600;">VIBRE.</span></p>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#3d4350;mso-line-height-rule:exactly;line-height:1.4;" class="footer-text">&copy; 2026 PronoKif</p>
</td></tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->

</td></tr>
</table>
</body>
</html>"""


# ═══════════════════════════════════════════════════════════════════════════
#  PUBLIC TEMPLATE FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════


def verification(verify_url: str) -> EmailContent:
    return EmailContent(
        subject="Confirme ton email — en piste !",
        text=(
            "Bienvenue dans le paddock PronoKif !\n\n"
            "Ton compte est presque prêt. Confirme ton email :\n"
            f"{verify_url}\n\n"
            "Tu n'as pas créé de compte PronoKif ? Ignore ce message."
        ),
        html_body=_render(
            preheader="Un dernier clic et tu es dans le paddock.",
            title="Bienvenue dans le paddock !",
            paragraphs=[
                "Ton compte est presque prêt. Un dernier clic pour "
                "confirmer ton email, puis tu pourras pronostiquer, "
                "créer des ligues et viser le podium.",
            ],
            button_url=verify_url,
            button_label="CONFIRMER MON EMAIL",
            fine_print=(
                "Tu n'as pas créé de compte PronoKif ? "
                "Ignore ce message, rien ne se passera."
            ),
        ),
    )


def password_reset(reset_url: str, expire_minutes: int = 30) -> EmailContent:
    return EmailContent(
        subject="Arrêt au stand — ton nouveau mot de passe",
        text=(
            "Arrêt au stand PronoKif\n\n"
            "Utilise ce lien pour définir un nouveau mot de passe :\n"
            f"{reset_url}\n\n"
            f"Ce lien expire dans {expire_minutes} minutes.\n"
            "Tu n'as pas demandé de réinitialisation ? Ignore ce message."
        ),
        html_body=_render(
            preheader="Un arrêt au stand rapide pour ton mot de passe.",
            title="Arrêt au stand",
            paragraphs=[
                "Pas de stress, même les meilleurs passent par les stands. "
                "Clique ci-dessous pour définir un nouveau mot de passe.",
            ],
            button_url=reset_url,
            button_label="NOUVEAU MOT DE PASSE",
            fine_print=(
                f"Ce lien expire dans {expire_minutes} minutes. "
                "Tu n'as pas fait cette demande ? Ignore ce message."
            ),
        ),
    )


def magic_login(magic_url: str, expire_minutes: int = 15) -> EmailContent:
    return EmailContent(
        subject="Ton pass paddock PronoKif",
        text=(
            "Connexion express PronoKif\n\n"
            "Ouvre ce lien pour te connecter sans mot de passe :\n"
            f"{magic_url}\n\n"
            f"Ce lien expire dans {expire_minutes} minutes "
            "et ne peut être utilisé qu'une seule fois.\n"
            "Tu n'as pas demandé ce lien ? Ignore ce message."
        ),
        html_body=_render(
            preheader="Un clic et tu es dans le paddock.",
            title="Connexion express",
            paragraphs=[
                "Un clic et tu es dans le paddock. "
                "Pas de mot de passe, que du bon.",
            ],
            button_url=magic_url,
            button_label="ME CONNECTER",
            fine_print=(
                f"Ce lien expire dans {expire_minutes} minutes "
                "et ne peut être utilisé qu'une seule fois. "
                "Tu n'as pas demandé ce lien ? Ignore ce message."
            ),
        ),
    )


def admin_magic_link(magic_url: str, expire_minutes: int = 15) -> EmailContent:
    return EmailContent(
        subject="Accès Direction de Course — PronoKif",
        text=(
            "Connexion back-office PronoKif\n\n"
            "Ouvre ce lien pour accéder au back-office :\n"
            f"{magic_url}\n\n"
            f"Ce lien expire dans {expire_minutes} minutes.\n"
            "Tu n'as pas demandé ce lien ? Ignore ce message."
        ),
        html_body=_render(
            preheader="Ton accès Direction de Course est prêt.",
            title="Direction de Course",
            paragraphs=[
                "Ton accès au back-office PronoKif est prêt. "
                "Un clic pour entrer en Direction de Course.",
            ],
            button_url=magic_url,
            button_label="ACCÉDER AU BACK-OFFICE",
            fine_print=(
                f"Ce lien expire dans {expire_minutes} minutes. "
                "Tu n'as pas demandé ce lien ? Ignore ce message."
            ),
            admin=True,
        ),
    )


def invitation(
    invite_url: str,
    personal_message: str | None = None,
    league_code: str | None = None,
) -> EmailContent:
    paras = [
        "Rejoins <strong>PronoKif</strong>, le jeu de pronostics F1 entre potes. "
        "Fais tes pronos, défie tes amis et vise le podium.",
    ]
    if personal_message:
        safe_msg = html.escape(personal_message)
        paras.append(
            f'<em style="color:#a1a1aa;">&laquo;&nbsp;{safe_msg}&nbsp;&raquo;</em>'
        )

    text_personal = f"\nMessage : {personal_message}\n" if personal_message else ""
    text_code = f"\nCode de ligue : {league_code}\n" if league_code else ""

    return EmailContent(
        subject="Rejoins le paddock PronoKif",
        text=(
            "Le paddock t'attend !\n\n"
            "Tu es invité(e) à rejoindre PronoKif, le jeu de pronostics F1 "
            "entre potes.\n"
            f"{text_personal}{text_code}\n"
            f"Crée ton compte : {invite_url}\n\n"
            "Cette invitation expire dans 7 jours."
        ),
        html_body=_render(
            preheader="On t'attend dans le paddock PronoKif.",
            title="Le paddock t'attend !",
            paragraphs=paras,
            button_url=invite_url,
            button_label="CRÉER MON COMPTE",
            fine_print="Cette invitation expire dans 7 jours.",
            code=league_code,
            code_label="CODE DE LIGUE",
        ),
    )
