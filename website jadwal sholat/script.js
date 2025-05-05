// DOM Elements
const loadingOverlay = document.getElementById('loading-overlay');
const locationName = document.getElementById('location-name');
const locationDetails = document.getElementById('location-details');
const hijriDate = document.getElementById('hijri-date');
const gregorianDate = document.getElementById('gregorian-date');
const currentPrayerName = document.getElementById('current-prayer-name');
const currentPrayerTime = document.getElementById('current-prayer-time');
const nextPrayerName = document.getElementById('next-prayer-name');
const nextPrayerTime = document.getElementById('next-prayer-time');
const countdown = document.getElementById('countdown');

// Prayer time elements
const fajrTime = document.getElementById('fajr-time');
const sunriseTime = document.getElementById('sunrise-time');
const dhuhrTime = document.getElementById('dhuhr-time');
const asrTime = document.getElementById('asr-time');
const maghribTime = document.getElementById('maghrib-time');
const ishaTime = document.getElementById('isha-time');

// Prayer names in Indonesian
const prayerNamesID = {
    Fajr: 'Subuh',
    Sunrise: 'Syuruq',
    Dhuhr: 'Dzuhur',
    Asr: 'Ashar',
    Maghrib: 'Maghrib',
    Isha: 'Isya'
};

// Global variables
let prayerTimes = {};
let userLocation = {};
let intervalId;

// Initialize the app
async function initApp() {
    try {
        // Get user's location
        await getUserLocation();
        
        // Get prayer times
        await getPrayerTimes();
        
        // Update UI
        updateUI();
        
        // Start countdown timer
        startCountdown();
        
        // Hide loading overlay
        loadingOverlay.style.display = 'none';
    } catch (error) {
        console.error('Error initializing app:', error);
        alert('Terjadi kesalahan saat memuat jadwal sholat. Silakan coba lagi.');
    }
}

// Get user's location using Geolocation API
function getUserLocation() {
    return new Promise((resolve, reject) => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    userLocation = { latitude, longitude };
                    
                    try {
                        // Get location name using reverse geocoding
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
                        const data = await response.json();
                        
                        userLocation.city = data.address.city || data.address.town || data.address.village || data.address.county || 'Unknown';
                        userLocation.state = data.address.state || '';
                        userLocation.country = data.address.country || '';
                        
                        resolve();
                    } catch (error) {
                        console.error('Error getting location name:', error);
                        userLocation.city = 'Unknown';
                        userLocation.state = '';
                        userLocation.country = '';
                        resolve();
                    }
                },
                (error) => {
                    console.error('Error getting geolocation:', error);
                    // Default to Jakarta if geolocation fails
                    userLocation = {
                        latitude: -6.2088,
                        longitude: 106.8456,
                        city: 'Jakarta',
                        state: 'Jakarta',
                        country: 'Indonesia'
                    };
                    resolve();
                }
            );
        } else {
            console.error('Geolocation is not supported by this browser');
            // Default to Jakarta if geolocation is not supported
            userLocation = {
                latitude: -6.2088,
                longitude: 106.8456,
                city: 'Jakarta',
                state: 'Jakarta',
                country: 'Indonesia'
            };
            resolve();
        }
    });
}

// Get prayer times from API
async function getPrayerTimes() {
    try {
        const today = new Date();
        const year = today.getFullYear();
        const month = today.getMonth() + 1;
        const day = today.getDate();
        
        const url = `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&method=11`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.code === 200) {
            prayerTimes = data.data;
            return prayerTimes;
        } else {
            throw new Error('Failed to fetch prayer times');
        }
    } catch (error) {
        console.error('Error fetching prayer times:', error);
        throw error;
    }
}

// Update UI with prayer times and location
function updateUI() {
    // Update location
    locationName.textContent = userLocation.city;
    locationDetails.textContent = `${userLocation.state}${userLocation.state && userLocation.country ? ', ' : ''}${userLocation.country}`;
    
    // Update date
    const hijriDateStr = prayerTimes.date.hijri.day + ' ' + 
                         prayerTimes.date.hijri.month.ar + ' ' + 
                         prayerTimes.date.hijri.year + ' H';
    
    const gregorianDateStr = new Date(prayerTimes.date.gregorian.date).toLocaleDateString('id-ID', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    hijriDate.textContent = hijriDateStr;
    gregorianDate.textContent = gregorianDateStr;
    
    // Update prayer times
    fajrTime.textContent = prayerTimes.timings.Fajr.slice(0, 5);
    sunriseTime.textContent = prayerTimes.timings.Sunrise.slice(0, 5);
    dhuhrTime.textContent = prayerTimes.timings.Dhuhr.slice(0, 5);
    asrTime.textContent = prayerTimes.timings.Asr.slice(0, 5);
    maghribTime.textContent = prayerTimes.timings.Maghrib.slice(0, 5);
    ishaTime.textContent = prayerTimes.timings.Isha.slice(0, 5);
    
    // Update current and next prayer
    updateCurrentAndNextPrayer();
}

// Update current and next prayer information
function updateCurrentAndNextPrayer() {
    const now = new Date();
    const prayers = [
        { name: 'Fajr', time: prayerTimes.timings.Fajr },
        { name: 'Sunrise', time: prayerTimes.timings.Sunrise },
        { name: 'Dhuhr', time: prayerTimes.timings.Dhuhr },
        { name: 'Asr', time: prayerTimes.timings.Asr },
        { name: 'Maghrib', time: prayerTimes.timings.Maghrib },
        { name: 'Isha', time: prayerTimes.timings.Isha }
    ];
    
    // Convert prayer times to Date objects
    const prayerDateObjects = prayers.map(prayer => {
        const [hours, minutes] = prayer.time.split(':');
        const prayerDate = new Date();
        prayerDate.setHours(parseInt(hours, 10));
        prayerDate.setMinutes(parseInt(minutes, 10));
        prayerDate.setSeconds(0);
        return { name: prayer.name, time: prayerDate };
    });
    
    // Find current and next prayer
    let currentPrayer = null;
    let nextPrayer = null;
    
    // Check if it's before Fajr
    if (now < prayerDateObjects[0].time) {
        // Before Fajr, next prayer is Fajr
        nextPrayer = prayerDateObjects[0];
        // Current prayer is Isha from previous day
        currentPrayer = { name: 'Isha', time: prayerDateObjects[5].time };
    } 
    // Check if it's after Isha
    else if (now > prayerDateObjects[5].time) {
        // After Isha, current prayer is Isha
        currentPrayer = prayerDateObjects[5];
        // Next prayer is Fajr of next day
        const nextFajr = new Date(prayerDateObjects[0].time);
        nextFajr.setDate(nextFajr.getDate() + 1);
        nextPrayer = { name: 'Fajr', time: nextFajr };
    } 
    // It's between prayers
    else {
        for (let i = 0; i < prayerDateObjects.length - 1; i++) {
            if (now >= prayerDateObjects[i].time && now < prayerDateObjects[i + 1].time) {
                currentPrayer = prayerDateObjects[i];
                nextPrayer = prayerDateObjects[i + 1];
                break;
            }
        }
    }
    
    // Update UI
    if (currentPrayer && nextPrayer) {
        currentPrayerName.textContent = prayerNamesID[currentPrayer.name];
        currentPrayerTime.textContent = formatTime(currentPrayer.time);
        
        nextPrayerName.textContent = prayerNamesID[nextPrayer.name];
        nextPrayerTime.textContent = formatTime(nextPrayer.time);
    }
}

// Start countdown timer to next prayer
function startCountdown() {
    // Clear existing interval if any
    if (intervalId) {
        clearInterval(intervalId);
    }
    
    // Update countdown every second
    intervalId = setInterval(() => {
        const now = new Date();
        const prayers = [
            { name: 'Fajr', time: prayerTimes.timings.Fajr },
            { name: 'Sunrise', time: prayerTimes.timings.Sunrise },
            { name: 'Dhuhr', time: prayerTimes.timings.Dhuhr },
            { name: 'Asr', time: prayerTimes.timings.Asr },
            { name: 'Maghrib', time: prayerTimes.timings.Maghrib },
            { name: 'Isha', time: prayerTimes.timings.Isha }
        ];
        
        // Find next prayer
        let nextPrayer = null;
        
        // Check if it's before Fajr
        if (now < getTimeAsDate(prayers[0].time)) {
            nextPrayer = { name: prayers[0].name, time: getTimeAsDate(prayers[0].time) };
        } 
        // Check if it's after Isha
        else if (now > getTimeAsDate(prayers[5].time)) {
            // Next prayer is Fajr of next day
            const nextFajr = getTimeAsDate(prayers[0].time);
            nextFajr.setDate(nextFajr.getDate() + 1);
            nextPrayer = { name: prayers[0].name, time: nextFajr };
        } 
        // It's between prayers
        else {
            for (let i = 0; i < prayers.length; i++) {
                const prayerTime = getTimeAsDate(prayers[i].time);
                if (now < prayerTime) {
                    nextPrayer = { name: prayers[i].name, time: prayerTime };
                    break;
                }
            }
        }
        
        // Calculate time difference
        if (nextPrayer) {
            const diff = nextPrayer.time - now;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((diff % (1000 * 60)) / 1000);
            
            // Update countdown
            countdown.textContent = `${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;
        }
        
        // Update current and next prayer every minute
        if (now.getSeconds() === 0) {
            updateCurrentAndNextPrayer();
        }
    }, 1000);
}

// Helper function to convert time string to Date object
function getTimeAsDate(timeStr) {
    const [hours, minutes] = timeStr.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10));
    date.setMinutes(parseInt(minutes, 10));
    date.setSeconds(0);
    return date;
}

// Helper function to format time
function formatTime(date) {
    return `${padZero(date.getHours())}:${padZero(date.getMinutes())}`;
}

// Helper function to pad zero
function padZero(num) {
    return num.toString().padStart(2, '0');
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Refresh prayer times at midnight
function scheduleRefresh() {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    
    const timeUntilMidnight = midnight - now;
    
    setTimeout(() => {
        initApp();
        scheduleRefresh();
    }, timeUntilMidnight);
}

scheduleRefresh();