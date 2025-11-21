import os
from dotenv import load_dotenv
from fastapi import FastAPI, Body, HTTPException, status, Request
from fastapi.responses import JSONResponse, FileResponse, RedirectResponse
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from pydantic_core import core_schema
from pydantic.json_schema import GetJsonSchemaHandler
from bson import ObjectId
import motor.motor_asyncio
from typing import Any
from authlib.integrations.starlette_client import OAuth
from starlette.middleware.sessions import SessionMiddleware

# --- 1. SETTINGS & DATABASE CONNECTION ---

# Load environment variables from .env file
load_dotenv()
MONGO_DETAILS = os.getenv("MONGO_DETAILS")
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")
SESSION_SECRET = os.getenv("SESSION_SECRET")
# IMPORTANT: Set this to your own email address. Only this user can save links.
ALLOWED_USER_EMAIL = "antoniotagaruma7@gmail.com"

if not MONGO_DETAILS:
    raise ValueError("MONGO_DETAILS environment variable not set!")

# Set up the MongoDB client and collections
client = motor.motor_asyncio.AsyncIOMotorClient(MONGO_DETAILS)
database = client.myproject
schedule_collection = database.get_collection("schedules")

# --- 2. DATA MODELS (PYDANTIC) ---

# Pydantic helper for MongoDB's ObjectId
class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __get_pydantic_json_schema__(cls, core_schema: core_schema.CoreSchema, handler: GetJsonSchemaHandler) -> dict[str, Any]:
        return handler(core_schema.string_schema())
        
# --- DATA MODELS for the new single-document structure ---
class ScheduleLinksModel(BaseModel):
    # Using a dictionary to hold links, keyed by slot_id (e.g., "lun_1")
    links: dict[str, str] = Field(default_factory=dict)
    
class ScheduleDBModel(ScheduleLinksModel):
    id: str = Field(alias="_id")
    class Config:
        populate_by_name = True # Allows using 'id' instead of '_id'
        arbitrary_types_allowed = True # Needed for ObjectId


# --- 3. FASTAPI APP SETUP ---

app = FastAPI(
    title="MySchedule API",
    summary="API for managing class schedule links.",
)

# Add session middleware to handle user login sessions
app.add_middleware(SessionMiddleware, secret_key=SESSION_SECRET)

# CORS (Cross-Origin Resource Sharing) middleware
origins = [
    "http://localhost",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 4. OAUTH (GOOGLE LOGIN) SETUP ---
oauth = OAuth()
oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

# --- 5. AUTHENTICATION ROUTES ---

@app.get('/login', include_in_schema=False)
async def login(request: Request):
    """Redirects the user to Google's login page."""
    redirect_uri = request.url_for('auth')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@app.get('/auth/callback', name='auth', include_in_schema=False)
async def auth(request: Request):
    """Handles the callback from Google after login."""
    token = await oauth.google.authorize_access_token(request)
    user = token.get('userinfo')
    if user:
        request.session['user'] = dict(user)
    return RedirectResponse(url='/')

@app.get('/logout', include_in_schema=False)
async def logout(request: Request):
    """Clears the user session and logs them out."""
    request.session.pop('user', None)
    return RedirectResponse(url='/')

@app.get('/me', include_in_schema=False)
async def me(request: Request):
    """Returns the current logged-in user's information."""
    user = request.session.get('user')
    return JSONResponse({'user': user})

# --- 6. API ROUTES (ENDPOINTS) ---

SCHEDULE_DOC_ID = "schedule_links"

@app.get("/schedule", response_description="Get the schedule links document", response_model=ScheduleLinksModel)
async def get_schedule():
    """
    Retrieve the single document containing all schedule links.
    If it doesn't exist, create and return a default empty one.
    """
    schedule = await schedule_collection.find_one({"_id": SCHEDULE_DOC_ID})
    if schedule:
        return schedule # Pydantic will validate this against ScheduleLinksModel

    # Document not found, create a default one
    default_schedule = {"_id": SCHEDULE_DOC_ID, "links": {}}
    await schedule_collection.insert_one(default_schedule)
    return default_schedule

@app.put("/schedule", response_description="Update the schedule links", response_model=ScheduleLinksModel)
async def update_schedule(request: Request, schedule: ScheduleLinksModel = Body(...)):
    """
    Update the links in the schedule document. THIS IS A PROTECTED ENDPOINT.
    """
    user = request.session.get('user')
    # SECURITY CHECK: Only allow the authorized user to save changes
    if not user or user.get('email') != ALLOWED_USER_EMAIL:
        raise HTTPException(status_code=403, detail="Forbidden: You are not authorized to perform this action.")

    schedule_data = jsonable_encoder(schedule)
    
    update_result = await schedule_collection.update_one(
        {"_id": SCHEDULE_DOC_ID}, {"$set": {"links": schedule_data.get("links", {})}}
    )

    if update_result.matched_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Schedule document with id {SCHEDULE_DOC_ID} not found")

    updated_schedule = await schedule_collection.find_one({"_id": SCHEDULE_DOC_ID})
    if updated_schedule:
        return updated_schedule
    
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Failed to retrieve updated schedule document.")

# --- 7. STATIC FILES AND ROOT PATH ---

# Mount the static directory to serve files like HTML, CSS, and JS
app.mount("/static", StaticFiles(directory="static"), name="static")


@app.get("/", include_in_schema=False)
async def read_root():
    """Serve the main HTML file."""
    return FileResponse('static/Schedule.html')


# --- 8. RUNNER ---
# This block allows you to run the app directly with `python app.py`
if __name__ == "__main__":
    import uvicorn
    # The 'reload=True' flag makes the server restart automatically on code changes.
    # Use port 8000 as configured in Google Cloud
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)