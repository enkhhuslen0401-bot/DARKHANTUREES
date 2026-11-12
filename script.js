function getStepLogger(manager) {
    try {
        if (manager && typeof manager.getLogger === "function") {
            return manager.getLogger();
        }
    }
    catch (_error) {
        // Ignore and fall back to console logger.
    }
    return {
        info: function (message) { if (typeof console !== "undefined" && console.log) { console.log(message); } },
        warn: function (message) { if (typeof console !== "undefined" && console.warn) { console.warn(message); } },
        error: function (message) { if (typeof console !== "undefined" && console.error) { console.error(message); } },
        severe: function (message) { if (typeof console !== "undefined" && console.error) { console.error(message); } }
    };
}

/**
 * STEP Business Rule
 * Trademark: AI Labz Ltd (TM)
 * Purpose: Describe the rule intent and expected side effects.
 * Notes: Keep transactions short and avoid repeated writes in loops.
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, updateDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, GoogleAuthProvider, FacebookAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyChQoRzp4uKW8s4uKC8_Q8TTMPeoAFE2MI",
    authDomain: "darkhan-turees.firebaseapp.com",
    projectId: "darkhan-turees",
    storageBucket: "darkhan-turees.firebasestorage.app",
    messagingSenderId: "173493944396",
    appId: "1:173493944396:web:336c9aa6ba5fch8cdb74w9",
    measurementId: "G-NP/ZST9ZLB"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();
const fbProvider = new FacebookAuthProvider();

// IMGBB API KEY-ГЭЭ ЭНД ТАВИНА УУ
const IMGBB_API_KEY = "ЭНД_ӨӨРИЙНХӨӨ_IMGBB_API_KEY-Г_БИЧНЭ";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

let listings = [];
let favorites = JSON.parse(localStorage.getItem('darkhanFavs')) || [];
let currentUser = null;
let selectedPaymentListingId = null;

// Нэвтрэх үйлдэл
document.getElementById('googleLoginBtn').onclick = async () => {
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error) {
        console.error(error);
        alert("Google-ээр нэвтрэхэд алдаа гарлаа.");
    }
};

document.getElementById('fbLoginBtn').onclick = async () => {
    try {
        await signInWithPopup(auth, fbProvider);
    } catch (error) {
        console.error(error);
        alert("Facebook-ээр нэвтрэхэд алдаа гарлаа.");
    }
};

document.getElementById('logoutBtn').onclick = async () => {
    await signOut(auth);
};

onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const authButtons = document.getElementById('authButtons');
    const userProfile = document.getElementById('userProfile');
    const addBtn = document.getElementById('openAddModalBtn');
    const myListingsBtn = document.getElementById('myListingsBtn');

    if (user) {
        authButtons.style.display = 'none';
        userProfile.style.display = 'flex';
        addBtn.style.display = 'inline-flex';
        myListingsBtn.style.display = 'inline-flex';
        document.getElementById('userName').innerText = `👤 ${user.displayName}`;
    } else {
        authButtons.style.display = 'flex';
        userProfile.style.display = 'none';
        addBtn.style.display = 'none';
        myListingsBtn.style.display = 'none';
    }
    renderListings(listings);
});

const listingsGrid = document.getElementById('listingsGrid');
const filterLocation = document.getElementById('filterLocation');
const filterType = document.getElementById('filterType');
const filterRooms = document.getElementById('filterRooms');
const searchInput = document.getElementById('searchInput');

async function fetchListings() {
    try {
        const q = query(collection(db, "listings"), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        listings = [];
        querySnapshot.forEach((docSnap) => {
            listings.push({ id: docSnap.id, ...docSnap.data() });
        });
        renderListings(listings);
        updateFavCount();
    } catch (error) {
        console.error("Дата татахад алдаа:", error);
        listingsGrid.innerHTML = '<p>Мэдээлэл ачаалахад алдаа гарлаа.</p>';
    }
}

/**
 * STEP business rule function: renderListings.
 * TODO: Describe purpose, side effects, and expected node/context state.
 * @param {*} items
 */
function renderListings(items) {
    listingsGrid.innerHTML = '';
    const now = Date.now();

    const visibleItems = items.filter(item => {
        const isOwner = currentUser && item.userId === currentUser.uid;
        const expiresAt = (item.createdAt || 0) + SEVEN_DAYS_MS + (item.paidExtensions || 0) * THIRTY_DAYS_MS;
        const isActive = now < expiresAt;
        return isActive || isOwner;
    });

    if (visibleItems.length === 0) {
        listingsGrid.innerHTML = '<p style="font-size:18px; color:#4b5563;">Одоогоор идэвхтэй зар олдсонгүй.</p>';
        return;
    }

    visibleItems.forEach(item => {
        const badgeClass = item.type === 'Хоногоор' ? 'daily' : (item.type === '6 сараар' ? 'sixmonth' : 'monthly');
        const priceSuffix = item.type === 'Хоногоор' ? '₮ / хоног' : (item.type === '6 сараар' ? '₮ / 6 сар' : '₮ / сар');
        const isFav = favorites.includes(item.id);
        const isOwner = currentUser && item.userId === currentUser.uid;

        const expiresAt = (item.createdAt || 0) + SEVEN_DAYS_MS + (item.paidExtensions || 0) * THIRTY_DAYS_MS;
        const isExpired = now >= expiresAt;

        const card = document.createElement('div');
        card.className = `card ${isExpired ? 'expired-card' : ''}`;

        let statusBadge = '';
        if (isExpired) {
            statusBadge = `<span class="badge expired-tag">⚠️ Төлбөр хүлээгдэж байна (Зөвхөн танд харагдаж байна)</span>`;
        } else {
            const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));
            statusBadge = `<span class="badge free-tag">⏳ Идэвхтэй (${daysLeft} хоног үлдсэн)</span>`;
        }

        card.innerHTML = `
            <div class="card-img-wrap">
                <img src="${item.image}" alt="${item.title}">
                ${isOwner ? `<button class="card-del-btn" onclick="deleteListing(event, '${item.id}')">🗑️ Устгах</button>` : ''}
                <button class="card-fav-btn" onclick="toggleFavorite(event, '${item.id}')">${isFav ? '❤️' : '🤍'}</button>
            </div>
            <div class="card-body" onclick="${isExpired ? '' : `openDetailModal('${item.id}')`}">
                <div class="badge-row">
                    <span class="badge ${badgeClass}">${item.type}</span>
                    ${isOwner ? statusBadge : ''}
                </div>
                <h4>${item.title}</h4>
                <p class="card-info">📍 ${item.location} • 🚪 ${item.rooms} өрөө</p>
                <p class="card-price">${Number(item.price).toLocaleString()}${priceSuffix}</p>
                ${isOwner && isExpired ? `<button class="pay-now-btn" onclick="openPaymentModal(event, '${item.id}')">💳 10,000₮ төлж сунгах</button>` : ''}
            </div>
        `;
        listingsGrid.appendChild(card);
    });
}

window.showMyListings = function() {
    if (!currentUser) return;
    const myItems = listings.filter(item => item.userId === currentUser.uid);
    renderListings(myItems);
    document.getElementById('sectionTitle').innerText = "📋 Миний оруулсан зарууд";
};

// Төлбөр төлөх модал ажиллуулах
const paymentModal = document.getElementById('paymentModal');
window.openPaymentModal = function(e, id) {
    e.stopPropagation();
    selectedPaymentListingId = id;
    document.getElementById('payRefCode').innerText = `TUREES_${id.slice(-6).toUpperCase()}`;
    paymentModal.style.display = 'flex';
};
document.getElementById('closePaymentModal').onclick = () => paymentModal.style.display = 'none';

document.getElementById('confirmPaymentBtn').onclick = async function() {
    if (!selectedPaymentListingId) return;
    try {
        const itemRef = doc(db, "listings", selectedPaymentListingId);
        const targetItem = listings.find(l => l.id === selectedPaymentListingId);
        const currentExt = targetItem.paidExtensions || 0;

        await updateDoc(itemRef, {
            paidExtensions: currentExt + 1
        });

        alert("Төлбөр амжилттай баталгаажлаа! Таны зар 30 хоногоор сунгагдлаа.");
        paymentModal.style.display = 'none';
        fetchListings();
    } catch (err) {
        console.error(err);
        alert("Алдаа гарлаа.");
    }
};

window.deleteListing = async function(e, id) {
    e.stopPropagation();
    if (!confirm("Та энэ зарыг устгахдаа итгэлтэй байна уу?")) return;

    try {
        await deleteDoc(doc(db, "listings", id));
        alert("Зар устгагдлаа.");
        fetchListings();
    } catch (error) {
        console.error(error);
        alert("Устгахад алдаа гарлаа.");
    }
};

/**
 * STEP business rule function: filterListings.
 * TODO: Describe purpose, side effects, and expected node/context state.
 */
function filterListings() {
    const searchVal = searchInput.value.toLowerCase();
    const locVal = filterLocation.value;
    const typeVal = filterType.value;
    const roomVal = filterRooms.value;

    document.getElementById('sectionTitle').innerText = "🔍 Хайлтын үр дүн";

    const filtered = listings.filter(item => {
        const matchesSearch = item.title.toLowerCase().includes(searchVal) || item.location.toLowerCase().includes(searchVal);
        const matchesLoc = locVal === 'all' || item.location === locVal;
        const matchesType = typeVal === 'all' || item.type === typeVal;
        const matchesRoom = roomVal === 'all' || item.rooms === roomVal;
        return matchesSearch && matchesLoc && matchesType && matchesRoom;
    });

    renderListings(filtered);
}

window.resetFilters = function() {
    searchInput.value = '';
    filterLocation.value = 'all';
    filterType.value = 'all';
    filterRooms.value = 'all';
    document.getElementById('sectionTitle').innerText = "🏠 Шинээр нэмэгдсэн байрнууд";
    renderListings(listings);
};

const detailModal = document.getElementById('detailModal');
window.openDetailModal = function(id) {
    const item = listings.find(l => l.id === id);
    if (!item) return;

    document.getElementById('modalImg').src = item.image;
    document.getElementById('modalTitle').innerText = item.title;
    document.getElementById('modalLocation').innerText = item.location;
    document.getElementById('modalRooms').innerText = item.rooms;
    document.getElementById('modalDesc').innerText = item.desc;

    const badge = document.getElementById('modalBadge');
    badge.innerText = item.type;
    badge.className = `badge ${item.type === 'Хоногоор' ? 'daily' : (item.type === '6 сараар' ? 'sixmonth' : 'monthly')}`;

    const priceSuffix = item.type === 'Хоногоор' ? '₮ / хоног' : (item.type === '6 сараар' ? '₮ / 6 сар' : '₮ / сар');
    document.getElementById('modalPrice').innerText = Number(item.price).toLocaleString() + priceSuffix;

    const phoneBtn = document.getElementById('modalPhone');
    phoneBtn.innerText = `📞 ${item.phone}`;
    phoneBtn.href = `tel:${item.phone}`;

    const msgBtn = document.getElementById('modalMessenger');
    if (item.messenger) {
        msgBtn.style.display = 'inline-flex';
        msgBtn.href = item.messenger;
    } else {
        msgBtn.style.display = 'none';
    }

    detailModal.style.display = 'flex';
};

document.getElementById('closeDetailModal').onclick = () => detailModal.style.display = 'none';

window.toggleFavorite = function(e, id) {
    e.stopPropagation();
    const index = favorites.indexOf(id);
    if (index > -1) {
        favorites.splice(index, 1);
    } else {
        favorites.push(id);
    }
    localStorage.setItem('darkhanFavs', JSON.stringify(favorites));
    renderListings(listings);
    updateFavCount();
};

/**
 * STEP business rule function: updateFavCount.
 * TODO: Describe purpose, side effects, and expected node/context state.
 */
function updateFavCount() {
    document.getElementById('favCount').innerText = favorites.length;
}

document.getElementById('openFavoritesBtn').onclick = function() {
    const favItems = listings.filter(item => favorites.includes(item.id));
    renderListings(favItems);
    document.getElementById('sectionTitle').innerText = "❤️ Таны хадгалсан байрнууд";
};

const addModal = document.getElementById('addModal');
document.getElementById('openAddModalBtn').onclick = () => addModal.style.display = 'flex';
document.getElementById('closeAddModal').onclick = () => addModal.style.display = 'none';

document.getElementById('addListingForm').onsubmit = async function(e) {
    e.preventDefault();
    if (!currentUser) {
        alert("Зар нэмэхийн тулд эхлээд нэвтэрнэ үү!");
        return;
    }

    const fileInput = document.getElementById('inputImageFile');
    const file = fileInput.files[0];
    if (!file) return;

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.innerText = "⏳ Зургийг хуулж байна...";
    submitBtn.disabled = true;

    try {
        const formData = new FormData();
        formData.append('image', file);

        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (!data.success) {
            alert("Зураг хуулахад алдаа гарлаа. IMGBB_API_KEY-гээ шалгана уу.");
            submitBtn.innerText = "✅ Зарыг нийтлэх (Эхний 7 хоног үнэгүй)";
            submitBtn.disabled = false;
            return;
        }

        const newListing = {
            userId: currentUser.uid,
            authorName: currentUser.displayName,
            title: document.getElementById('inputTitle').value,
            location: document.getElementById('inputLocation').value,
            type: document.getElementById('inputType').value,
            rooms: document.getElementById('inputRooms').value,
            price: Number(document.getElementById('inputPrice').value),
            phone: document.getElementById('inputPhone').value,
            messenger: document.getElementById('inputMessenger').value,
            image: data.data.url,
            desc: document.getElementById('inputDesc').value,
            createdAt: Date.now(),
            paidExtensions: 0
        };

        await addDoc(collection(db, "listings"), newListing);

        alert("Таны зар амжилттай нийтлэгдлээ! (Эхний 7 хоног үнэгүй)");
        addModal.style.display = 'none';
        document.getElementById('addListingForm').reset();
        submitBtn.innerText = "✅ Зарыг нийтлэх (Эхний 7 хоног үнэгүй)";
        submitBtn.disabled = false;

        fetchListings();
    } catch (err) {
        console.error(err);
        alert("Зар оруулахад алдаа гарлаа.");
        submitBtn.innerText = "✅ Зарыг нийтлэх (Эхний 7 хоног үнэгүй)";
        submitBtn.disabled = false;
    }
};

searchInput.oninput = filterListings;
filterLocation.onchange = filterListings;
filterType.onchange = filterListings;
filterRooms.onchange = filterListings;

window.onclick = function(event) {
    if (event.target === detailModal) detailModal.style.display = 'none';
    if (event.target === addModal) addModal.style.display = 'none';
    if (event.target === paymentModal) paymentModal.style.display = 'none';
};

fetchListings();
