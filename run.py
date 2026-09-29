import sys
import os
import uvicorn
import webbrowser
import threading
import time
import multiprocessing

def open_browser():
    """Sunucunun açılmasına fırsat vermek için 1.5 saniye bekleyip tarayıcıyı tetikler."""
    time.sleep(1.5)
    webbrowser.open("http://127.0.0.1:8000")

if __name__ == "__main__":
    # Windows .exe paketlerinde thread/process çakışmasını engeller
    multiprocessing.freeze_support()

    # PyInstaller paketinde çalışma dizinini _internal (kaynakların olduğu yer) yap
    if getattr(sys, 'frozen', False):
        base_dir = getattr(sys, '_MEIPASS', os.path.dirname(sys.executable))
        os.chdir(base_dir)

    # Web sunucusunu import et (dizin ayarlandıktan sonra)
    from web.server import app

    # Tarayıcıyı açacak thread
    threading.Thread(target=open_browser, daemon=True).start()
    
    print("S7 Monitor Suite başlatılıyor...")
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=False)