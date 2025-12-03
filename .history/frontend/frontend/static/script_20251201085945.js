/* --- 1. PARTICLE ENGINE --- */
const canvas = document.getElementById('sanskrit-canvas');
const ctx = canvas.getContext('2d');
let width, height;
const chars = "अ आ इ ई उ ऊ ऋ ए ऐ ओ औ क ख ग घ ङ च छ ज झ ञ ट ठ ड ढ ण त थ द ध न प फ ब भ म य र ल व श ष स ह ॐ श्री";

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width; canvas.height = height;
}
window.addEventListener('resize', resize);
resize();

class Particle {
    constructor() { this.reset(); }
    reset() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.char = chars.split(' ')[Math.floor(Math.random() * chars.split(' ').length)];
        this.size = Math.random() * 20 + 10;
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = (Math.random() - 0.5) * 0.5;
        this.opacity = Math.random() * 0.3;
    }
    update() {
        this.x += this.speedX; this.y += this.speedY;
        if(this.x<0 || this.x>width || this.y<0 || this.y>height) this.reset();
    }
    draw() {
        ctx.fillStyle = `rgba(255, 215, 0, ${this.opacity})`;
        ctx.font = `${this.size}px 'Martel'`;
        ctx.fillText(this.char, this.x, this.y);
    }
}
const particles = Array.from({length: 50}, () => new Particle());
function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
}
animate();

/* --- 2. AUTHENTICATION LOGIC --- */
// Called by Google when user logs in
window.handleCredentialResponse = function(response) {
    console.log("Processing Google Token...");
    
    fetch('/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: response.credential })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            unlockSanctum(data.user);
        } else {
            alert("Verification Failed.");
        }
    })
    .catch(err => console.error("Auth Error:", err));
};

function unlockSanctum(name) {
    document.body.classList.add('unlocked');
    document.getElementById('user-name').innerText = name;
    document.getElementById('user-badge').classList.remove('hidden');
}

/* --- 3. GENERATION LOGIC --- */
document.getElementById('generate-btn').addEventListener('click', async () => {
    const chandas = document.getElementById('chandas-select').value;
    const context = document.getElementById('context-input').value;
    const btn = document.getElementById('generate-btn');
    const resultDiv = document.getElementById('sloka-text');
    const loader = document.getElementById('loader');

    if(!context) return alert("Please enter a context.");

    // UI Loading
    btn.disabled = true;
    loader.classList.remove('hidden');
    resultDiv.innerText = "";
    
    try {
        const res = await fetch('/generate-and-verify', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                chandas: chandas,
                context: context,
                max_attempts: 5
            })
        });
        const data = await res.json();
        
        // UI Result
        loader.classList.add('hidden');
        if(data.success) {
            resultDiv.innerText = data.final.shloka;
            document.getElementById('analysis-status').innerText = "Verified ✅";
            document.getElementById('analysis-status').style.color = "#4ade80";
        } else {
            resultDiv.innerText = data.final?.shloka || "Generation failed.";
            document.getElementById('analysis-status').innerText = "Imperfect ⚠️";
            document.getElementById('analysis-status').style.color = "orange";
        }
        document.getElementById('attempt-count').innerText = data.attempts?.length || 0;

    } catch(e) {
        alert("Server Error");
        loader.classList.add('hidden');
    } finally {
        btn.disabled = false;
    }
});