import struct

class S7TypeParser:
    """
    Siemens PLC'den gelen Big-Endian (>) bayt dizilerini 
    anlamlı Python tiplerine dönüştürür.
    """
    
    @staticmethod
    def parse_bool(byte_data: bytes, bit_index: int) -> bool:
        """Bir bayt içindeki spesifik bir biti (0-7) okur (Örn: DB1.DBX0.2)."""
        if not byte_data: 
            return False
        return (byte_data[0] & (1 << bit_index)) != 0

    @staticmethod
    def parse_int(byte_data: bytes) -> int:
        """16-bit işaretli tam sayı (Int16) okur (Örn: DB1.DBW2)."""
        if len(byte_data) < 2: return 0
        return struct.unpack('>h', byte_data[0:2])[0]
        
    @staticmethod
    def parse_dint(byte_data: bytes) -> int:
        """32-bit işaretli tam sayı (Int32) okur (Örn: DB1.DBD4)."""
        if len(byte_data) < 4: return 0
        return struct.unpack('>i', byte_data[0:4])[0]

    @staticmethod
    def parse_real(byte_data: bytes) -> float:
        """32-bit ondalıklı sayı (Float32 / Real) okur."""
        if len(byte_data) < 4: return 0.0
        return struct.unpack('>f', byte_data[0:4])[0]

    @staticmethod
    def parse_word(byte_data: bytes) -> int:
        """16-bit işaretsiz tam sayı (UInt16 / Word) okur."""
        if len(byte_data) < 2: return 0
        return struct.unpack('>H', byte_data[0:2])[0]
        
    @staticmethod
    def parse_dword(byte_data: bytes) -> int:
        """32-bit işaretsiz tam sayı (UInt32 / DWord) okur."""
        if len(byte_data) < 4: return 0
        return struct.unpack('>I', byte_data[0:4])[0]