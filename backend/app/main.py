from fastapi import FastAPI

app = FastAPI(title="Task API")

@app.get("/health")
def health():
    return {"status": "ok"}
