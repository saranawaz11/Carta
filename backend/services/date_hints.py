import calendar
import difflib
import re
from datetime import date, timedelta

WEEKDAYS = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
]
MONTHS = [m.lower() for m in calendar.month_name if m]
AMBIGUOUS_MONTHS = {"may", "march"}

_WORD = re.compile(r"[A-Za-z]+")
_NUM = re.compile(r"^\d{1,2}(st|nd|rd|th)?$", re.IGNORECASE)


def _match(word: str, names: list[str]) -> str | None:
    word = word.lower()
    if word in names:
        return word
    if names is MONTHS:
        for name in names:
            if word in (name[:3], name[:3] + ".", "sept" if name == "september" else ""):
                return name
    if len(word) < 5:
        return None
    close = difflib.get_close_matches(word, names, n=1, cutoff=0.8)
    return close[0] if close else None


def _next_weekday(today: date, index: int, following_week: bool) -> date:
    days = (index - today.weekday()) % 7 or 7
    result = today + timedelta(days=days)
    if following_week and days < 7 and result.isocalendar()[1] == today.isocalendar()[1]:
        result += timedelta(days=7)
    return result


def _upcoming(today: date, month: int, day: int) -> date | None:
    for year in (today.year, today.year + 1):
        try:
            candidate = date(year, month, day)
        except ValueError:
            continue
        if candidate >= today:
            return candidate
    return None


FILLERS = {
    "on", "by", "before", "until", "due", "for", "in", "this", "coming", "next",
    "at", "after", "from", "since", "around", "about", "mid", "middle", "of", "the",
}
_MID = re.compile(r"\b(mid|middle)(\s+of)?(\s+the)?[\s-]*$", re.IGNORECASE)
_YEAR = re.compile(r"^\d{4}$")


def strip_date_phrase(title: str) -> str:
    """Remove weekday/month phrases (and linking words) and tidy the title."""
    title = re.sub(r"\bmid-", "mid ", title, flags=re.IGNORECASE)
    words = title.split()
    drop: set[int] = set()
    for i, raw in enumerate(words):
        core = re.sub(r"[^A-Za-z]", "", raw)
        if not core:
            continue
        is_weekday = _match(core, WEEKDAYS) is not None
        month = _match(core, MONTHS)
        if not is_weekday and month is None:
            continue
        nxt = words[i + 1].strip(",.") if i + 1 < len(words) else ""
        prv = words[i - 1].strip(",.") if i > 0 else ""
        has_num = bool(
            _NUM.match(nxt)
            or _NUM.match(prv)
            or (i >= 2 and prv.lower() == "of" and _NUM.match(words[i - 2].strip(",.")))
        )
        if month in AMBIGUOUS_MONTHS and not has_num:
            continue
        drop.add(i)
        if month is not None:
            j = i + 1
            if j < len(words) and _NUM.match(words[j].strip(",.")):
                drop.add(j)
                j += 1
            if j < len(words) and _YEAR.match(words[j].strip(",.")):
                drop.add(j)
            k = i - 1
            if k >= 1 and words[k].lower() == "of" and _NUM.match(words[k - 1]):
                drop.update({k, k - 1})
                k -= 2
            elif k >= 0 and _NUM.match(words[k].strip(",.")):
                drop.add(k)
                k -= 1
        else:
            k = i - 1
        while k >= 0 and words[k].lower().strip(",.") in FILLERS:
            drop.add(k)
            k -= 1
    if not drop:
        return title.strip()
    cleaned = " ".join(w for i, w in enumerate(words) if i not in drop).strip(" ,.-")
    if not cleaned:
        return title.strip()
    return cleaned[0].upper() + cleaned[1:]


def find_named_date(text: str, today: date) -> date | None:
    """Deterministically resolve an explicit weekday or month name in text."""
    tokens = [(m.group(0), m.start(), m.end()) for m in _WORD.finditer(text)]

    for i, (word, _, _) in enumerate(tokens):
        weekday = _match(word, WEEKDAYS)
        if weekday is not None:
            following = i > 0 and tokens[i - 1][0].lower() == "next"
            return _next_weekday(today, WEEKDAYS.index(weekday), following)

    for i, (word, start, end) in enumerate(tokens):
        month = _match(word, MONTHS)
        if month is None:
            continue
        month_number = MONTHS.index(month) + 1
        after = text[end:].split(None, 1)
        before = text[:start].split()
        day = None
        if after and _NUM.match(after[0].strip(",.")):
            day = int(re.match(r"\d+", after[0]).group(0))
        elif before and _NUM.match(before[-1].strip(",.")) or (
            len(before) >= 2 and before[-1].lower() == "of" and _NUM.match(before[-2])
        ):
            token = before[-1] if _NUM.match(before[-1].strip(",.")) else before[-2]
            day = int(re.match(r"\d+", token).group(0))
        if day is None and _MID.search(text[:start]):
            day = 15
        if day is not None:
            found = _upcoming(today, month_number, day)
            if found:
                return found
            continue
        if month in AMBIGUOUS_MONTHS:
            continue
        last = calendar.monthrange(today.year, month_number)[1]
        found = _upcoming(today, month_number, last)
        if found:
            return found
    return None
