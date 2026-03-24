// main.js

document.addEventListener('DOMContentLoaded', () => {
    const publishBtn = document.getElementById('publish-button');
    const clearBtn = document.getElementById('clear-button');
    const articlesContainer = document.getElementById('articles-container');

    // Try to find form fields (supports simple and drag/drop variants)
    const titleEl = document.getElementById('title');
    const contentEl = document.getElementById('content');

    // main image: prefer file input id 'main-image-file', else url input id 'main-image' or 'main-image-url'
    const mainFileInput = document.getElementById('main-image-file') || document.querySelector('input[type="file"][id^="main"]');
    const mainUrlInput = document.getElementById('main-image') || document.getElementById('main-image-url');

    // extras: support both simple URL inputs (additional-image-1/2/3) or file/url pairs with classes
    const extraUrlSimple = [
        document.getElementById('additional-image-1'),
        document.getElementById('additional-image-2'),
        document.getElementById('additional-image-3')
    ].filter(Boolean);

    const extraFileInputs = Array.from(document.querySelectorAll('.extra-file'));
    const extraUrlInputs = Array.from(document.querySelectorAll('.extra-url'));

    // fallback arrays if only simple url inputs exist
    const extrasSimpleUrls = extraUrlSimple.length ? extraUrlSimple : [];

    // helper: read File -> dataURL
    const fileToDataURL = file => new Promise((res, rej) => {
        if (!file) return res(null);
        const reader = new FileReader();
        reader.onload = e => res(e.target.result);
        reader.onerror = () => res(null);
        reader.readAsDataURL(file);
    });

    // get main image src (file dataURL preferred, else URL string)
    async function getMainSrc() {
        if (mainFileInput && mainFileInput.files && mainFileInput.files[0]) {
            return await fileToDataURL(mainFileInput.files[0]);
        }
        if (mainUrlInput && mainUrlInput.value && mainUrlInput.value.trim()) {
            return mainUrlInput.value.trim();
        }
        return null;
    }

    // get extras (up to 3) - prefer file inputs (if present), else url inputs
    async function getExtras() {
        const extras = [];

        // if dedicated extra file/url pairs exist (drag/drop variant)
        if (extraFileInputs.length || extraUrlInputs.length) {
            // pair by index (use url input if no file)
            for (let i = 0; i < Math.max(extraFileInputs.length, extraUrlInputs.length, 3); i++) {
                let src = null;
                const fi = extraFileInputs[i];
                const ui = extraUrlInputs[i];
                if (fi && fi.files && fi.files[0]) {
                    src = await fileToDataURL(fi.files[0]);
                } else if (ui && ui.value && ui.value.trim()) {
                    src = ui.value.trim();
                }
                if (src) extras.push(src);
                if (extras.length >= 3) break;
            }
            return extras;
        }

        // fallback: simple URL-only extras
        for (let i = 0; i < extrasSimpleUrls.length && extras.length < 3; i++) {
            const v = extrasSimpleUrls[i].value && extrasSimpleUrls[i].value.trim();
            if (v) extras.push(v);
        }
        return extras;
    }

    // build article node: header shows title + thumbnail, clicking header toggles expanded body with full text + gallery
    function buildArticleNode({ title, text, main, extras }) {
        const article = document.createElement('article');
        article.className = 'article card';

        const header = document.createElement('div');
        header.className = 'header';

        const h = document.createElement('h3');
        h.textContent = title || 'Sans titre';
        header.appendChild(h);

        if (main) {
            const thumb = document.createElement('div');
            thumb.className = 'thumb';
            const img = document.createElement('img');
            img.src = main;
            img.alt = title || 'Vignette';
            img.onerror = () => img.style.display = 'none';
            thumb.appendChild(img);
            header.appendChild(thumb);
        }

        article.appendChild(header);

        // body (collapsed by default)
        const body = document.createElement('div');
        body.className = 'body';

        const contentWrap = document.createElement('div');
        contentWrap.className = 'content';

        const p = document.createElement('p');
        p.textContent = text || '';
        contentWrap.appendChild(p);

        if (extras && extras.length) {
            const gallery = document.createElement('div');
            gallery.className = 'gallery';
            extras.forEach(src => {
                if (!src) return;
                const im = document.createElement('img');
                im.src = src;
                im.alt = 'Image supplémentaire';
                im.onerror = () => im.style.display = 'none';
                gallery.appendChild(im);
            });
            contentWrap.appendChild(gallery);
        }

        // meta row with time and delete button
        const meta = document.createElement('div');
        meta.className = 'meta';

        const time = document.createElement('small');
        time.textContent = new Date().toLocaleString();
        time.style.color = 'var(--muted)';

        const del = document.createElement('button');
        del.className = 'delete-btn';
        del.type = 'button';
        del.textContent = 'Supprimer';
        del.addEventListener('click', (ev) => {
            ev.stopPropagation(); // don't toggle
            article.animate([{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: 'scale(0.98)' }], { duration: 220 });
            setTimeout(() => article.remove(), 240);
        });

        meta.appendChild(time);
        meta.appendChild(del);
        contentWrap.appendChild(meta);

        body.appendChild(contentWrap);
        article.appendChild(body);

        // toggle expand/collapse when clicking header
        header.addEventListener('click', () => {
            const willExpand = !article.classList.contains('expanded');
            if (willExpand) {
                article.classList.add('expanded');
            } else {
                article.classList.remove('expanded');
            }
        });

        return article;
    }

    // publish handler
    if (publishBtn) {
        publishBtn.addEventListener('click', async (ev) => {
            ev.preventDefault();
            const title = titleEl ? titleEl.value.trim() : '';
            const text = contentEl ? contentEl.value.trim() : '';

            if (!title && !text) {
                alert('Ajoutez un titre ou du contenu avant de publier.');
                return;
            }

            const main = await getMainSrc();
            const extras = await getExtras();

            const node = buildArticleNode({ title, text, main, extras });
            // newest first
            if (articlesContainer) {
                articlesContainer.prepend(node);
                node.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 360, easing: 'cubic-bezier(.2,.8,.2,1)' });
            }

            // clear form fields safely
            try {
                if (titleEl) titleEl.value = '';
                if (contentEl) contentEl.value = '';
                if (mainFileInput) mainFileInput.value = '';
                if (mainUrlInput) mainUrlInput.value = '';
                // extras: clear file and url inputs
                extraFileInputs.forEach(i => i.value = '');
                extraUrlInputs.forEach(i => i.value = '');
                extrasSimpleUrls.forEach(i => i.value = '');
                // if there are previews shown in DOM, remove their images (best-effort)
                document.querySelectorAll('.preview img').forEach(img => img.remove());
            } catch (err) {
                // silent
                console.error(err);
            }
        });
    }

    // clear handler (optional)
    if (clearBtn) {
        clearBtn.addEventListener('click', (ev) => {
            ev.preventDefault();
            if (!confirm('Effacer tous les champs ?')) return;
            if (titleEl) titleEl.value = '';
            if (contentEl) contentEl.value = '';
            if (mainFileInput) mainFileInput.value = '';
            if (mainUrlInput) mainUrlInput.value = '';
            extraFileInputs.forEach(i => i.value = '');
            extraUrlInputs.forEach(i => i.value = '');
            extrasSimpleUrls.forEach(i => i.value = '');
            document.querySelectorAll('.preview').forEach(p => p.textContent = 'Aucun aperçu');
        });
    }
});