import socket
import os
import logging
from core.iso_on_tcp import build_cotp_connection_request
from core.s7_protocol import build_setup_communication, build_read_var_req

# Log klasörünü ve dosyasını oluştur
os.makedirs("logs", exist_ok=True)
logging.basicConfig(
    filename="logs/log.txt",
    level=logging.INFO,
    format="%(asctime)s - %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

class S7ConnectionManager:
    def __init__(self, ip: str, rack: int = 0, slot: int = 1, port: int = 102):
        self.ip = ip
        self.port = port
        self.rack = rack
        self.slot = slot
        self.sock = None
        self.connected = False

    def __enter__(self):
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.disconnect()

    def connect(self) -> bool:
        try:
            self.sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            self.sock.settimeout(2.0)
            self.sock.connect((self.ip, self.port))
            
            self.sock.send(build_cotp_connection_request(self.rack, self.slot))
            resp1 = self.sock.recv(1024)
            if not resp1 or len(resp1) < 4:
                raise Exception("COTP reddedildi.")

            self.sock.send(build_setup_communication())
            resp2 = self.sock.recv(1024)
            if not resp2:
                raise Exception("S7 Oturumu başlatılamadı.")
            
            self.connected = True
            return True
        except Exception as e:
            self.connected = False
            if self.sock:
                self.sock.close()
            # Ekrana basmak yerine arka plandaki log dosyasına yazıyoruz
            logging.info(f"[{self.ip}] Bağlantı Hatası: {e}")
            return False

    def read_area(self, db_number: int, start_offset: int, length: int) -> bytes:
        if not self.connected: return None
        try:
            req = build_read_var_req(db_number, start_offset, length)
            self.sock.send(req)
            resp = self.sock.recv(1024)
            if resp and len(resp) >= 25 + length:
                return resp[25:25+length]
            return None
        except Exception:
            self.connected = False
            return None

    def disconnect(self):
        if self.sock:
            self.sock.close()
        self.connected = False