document.addEventListener("DOMContentLoaded", () => {
    const ws = new WebSocket(`ws://${location.host}/ws`);
    const tagsBody = document.getElementById("tagsBody");
    const statTime = document.getElementById("stat-time");
    const statTags = document.getElementById("stat-tags");
    const statPlc = document.getElementById("stat-plc");
    const statHealth = document.getElementById("stat-health");
    const connectionStatus = document.getElementById("connectionStatus");

    // Tüm PLC verilerini birleştireceğimiz ana bellek
    window.systemData = {};

    // PLC Plant (Fabrika) eşleştirme haritası
    let plcPlantMap = {};

    // Sistemdeki kayıtlı PLC'lerin Plant bilgilerini çek
    async function loadPlcPlants() {
        try {
            const res = await fetch("/api/plcs");
            const data = await res.json();
            if (data.data) {
                data.data.forEach(p => {
                    plcPlantMap[p.name] = p.plant || "JAN";
                });
            }
        } catch (e) {
            console.error("Plant haritası alınamadı:", e);
        }
    }

    loadPlcPlants();

    ws.onopen = () => {
        connectionStatus.textContent = "🟢 Bağlı";
        connectionStatus.style.color = "#10b981";
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        // Eğer backend doğrudan plant gönderiyorsa haritaya yaz
        if (data.plant) {
            plcPlantMap[data.plc_name] = data.plant;
        }

        // Gelen veriyi PLC ismine göre bellekte güncelle
        window.systemData[data.plc_name] = {
            timestamp: data.timestamp,
            tags: data.tags,
            plant: data.plant || plcPlantMap[data.plc_name] || "JAN"
        };

        renderDashboard();
    };

    ws.onclose = () => {
        connectionStatus.textContent = "🔴 Bağlantı Koptu";
        connectionStatus.style.color = "#ef4444";
        if (statHealth) {
            statHealth.textContent = "Bağlantı Yok";
            statHealth.style.color = "#ef4444";
        }
    };

    function renderDashboard() {
        let totalTags = 0;
        let errorCount = 0;
        let latestTime = "--:--:--";
        let newHtml = "";

        const plcNames = Object.keys(window.systemData);
        statPlc.textContent = plcNames.length + " Adet";

        plcNames.forEach(plcName => {
            const plcInfo = window.systemData[plcName];
            latestTime = plcInfo.timestamp;

            // Fabrika / Plant rozetini belirle (Varsayılan: JAN)
            const plant = plcInfo.plant || plcPlantMap[plcName] || "JAN";
            const plantBadge = `<span class="badge-plant ${plant}">${plant}</span>`;

            // 1. Grup Başlığı (Sola çıkıntılı, rozet en başta: [JAN] Üretim Saha-1)
            newHtml += `
                <tr class="plc-group-header">
                    <td colspan="4">
                        <div class="plc-group-inner">
                            <span class="plc-title-left">
                                ${plantBadge}
                                <strong>🖥️ ${plcName}</strong>
                            </span>
                            <span class="plc-timestamp">Son Yanıt: ${plcInfo.timestamp || '--:--:--'}</span>
                        </div>
                    </td>
                </tr>
            `;

            // 2. Bu PLC'ye ait Tag'lerin Listelenmesi
            if (plcInfo.tags && Array.isArray(plcInfo.tags)) {
                plcInfo.tags.forEach(tag => {
                    totalTags++;
                    let valDisplay = tag.value;
                    let isError = String(valDisplay).includes("Hata") || String(valDisplay).includes("ulaşılamadı") || String(valDisplay).includes("Okunamadı");

                    if (isError) errorCount++;

                    // Bool tipi için özel görünüm (Hata yoksa)
                    if (tag.type === "Bool" && !isError) {
                        const isActive = (tag.value === true || tag.value === "true" || tag.value === 1);
                        valDisplay = `<span class="status-badge ${isActive ? 'good' : ''}" style="${!isActive ? 'background:rgba(0,0,0,0.06); color:#64748b;' : ''}">${isActive ? 'AKTİF' : 'PASİF'}</span>`;
                    }

                    // Dinamik pulse efektli durum rozeti
                    let statusBadge = isError 
                        ? `<span class="status-badge pulse-error">Hata</span>`
                        : `<span class="status-badge pulse-good">Okunuyor</span>`;

                    newHtml += `
                        <tr>
                            <td style="padding-left: 28px;"><strong>${tag.name}</strong></td>
                            <td><span style="color: var(--text-muted);">${tag.type}</span></td>
                            <td>${valDisplay}</td>
                            <td>${statusBadge}</td>
                        </tr>
                    `;
                });
            }
        });

        // Tabloyu ve üst kartları güncelle
        tagsBody.innerHTML = newHtml;
        statTime.textContent = latestTime;
        statTags.textContent = totalTags + " Adet";

        // Sistem Sağlığı Analizi
        if (statHealth) {
            if (errorCount === 0 && totalTags > 0) {
                statHealth.textContent = "Kusursuz";
                statHealth.style.color = "#10b981";
            } else if (errorCount > 0) {
                statHealth.textContent = `${errorCount} Hata!`;
                statHealth.style.color = "#ef4444";
            } else {
                statHealth.textContent = "Bekleniyor";
                statHealth.style.color = "var(--text-main)";
            }
        }
    }
});