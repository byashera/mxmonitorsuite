from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request

# Dahili modüller
from storage import config_store
from web.routes import api_plc

app = FastAPI(title="S7 Monitor Suite")

# Rotaları ve statik dosyaları bağla
app.include_router(api_plc.router)
app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

@app.on_event("startup")
async def startup_event():
    # Veri depolama şablonunu doğrula
    config_store.init_db()

@app.get("/")
async def get_dashboard(request: Request):
    return templates.TemplateResponse(request=request, name="index.html", context={"request": request})