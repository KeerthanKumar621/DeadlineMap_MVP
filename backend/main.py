
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client

load_dotenv()

app = FastAPI(
    title="DeadlineMap API",
    description="Backend API for DeadlineMap",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


def get_supabase_client() -> Client:
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_ANON_KEY")

    if not url or not key:
        raise RuntimeError("Supabase environment variables are missing.")

    return create_client(url, key)


@app.get("/")
def root():
    return {"message": "DeadlineMap API is running"}


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/supabase-check")
def supabase_check():
    try:
        supabase = get_supabase_client()

        # Test access to the existing assignments table.
        supabase.table("assignments").select("id").limit(1).execute()

        return {
            "status": "connected",
            "message": "Supabase connection successful",
        }
    except Exception:
        raise HTTPException(
            status_code=503,
            detail=(
                "Supabase connection test failed. "
                "Check the environment variables, table, and permissions."
            ),
        )
