from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys

from dotenv import load_dotenv


_ROOT = Path(__file__).resolve().parent
_BACKEND = _ROOT / "backend"

load_dotenv(_BACKEND / ".env")
sys.path.insert(0, str(_BACKEND))

_spec = spec_from_file_location("_carta_backend_main", _BACKEND / "main.py")
if _spec is None or _spec.loader is None:
    raise RuntimeError("Unable to load the backend application")

_module = module_from_spec(_spec)
_spec.loader.exec_module(_module)
app = _module.app
