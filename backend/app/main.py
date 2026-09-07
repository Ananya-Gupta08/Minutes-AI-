import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .database import Base, engine
from .routers import router
from .seed import seed_database

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    if os.getenv('SEED_DEMO', 'true').lower() == 'true':
        seed_database()
    yield

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://minutes-ai-nine.vercel.app",
    ],
    allow_origin_regex="https://.*\\.vercel\\.app",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(router)
