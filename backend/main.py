from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core import config
from routes import (
    capture,
    chat,
    folders,
    me,
    note_summaries,
    notes,
    tags,
    tasks,
    transcription,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.FRONTEND_ORIGINS,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(me.router)
app.include_router(notes.router)
app.include_router(folders.router)
app.include_router(note_summaries.router)
app.include_router(tags.router)
app.include_router(chat.router)
app.include_router(tasks.router)
app.include_router(capture.router)
app.include_router(transcription.router)


@app.get("/test")
def root():
    return {"message": "Hello from FastAPI"}
