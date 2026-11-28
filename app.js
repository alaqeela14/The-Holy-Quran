// الصوت الكامل للسورة يُحمّل من CDN موثوق عند فتح قسم الصوت.
const SURAH_AUDIO_BASE = 'https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/';
const SURAH_AUDIO_FALLBACK = 'https://github.com/The-Quran-Project/Quran-Audio-Chapters/raw/refs/heads/main/Data/1/';

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

// --- خيارات الآية ---
const verseOptionsOverlay = document.getElementById('verse-options-overlay');
const verseOptionsSheet = document.getElementById('verse-options-sheet');

// --- نوافذ مختلفة ---
const tafsirOverlay = document.getElementById('tafsir-overlay');
const tafsirSheet = document.getElementById('tafsir-sheet');
const tafsirText = document.getElementById('tafsir-text');

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
let fontSize = 1.45;
let isRestoringHistory = false;
let pressTarget = null;
let surahRenderToken = 0;

// --- تخزين محلي ---
const FAVORITES_KEY = 'quran_favorites';
const NOTES_KEY = 'quran_notes';
const FONT_SIZE_KEY = 'quran_font_size';
const DARK_MODE_KEY = 'quran_dark_mode';

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
    const saved = parseFloat(localStorage.getItem(FONT_SIZE_KEY));
    // ترحيل الحجم الافتراضي القديم الكبير إلى حجم أنسب للهاتف.
    if (!Number.isFinite(saved) || saved === 1.8 || saved === 1.45) return 1.3;
    return Math.min(2.4, Math.max(1.1, saved));
}
function setFontSize(size) {
    fontSize = Math.min(2.4, Math.max(1.1, Number(size) || 1.3));
    localStorage.setItem(FONT_SIZE_KEY, fontSize);
    document.documentElement.style.setProperty('--font-size-quran', fontSize + 'rem');
    document.documentElement.style.setProperty('--font-size-tafsir', Math.max(0.95, fontSize * 0.76) + 'rem');
    if (fontSizeDisplay) fontSizeDisplay.textContent = Number(fontSize.toFixed(2)) + 'rem';
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


function closeMenuIfOpen() {
    const sidebar=document.getElementById('sidebar');
    const overlay=document.getElementById('sidebar-overlay');
    if (sidebar && sidebar.classList.contains('active')) sidebar.classList.remove('active');
    if (overlay && overlay.classList.contains('active')) overlay.classList.remove('active');
}

// --- سجل التنقل: دعم زر الرجوع في Android والمتصفح ---
function saveNavigationState(state) {
    if (!isRestoringHistory && window.history && window.history.pushState) {
        window.history.pushState(state, '', window.location.href);
    }
}

function closeTransientPanels() {
    const pairs = [
        [verseOptionsOverlay, verseOptionsSheet],
        [tafsirOverlay, tafsirSheet],
        [notesOverlay, notesSheet],
        [verseDetailsOverlay, verseDetailsSheet],
        [favoritesOverlay, favoritesSheet],
        [settingsOverlay, settingsSheet]
    ];
    pairs.forEach(([overlay, panel]) => {
        if (overlay) overlay.classList.remove('active');
        if (panel) panel.classList.remove('active');
    });
    closeMenuIfOpen();
}

window.addEventListener('popstate', (event) => {
    const route = event.state || { screen: 'welcome' };
    isRestoringHistory = true;
    closeTransientPanels();

    if (route.screen === 'reading') {
        currentMode = route.mode || 'quran';
        const surah = surahsData.find(item => item[0] === route.surahId);
        if (surah) openSurah(surah[1], route.surahId, route.verseNum || null);
    } else if (route.screen === 'section') {
        readingScreen.classList.remove('active');
        welcomeScreen.classList.remove('active');
        sectionScreen.classList.add('active');
        currentMode = route.mode || 'quran';
        renderSectionSurahs();
        stopAudio();
    } else {
        readingScreen.classList.remove('active');
        sectionScreen.classList.remove('active');
        welcomeScreen.classList.add('active');
        stopAudio();
    }
    isRestoringHistory = false;
});

window.addEventListener('DOMContentLoaded', () => {
    if (!window.history.state || !window.history.state.screen) {
        window.history.replaceState({ screen: 'welcome' }, '', window.location.href);
    }
});

// --- البدء ---

function startApp() {
    welcomeScreen.classList.remove('active');
    showSections();
}

function enterWelcomeSection(section) {
    welcomeScreen.classList.remove('active');
    if (section === 'tafsir') showTafsirSection();
    else if (section === 'audio') showAudioSection();
    else showQuranSection();
}

function backToWelcome() {
    if (window.history.state && window.history.state.screen !== 'welcome') {
        window.history.back();
        return;
    }
    sectionScreen.classList.remove('active');
    readingScreen.classList.remove('active');
    welcomeScreen.classList.add('active');
}

function toggleMenu() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function showSections() {
    currentMode = 'quran';
    saveNavigationState({ screen: 'section', mode: 'quran' });
    sectionScreen.classList.add('active');
    renderSectionSurahs();
    closeMenuIfOpen();
}

function backToSections() {
    if (window.history.state && window.history.state.screen === 'reading') {
        window.history.back();
        return;
    }
    readingScreen.classList.remove('active');
    sectionScreen.classList.add('active');
    setFabVisibility(true);
    stopAudio();
}

function showTafsirSection() {
    currentMode = 'tafsir';
    saveNavigationState({ screen: 'section', mode: 'tafsir' });
    sectionScreen.classList.add('active');
    renderSectionSurahs();
    closeMenuIfOpen();
}

function showAudioSection() {
    currentMode = 'audio';
    saveNavigationState({ screen: 'section', mode: 'audio' });    sectionScreen.classList.add('active');
    renderSectionSurahs();
    closeMenuIfOpen();
}

function showQuranSection() {
    currentMode = 'quran';
    saveNavigationState({ screen: 'section', mode: 'quran' });
    sectionScreen.classList.add('active');
    renderSectionSurahs();
    closeMenuIfOpen();
}

function showFavorites() {
    renderFavorites();
    favoritesOverlay.classList.add('active');
    favoritesSheet.classList.add('active');
    setFabVisibility(false);
    toggleMenu();
}

function closeFavorites() {
    favoritesOverlay.classList.remove('active');
    favoritesSheet.classList.remove('active');
    setFabVisibility(true);
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

// --- البحث الشامل في أسماء السور والآيات والتفسير ---
function normalizeSearchText(value) {
    return String(value || '')
        .normalize('NFKD')
        .replace(/[\u064B-\u065F\u0670\u0640]/g, '')
        .replace(/[إأآٱ]/g, 'ا')
        .replace(/ى/g, 'ي')
        .toLowerCase()
        .trim();
}

function openSearchScreen() {
    welcomeScreen.classList.remove('active');
    sectionScreen.classList.remove('active');
    readingScreen.classList.remove('active');
    document.getElementById('search-screen').classList.add('active');
    closeMenuIfOpen();
    const input = document.getElementById('global-search-input');
    const results = document.getElementById('search-results');
    if (input) input.value = '';
    if (results) results.innerHTML = '<p class="search-hint">اكتب كلمة أو عبارة للبحث في القرآن الكريم والتفسير.</p>';
    if (input) input.focus();
}

function closeSearchScreen() {
    document.getElementById('search-screen').classList.remove('active');
    welcomeScreen.classList.add('active');
}

function executeSearch(rawQuery) {
    const results = document.getElementById('search-results');
    if (!results) return;
    const query = normalizeSearchText(rawQuery);
    results.innerHTML = '';
    if (!query) {
        results.innerHTML = '<p class="search-hint">اكتب كلمة أو عبارة للبحث في القرآن الكريم والتفسير.</p>';
        return;
    }

    const fragment = document.createDocumentFragment();
    let count = 0;
    const maxResults = 100;
    const addResult = (title, snippet, type, surahId, verseNum, mode) => {
        if (count >= maxResults) return;
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'search-result';
        const heading = document.createElement('div');
        heading.className = 'search-result-title';
        heading.textContent = title;
        const body = document.createElement('div');
        body.className = 'search-result-snippet';
        body.textContent = String(snippet || '').slice(0, 190);
        const label = document.createElement('div');
        label.className = 'search-result-type';
        label.textContent = type;
        item.append(heading, body, label);
        item.addEventListener('click', () => {
            const surah = surahsData.find(entry => Number(entry[0]) === Number(surahId));
            if (!surah) return;
            currentMode = mode;
            document.getElementById('search-screen').classList.remove('active');
            openSurah(surah[1], Number(surahId), verseNum || 1);
        });
        fragment.appendChild(item);
        count++;
    };

    surahsData.forEach(([id, name]) => {
        if (count < maxResults && normalizeSearchText(name).includes(query)) {
            addResult(`سورة ${name}`, `الانتقال إلى سورة ${name}`, 'اسم سورة', id, 1, 'quran');
        }
    });

    Object.keys(quranData || {}).forEach(id => {
        if (count >= maxResults) return;
        const data = quranData[id];
        if (!data || !Array.isArray(data.verses)) return;
        const surah = surahsData.find(entry => Number(entry[0]) === Number(id));
        const surahName = surah ? surah[1] : `السورة ${id}`;
        data.verses.forEach((verse, index) => {
            if (count >= maxResults) return;
            if (normalizeSearchText(verse.text).includes(query)) {
                addResult(`${surahName} - الآية ${index + 1}`, verse.text, 'نتيجة في نص القرآن', id, index + 1, 'quran');
            }
            if (count < maxResults && normalizeSearchText(verse.tafsir).includes(query)) {
                addResult(`${surahName} - الآية ${index + 1}`, verse.tafsir, 'نتيجة في التفسير', id, index + 1, 'tafsir');
            }
        });
    });

    if (count === 0) {
        results.innerHTML = '<p class="search-hint">لم نعثر على نتائج مطابقة.</p>';
    } else {
        results.appendChild(fragment);
        if (count === maxResults) {
            const note = document.createElement('p');
            note.className = 'search-hint';
            note.textContent = 'عُرضت أول 100 نتيجة. أضف كلمات أكثر لتضييق البحث.';
            results.appendChild(note);
        }
    }
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
    saveNavigationState({ screen: 'reading', mode: currentMode, surahId, verseNum: specificVerseNum || null });
    readingTitle.innerText = `سورة ${surahName}`;

    if (currentMode === 'quran') readingModeBadge.textContent = 'النص';
    else if (currentMode === 'tafsir') readingModeBadge.textContent = 'التفسير';
    else if (currentMode === 'audio') readingModeBadge.textContent = 'الصوتي';

    quranTextContainer.classList.toggle('mode-tafsir', currentMode === 'tafsir');
    quranTextContainer.innerHTML = '';
    sectionScreen.classList.remove('active');
    readingScreen.classList.add('active');

    const renderToken = ++surahRenderToken;
    const surahData = quranData[surahId];
    if (!surahData || !Array.isArray(surahData.verses)) {
        quranTextContainer.innerHTML = '<p style="text-align:center;color:var(--text-light);margin-top:20px;font-family:Tajawal;">(بيانات السورة غير متوفرة)</p>';
        readingFooterText.textContent = `سورة ${surahName} - 0 آية`;
        return;
    }

    const verses = surahData.verses;
    if (currentMode === 'audio') {
        const audioUrl = SURAH_AUDIO_BASE + surahId + '.mp3';
        const fallbackUrl = SURAH_AUDIO_FALLBACK + surahId + '.mp3';
        quranTextContainer.innerHTML = `
            <section class="audio-surah-card" aria-label="مشغل سورة ${escapeHtml(surahName)}">
                <h2>تلاوة سورة ${escapeHtml(surahName)}</h2>
                <p class="audio-reciter">القارئ: مشاري راشد العفاسي</p>
                <audio id="surah-audio-player" preload="metadata" playsinline>
                    <source src="${audioUrl}" type="audio/mpeg">
                    متصفحك لا يدعم تشغيل الصوت.
                </audio>
                <div class="surah-audio-controls">
                    <button type="button" class="audio-skip-btn" onclick="seekSurahAudio(-10)" aria-label="استرجاع عشر ثوان">−10</button>
                    <button type="button" class="audio-play-btn" id="surah-audio-toggle" onclick="toggleSurahAudio()">تشغيل</button>
                    <button type="button" class="audio-skip-btn" onclick="seekSurahAudio(10)" aria-label="تقديم عشر ثوان">+10</button>
                </div>
                <input class="audio-progress" id="surah-audio-progress" type="range" min="0" max="1000" value="0" step="1" aria-label="موضع التلاوة" oninput="seekSurahAudioTo(this.value)">
                <div class="audio-time-row"><span id="surah-audio-current">00:00</span><span id="surah-audio-duration">--:--</span></div>
                <p id="surah-audio-status" class="audio-status" role="status">جاهز للتشغيل</p>
            </section>`;
        currentAudio = document.getElementById('surah-audio-player');
        let fallbackTried = false;
        currentAudio.addEventListener('loadedmetadata', updateSurahAudioProgress);
        currentAudio.addEventListener('timeupdate', updateSurahAudioProgress);
        currentAudio.addEventListener('play', () => {
            const button = document.getElementById('surah-audio-toggle');
            if (button) button.textContent = 'إيقاف مؤقت';
            const status = document.getElementById('surah-audio-status');
            if (status) status.textContent = 'التلاوة قيد التشغيل';
        });
        currentAudio.addEventListener('pause', () => {
            const button = document.getElementById('surah-audio-toggle');
            if (button) button.textContent = 'استئناف';
        });
        currentAudio.addEventListener('ended', () => {
            const button = document.getElementById('surah-audio-toggle');
            if (button) button.textContent = 'إعادة التشغيل';
            const status = document.getElementById('surah-audio-status');
            if (status) status.textContent = 'اكتملت تلاوة السورة';
        });
        currentAudio.addEventListener('error', () => {
            if (!fallbackTried && currentAudio) {
                fallbackTried = true;
                currentAudio.src = fallbackUrl;
                currentAudio.load();
                const status = document.getElementById('surah-audio-status');
                if (status) status.textContent = 'جارٍ تجربة مصدر صوتي بديل...';
                return;
            }
            const status = document.getElementById('surah-audio-status');
            if (status) status.textContent = 'تعذر تحميل التلاوة من المصدرين. تحقق من اتصال الإنترنت.';
        });
        readingFooterText.textContent = `سورة ${surahName} - ${verses.length} آية`;
        const fab = document.getElementById('fab-btn');
        if (fab) fab.style.display = 'none';
        return;
    }
    const favorites = new Set(getFavorites().map(item => `${item.surahId}:${item.verseNum}`));
    const firstIndex = 0;
    const lastIndex = verses.length;
    const batchSize = 40;

    function renderBatch() {
        if (renderToken !== surahRenderToken) return;
        const batchEnd = Math.min(firstIndex + batchSize + (renderBatch.offset || 0), lastIndex);
        let html = '';
        for (let index = firstIndex + (renderBatch.offset || 0); index < batchEnd; index++) {
            const verse = verses[index];
            const verseNum = index + 1;
            const favClass = favorites.has(`${surahId}:${verseNum}`) ? 'favorite' : '';

            if (currentMode === 'tafsir') {
                html += `
                    <span class="verse ${favClass}"
                          data-surah="${surahId}"
                          data-verse="${verseNum}"
                          data-text="${escapeHtml(verse.text)}"
                          data-tafsir="${escapeHtml(verse.tafsir)}">[${verseNum}] ${verse.tafsir || "لا يوجد تفسير"} </span> `;
            } else {
                html += `
                    <span class="verse ${favClass}"
                          data-surah="${surahId}"
                          data-verse="${verseNum}"
                          data-text="${escapeHtml(verse.text)}"
                          data-tafsir="${escapeHtml(verse.tafsir)}">${verse.text} <span class="verse-number">${verseNum}</span> </span> `;
            }
        }

        if (html) quranTextContainer.insertAdjacentHTML('beforeend', html);
        renderBatch.offset = (renderBatch.offset || 0) + (batchEnd - (firstIndex + (renderBatch.offset || 0)));
        if (firstIndex + renderBatch.offset < lastIndex) {
            requestAnimationFrame(renderBatch);
        } else if (specificVerseNum) {
            requestAnimationFrame(() => {
                const targetVerse = quranTextContainer.querySelector(`.verse[data-verse="${specificVerseNum}"]`);
                if (targetVerse) targetVerse.scrollIntoView({ behavior: 'smooth', block: 'center' });
            });
        }
    }

    renderBatch.offset = 0;
    if (currentMode !== 'audio') attachLongPressEvents();
    requestAnimationFrame(renderBatch);
    readingFooterText.textContent = `سورة ${surahName} - ${verses.length} آية`;
}

// --- تجهيز الضغط المطول ---
function attachLongPressEvents() {
    // ربط الأحداث مرة واحدة بالحاوية بدلاً من إنشاء عدة مستمعات لكل آية.
    if (quranTextContainer.dataset.longPressBound === 'true') return;
    quranTextContainer.dataset.longPressBound = 'true';

    const findVerse = (target) => target && target.closest ? target.closest('.verse') : null;
    const cancelPress = () => {
        clearTimeout(pressTimer);
        if (pressTarget) pressTarget.classList.remove('pressing');
        pressTarget = null;
    };

    quranTextContainer.addEventListener('touchstart', (event) => {
        const verse = findVerse(event.target);
        if (!verse) return;
        cancelPress();
        pressTarget = verse;
        verse.classList.add('pressing');
        pressTimer = setTimeout(() => {
            showVerseOptions(verse);
            if (navigator.vibrate) navigator.vibrate(35);
        }, PRESS_DURATION);
    }, { passive: true });

    quranTextContainer.addEventListener('touchend', cancelPress, { passive: true });
    quranTextContainer.addEventListener('touchcancel', cancelPress, { passive: true });
    quranTextContainer.addEventListener('touchmove', cancelPress, { passive: true });

    quranTextContainer.addEventListener('mousedown', (event) => {
        const verse = findVerse(event.target);
        if (!verse) return;
        cancelPress();
        pressTarget = verse;
        verse.classList.add('pressing');
        pressTimer = setTimeout(() => showVerseOptions(verse), PRESS_DURATION);
    });
    quranTextContainer.addEventListener('mouseup', cancelPress);
    quranTextContainer.addEventListener('mouseleave', cancelPress);
    quranTextContainer.addEventListener('contextmenu', (event) => {
        if (findVerse(event.target)) event.preventDefault();
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
        </div>
    `;
    
    verseOptionsOverlay.classList.add('active');
    verseOptionsSheet.classList.add('active');
    setFabVisibility(false);
}

function closeVerseOptions() {
    verseOptionsOverlay.classList.remove('active');
    verseOptionsSheet.classList.remove('active');
    setFabVisibility(true);
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
    setFabVisibility(false);
}

function closeTafsir() {
    tafsirOverlay.classList.remove('active');
    tafsirSheet.classList.remove('active');
    setFabVisibility(true);
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
    setFabVisibility(false);
}

function closeNotes() {
    notesOverlay.classList.remove('active');
    notesSheet.classList.remove('active');
    setFabVisibility(true);
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
    setFabVisibility(false);
}

function closeVerseDetails() {
    verseDetailsOverlay.classList.remove('active');
    verseDetailsSheet.classList.remove('active');
    setFabVisibility(true);
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
// الميزة 11: التحكم في حجم النص والوضع الليلي
// ============================================================================
function increaseFontSize() {
    if (fontSize < 2.4) setFontSize(Math.min(2.4, fontSize + 0.1));
}

function decreaseFontSize() {
    if (fontSize > 1.1) setFontSize(Math.max(1.1, fontSize - 0.1));
}

function toggleDarkMode() {    setDarkMode(!isDarkMode);
}

// ============================================================================
// الإعدادات
// ============================================================================
function openSettings() {
    fontSizeDisplay.textContent = fontSize + 'rem';
    settingsOverlay.classList.add('active');
    settingsSheet.classList.add('active');
    setFabVisibility(false);
    toggleMenu();
}

function closeSettings() {
    settingsOverlay.classList.remove('active');
    settingsSheet.classList.remove('active');
    setFabVisibility(true);
}

function resetSettings() {
    setFontSize(1.3);
    setDarkMode(false);
    alert('تم إعادة الضبط الإعدادات الافتراضية');
}

// --- دوال مساعدة ---

function formatAudioTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return String(mins).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
}

function updateSurahAudioProgress() {
    const audio = document.getElementById('surah-audio-player');
    if (!audio) return;
    const progress = document.getElementById('surah-audio-progress');
    const current = document.getElementById('surah-audio-current');
    const duration = document.getElementById('surah-audio-duration');
    if (progress) progress.value = audio.duration ? Math.round((audio.currentTime / audio.duration) * 1000) : 0;
    if (current) current.textContent = formatAudioTime(audio.currentTime);
    if (duration) duration.textContent = formatAudioTime(audio.duration);
}

function toggleSurahAudio() {
    const audio = document.getElementById('surah-audio-player');
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => {
        const status = document.getElementById('surah-audio-status');
        if (status) status.textContent = 'تعذر بدء التشغيل؛ تحقق من اتصال الإنترنت.';
    });
    else audio.pause();
}

function seekSurahAudio(seconds) {
    const audio = document.getElementById('surah-audio-player');
    if (audio && Number.isFinite(audio.duration)) {
        audio.currentTime = Math.max(0, Math.min(audio.duration, audio.currentTime + seconds));
        updateSurahAudioProgress();
    }
}

function seekSurahAudioTo(value) {
    const audio = document.getElementById('surah-audio-player');
    if (audio && Number.isFinite(audio.duration)) {
        audio.currentTime = (Number(value) / 1000) * audio.duration;
        updateSurahAudioProgress();
    }
}

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

// --- إجراء الزر العائم ---
function fabAction() {
    if (currentMode === 'audio') {
        const player = document.getElementById('surah-audio-player');
        if (player) player.play().catch(() => alert('تعذر تشغيل التلاوة. تحقق من اتصال الإنترنت.'));
    } else {
        // في وضع النص، ن显示 التفسير للآية الحالية إذا كانت محددة
        if (currentVerse) {
            showTextTafsir();
        } else {
            alert('الرجاء اختيار آية أولاً');
        }
    }
}

function setFabVisibility(visible) {
    const fab = document.getElementById('fab-btn');
    if (fab) fab.style.display = visible ? '' : 'none';
}

// --- إغلاق النوافذ عند النقر خارجها ---
window.onclick = function(event) {
    if (event.target.classList.contains('custom-modal')) {
        event.target.classList.remove('active');
    }
    if (event.target === verseOptionsOverlay) {
        closeVerseOptions();
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
    
    // لم تعد هناك حاجة لإعداد رابط صوتي يدوي؛ مصدر السور مدمج في التطبيق.
    
    // إظهار صفحة الترحيب
    welcomeScreen.classList.add('active');
});
/* تحديث بالسحب للأسفل مع احترام التمرير داخل المحتوى */
(function enablePullToRefresh() {
    let startY = null;
    let activeScroller = null;
    const scrollSelector = '.quran-text-container, .surah-list, .search-results';
    document.addEventListener('touchstart', (event) => {
        if (!event.touches || event.touches.length !== 1) {
            startY = null;
            activeScroller = null;
            return;
        }
        if (event.target.closest('input, textarea, button, #sidebar, .custom-modal, #verse-options-sheet, #tafsir-sheet, #settings-sheet')) {
            startY = null;
            activeScroller = null;
            return;
        }
        activeScroller = event.target.closest(scrollSelector);
        if (activeScroller && activeScroller.scrollTop > 0) {
            startY = null;
            return;
        }
        if (!activeScroller && window.scrollY > 0) {
            startY = null;
            return;
        }
        startY = event.touches[0].clientY;
    }, { passive: true });

    document.addEventListener('touchend', (event) => {
        if (startY === null || !event.changedTouches || !event.changedTouches.length) return;
        const distance = event.changedTouches[0].clientY - startY;
        const canRefresh = !activeScroller || activeScroller.scrollTop <= 0;
        startY = null;
        activeScroller = null;
        if (canRefresh && distance >= 125) window.location.reload();
    }, { passive: true });

    document.addEventListener('touchcancel', () => {
        startY = null;
        activeScroller = null;
    }, { passive: true });
})();

