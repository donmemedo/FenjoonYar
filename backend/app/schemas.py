"""Shared input types. ASCII-only digit classes: [0-9], never \\d (which also matches Persian digits
and would let one phone number exist in several spellings)."""
from typing import Annotated, Literal

from pydantic import StringConstraints

Phone = Annotated[str, StringConstraints(pattern=r"^09[0-9]{9}$")]
OtpCodeIn = Annotated[str, StringConstraints(pattern=r"^[0-9]{6}$")]
RedeemCode = Annotated[str, StringConstraints(pattern=r"^[0-9]{8}$")]
Slug = Annotated[str, StringConstraints(pattern=r"^[a-z0-9-]{1,40}$")]
Name = Annotated[str, StringConstraints(strip_whitespace=True, max_length=80)]
Email = Annotated[
    str,
    StringConstraints(strip_whitespace=True, max_length=254, pattern=r"^([^@\s]+@[^@\s]+\.[^@\s]+)?$"),
]
Drink = Literal["espresso", "latte", "cappuccino", "filter", "cold"]
PlanKind = Literal["package", "subscription", "corporate"]
