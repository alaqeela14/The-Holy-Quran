// --- توليد قائمة السور ---
const surahListContainer = document.getElementById('surah-list');

function renderSurahs(searchQuery = "") {
    surahListContainer.innerHTML = "";
    
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
            surahListContainer.appendChild(item);
        }
    });

    if (surahListContainer.innerHTML === "") {
        surahListContainer.innerHTML = `<p style="text-align:center; color:#7a6b5d; margin-top:20px;">لا توجد نتائج مطابقة</p>`;
    }
}

// استدعاء الدالة عند بدء التشغيل
renderSurahs();

// --- التنقل بين الشاشات ---
const readingScreen = document.getElementById('reading-screen');
const readingTitle = document.getElementById('reading-title');
const quranTextContainer = document.getElementById('quran-text');

function openSurah(surahName, surahId) {
    readingTitle.innerText = `سورة ${surahName}`;
    let contentHTML = "";

    if (quranData[surahId]) {
        quranData[surahId].verses.forEach((verse, index) => {
            const verseNum = index + 1;
            let displayNum = verseNum;
            
            contentHTML += `<span class="verse" data-tafsir="${verse.tafsir.replace(/"/g, '&quot;')}">${verse.text} <span class="verse-number">${displayNum}</span> </span> `;
        });
        
    } else {
        contentHTML = `
            <p style="text-align:center; color:#7a6b5d; margin-top:20px; font-family:'Tajawal';">(هذا نص تجريبي لسورة ${surahName}، سيتم ربطه بقاعدة بيانات القرآن لاحقاً)</p>
            <span class="verse" data-tafsir="تفسير تجريبي للآية الأولى.">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ <span class="verse-number">١</span> </span>
        `;
    }

    quranTextContainer.innerHTML = contentHTML;
    attachLongPressEvents();
    readingScreen.classList.add('active');
}

function closeSurah() {
    readingScreen.classList.remove('active');
}

// --- وظيفة الضغط المطول ---
const tafsirOverlay = document.getElementById('tafsir-overlay');
const tafsirSheet = document.getElementById('tafsir-sheet');
const tafsirText = document.getElementById('tafsir-text');
let pressTimer;
const PRESS_DURATION = 800;

function attachLongPressEvents() {
    const verses = document.querySelectorAll('.verse');
    
    verses.forEach(verse => {
        verse.addEventListener('touchstart', (e) => {
            verse.classList.add('pressing');
            pressTimer = setTimeout(() => {
                showTafsir(verse.getAttribute('data-tafsir'));
                if (navigator.vibrate) navigator.vibrate(50);
            }, PRESS_DURATION);
        });

        verse.addEventListener('touchend', () => {
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
                showTafsir(verse.getAttribute('data-tafsir'));
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

// --- إظهار وإخفاء التفسير ---
function showTafsir(text) {
    tafsirText.innerText = text;
    tafsirOverlay.classList.add('active');
    tafsirSheet.classList.add('active');
}

function closeTafsir() {
    tafsirOverlay.classList.remove('active');
    tafsirSheet.classList.remove('active');
}

// --- التحكم بالقائمة الجانبية والنوافذ ---
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function toggleMenu() {
    sidebar.classList.toggle('active');
    sidebarOverlay.classList.toggle('active');
}

function showModal(type) {
    toggleMenu();
    setTimeout(() => {
        document.getElementById(`modal-${type}`).classList.add('active');
    }, 300);
}

function closeModal(type) {
    document.getElementById(`modal-${type}`).classList.remove('active');
}

window.onclick = function(event) {
    if (event.target.classList.contains('custom-modal')) {
        event.target.classList.remove('active');
    }
}