import struct

def build_tpkt(payload: bytes) -> bytes:
    """
    S7 Paketini TPKT zarfına koyar.
    Zarf Yapısı: [Versiyon:3] [Ayrılmış:0] [Uzunluk: 2 Bayt] + [Payload]
    """
    length = len(payload) + 4
    return struct.pack('>BBH', 3, 0, length) + payload

def build_cotp_connection_request(rack: int = 0, slot: int = 1) -> bytes:
    """
    PLC'nin 102 numaralı portuna atılacak ilk "Tanışma / El Sıkışma" paketidir.
    S7-1200 ve S7-1500 serileri genelde Rack 0, Slot 1'de çalışır.
    """
    
    # Destination TSAP hesaplaması (Siemens standardı)
    dst_tsap_1 = 0x01
    dst_tsap_2 = (rack * 0x20) + slot

    cotp = bytes([
        0x11,                   # Uzunluk (17 bayt)
        0xE0,                   # PDU Tipi: Connection Request
        0x00, 0x00,             # Hedef Referansı
        0x00, 0x01,             # Kaynak Referansı
        0x00,                   # Class 0
        0xC0, 0x01, 0x0A,       # Parametre: TPDU Boyutu (10 -> 1024 bayt desteklenir)
        0xC1, 0x02, 0x01, 0x00, # Parametre: Kaynak TSAP
        0xC2, 0x02, dst_tsap_1, dst_tsap_2  # Parametre: Hedef TSAP
    ])
    
    return build_tpkt(cotp)

def build_cotp_data_header() -> bytes:
    """Veri okuma/yazma işlemleri sırasında kullanılacak kısa başlık."""
    # 0x02 (Uzunluk), 0xF0 (Data PDU), 0x80 (EOT - End of Transmission)
    return bytes([0x02, 0xF0, 0x80])