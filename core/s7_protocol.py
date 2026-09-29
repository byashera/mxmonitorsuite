import struct
from core.iso_on_tcp import build_tpkt, build_cotp_data_header

def build_setup_communication() -> bytes:
    """
    PLC ile COTP el sıkışması bittikten sonra, S7 haberleşmesini 
    başlatmak için gönderilen 'Setup Communication' paketidir.
    """
    s7_pdu = bytes([
        0x32, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0x00, 0x00, # S7 Header
        0xf0, 0x00, 0x00, 0x01, 0x00, 0x01, 0x03, 0xc0              # Parameter Payload
    ])
    return build_tpkt(build_cotp_data_header() + s7_pdu)

def build_read_var_req(db_number: int, start_offset: int, length: int) -> bytes:
    """
    Belirli bir Data Block (DB) içerisindeki baytları okumak için istek paketi.
    (Bahsettiğimiz "Toplu Okuma" mantığı bu length parametresiyle sağlanır).
    """
    s7_header = bytes([
        0x32, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x0E, 0x00, 0x00, 0x04, 0x01
    ])
    
    # 0x84 DB alanını temsil eder. Adresleme bit bazlı olduğu için offset * 8 yapılır.
    offset_bits = start_offset * 8
    item_req = struct.pack('>BBHHHHBHHB', 
        0x12, 0x0a, 0x10, 0x02, 
        length,                 # Okunacak bayt sayısı
        db_number,              # DB Numarası (Örn: DB1)
        0x84,                   # Alan Tipi: Data Blocks
        (offset_bits >> 16),    # Offset Yüksek Bayt
        (offset_bits & 0xFFFF), # Offset Düşük Bayt
        0x00
    )
    return build_tpkt(build_cotp_data_header() + s7_header + item_req)