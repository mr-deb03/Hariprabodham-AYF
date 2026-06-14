"""WhatsApp delivery via Twilio.

Note: Twilio fetches media from public URLs, so matched images are served by
this app at PUBLIC_BASE_URL/media/... (see app.py). Twilio allows up to 10
media items per message.
"""
from twilio.rest import Client

from config import settings


def _client() -> Client:
    return Client(settings.twilio_account_sid, settings.twilio_auth_token)


def _to(number: str) -> str:
    number = number.strip().replace(" ", "").replace("-", "")
    if not number.startswith("whatsapp:"):
        number = "whatsapp:" + number
    return number


def send_text(to_number: str, body: str):
    _client().messages.create(
        from_=settings.twilio_whatsapp_from,
        to=_to(to_number),
        body=body,
    )


def send_media(to_number: str, media_urls, body: str = ""):
    _client().messages.create(
        from_=settings.twilio_whatsapp_from,
        to=_to(to_number),
        body=body,
        media_url=list(media_urls),  # up to 10 per message
    )
