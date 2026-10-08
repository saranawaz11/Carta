from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core import config
from routes import capture, chat, me, notes, tasks

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.FRONTEND_ORIGINS,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(me.router)
app.include_router(notes.router)
app.include_router(chat.router)
app.include_router(tasks.router)
app.include_router(capture.router)


