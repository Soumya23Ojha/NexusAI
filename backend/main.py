from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create the FastAPI application
app = FastAPI(
    title="AI Chatbot API",
    version="1.0.0"
)

# Allow requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Home route
@app.get("/")
async def home():
    return {
        "status": "success",
        "message": "AI Chatbot Backend is Running 🚀"
    }

# Health check route
@app.get("/health")
async def health():
    return {
        "status": "healthy"
    }