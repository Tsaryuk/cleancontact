import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .database import init_db
from .routers import contacts, import_export, ai

app = FastAPI(title="CleanContact API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup():
    # Ensure data directory exists
    db_path = os.environ.get("DB_PATH", "/data/cleancontact.db")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    init_db()


app.include_router(contacts.router)
app.include_router(import_export.router)
app.include_router(ai.router)


@app.get("/health")
def health():
    return {"status": "ok"}
