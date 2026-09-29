import json
import os
from pathlib import Path

# JSON dosyasının oluşturulacağı dizin
STORAGE_DIR = Path(__file__).parent
CONFIG_FILE = STORAGE_DIR / "plcs.json"

def init_db():
    """Dosya yoksa varsayılan boş bir şablonla oluşturur."""
    if not CONFIG_FILE.exists():
        default_data = {
            "plcs": [
                {
                    "id": 1,
                    "name": "Ana Hat S7-1500",
                    "ip": "192.168.0.10",
                    "rack": 0,
                    "slot": 1,
                    "active": True,
                    "tags": []
                }
            ]
        }
        _save_data(default_data)

def _read_data() -> dict:
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def _save_data(data: dict):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

def get_all_plcs() -> list:
    """Kayıtlı tüm PLC'leri döndürür."""
    return _read_data().get("plcs", [])

def add_tag_to_plc(plc_id: int, tag_data: dict):
    """Belirli bir PLC'nin listesine yeni bir tag ekler."""
    data = _read_data()
    for plc in data["plcs"]:
        if plc["id"] == plc_id:
            # Tag'e benzersiz bir ID ata
            tag_data["id"] = len(plc["tags"]) + 1
            plc["tags"].append(tag_data)
            break
    _save_data(data)

def add_plc(plc_data: dict):
    """Yeni bir PLC cihazını JSON dosyasına kaydeder."""
    data = _read_data()
    # Mevcut PLC'lerin en büyük ID'sini bulup 1 artırarak yeni ID oluştur
    new_id = 1 if not data.get("plcs") else max(p["id"] for p in data["plcs"]) + 1
    
    plc_data["id"] = new_id
    plc_data["tags"] = []  # Yeni cihazın tag listesi başlangıçta boş olur
    data["plcs"].append(plc_data)
    
    _save_data(data)

def delete_plc(plc_id: int):
    """Belirtilen ID'ye sahip PLC'yi siler."""
    data = _read_data()
    # Verilen ID'ye sahip olmayan PLC'leri filtreleyerek yeni listeyi oluştur
    data["plcs"] = [plc for plc in data["plcs"] if plc["id"] != plc_id]
    _save_data(data)

def delete_tag(plc_id: int, tag_id: int):
    """Belirtilen PLC altındaki belirli bir tag'i siler."""
    data = _read_data()
    for plc in data["plcs"]:
        if plc["id"] == plc_id:
            # Verilen tag ID'sine sahip olmayan tag'leri filtrele
            plc["tags"] = [tag for tag in plc["tags"] if tag.get("id") != tag_id]
            break
    _save_data(data)

def update_plc(plc_id: int, updated_data: dict):
    """Belirtilen ID'ye sahip PLC'nin bilgilerini günceller."""
    data = _read_data()
    for plc in data["plcs"]:
        if plc["id"] == plc_id:
            plc["name"] = updated_data.get("name", plc["name"])
            plc["ip"] = updated_data.get("ip", plc["ip"])
            plc["rack"] = updated_data.get("rack", plc["rack"])
            plc["slot"] = updated_data.get("slot", plc["slot"])
            break
    _save_data(data)