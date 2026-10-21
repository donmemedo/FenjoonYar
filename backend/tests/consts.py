PHONE = "09121234567"
PHONE2 = "09127654321"
CSRF = {"X-Requested-With": "cups-web"}


def writes(statements):
    """The INSERT / UPDATE / DELETE statements among captured SQL."""
    return [s for s in statements if s.lstrip()[:6].upper() in ("INSERT", "UPDATE", "DELETE")]
