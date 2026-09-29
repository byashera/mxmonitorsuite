// ==========================================
// 0. ANİMASYONLU BİLDİRİM (TOAST POP-UP) SİSTEMİ
// ==========================================
function showToast(message, type = "info") {
    const container = document.getElementById("toastContainer");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let icon = "ℹ️";
    if (type === "success") icon = "✅";
    if (type === "warning") icon = "⚠️";
    if (type === "error") icon = "❌";

    toast.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = "toastSlideOut 0.3s forwards";
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// ==========================================
// DIŞARI AKTARMA (EXPORT) AŞAMALI YÖNETİMİ
// ==========================================
async function openExportModal() {
    if (!window.systemData || Object.keys(window.systemData).length === 0) {
        return showToast("Dışa aktarılacak canlı veri bulunmuyor.", "warning");
    }

    const hasPlc = await populatePlcDropdown("exportTargetPlc");
    if (!hasPlc) return showToast("Sistemde kayıtlı PLC cihazı bulunamadı!", "error");

    document.getElementById("exportStepSelect").style.display = "block";
    document.getElementById("exportStepProgress").style.display = "none";
    document.getElementById("exportStepSuccess").style.display = "none";
    document.getElementById("exportProgressBar").style.width = "0%";
    document.getElementById("exportModal").style.display = "flex";
}

function closeExportModal() {
    document.getElementById("exportModal").style.display = "none";
}

async function processDataExport() {
    const targetPlcId = document.getElementById("exportTargetPlc").value;
    const format = document.querySelector('input[name="exportFormat"]:checked').value;

    document.getElementById("exportStepSelect").style.display = "none";
    document.getElementById("exportStepProgress").style.display = "block";

    const progressBar = document.getElementById("exportProgressBar");
    const statusText = document.getElementById("exportProgressStatus");
    const counterText = document.getElementById("exportProgressCounter");

    const steps = [
        { p: 25, t: "İzlenen canlı tag verileri taranıyor..." },
        { p: 55, t: "Veriler yapılandırılıyor ve şablon oluşturuluyor..." },
        { p: 85, t: `${format.toUpperCase()} formatında dosya derleniyor...` },
        { p: 100, t: "Dosya indirmeye hazır!" }
    ];

    for (let step of steps) {
        progressBar.style.width = `${step.p}%`;
        statusText.innerText = step.t;
        counterText.innerText = `%${step.p}`;
        await new Promise(r => setTimeout(r, 140));
    }

    try {
        const response = await fetch("/api/export/data", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                plc_id: parseInt(targetPlcId),
                format: format,
                data: window.systemData
            })
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `PLC_${targetPlcId}_Veri.${format === 'word' ? 'docx' : format === 'excel' ? 'xlsx' : 'sql'}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            setTimeout(() => {
                document.getElementById("exportStepProgress").style.display = "none";
                document.getElementById("exportStepSuccess").style.display = "block";
                document.getElementById("exportSuccessText").innerHTML = `
                    Veriler <strong>${format.toUpperCase()}</strong> formatında başarıyla dışa aktarıldı ve indirildi.
                `;
            }, 300);
        } else {
            throw new Error("Sunucu dışa aktarma hatası verdi.");
        }
    } catch (err) {
        closeExportModal();
        showToast("Dışa aktarma sırasında bir hata oluştu!", "error");
    }
}

// ==========================================
// 1. MODAL (AÇILIR PENCERE) YÖNETİMİ
// ==========================================
async function populatePlcDropdown(selectElementId) {
    const select = document.getElementById(selectElementId);
    if (!select) return false;

    try {
        const res = await fetch("/api/plcs");
        const data = await res.json();
        select.innerHTML = "";

        if (!data.data || data.data.length === 0) {
            select.innerHTML = "<option value=''>Kayıtlı PLC Bulunamadı</option>";
            initCustomSelects();
            return false;
        }

        data.data.forEach(plc => {
            const port = plc.port || 102;
            select.innerHTML += `<option value="${plc.id}">${plc.name} (${plc.ip}:${port})</option>`;
        });
        initCustomSelects();
        return true;
    } catch (e) {
        console.error("PLC listesi yüklenemedi:", e);
        return false;
    }
}

async function openTagModal() {
    const hasPlc = await populatePlcDropdown("tagTargetPlc");
    if (!hasPlc) return showToast("Tag eklemeden önce en az 1 adet PLC tanımlamalısınız!", "warning");
    document.getElementById("tagModal").style.display = "flex";
}
function closeTagModal() {
    document.getElementById("tagModal").style.display = "none";
    const f = document.getElementById("addTagForm");
    if (f) f.reset();
}

let currentEditTag = { plcId: null, tagId: null };
function openEditTagModal(plcId, tagId, name, db, offset, type) {
    currentEditTag = { plcId, tagId };
    document.getElementById("editTagName").value = name;
    document.getElementById("editTagDb").value = db;
    document.getElementById("editTagOffset").value = offset;
    document.getElementById("editTagType").value = type;
    document.getElementById("editTagModal").style.display = "flex";
}
function closeEditTagModal() {
    document.getElementById("editTagModal").style.display = "none";
    const form = document.getElementById("editTagForm");
    if (form) form.reset();
    currentEditTag = { plcId: null, tagId: null };
}

function openPlcModal() {
    document.getElementById("plcModal").style.display = "flex";
}
function closePlcModal() {
    document.getElementById("plcModal").style.display = "none";
    const f = document.getElementById("addPlcForm");
    if (f) f.reset();
}

let currentEditPlcId = null;
function openEditPlcModal(id, name, ip, rack, slot, plant = 'JAN', port = 102) {
    currentEditPlcId = id;
    if (document.getElementById("editPlcPlant")) document.getElementById("editPlcPlant").value = plant;
    document.getElementById("editPlcName").value = name;
    document.getElementById("editPlcIp").value = ip;
    if (document.getElementById("editPlcPort")) document.getElementById("editPlcPort").value = port;
    document.getElementById("editPlcRack").value = rack;
    document.getElementById("editPlcSlot").value = slot;
    document.getElementById("editPlcModal").style.display = "flex";
}
function closeEditPlcModal() {
    document.getElementById("editPlcModal").style.display = "none";
    const form = document.getElementById("editPlcForm");
    if (form) form.reset();
    currentEditPlcId = null;
}

let confirmCallback = null;
function openConfirmModal(title, message, callback) {
    document.getElementById("confirmTitle").innerHTML = `<span>⚠️</span> ${title}`;
    document.getElementById("confirmMessage").innerText = message;
    document.getElementById("confirmModal").style.display = "flex";
    confirmCallback = callback;
}
function closeConfirmModal() {
    document.getElementById("confirmModal").style.display = "none";
    confirmCallback = null;
}

// ==========================================
// 2. CSV VE EXCEL İŞLEMLERİ (AŞAMALI AKTARIM)
// ==========================================
async function openImportModal() {
    const hasPlc = await populatePlcDropdown("importTargetPlc");
    if (!hasPlc) return showToast("Tag aktarmadan önce en az 1 adet PLC tanımlamalısınız!", "warning");

    document.getElementById("importStepSelect").style.display = "block";
    document.getElementById("importStepProgress").style.display = "none";
    document.getElementById("importStepSuccess").style.display = "none";
    document.getElementById("dropzoneText").innerHTML = "<strong>Bir dosya seçin</strong> veya buraya sürükleyin";
    document.getElementById("importProgressBar").style.width = "0%";

    const fileInp = document.getElementById("csvFileInput");
    if (fileInp) fileInp.value = "";
    document.getElementById("importTagModal").style.display = "flex";
}

function closeImportModal() {
    document.getElementById("importTagModal").style.display = "none";
    const fileInp = document.getElementById("csvFileInput");
    if (fileInp) fileInp.value = "";
    loadStoredData();
}

function handleFileSelected(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        document.getElementById("dropzoneText").innerHTML = `Seçilen Dosya: <strong>${file.name}</strong> (${(file.size / 1024).toFixed(1)} KB)`;
    }
}

async function processCsvImport() {
    const fileInput = document.getElementById("csvFileInput");
    if (!fileInput || !fileInput.files.length) {
        return showToast("Lütfen bir CSV veya TXT dosyası seçin.", "warning");
    }

    const targetPlcSelect = document.getElementById("importTargetPlc");
    const targetPlcId = targetPlcSelect ? targetPlcSelect.value : null;
    if (!targetPlcId) {
        return showToast("Lütfen geçerli bir hedef PLC seçin!", "warning");
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function (e) {
        const rawLines = e.target.result.split('\n');
        const validLines = rawLines.map(l => l.trim()).filter(l => l.length > 0 && l.includes(','));

        if (validLines.length === 0) {
            return showToast("Dosyada geçerli formatta tag bulunamadı!", "warning");
        }

        document.getElementById("importStepSelect").style.display = "none";
        document.getElementById("importStepProgress").style.display = "block";

        const progressBar = document.getElementById("importProgressBar");
        const statusText = document.getElementById("progressStatusText");
        const counterText = document.getElementById("progressCounterText");

        let addedCount = 0;
        const total = validLines.length;

        for (let i = 0; i < total; i++) {
            const parts = validLines[i].split(',');
            if (parts.length >= 4) {
                const tagData = {
                    name: parts[0].trim(),
                    db_number: parseInt(parts[1].trim()),
                    offset: parseInt(parts[2].trim()),
                    data_type: parts[3].trim()
                };

                try {
                    await fetch(`/api/plcs/${targetPlcId}/tags`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(tagData)
                    });
                    addedCount++;
                } catch (err) {
                    console.error("Tag ekleme hatası:", err);
                }
            }

            const percentage = Math.round(((i + 1) / total) * 100);
            progressBar.style.width = `${percentage}%`;
            statusText.innerText = `Taglar aktarılıyor... (${i + 1} / ${total})`;
            counterText.innerText = `%${percentage}`;

            await new Promise(r => setTimeout(r, 40));
        }

        setTimeout(() => {
            document.getElementById("importStepProgress").style.display = "none";
            document.getElementById("importStepSuccess").style.display = "block";
            document.getElementById("successSummaryText").innerHTML = `
                Tebrikler! Toplam <strong>${addedCount} adet</strong> tag başarıyla seçilen PLC cihazına aktarıldı.
            `;
        }, 400);
    };

    reader.readAsText(file);
}

// ==========================================
// 3. AYARLAR YÖNETİMİ
// ==========================================
function saveSettings() {
    const settings = {
        plcInterval: document.getElementById("setPlcInterval")?.value || 1000,
        uiInterval: document.getElementById("setUiInterval")?.value || 1000,
        logLevel: document.getElementById("setLogLevel")?.value || "error"
    };
    localStorage.setItem("s7_settings", JSON.stringify(settings));
    showToast("Ayarlar başarıyla kaydedildi!", "success");
}

function clearLogs() {
    openConfirmModal("Logları Temizle", "Arka plandaki tüm log geçmişini silmek istediğinize emin misiniz?", () => {
        alert("Log temizleme talebi sunucuya iletildi.");
    });
}

// ==========================================
// 4. VERİLERİ ÇEKME VE TABLOLARI DOLDURMA (PLC & TAG LİSTESİ)
// ==========================================
async function loadStoredData() {
    try {
        const response = await fetch("/api/plcs");
        const result = await response.json();

        const plcBody = document.getElementById("plcListBody");
        const tagBody = document.getElementById("tagListBody");

        if (!plcBody || !tagBody) return;

        plcBody.innerHTML = "";
        tagBody.innerHTML = "";

        if (!result.data || result.data.length === 0) {
            plcBody.innerHTML = "<tr><td colspan='5' style='text-align:center;'>Kayıtlı cihaz yok.</td></tr>";
            tagBody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Kayıtlı tag yok.</td></tr>";
            return;
        }

        let hasTags = false;

        result.data.forEach(plc => {
            const statusClass = plc.active ? "good" : "";
            const statusText = plc.active ? "Aktif" : "Pasif";
            const plant = plc.plant || 'JAN';
            const plantBadge = `<span class="badge-plant ${plant}">${plant}</span>`;
            const port = plc.port || 102;

            plcBody.innerHTML += `
                <tr>
                    <td>${plantBadge} <strong style="margin-left:6px;">${plc.name}</strong></td>
                    <td>${plc.ip}:${port}</td>
                    <td>${plc.rack} / ${plc.slot}</td>
                    <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td>
                        <button class="action-btn edit" onclick="openEditPlcModal(${plc.id}, '${plc.name}', '${plc.ip}', ${plc.rack}, ${plc.slot}, '${plant}', ${port})">Düzenle</button>
                        <button class="action-btn delete" onclick="deletePlc(${plc.id})">Sil</button>
                    </td>
                </tr>
            `;

            if (plc.tags && plc.tags.length > 0) {
                hasTags = true;
                plc.tags.forEach(tag => {
                    tagBody.innerHTML += `
                        <tr>
                            <td><strong>${tag.name}</strong><br><small style="color:var(--text-muted)">${plc.name}</small></td>
                            <td>DB${tag.db_number}.DBX${tag.offset}</td>
                            <td>${tag.data_type}</td>
                            <td>
                                <button class="action-btn edit" onclick="openEditTagModal(${plc.id}, ${tag.id}, '${tag.name}', ${tag.db_number}, ${tag.offset}, '${tag.data_type}')">Düzenle</button>
                                <button class="action-btn delete" onclick="deleteTag(${plc.id}, ${tag.id})">Sil</button>
                            </td>
                        </tr>
                    `;
                });
            }
        });

        if (!hasTags) tagBody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Henüz hiçbir cihaza tag eklenmemiş.</td></tr>";
    } catch (e) {
        console.error("Veriler yüklenirken hata oluştu:", e);
    }
}

function deletePlc(plcId) {
    openConfirmModal("Cihazı Sil", "Bu cihazı ve tagleri silmek istediğinize emin misiniz?", async () => {
        try {
            const res = await fetch(`/api/plcs/${plcId}`, { method: 'DELETE' });
            if (res.ok) {
                loadStoredData();
                initDashboardPlcs();
            }
        } catch (e) {
            console.error("Silme hatası:", e);
        }
    });
}

function deleteTag(plcId, tagId) {
    openConfirmModal("Tag'i Sil", "Bu tag'i listeden kaldırmak istediğinize emin misiniz?", async () => {
        try {
            const res = await fetch(`/api/plcs/${plcId}/tags/${tagId}`, { method: 'DELETE' });
            if (res.ok) {
                loadStoredData();
                initDashboardPlcs();
            }
        } catch (e) {
            console.error("Silme hatası:", e);
        }
    });
}

// ==========================================
// 5. SAYFA YÜKLENDİĞİNDE ÇALIŞACAKLAR
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    loadStoredData();
    initCustomSelects();
    initDashboardPlcs();
    loadWatchlists();

    const savedSettings = JSON.parse(localStorage.getItem("s7_settings"));
    if (savedSettings) {
        if (document.getElementById("setPlcInterval")) document.getElementById("setPlcInterval").value = savedSettings.plcInterval;
        if (document.getElementById("setUiInterval")) document.getElementById("setUiInterval").value = savedSettings.uiInterval;
        if (document.getElementById("setLogLevel")) document.getElementById("setLogLevel").value = savedSettings.logLevel;
    }

    const confirmBtn = document.getElementById("confirmBtn");
    if (confirmBtn) {
        confirmBtn.addEventListener("click", () => {
            if (confirmCallback) confirmCallback();
            closeConfirmModal();
        });
    }

    // SPA Sekme Geçişleri
    const menuLinks = document.querySelectorAll('.sidebar .menu a[data-target]');
    const pageViews = document.querySelectorAll('.page-view');

    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            menuLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');

            pageViews.forEach(view => {
                view.classList.remove('active');
                setTimeout(() => { if (!view.classList.contains('active')) { view.style.display = 'none'; } }, 300);
            });

            setTimeout(() => {
                const targetView = document.getElementById(targetId);
                if (targetView) {
                    targetView.style.display = 'block';
                    setTimeout(() => targetView.classList.add('active'), 10);
                }
            }, 300);

            if (targetId === "view-watchlists") {
                loadWatchlists();
            }
        });
    });

    // Form Gönderimleri: Tag Ekle
    const addTagForm = document.getElementById("addTagForm");
    if (addTagForm) {
        addTagForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const targetPlcId = document.getElementById("tagTargetPlc").value;
            const tagData = {
                name: document.getElementById("tagName").value,
                db_number: parseInt(document.getElementById("tagDb").value),
                offset: parseInt(document.getElementById("tagOffset").value),
                data_type: document.getElementById("tagType").value
            };

            try {
                const response = await fetch(`/api/plcs/${targetPlcId}/tags`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(tagData)
                });
                if (response.ok) {
                    closeTagModal();
                    loadStoredData();
                    initDashboardPlcs();
                    showToast("Tag başarıyla eklendi!", "success");
                }
            } catch (error) {
                console.error("API Hatası:", error);
            }
        });
    }

    // Form Gönderimleri: Tag Düzenle
    const editTagForm = document.getElementById("editTagForm");
    if (editTagForm) {
        editTagForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentEditTag.plcId || !currentEditTag.tagId) return;

            const updatedData = {
                name: document.getElementById("editTagName").value,
                db_number: parseInt(document.getElementById("editTagDb").value),
                offset: parseInt(document.getElementById("editTagOffset").value),
                data_type: document.getElementById("editTagType").value
            };

            try {
                const response = await fetch(`/api/plcs/${currentEditTag.plcId}/tags/${currentEditTag.tagId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedData)
                });
                if (response.ok) {
                    closeEditTagModal();
                    loadStoredData();
                    initDashboardPlcs();
                    showToast("Tag başarıyla güncellendi!", "success");
                }
            } catch (error) {
                console.error("Tag güncelleme hatası:", error);
            }
        });
    }

    // Form Gönderimleri: PLC Ekle (Port Destekli)
    const addPlcForm = document.getElementById("addPlcForm");
    if (addPlcForm) {
        addPlcForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const plcData = {
                name: document.getElementById("plcName").value,
                ip: document.getElementById("plcIp").value,
                port: parseInt(document.getElementById("plcPort")?.value || 102),
                plant: document.getElementById("plcPlant").value,
                rack: parseInt(document.getElementById("plcRack").value),
                slot: parseInt(document.getElementById("plcSlot").value),
                active: true
            };
            try {
                const response = await fetch("/api/plcs", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(plcData)
                });
                if (response.ok) {
                    closePlcModal();
                    loadStoredData();
                    initDashboardPlcs();
                    showToast("Yeni PLC başarıyla eklendi!", "success");
                }
            } catch (error) {
                console.error("API Hatası:", error);
            }
        });
    }

    // Form Gönderimleri: PLC Düzenle (Port Destekli)
    const editPlcForm = document.getElementById("editPlcForm");
    if (editPlcForm) {
        editPlcForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            if (!currentEditPlcId) return;
            const updatedData = {
                name: document.getElementById("editPlcName").value,
                ip: document.getElementById("editPlcIp").value,
                port: parseInt(document.getElementById("editPlcPort")?.value || 102),
                plant: document.getElementById("editPlcPlant").value,
                rack: parseInt(document.getElementById("editPlcRack").value),
                slot: parseInt(document.getElementById("editPlcSlot").value)
            };
            try {
                const response = await fetch(`/api/plcs/${currentEditPlcId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(updatedData)
                });
                if (response.ok) {
                    closeEditPlcModal();
                    loadStoredData();
                    initDashboardPlcs();
                    showToast("PLC başarıyla güncellendi!", "success");
                }
            } catch (error) {
                console.error("Güncelleme hatası:", error);
                showToast("PLC güncellenirken hata oluştu!", "error");
            }
        });
    }

    // ==========================================
    // 6. KONSOL (TERMINAL) İŞLEMLERİ
    // ==========================================
    const terminalOutput = document.getElementById("terminalOutput");
    const terminalInput = document.getElementById("terminalInput");

    const helpText = `S7 Monitor Suite - Etkileşimli Konsol (v1.0)
──────────────────────────────────────────────────────────────
Bağlantı Komutları:
  connect <ip>             (Standart 102 portu ile el sıkışma oturumu dener)
  connect <ip>:<port>      (Özel port ile el sıkışma oturumu dener)
  status                   (Sistemde kayıtlı PLC'lerin durumunu yazdırır)
  clear                    (Terminal ekranını temizler)
  help                     (Bu yardım menüsünü tekrar gösterir)
──────────────────────────────────────────────────────────────`;

    window.printToTerminal = function (text, type = "normal") {
        if (!terminalOutput) return;
        const line = document.createElement("div");
        line.className = `terminal-line ${type}`;
        line.textContent = text;
        terminalOutput.appendChild(line);
        terminalOutput.scrollTop = terminalOutput.scrollHeight;
    };

    window.clearConsole = function () {
        if (terminalOutput) terminalOutput.innerHTML = "";
        window.printToTerminal(helpText, "help");
    };

    window.clearConsole();

    if (terminalInput) {
        terminalInput.addEventListener("keydown", async (e) => {
            if (e.key === "Enter") {
                const cmd = terminalInput.value.trim();
                if (!cmd) return;

                window.printToTerminal(`root@s7-monitor:~# ${cmd}`, "command");
                terminalInput.value = "";

                const args = cmd.split(" ");
                const mainCmd = args[0].toLowerCase();

                if (mainCmd === "clear") {
                    window.clearConsole();
                }
                else if (mainCmd === "help") {
                    window.printToTerminal(helpText, "help");
                }
                else {
                    try {
                        const response = await fetch('/api/console', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ command: cmd })
                        });
                        const result = await response.json();
                        window.printToTerminal(result.output, result.status);
                    } catch (error) {
                        window.printToTerminal("Kritik Hata: Python sunucusu ile iletişim kurulamadı.", "error");
                    }
                }
            }
        });
    }

    const consoleLink = document.querySelector('a[data-target="view-console"]');
    if (consoleLink) {
        consoleLink.addEventListener('click', () => {
            setTimeout(() => { if (terminalInput) terminalInput.focus(); }, 350);
        });
    }
});

// ==========================================
// 7. ÖZEL BUZLU CAM DROPDOWN DÖNÜŞTÜRÜCÜ
// ==========================================
function initCustomSelects() {
    document.querySelectorAll(".form-group select").forEach(select => {
        if (select.parentElement.classList.contains("custom-select-wrapper")) return;

        select.style.display = "none";

        const wrapper = document.createElement("div");
        wrapper.className = "custom-select-wrapper";
        select.parentNode.insertBefore(wrapper, select);
        wrapper.appendChild(select);

        const trigger = document.createElement("div");
        trigger.className = "custom-select-trigger";

        const selectedText = select.options[select.selectedIndex]?.text || "Seçiniz...";
        trigger.innerHTML = `
            <span class="trigger-text">${selectedText}</span>
            <span class="custom-select-arrow">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </span>
        `;
        wrapper.appendChild(trigger);

        const optionsList = document.createElement("div");
        optionsList.className = "custom-options";

        function buildOptions() {
            optionsList.innerHTML = "";
            Array.from(select.options).forEach(opt => {
                const customOpt = document.createElement("div");
                customOpt.className = `custom-option ${opt.selected ? 'selected' : ''}`;
                customOpt.textContent = opt.text;
                customOpt.dataset.value = opt.value;

                customOpt.addEventListener("click", () => {
                    select.value = opt.value;
                    trigger.querySelector(".trigger-text").textContent = opt.text;
                    optionsList.querySelectorAll(".custom-option").forEach(o => o.classList.remove("selected"));
                    customOpt.classList.add("selected");
                    wrapper.classList.remove("open");
                    select.dispatchEvent(new Event("change"));
                });
                optionsList.appendChild(customOpt);
            });
        }

        buildOptions();
        wrapper.appendChild(optionsList);

        trigger.addEventListener("click", (e) => {
            e.stopPropagation();
            document.querySelectorAll(".custom-select-wrapper.open").forEach(w => {
                if (w !== wrapper) w.classList.remove("open");
            });
            buildOptions();
            wrapper.classList.toggle("open");
        });
    });
}

document.addEventListener("click", () => {
    document.querySelectorAll(".custom-select-wrapper.open").forEach(w => w.classList.remove("open"));
});

// ==========================================
// 8. TEK SEFERLİK SORGULAMA VE DASHBOARD YÖNETİMİ
// ==========================================
let selectedTags = new Map();

async function pollPlcData(plcId, btnElement) {
    if (btnElement) btnElement.classList.add("loading");
    showToast("Cihaza bağlanılıyor ve sahadan veriler çekiliyor...", "info");

    try {
        const res = await fetch(`/api/plcs/${plcId}/poll`, { method: "POST" });
        const result = await res.json();

        if (result.status === "success") {
            if (!window.systemData) window.systemData = {};

            window.systemData[result.plc_id] = {
                id: result.plc_id,
                name: result.plc_name,
                timestamp: result.timestamp,
                plant: result.plant,
                tags: result.tags,
                hasPolled: true
            };

            updateDbFilterOptions();
            renderPolledDashboard();
            updateTopCards();
            showToast(`${result.plc_name} verileri başarıyla okundu!`, "success");
        } else {
            showToast(result.message || "PLC bağlantı hatası!", "error");
        }
    } catch (e) {
        console.error(e);
        showToast("Bağlantı sırasında beklenmeyen bir hata oluştu!", "error");
    } finally {
        if (btnElement) btnElement.classList.remove("loading");
    }
}

// DB Dropdown Seçeneklerini Güncelle
// DB Dropdown Seçeneklerini Güncelle ve Özel Buzlu Cam Arayüzüne Dönüştür
function updateDbFilterOptions() {
    const box = document.querySelector(".db-filter-box");
    if (!box) return;

    // Sistemdeki tüm kayıtlı veya çekilmiş tag'lerin DB numaralarını topla
    const dbSet = new Set();
    Object.values(window.systemData || {}).forEach(plc => {
        // Hem taranmış tags hem de ilk yüklenen rawTags listesinden DB'leri al
        const allTags = [...(plc.tags || []), ...(plc.rawTags || [])];
        allTags.forEach(t => {
            const dbNum = t.db_number !== undefined ? t.db_number : t.db;
            if (dbNum !== undefined && dbNum !== null && dbNum !== "") {
                dbSet.add(parseInt(dbNum));
            }
        });
    });

    // Varsa eski custom yapıyı kaldırıp temiz bir select üzerinden yeniden kur
    const currentVal = window.selectedDbFilter || "ALL";
    box.innerHTML = `
        <select id="dbFilterSelect" style="display: none;">
            <option value="ALL">Tüm DB'ler</option>
            ${Array.from(dbSet).sort((a, b) => a - b).map(db => `<option value="${db}" ${String(currentVal) === String(db) ? 'selected' : ''}>DB${db}</option>`).join('')}
        </select>
    `;

    const select = box.querySelector("#dbFilterSelect");
    const wrapper = document.createElement("div");
    wrapper.className = "custom-select-wrapper";
    box.appendChild(wrapper);

    // Tetikleyici Başlık
    const trigger = document.createElement("div");
    trigger.className = "custom-select-trigger";
    const selectedText = currentVal === "ALL" ? "Tüm DB'ler" : `DB${currentVal}`;
    trigger.innerHTML = `
        <span class="trigger-text">${selectedText}</span>
        <span class="custom-select-arrow">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
        </span>
    `;
    wrapper.appendChild(trigger);

    // Açılır Liste (Buzlu Cam)
    const optionsList = document.createElement("div");
    optionsList.className = "custom-options";

    const allOptions = [
        { value: "ALL", text: "Tüm DB'ler" },
        ...Array.from(dbSet).sort((a, b) => a - b).map(db => ({ value: String(db), text: `DB${db}` }))
    ];

    allOptions.forEach(opt => {
        const item = document.createElement("div");
        item.className = `custom-option ${String(currentVal) === String(opt.value) ? 'selected' : ''}`;
        item.textContent = opt.text;
        item.addEventListener("click", (e) => {
            e.stopPropagation();
            window.selectedDbFilter = opt.value;
            trigger.querySelector(".trigger-text").textContent = opt.text;
            optionsList.querySelectorAll(".custom-option").forEach(o => o.classList.remove("selected"));
            item.classList.add("selected");
            wrapper.classList.remove("open");
            renderPolledDashboard();
        });
        optionsList.appendChild(item);
    });

    wrapper.appendChild(optionsList);

    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        document.querySelectorAll(".custom-select-wrapper.open").forEach(w => {
            if (w !== wrapper) w.classList.remove("open");
        });
        wrapper.classList.toggle("open");
    });
}

// Filtreleme Tetikleyicisi
function filterDashboardTags() {
    renderPolledDashboard();
}

function renderPolledDashboard() {
    const tagsBody = document.getElementById("tagsBody");
    if (!tagsBody) return;

    const searchInput = document.getElementById("tagSearchInput");
    const dbFilterSelect = document.getElementById("dbFilterSelect");

    const searchQuery = (searchInput ? searchInput.value : "").trim().toLowerCase();
    const selectedDb = window.selectedDbFilter || "ALL";

    let newHtml = "";
    const plcEntries = Object.values(window.systemData || {});

    if (plcEntries.length === 0) {
        tagsBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 25px; color: var(--text-muted);">Kayıtlı PLC cihazı bulunmuyor.</td></tr>`;
        return;
    }

    plcEntries.forEach(plc => {
        const plant = plc.plant || "JAN";
        const plantBadge = `<span class="badge-plant ${plant}">${plant}</span>`;

        newHtml += `
            <tr class="plc-group-header">
                <td colspan="5">
                    <div class="plc-group-inner">
                        <span class="plc-title-left">
                            ${plantBadge}
                            <strong>🖥️ ${plc.name}</strong>
                            <button class="btn-poll-play" title="Tek Seferlik Sorgula" onclick="pollPlcData(${plc.id}, this)">▶</button>
                        </span>
                        <span class="plc-timestamp">Son Yanıt: ${plc.timestamp || '--:--:--'}</span>
                    </div>
                </td>
            </tr>
        `;

        if (!plc.hasPolled) {
            newHtml += `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 18px; color: var(--text-muted); font-size: 0.88rem;">
                        Bu cihazdan henüz veri çekilmedi. Verileri okumak için yukarıdaki <strong>▶</strong> butonuna basınız.
                    </td>
                </tr>
            `;
            return;
        }

        // Filtreleme Kriterleri: Arama Terimi + DB Numarası
        const filteredTags = (plc.tags || []).filter(tag => {
            const matchesSearch = !searchQuery || tag.name.toLowerCase().includes(searchQuery);
            const matchesDb = selectedDb === "ALL" || String(tag.db_number) === String(selectedDb);
            return matchesSearch && matchesDb;
        });

        if (filteredTags.length === 0) {
            newHtml += `
                <tr>
                    <td colspan="5" style="text-align: center; padding: 16px; color: var(--text-muted); font-size: 0.85rem;">
                        Filtreye uygun tag bulunamadı.
                    </td>
                </tr>
            `;
            return;
        }

        filteredTags.forEach(tag => {
            const isChecked = selectedTags.has(`${plc.name}_${tag.name}`) ? "checked" : "";
            const isErr = String(tag.value).includes("Hata") || String(tag.value).includes("ulaşılamadı");

            let statusBadge = isErr
                ? `<span class="status-badge pulse-error">Hata</span>`
                : `<span class="status-badge good">Okundu</span>`;

            let displayVal = tag.value;
            if (tag.type === "Bool" && !isErr) {
                const isActive = (tag.value === true || tag.value === "true" || tag.value === 1);
                displayVal = `<span class="status-badge ${isActive ? 'good' : ''}" style="${!isActive ? 'background:rgba(0,0,0,0.06); color:#64748b;' : ''}">${isActive ? 'AKTİF' : 'PASİF'}</span>`;
            }

            const dbBadge = tag.db_number !== undefined ? `<small style="color:var(--text-muted); margin-left:6px; font-weight:normal;">(DB${tag.db_number})</small>` : '';

            newHtml += `
                <tr>
                    <td style="text-align: center;">
                        <input type="checkbox" ${isChecked} onchange="handleTagSelect('${plc.name}', '${tag.name}', '${tag.type}', this)">
                    </td>
                    <td style="padding-left: 20px;"><strong>${tag.name}</strong>${dbBadge}</td>
                    <td><span style="color: var(--text-muted);">${tag.type}</span></td>
                    <td>${displayVal}</td>
                    <td>${statusBadge}</td>
                </tr>
            `;
        });
    });

    tagsBody.innerHTML = newHtml;
    updateWatchlistButton();
}

function updateTopCards() {
    const plcs = Object.values(window.systemData || {});
    let polledTags = 0;
    let lastTime = "--:--:--";
    let hasPolledAny = false;

    plcs.forEach(p => {
        if (p.hasPolled) {
            hasPolledAny = true;
            polledTags += (p.tags ? p.tags.length : 0);
            lastTime = p.timestamp;
        }
    });

    const statPlc = document.getElementById("stat-plc");
    const statTags = document.getElementById("stat-tags");
    const statTime = document.getElementById("stat-time");
    const statHealth = document.getElementById("stat-health");

    if (statPlc) statPlc.textContent = plcs.length + " Adet";
    if (statTags) statTags.textContent = polledTags + " Adet";
    if (statTime) statTime.textContent = lastTime;
    if (statHealth) {
        statHealth.textContent = hasPolledAny ? "Hazır" : "Bekleniyor";
        statHealth.style.color = hasPolledAny ? "#10b981" : "#3b82f6";
    }
}

// Tablo Başlığındaki "Tümünü Seç / Kaldır" Fonksiyonu
function toggleSelectAll(masterCheckbox) {
    const isChecked = masterCheckbox.checked;
    const checkboxes = document.querySelectorAll('#tagsBody input[type="checkbox"]');
    
    checkboxes.forEach(cb => {
        if (cb.checked !== isChecked) {
            cb.checked = isChecked;
            cb.dispatchEvent(new Event('change'));
        }
    });
}

function handleTagSelect(plcName, tagName, type, checkbox) {
    const key = `${plcName}_${tagName}`;
    if (checkbox.checked) {
        selectedTags.set(key, { plc: plcName, name: tagName, type: type });
    } else {
        selectedTags.delete(key);
    }
    updateWatchlistButton();
}

function updateWatchlistButton() {
    const btn = document.getElementById("btnCreateWatchlist");
    const countSpan = document.getElementById("selectedTagCount");
    if (btn && countSpan) {
        countSpan.textContent = selectedTags.size;
        btn.style.display = selectedTags.size > 0 ? "inline-flex" : "none";
    }
}

function openCreateWatchlistModal() {
    document.getElementById("modalSelectedCount").textContent = selectedTags.size;
    document.getElementById("watchlistModal").style.display = "flex";
}
function closeWatchlistModal() {
    document.getElementById("watchlistModal").style.display = "none";
}

document.getElementById("createWatchlistForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const listName = document.getElementById("watchListName").value;
    const tagList = Array.from(selectedTags.values());

    const res = await fetch("/api/watchlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: listName, tags: tagList })
    });

    if (res.ok) {
        showToast("Liste başarıyla kaydedildi!", "success");
        closeWatchlistModal();
        selectedTags.clear();
        renderPolledDashboard();
        loadWatchlists();
    }
});

async function initDashboardPlcs() {
    try {
        const res = await fetch("/api/plcs");
        const data = await res.json();
        window.systemData = {};

        if (data.data && data.data.length > 0) {
            data.data.forEach(p => {
                window.systemData[p.id] = {
                    id: p.id,
                    name: p.name,
                    timestamp: "--:--:--",
                    plant: p.plant || "JAN",
                    tags: [],
                    rawTags: p.tags || [],
                    hasPolled: false
                };
            });
        }
        updateDbFilterOptions(); // <-- Sayfa ilk açıldığında kayıtlı tag'lerin DB'lerini doğrudan yükler
        renderPolledDashboard();
        updateTopCards();
    } catch (e) {
        console.error("Dashboard yüklenemedi:", e);
    }
}

// ==========================================
// 9. İZLEME LİSTELERİ (WATCHLISTS) YÖNETİMİ
// ==========================================
async function loadWatchlists() {
    const container = document.getElementById("watchlistsContainer");
    if (!container) return;

    try {
        const res = await fetch("/api/watchlists");
        const result = await res.json();
        const lists = result.data || [];

        if (lists.length === 0) {
            container.innerHTML = `
                <div class="glass" style="grid-column: 1/-1; text-align: center; padding: 50px 20px;">
                    <div style="font-size: 2.5rem; margin-bottom: 10px;">📋</div>
                    <h3 style="margin-bottom: 6px; color: var(--text-main);">Henüz Kayıtlı Liste Yok</h3>
                    <p style="color: var(--text-muted); font-size: 0.9rem;">
                        Canlı İzleme tablosundaki tag'lerin yanındaki kutuları işaretleyerek yeni bir grup oluşturabilirsiniz.
                    </p>
                </div>
            `;
            return;
        }

        let html = "";
        lists.forEach(item => {
            let tagsHtml = "";
            (item.tags || []).forEach(t => {
                tagsHtml += `
                    <div class="watchlist-tag-item">
                        <div>
                            <strong>${t.name}</strong>
                            <div class="tag-source">🖥️ ${t.plc || 'PLC'}</div>
                        </div>
                        <span class="status-badge" style="background: rgba(37,99,235,0.08); color: var(--accent);">
                            ${t.type}
                        </span>
                    </div>
                `;
            });

            html += `
                <div class="card glass watchlist-card" style="display: flex;">
                    <div class="watchlist-header">
                        <div>
                            <h3>${item.name}</h3>
                            <div class="watchlist-meta">Oluşturulma: ${item.created_at || '--:--'} • ${item.tags.length} Tag</div>
                        </div>
                        <div class="watchlist-actions" style="display: flex; gap: 8px;">
                            <button class="action-btn copy-btn" title="Tag Listesini Kopyala" onclick="copyWatchlistToClipboard(${item.id})">📋 Kopyala</button>
                            <button class="action-btn delete" title="Listeyi Sil" onclick="deleteWatchlist(${item.id})">Sil</button>
                        </div>
                    </div>
                    <div class="watchlist-tag-list">
                        ${tagsHtml}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html;
    } catch (e) {
        console.error("Watchlists yüklenemedi:", e);
    }
}

// Seçilen Listenin Taglerini Panoya Kopyalama Fonksiyonu
async function copyWatchlistToClipboard(listId) {
    try {
        const res = await fetch("/api/watchlists");
        const result = await res.json();
        const targetList = (result.data || []).find(l => l.id === listId);

        if (!targetList || !targetList.tags || targetList.tags.length === 0) {
            return showToast("Kopyalanacak tag bulunamadı.", "warning");
        }

        // Düzenli metin formatı
        let textToCopy = `📋 LİSTE: ${targetList.name} (${targetList.created_at || ''})\n`;
        textToCopy += `-----------------------------------------\n`;
        targetList.tags.forEach((t, i) => {
            textToCopy += `${i + 1}. [${t.plc || 'PLC'}] ${t.name} (${t.type})\n`;
        });
        textToCopy += `-----------------------------------------\nToplam: ${targetList.tags.length} Tag`;

        await navigator.clipboard.writeText(textToCopy);
        showToast(`"${targetList.name}" listesi panoya kopyalandı!`, "success");
    } catch (err) {
        console.error("Kopyalama hatası:", err);
        showToast("Panoya kopyalama başarısız oldu.", "error");
    }
}

function deleteWatchlist(listId) {
    openConfirmModal("Listeyi Sil", "Bu izleme grubunu silmek istediğinize emin misiniz?", async () => {
        try {
            const res = await fetch(`/api/watchlists/${listId}`, { method: "DELETE" });
            if (res.ok) {
                showToast("Liste silindi!", "success");
                loadWatchlists();
            }
        } catch (e) {
            console.error("Silinemedi:", e);
        }
    });
}