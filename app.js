// ============================================================================
// إعدادات الصوت - عدل هذا الرابط حسب مكان ملفات MP3 على جهازك
// مثال: إذا كانت الملفات في https://example.com/audio/1/1.mp3
// ============================================================================
let AUDIO_BASE_URL = localStorage.getItem('audio_base_url') || "https://YOUR_AUDIO_SERVER/audio/";
const AUDIO_FILE_PATTERN = "{surahId}/{verseNum}.mp3";

// --- بيانات السور وقاعدة البيانات ---
// يتم تحميلها من ملف data.js قبل هذا الملف
// surahsData و quranData معرفان في data.js

// --- متغيرات عامة ---
const readingScreen = document.getElementById('reading-screen');
const sectionScreen = document.getElementById('section-screen');
const welcomeScreen = document.getElementById('welcome-screen');
const readingTitle = document.getElementById('reading-title');
const quranTextContainer = document.getElementById('quran-text');
const sectionSurahList = document.getElementById('section-surah-list');
const sectionSearch = document.getElementById('section-search');
const readingFooterText = document.getElementById('reading-footer-text');
const readingModeBadge = document.getElementById('reading-mode-badge');
const darkModeBtn = document.getElementById('dark-mode-btn');
const fontSizeDisplay = document.getElementById('font-size-display');
const audioUrlInput = document.getElementById('audio-url-input');

// --- خيارات الآية ---
const verseOptionsOverlay = document.getElementById('verse-options-overlay');
const verseOptionsSheet = document.getElementById('verse-options-sheet');

// --- نوافذ مختلفة ---
const tafsirOverlay = document.getElementById('tafsir-overlay');
const tafsirSheet = document.getElementById('tafsir-sheet');
const tafsirText = document.getElementById('tafsir-text');

const audioRangeOverlay = document.getElementById('audio-range-overlay');
const audioRangeSheet = document.getElementById('audio-range-sheet');

const notesOverlay = document.getElementById('notes-overlay');
const notesSheet = document.getElementById('notes-sheet');
const notesTextarea = document.getElementById('notes-textarea');

const verseDetailsOverlay = document.getElementById('verse-details-overlay');
const verseDetailsSheet = document.getElementById('verse-details-sheet');

const favoritesOverlay = document.getElementById('favorites-overlay');
const favoritesSheet = document.getElementById('favorites-sheet');
const favList = document.getElementById('fav-list');

const settingsOverlay = document.getElementById('settings-overlay');
const settingsSheet = document.getElementById('settings-sheet');

// --- متغيرات الحالة ---
let currentVerse = null;        // { surahId, verseNum, text, tafsir }
let currentAudio = null;        // كائن الصوت الحالي
let pressTimer;
const PRESS_DURATION = 800;
let currentMode = 'quran';      // 'quran' | 'tafsir' | 'audio'
let currentSurahId = null;
let isDarkMode = false;
let fontSize = 1.8;

// --- تخزين محلي ---
const FAVORITES_KEY = 'quran_favorites';
const NOTES_KEY = 'quran_notes';
const FONT_SIZE_KEY = 'quran_font_size';
const DARK_MODE_KEY = 'quran_dark_mode';
const AUDIO_BASE_URL_KEY = 'audio_base_url';

function getFavorites() {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]'); } catch { return []; }
}
function setFavorites(favs) { localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs)); }
function isFavorite(surahId, verseNum) {
    return getFavorites().some(f => f.surahId === surahId && f.verseNum === verseNum);
}
function toggleFavorite(surahId, verseNum) {
    const favs = getFavorites();
    const idx = favs.findIndex(f => f.surahId === surahId && f.verseNum === verseNum);
    if (idx >= 0) favs.splice(idx, 1);
    else favs.push({ surahId, verseNum, addedAt: Date.now() });
    setFavorites(favs);
    return idx < 0;
}

function getNotes() {
    try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '{}'); } catch { return {}; }
}
function setNotes(notes) { localStorage.setItem(NOTES_KEY, JSON.stringify(notes)); }
function getNote(surahId, verseNum) {
    const key = `${surahId}:${verseNum}`;
    return getNotes()[key] || '';
}
function saveNote(surahId, verseNum, text) {
    const notes = getNotes();
    notes[`${surahId}:${verseNum}`] = text;
    setNotes(notes);
}

function getFontSize() {
    const saved = localStorage.getItem(FONT_SIZE_KEY);
    return saved ? parseFloat(saved) : 1.8;
}
function setFontSize(size) {
    fontSize = size;
    localStorage.setItem(FONT_SIZE_KEY, size);
    document.documentElement.style.setProperty('--font-size-quran', size + 'rem');
    document.documentElement.style.setProperty('--font-size-tafsir', (size * 0.61) + 'rem');
    if (fontSizeDisplay) fontSizeDisplay.textContent = size + 'rem';
}

function isDarkModeEnabled() {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    return saved === 'true';
}
function setDarkMode(enabled) {
    isDarkMode = enabled;
    localStorage.setItem(DARK_MODE_KEY, enabled);
    document.documentElement.setAttribute('data-theme', enabled ? 'dark' : 'light');
    if (darkModeBtn) darkModeBtn.textContent = enabled ? '☀️' : '🌙';
}

// --- البدء ---

function startApp() {
    welcomeScreen.classList.remove('active');
    showSections();
}

function backToWelcome() {
    sectionScreen.classList.remove('active');
    welcomeScreen.classList.add('active');
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function showSections() {
    sectionScreen.classList.add('active');
    renderSectionSurahs();
}

function backToSections() {
    readingScreen.classList.remove('active');
    stopAudio();
}

function showTafsirSection() {
    currentMode = 'tafsir';
    sectionScreen.classList.add('active');
    renderSectionSurahs();
    toggleMenu();
}

function showAudioSection() {
    currentMode = 'audio';
    sectionScreen.classList.add('active');
    renderSectionSurahs();
    toggleMenu();
}

function showQuranSection() {
    currentMode = 'quran';
    sectionScreen.classList.add('active');
    renderSectionSurahs();
    toggleMenu();
}

function showFavorites() {
    renderFavorites();
    favoritesOverlay.classList.add('active');
    favoritesSheet.classList.add('active');
    toggleMenu();
}

function closeFavorites() {
    favoritesOverlay.classList.remove('active');
    favoritesSheet.classList.remove('active');
}

function renderFavorites() {
    const favs = getFavorites();
    favList.innerHTML = '';
    if (favs.length === 0) {
        favList.innerHTML = '<p style="text-align:center; color:var(--text-light); margin-top:20px;">لا توجد آيات مفضلة</p>';
        return;
    }
    favs.forEach(fav => {
        const surah = surahsData.find(s => s[0] === fav.surahId);
        const item = document.createElement('div');
        item.className = 'fav-item';
        item.onclick = () => {
            closeFavorites();
            openSurah(surah ? surah[1] : 'سورة', fav.surahId, fav.verseNum);
        };
        item.innerHTML = `
            <div class="fav-surah">${surah ? surah[1] : 'غير معروفة'} - الآية ${fav.verseNum}</div>
            <div class="fav-verse">رقم السورة: ${fav.surahId}</div>
        `;
        favList.appendChild(item);
    });
}

// --- عرض السور حسب القسم ---
function renderSectionSurahs() {
    sectionSurahList.innerHTML = "";
    const searchQuery = sectionSearch ? sectionSearch.value : "";
    
    surahsData.forEach(surah => {
        const [id, name, verses, type] = surah;
        
        if (name.includes(searchQuery) || id.toString() === searchQuery) {
            const item = document.createElement('div');
            item.className = 'surah-item';
            item.onclick = () => openSurah(name, id);
            
            item.innerHTML = `
                <div class="surah-name">${name}</div>
                <div class="surah-info">${verses} آية - ${type}</div>
                <div class="surah-number">${id}</div>
            `;
            sectionSurahList.appendChild(item);
        }
    });
    
    if (sectionSurahList.innerHTML === "") {
        sectionSurahList.innerHTML = `<p style="text-align:center; color:var(--text-light); margin-top:20px;">لا توجد نتائج مطابقة</p>`;
    }
}

function filterSurahs(query) {
    renderSectionSurahs();
}

// --- فتح السورة ---
function openSurah(surahName, surahId, specificVerseNum = null) {
    currentSurahId = surahId;
    readingTitle.innerText = `سورة ${surahName}`;
    
    // تعيين شارة الوضع
    if (currentMode === 'quran') readingModeBadge.textContent = 'النص';
    else if (currentMode === 'tafsir') readingModeBadge.textContent = 'التفسير';
    else if (currentMode === 'audio') readingModeBadge.textContent = 'الصوتي';
    
    let contentHTML = "";
    
    if (quranData[surahId]) {
        quranData[surahId].verses.forEach((verse, index) => {
            const verseNum = index + 1;
            
            // إذا تم تحديد آية معينة، ن显示 فقط تلك الآية
            if (specificVerseNum && verseNum !== specificVerseNum) return;
            
            const isFav = isFavorite(surahId, verseNum);
            const favClass = isFav ? 'favorite' : '';
            
            if (currentMode === 'audio') {
                // في وضع الصوت، نعرض زر تشغيل لكل آية
                contentHTML += `
                    <div class="verse-item" style="padding:15px; border-bottom:1px solid var(--border-color);">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="flex:1;">
                                <div class="verse-number" style="margin:0 5px;">${verseNum}</div>
                                <div style="font-size:1.2rem; margin-top:5px;">${verse.text}</div>
                            </div>
                            <button onclick="playSingleVerseAudio(${surahId}, ${verseNum})" style="background:var(--primary-color); color:white; border:none; border-radius:8px; padding:8px 16px; cursor:pointer;">تشغيل</button>
                        </div>
                    </div>
                `;
            } else if (currentMode === 'tafsir') {
                // في وضع التفسير، نعرض التفسير فقط
                contentHTML += `
                    <span class="verse ${favClass}" 
                          data-surah="${surahId}" 
                          data-verse="${verseNum}" 
                          data-text="${escapeHtml(verse.text)}"
                          data-tafsir="${escapeHtml(verse.tafsir)}">
                        [${verseNum}] ${verse.tafsir || "لا يوجد تفسير"} 
                    </span> `;
            } else {
                // وضع النص القرآني العادي
                contentHTML += `
                    <span class="verse ${favClass}" 
                          data-surah="${surahId}" 
                          data-verse="${verseNum}" 
                          data-text="${escapeHtml(verse.text)}"
                          data-tafsir="${escapeHtml(verse.tafsir)}">
                        ${verse.text} <span class="verse-number">${verseNum}</span> 
                    </span> `;
            }
        });
    } else {
        contentHTML = `
            <p style="text-align:center; color:var(--text-light); margin-top:20px; font-family:'Tajawal';">(بيانات السورة غير متوفرة)</p>
        `;
    }
    
    quranTextContainer.innerHTML = contentHTML;
    
    if (currentMode !== 'audio') {
        attachLongPressEvents();
    }
    
    readingFooterText.textContent = `سورة ${surahName} - ${quranData[surahId] ? quranData[surahId].verses.length : 0} آية`;
    
    sectionScreen.classList.remove('active');
    readingScreen.classList.add('active');
}

// --- تشغيل آية واحدة صوتياً ---
function playSingleVerseAudio(surahId, verseNum) {
    const audioUrl = getAudioUrl(surahId, verseNum);
    stopAudio();
    try {
        currentAudio = new Audio(audioUrl);
        currentAudio.play().catch(err => {
            console.error('خطأ في تشغيل الصوت:', err);
            alert('لا يمكن تشغيل الملف الصوتي.\nتأكد من أن الرابط صحيح والملف موجود.');
        });
    } catch (err) {
        alert('خطأ في تشغيل الصوت: ' + err.message);
    }
}

// --- تجهيز الضغط المطول ---
function attachLongPressEvents() {
    const verses = document.querySelectorAll('.verse');
    
    verses.forEach(verse => {
        verse.addEventListener('touchstart', (e) => {
            verse.classList.add('pressing');
            pressTimer = setTimeout(() => {
                showVerseOptions(verse);
                if (navigator.vibrate) navigator.vibrate(50);
            }, PRESS_DURATION);
        });

        verse.addEventListener('touchend', (e) => {
            clearTimeout(pressTimer);
            verse.classList.remove('pressing');
        });

        verse.addEventListener('touchmove', () => {
            clearTimeout(pressTimer);
            verse.classList.remove('pressing');
        });

        verse.addEventListener('mousedown', (e) => {
            e.preventDefault(); 
            verse.classList.add('pressing');
            pressTimer = setTimeout(() => {
                showVerseOptions(verse);
            }, PRESS_DURATION);
        });

        verse.addEventListener('mouseup', () => {
            clearTimeout(pressTimer);
            verse.classList.remove('pressing');
        });

        verse.addEventListener('mouseleave', () => {
            clearTimeout(pressTimer);
            verse.classList.remove('pressing');
        });
        
        verse.addEventListener('contextmenu', (e) => e.preventDefault());
    });
}

// --- عرض قائمة خيارات الآية ---
function showVerseOptions(verseEl) {
    const surahId = parseInt(verseEl.getAttribute('data-surah'));
    const verseNum = parseInt(verseEl.getAttribute('data-verse'));
    const text = verseEl.getAttribute('data-text');
    const tafsir = verseEl.getAttribute('data-tafsir');
    
    currentVerse = { surahId, verseNum, text, tafsir };
    
    const isFav = isFavorite(surahId, verseNum);
    
    verseOptionsSheet.innerHTML = `
        <div class="options-handle"></div>
        <div class="options-title">اختر إجراءً للآية ${verseNum}</div>
        <div class="options-grid">
            <button class="option-btn" onclick="playAudioTafsir()">
                <span class="icon">🔊</span><span>تفسير صوتي</span>
            </button>
            <button class="option-btn" onclick="openAudioRange()">
                <span class="icon">🎵</span><span>إستماع إلى...</span>
            </button>
            <button class="option-btn" onclick="playVerseOnly()">
                <span class="icon">▶️</span><span>إستماع الآية</span>
            </button>
            <button class="option-btn" onclick="showTextTafsir()">
                <span class="icon">📖</span><span>تفسير (نص)</span>
            </button>
            <button class="option-btn" onclick="openNotes()">
                <span class="icon">📝</span><span>ملاحظة</span>
            </button>
            <button class="option-btn" onclick="toggleFavoriteVerse()">
                <span class="icon" id="fav-icon">${isFav ? '⭐' : '☆'}</span><span id="fav-text">${isFav ? 'إزالة من المفضلة' : 'تفضيل'}</span>
            </button>
            <button class="option-btn" onclick="showVerseDetails()">
                <span class="icon">ℹ️</span><span>تفاصيل الآية</span>
            </button>
            <button class="option-btn" onclick="shareVerse()">
                <span class="icon">📤</span><span>مشاركة</span>
            </button>
            <button class="option-btn" onclick="copyVerse()">
                <span class="icon">📋</span><span>نسخ</span>
            </button>
            <button class="option-btn" onclick="downloadAudio()">
                <span class="icon">⬇️</span><span>تحميل صوتي</span>
            </button>
        </div>
    `;
    
    verseOptionsOverlay.classList.add('active');
    verseOptionsSheet.classList.add('active');
}

function closeVerseOptions() {
    verseOptionsOverlay.classList.remove('active');
    verseOptionsSheet.classList.remove('active');
}

// ============================================================================
// الميزة 1: التفسير الصوتي (MP3)
// ============================================================================
function playAudioTafsir() {
    if (!currentVerse) return;
    
    closeVerseOptions();
    
    const audioUrl = getAudioUrl(currentVerse.surahId, currentVerse.verseNum);
    
    stopAudio();
    
    try {
        currentAudio = new Audio(audioUrl);
        currentAudio.play().catch(err => {
            console.error('خطأ في تشغيل الصوت:', err);
            alert('لا يمكن تشغيل الملف الصوتي.\nتأكد من أن الرابط صحيح والملف موجود.');
        });
        
        currentAudio.addEventListener('ended', () => {
            currentAudio = null;
        });
    } catch (err) {
        alert('خطأ في تشغيل الصوت: ' + err.message);
    }
}

// ============================================================================
// الميزة 2: الاستماع المتقدم (نطاق)
// ============================================================================
function openAudioRange() {
    if (!currentVerse) return;
    
    closeVerseOptions();
    
    const surahId = currentVerse.surahId;
    const totalVerses = quranData[surahId] ? quranData[surahId].verses.length : 1;
    
    audioRangeSheet.innerHTML = `
        <div class="range-title">إستماع من الآية ${currentVerse.verseNum} إلى</div>
        <div class="range-labels">
            <span>الآية ${currentVerse.verseNum}</span>
            <span>الآية ${totalVerses}</span>
        </div>
        <input type="range" class="range-input" id="range-end-slider" min="${currentVerse.verseNum}" max="${totalVerses}" value="${totalVerses}">
        <div class="range-controls">
            <label>من الآية:</label>
            <input type="number" id="range-start" min="1" max="${totalVerses}" value="${currentVerse.verseNum}">
            <label>إلى الآية:</label>
            <input type="number" id="range-end-input" min="1" max="${totalVerses}" value="${totalVerses}">
        </div>
        <button class="range-btn" onclick="startRangeAudio()">بدء التشغيل</button>
        <button class="range-btn" style="background-color: var(--text-light);" onclick="closeAudioRange()">إلغاء</button>
    `;
    
    audioRangeOverlay.classList.add('active');
    audioRangeSheet.classList.add('active');
}

function closeAudioRange() {
    audioRangeOverlay.classList.remove('active');
    audioRangeSheet.classList.remove('active');
}

function startRangeAudio() {
    const startInput = document.getElementById('range-start');
    const endInput = document.getElementById('range-end-input');
    const startVerse = parseInt(startInput.value);
    const endVerse = parseInt(endInput.value);
    
    if (startVerse > endVerse) {
        alert('الآية البداية يجب أن تكون أصغر من الآية النهاية');
        return;
    }
    
    closeAudioRange();
    stopAudio();
    
    playRangeVerses(currentVerse.surahId, startVerse, endVerse);
}

async function playRangeVerses(surahId, startVerse, endVerse) {
    for (let v = startVerse; v <= endVerse; v++) {
        const audioUrl = getAudioUrl(surahId, v);
        await playSingleAudio(audioUrl);
    }
}

function playSingleAudio(audioUrl) {
    return new Promise((resolve, reject) => {
        stopAudio();
        try {
            currentAudio = new Audio(audioUrl);
            currentAudio.play().catch(reject);
            currentAudio.addEventListener('ended', () => {
                currentAudio = null;
                resolve();
            }, { once: true });
            currentAudio.addEventListener('error', reject);
        } catch (err) {
            reject(err);
        }
    });
}

// ============================================================================
// الميزة 3: تشغيل الآية فقط
// ============================================================================
function playVerseOnly() {
    if (!currentVerse) return;
    closeVerseOptions();
    playAudioTafsir();
}

// ============================================================================
// الميزة 4: تفسير النص
// ============================================================================
function showTextTafsir() {
    if (!currentVerse) return;
    closeVerseOptions();
    
    tafsirText.innerText = currentVerse.tafsir || "لا يوجد تفسير متاح لهذه الآية.";
    tafsirOverlay.classList.add('active');
    tafsirSheet.classList.add('active');
}

function closeTafsir() {
    tafsirOverlay.classList.remove('active');
    tafsirSheet.classList.remove('active');
}

// ============================================================================
// الميزة 5: الملاحظات
// ============================================================================
function openNotes() {
    if (!currentVerse) return;
    closeVerseOptions();
    
    const savedNote = getNote(currentVerse.surahId, currentVerse.verseNum);
    notesTextarea.value = savedNote;
    
    notesOverlay.classList.add('active');
    notesSheet.classList.add('active');
}

function closeNotes() {
    notesOverlay.classList.remove('active');
    notesSheet.classList.remove('active');
}

function saveNoteVerse() {
    if (!currentVerse) return;
    saveNote(currentVerse.surahId, currentVerse.verseNum, notesTextarea.value);
    closeNotes();
    alert('تم حفظ الملاحظة بنجاح');
}

// ============================================================================
// الميزة 6: المفضلة
// ============================================================================
function toggleFavoriteVerse() {
    if (!currentVerse) return;
    
    const added = toggleFavorite(currentVerse.surahId, currentVerse.verseNum);
    closeVerseOptions();
    
    const favIcon = document.getElementById('fav-icon');
    const favText = document.getElementById('fav-text');
    if (favIcon) favIcon.textContent = added ? '⭐' : '☆';
    if (favText) favText.textContent = added ? 'إزالة من المفضلة' : 'تفضيل';
    
    alert(added ? 'تمت إضافة الآية إلى المفضلة' : 'تمت إزالة الآية من المفضلة');
}

// ============================================================================
// الميزة 7: تفاصيل الآية
// ============================================================================
function showVerseDetails() {
    if (!currentVerse) return;
    closeVerseOptions();
    
    const surah = surahsData.find(s => s[0] === currentVerse.surahId);
    const juz = calculateJuz(currentVerse.surahId, currentVerse.verseNum);
    const hizb = calculateHizb(currentVerse.surahId, currentVerse.verseNum);
    const page = calculatePage(currentVerse.surahId, currentVerse.verseNum);
    
    document.getElementById('detail-surah').textContent = surah ? surah[1] : 'غير معروفة';
    document.getElementById('detail-surah-id').textContent = currentVerse.surahId;
    document.getElementById('detail-verse').textContent = currentVerse.verseNum;
    document.getElementById('detail-juz').textContent = juz;
    document.getElementById('detail-hizb').textContent = hizb;
    document.getElementById('detail-page').textContent = page;
    
    verseDetailsOverlay.classList.add('active');
    verseDetailsSheet.classList.add('active');
}

function closeVerseDetails() {
    verseDetailsOverlay.classList.remove('active');
    verseDetailsSheet.classList.remove('active');
}

function calculateJuz(surahId, verseNum) {
    const cumulative = [0, 7, 293, 493, 669, 789, 954, 1119, 1194, 1323, 1432, 1555, 1678, 1721, 1773, 1824, 1906, 1998, 2051, 2129, 2194, 2249, 2295, 2348, 2420, 2503, 2586, 2655, 2708, 2771, 2839, 2907, 2974, 3047, 3124, 3206, 3282, 3362, 3410, 3458, 3502, 3555, 3625, 3678, 3714, 3761, 3815, 3860, 3904, 3950, 3992, 4037, 4084, 4128, 4166, 4205, 4237, 4270, 4306, 4335, 4363, 4391, 4419, 4446, 4470, 4494, 4518, 4542, 4564, 4585, 4606, 4627, 4648, 4669, 4690, 4711, 4732, 4753, 4774, 4795, 4816, 4837, 4858, 4879, 4900, 4921, 4942, 4963, 4984, 5005, 5026, 5047, 5068, 5089, 5110, 5131, 5152, 5173, 5194, 5215, 5236, 5257, 5278, 5299, 5320, 5341, 5362, 5383, 5404, 5425, 5446, 5467, 5488, 5509, 5530, 5551, 5572, 5593, 5614, 5635, 5656, 5677, 5698, 5719, 5740, 5761, 5782, 5803, 5824, 5845, 5866, 5887, 5908, 5929, 5950, 5971, 5992, 6013, 6034, 6055, 6076, 6097, 6118, 6139, 6160, 6181, 6202, 6223];
    let juz = 30;
    for (let i = 1; i < cumulative.length; i++) {
        const verseIndex = getGlobalVerseIndex(surahId, verseNum);
        if (verseIndex <= cumulative[i]) {
            juz = i;
            break;
        }
    }
    return juz;
}

function calculateHizb(surahId, verseNum) {
    const juz = calculateJuz(surahId, verseNum);
    return Math.ceil(juz / 2) || 1;
}

function calculatePage(surahId, verseNum) {
    const cumulative = [0, 7, 293, 493, 669, 789, 954, 1119, 1194, 1323, 1432, 1555, 1678, 1721, 1773, 1824, 1906, 1998, 2051, 2129, 2194, 2249, 2295, 2348, 2420, 2503, 2586, 2655, 2708, 2771, 2839, 2907, 2974, 3047, 3124, 3206, 3282, 3362, 3410, 3458, 3502, 3555, 3625, 3678, 3714, 3761, 3815, 3860, 3904, 3950, 3992, 4037, 4084, 4128, 4166, 4205, 4237, 4270, 4306, 4335, 4363, 4391, 4419, 4446, 4470, 4494, 4518, 4542, 4564, 4585, 4606, 4627, 4648, 4669, 4690, 4711, 4732, 4753, 4774, 4795, 4816, 4837, 4858, 4879, 4900, 4921, 4942, 4963, 4984, 5005, 5026, 5047, 5068, 5089, 5110, 5131, 5152, 5173, 5194, 5215, 5236, 5257, 5278, 5299, 5320, 5341, 5362, 5383, 5404, 5425, 5446, 5467, 5488, 5509, 5530, 5551, 5572, 5593, 5614, 5635, 5656, 5677, 5698, 5719, 5740, 5761, 5782, 5803, 5824, 5845, 5866, 5887, 5908, 5929, 5950, 5971, 5992, 6013, 6034, 6055, 6076, 6097, 6118, 6139, 6160, 6181, 6202, 6223];
    const globalIndex = getGlobalVerseIndex(surahId, verseNum);
    return Math.floor(globalIndex / 20) + 1;
}

function getGlobalVerseIndex(surahId, verseNum) {
    let index = 0;
    for (let i = 1; i < surahId; i++) {
        index += (quranData[i] ? quranData[i].verses.length : 0);
    }
    return index + verseNum;
}

// ============================================================================
// الميزة 8: المشاركة
// ============================================================================
function shareVerse() {
    if (!currentVerse) return;
    closeVerseOptions();
    
    const shareText = `سورة ${currentVerse.surahId} - الآية ${currentVerse.verseNum}\n\n${currentVerse.text}\n\nالتفسير: ${currentVerse.tafsir || 'غير متوفر'}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'القرآن الكريم - تقريب القرآن',
            text: shareText,
            url: window.location.href
        }).catch(err => console.log('خطأ في المشاركة:', err));
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = shareText;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('تم نسخ النص للمشاركة');
    }
}

// ============================================================================
// الميزة 9: النسخ
// ============================================================================
function copyVerse() {
    if (!currentVerse) return;
    closeVerseOptions();
    
    const textToCopy = `${currentVerse.text}\n\n(سورة ${currentVerse.surahId} - الآية ${currentVerse.verseNum})`;
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            alert('تم نسخ نص الآية إلى الحافظة');
        }).catch(() => {
            fallbackCopyTextToClipboard(textToCopy);
        });
    } else {
        fallbackCopyTextToClipboard(textToCopy);
    }
}

function fallbackCopyTextToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        alert('تم نسخ نص الآية إلى الحافظة');
    } catch (err) {
        alert('لا يمكن النسخ. يرجى النسخ يدوياً.');
    }
    document.body.removeChild(textArea);
}

// ============================================================================
// الميزة 10: تحميل الملف الصوتي
// ============================================================================
function downloadAudio() {
    if (!currentVerse) return;
    closeVerseOptions();
    
    const audioUrl = getAudioUrl(currentVerse.surahId, currentVerse.verseNum);
    
    const link = document.createElement('a');
    link.href = audioUrl;
    link.download = `سورة_${currentVerse.surahId}_آية_${currentVerse.verseNum}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert('جاري تحميل الملف الصوتي للآية ' + currentVerse.verseNum);
}

// ============================================================================
// الميزة 11: التحكم في حجم النص والوضع الليلي
// ============================================================================
function increaseFontSize() {
    if (fontSize < 3.0) {
        setFontSize(fontSize + 0.2);
    }
}

function decreaseFontSize() {
    if (fontSize > 1.0) {
        setFontSize(fontSize - 0.2);
    }
}

function toggleDarkMode() {
    setDarkMode(!isDarkMode);
}

// ============================================================================
// الإعدادات
// ============================================================================
function openSettings() {
    audioUrlInput.value = AUDIO_BASE_URL;
    fontSizeDisplay.textContent = fontSize + 'rem';
    settingsOverlay.classList.add('active');
    settingsSheet.classList.add('active');
    toggleMenu();
}

function closeSettings() {
    settingsOverlay.classList.remove('active');
    settingsSheet.classList.remove('active');
}

function resetSettings() {
    setFontSize(1.8);
    setDarkMode(false);
    AUDIO_BASE_URL = "https://YOUR_AUDIO_SERVER/audio/";
    audioUrlInput.value = AUDIO_BASE_URL;
    localStorage.setItem(AUDIO_BASE_URL_KEY, AUDIO_BASE_URL);
    alert('تم إعادة الضبط الإعدادات الافتراضية');
}

function saveAudioUrl() {
    const url = audioUrlInput.value.trim();
    if (url) {
        AUDIO_BASE_URL = url;
        localStorage.setItem(AUDIO_BASE_URL_KEY, url);
        alert('تم حفظ الرابط الصوتي');
    }
}

// --- دوال مساعدة ---
function stopAudio() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
    }
}

function escapeHtml(text) {
    if (!text) return '';
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getAudioUrl(surahId, verseNum) {
    const pattern = AUDIO_FILE_PATTERN
        .replace('{surahId}', surahId)
        .replace('{verseNum}', verseNum);
    return AUDIO_BASE_URL + pattern;
}

// --- إجراء الزر العائم ---
function fabAction() {
    if (currentMode === 'audio') {
        // في وضع الصوت، نبدأ تشغيل السورة كاملة من البداية
        if (currentSurahId) {
            stopAudio();
            playRangeVerses(currentSurahId, 1, quranData[currentSurahId] ? quranData[currentSurahId].verses.length : 1);
        }
    } else {
        // في وضع النص، ن显示 التفسير للآية الحالية إذا كانت محددة
        if (currentVerse) {
            showTextTafsir();
        } else {
            alert('الرجاء اختيار آية أولاً');
        }
    }
}

// --- إغلاق النوافذ عند النقر خارجها ---
window.onclick = function(event) {
    if (event.target.classList.contains('custom-modal')) {
        event.target.classList.remove('active');
    }
    if (event.target === verseOptionsOverlay) {
        closeVerseOptions();
    }
    if (event.target === audioRangeOverlay) {
        closeAudioRange();
    }
    if (event.target === notesOverlay) {
        closeNotes();
    }
    if (event.target === verseDetailsOverlay) {
        closeVerseDetails();
    }
    if (event.target === favoritesOverlay) {
        closeFavorites();
    }
    if (event.target === settingsOverlay) {
        closeSettings();
    }
}

// --- تهيئة التطبيق عند التحميل ---
window.addEventListener('DOMContentLoaded', () => {
    // استعادة الإعدادات المحفوظة
    setFontSize(getFontSize());
    setDarkMode(isDarkModeEnabled());
    
    // استعادة رابط الصوت
    const savedUrl = localStorage.getItem(AUDIO_BASE_URL_KEY);
    if (savedUrl) {
        AUDIO_BASE_URL = savedUrl;
    }
    if (audioUrlInput) {
        audioUrlInput.value = AUDIO_BASE_URL;
    }
    
    // إظهار صفحة الترحيب
    welcomeScreen.classList.add('active');
});
