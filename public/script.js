/* =============================================
   GuardianSense — Abode.space Inspired Design
   JavaScript: Scroll Reveals, Form, Modal, Nav
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {

    // --- Scroll Reveal ---
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = entry.target.dataset.delay || 0;
                setTimeout(() => entry.target.classList.add('visible'), delay * 120);
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -30px 0px' });

    revealElements.forEach(el => revealObserver.observe(el));

    // --- Mobile Nav Toggle ---
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    navToggle.addEventListener('click', () => {
        navToggle.classList.toggle('active');
        navLinks.classList.toggle('active');
        document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
    });

    navLinks.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navToggle.classList.remove('active');
            navLinks.classList.remove('active');
            document.body.style.overflow = '';
        });
    });

    // --- Smooth Scroll ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', e => {
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // --- Form Validation ---
    const form = document.getElementById('betaForm');
    const modal = document.getElementById('successModal');
    const closeModalBtn = document.getElementById('closeModal');

    function showError(id, msg) {
        const el = document.getElementById(id);
        const err = document.getElementById(id + 'Error');
        if (el) el.classList.add('error');
        if (err) err.textContent = msg;
    }

    function clearError(id) {
        const el = document.getElementById(id);
        const err = document.getElementById(id + 'Error');
        if (el) el.classList.remove('error');
        if (err) err.textContent = '';
    }

    // Live clear on input
    ['parentName', 'email', 'phone', 'interest'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', () => clearError(id));
    });

    form.addEventListener('submit', async e => {
        e.preventDefault();
        let valid = true;

        ['parentName', 'email', 'phone', 'interest'].forEach(clearError);

        const name = document.getElementById('parentName').value.trim();
        const email = document.getElementById('email').value.trim();
        const phone = document.getElementById('phone').value.trim();
        const interest = document.getElementById('interest').value.trim();

        if (!name) { showError('parentName', 'Please enter your name'); valid = false; }
        if (!email) { showError('email', 'Please enter your email'); valid = false; }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { showError('email', 'Please enter a valid email'); valid = false; }
        if (!phone) { showError('phone', 'Please enter your phone number'); valid = false; }
        else if (phone.replace(/[\s\-\+\(\)]/g, '').length < 8) { showError('phone', 'Please enter a valid phone number'); valid = false; }
        if (!interest) { showError('interest', 'Please tell us why you\'re interested'); valid = false; }

        if (!valid) return;

        // Send to backend
        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Submitting...';
        submitBtn.disabled = true;

        try {
            const res = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, interest })
            });
            const data = await res.json();

            if (data.success) {
                modal.classList.add('active');
                document.body.style.overflow = 'hidden';
                form.reset();
            } else if (res.status === 409) {
                showError('email', data.message || 'This email is already registered');
            } else if (data.errors) {
                Object.entries(data.errors).forEach(([field, msg]) => {
                    const idMap = { name: 'parentName', email: 'email', phone: 'phone', interest: 'interest' };
                    showError(idMap[field] || field, msg);
                });
            }
        } catch (err) {
            console.error('Submission failed:', err);
            showError('email', 'Something went wrong. Please try again.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });

    // --- Modal Close ---
    closeModalBtn.addEventListener('click', () => {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    });

    modal.addEventListener('click', e => {
        if (e.target === modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    });

});
