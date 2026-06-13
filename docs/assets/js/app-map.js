(function () {
    if (!window.FALLES_APP) {
        return;
    }

    const config = window.FALLES_APP;
    const state = {
        map: null,
        markersLayer: null,
        userMarker: null,
        userLocation: null,
        fallas: [],
        events: [],
        selectedId: 0,
        filters: {
            query: "",
            category: "all",
            section: "all",
            special: "",
        },
        // Ruta actual dibujada en el mapa (si existe)
        routeLine: null,
    };

    const elements = {
        search: document.getElementById("appSearch"),
        sectionFilter: document.getElementById("sectionFilter"),
        categoryChips: Array.from(document.querySelectorAll("[data-category]")),
        specialChips: Array.from(document.querySelectorAll("[data-special]")),
        clearButtons: Array.from(document.querySelectorAll("[data-clear-filters]")),
        navButtons: Array.from(document.querySelectorAll("[data-nav]")),
        views: Array.from(document.querySelectorAll(".app-view")),
        jumpButtons: Array.from(document.querySelectorAll("[data-view-jump]")),
        locateButtons: Array.from(document.querySelectorAll("[data-locate]")),
        mapCount: document.getElementById("mapCount"),
        filterLabel: document.getElementById("filterLabel"),
        mapEmpty: document.getElementById("mapEmpty"),
        resetMapButton: document.querySelector("[data-reset-map]"),
        heroSummary: document.getElementById("heroSummary"),
        heroFallaCount: document.getElementById("heroFallaCount"),
        heroEventCount: document.getElementById("heroEventCount"),
        heroFavoriteCount: document.getElementById("heroFavoriteCount"),
        mapFavoriteCount: document.getElementById("mapFavoriteCount"),
        mapEventCount: document.getElementById("mapEventCount"),
        mapModeLabel: document.getElementById("mapModeLabel"),
        featuredFallas: document.getElementById("featuredFallas"),
        routePlans: document.getElementById("routePlans"),
        agendaList: document.getElementById("agendaList"),
        agendaCount: document.getElementById("agendaCount"),
        favoriteFallas: document.getElementById("favoriteFallas"),
        favoriteEvents: document.getElementById("favoriteEvents"),
        favoritesCount: document.getElementById("favoritesCount"),
        profileForm: document.getElementById("profileForm"),
        profileName: document.getElementById("profileName"),
        profileEmail: document.getElementById("profileEmail"),
        profileAvatar: document.getElementById("profileAvatar"),
        profileNameInput: document.getElementById("profileNameInput"),
        profileFeedback: document.getElementById("profileFeedback"),
        profileFallaCount: document.getElementById("profileFallaCount"),
        profileEventCount: document.getElementById("profileEventCount"),
        sheet: document.getElementById("fallaSheet"),
        sheetImage: document.getElementById("sheetImage"),
        sheetTitle: document.getElementById("sheetTitle"),
        sheetDescription: document.getElementById("sheetDescription"),
        sheetPrize: document.getElementById("sheetPrize"),
        sheetAddress: document.getElementById("sheetAddress"),
        sheetNeighborhood: document.getElementById("sheetNeighborhood"),
        sheetArtist: document.getElementById("sheetArtist"),
        sheetTags: document.getElementById("sheetTags"),
        sheetRoute: document.getElementById("sheetRoute"),
        sheetDetail: document.getElementById("sheetDetail"),
        sheetFavorite: document.getElementById("sheetFavorite"),
        closeSheetButton: document.querySelector("[data-close-sheet]"),
    };

    function normalize(value) {
        return String(value || "")
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function escapeHtml(value) {
        return String(value || "")
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function capitalize(value) {
        const text = String(value || "");
        return text.charAt(0).toUpperCase() + text.slice(1);
    }

    function truncate(value, length) {
        const text = String(value || "").trim();
        if (text.length <= length) {
            return text;
        }

        return text.slice(0, Math.max(0, length - 3)).trimEnd() + "...";
    }

    function sanitizeColor(value) {
        return /^#[0-9a-f]{3,8}$/i.test(String(value || "")) ? String(value) : "#ff7a4d";
    }

    function readCsrfToken() {
        if (!document.cookie) {
            return "";
        }

        return document.cookie
            .split(";")
            .map((chunk) => chunk.trim())
            .find((chunk) => chunk.split("=")[0] && chunk.split("=")[0].endsWith("_csrf"))
            ?.split("=")
            .slice(1)
            .join("=") || "";
    }

    function withRequestOptions(options) {
        const nextOptions = Object.assign({
            credentials: "same-origin",
        }, options || {});
        const headers = new Headers(nextOptions.headers || {});
        const method = String(nextOptions.method || "GET").toUpperCase();
        const csrfToken = readCsrfToken();

        if (csrfToken && method !== "GET" && !headers.has("X-CSRF-Token")) {
            headers.set("X-CSRF-Token", decodeURIComponent(csrfToken));
        }

        nextOptions.headers = headers;
        return nextOptions;
    }

    function distanceKm(lat1, lon1, lat2, lon2) {
        const toRad = (input) => (input * Math.PI) / 180;
        const earthRadius = 6371;
        const deltaLat = toRad(lat2 - lat1);
        const deltaLon = toRad(lon2 - lon1);
        const a =
            Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);

        return earthRadius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    function splitDateParts(value) {
        const date = value ? new Date(value + "T00:00:00") : null;
        if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
            return {
                day: "--",
                month: "Sin fecha",
                label: "Fecha pendiente",
            };
        }

        const month = date.toLocaleDateString("es-ES", { month: "short" }).replace(".", "");
        const label = date.toLocaleDateString("es-ES", {
            day: "numeric",
            month: "long",
        });

        return {
            day: String(date.getDate()).padStart(2, "0"),
            month: capitalize(month),
            label: capitalize(label),
        };
    }

    function favoriteTotal() {
        const fallas = state.fallas.filter((item) => item.is_favorite).length;
        const events = state.events.filter((item) => item.is_favorite).length;
        return fallas + events;
    }

    function categoryMarkerClass(category) {
        const normalized = normalize(category);
        if (normalized === "infantil") {
            return "falla-marker--infantil";
        }
        if (normalized === "experimental") {
            return "falla-marker--experimental";
        }
        return "falla-marker--principal";
    }

    function isFallaCategory(category) {
        const normalized = normalize(category);
        return normalized === "principal" || normalized === "infantil" || normalized === "experimental";
    }

    function createMarkerIcon(item, isActive) {
        const markerClasses = [
            "falla-marker",
            categoryMarkerClass(item.category),
            isActive ? "is-active" : "",
            item.is_favorite ? "is-favorite" : "",
        ].filter(Boolean).join(" ");

        return L.divIcon({
            className: "falla-marker-wrapper",
            html: '<span class="' + markerClasses + '"></span>',
            iconSize: [34, 34],
            iconAnchor: [17, 34],
        });
    }

    function initMap() {
        state.map = L.map("fallaMap", {
            zoomControl: false,
            attributionControl: false,
        }).setView([config.map.lat, config.map.lng], config.map.zoom);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
        }).addTo(state.map);

        L.control.zoom({ position: "bottomright" }).addTo(state.map);
        state.markersLayer = L.layerGroup().addTo(state.map);
    }

    async function loadJson(url, options) {
        const response = await fetch(url, withRequestOptions(options));
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
            throw new Error(payload.message || "Request failed");
        }

        return payload;
    }

    async function loadData() {
        const [fallasPayload, eventsPayload, profilePayload] = await Promise.all([
            loadJson(config.endpoints.fallas),
            loadJson(config.endpoints.events),
            loadJson(config.endpoints.profile),
        ]);

        state.fallas = Array.isArray(fallasPayload.items) ? fallasPayload.items : [];
        state.events = Array.isArray(eventsPayload.items) ? eventsPayload.items : [];

        renderProfile(profilePayload.profile || config.profile);
        fillSectionFilter();
        renderAgenda();
        renderMap();
        renderFavorites();

        const focusId = Number(config.focusId || 0);
        if (focusId > 0) {
            const target = state.fallas.find((item) => Number(item.id) === focusId);
            if (target) {
                openFalla(target, true);
                return;
            }
        }

        const initialFalla = getFilteredFallas()[0];
        if (initialFalla) {
            openFalla(initialFalla, false);
        }
    }

    function fillSectionFilter() {
        const sections = Array.from(
            new Set(
                state.fallas
                    .map((item) => String(item.section_name || "").trim())
                    .filter(Boolean)
            )
        ).sort((left, right) => left.localeCompare(right, "es"));

        elements.sectionFilter.innerHTML = ['<option value="all">Todas las secciones</option>']
            .concat(sections.map((section) => '<option value="' + escapeHtml(section) + '">' + escapeHtml(section) + "</option>"))
            .join("");
    }

    function getFilteredFallas() {
        const query = normalize(state.filters.query);
        const section = state.filters.section;
        const category = state.filters.category;
        const special = state.filters.special;

        let items = state.fallas.filter((item) => {
            const validFalla = isFallaCategory(item.category);
            const matchesQuery =
                query === "" ||
                normalize(item.name).includes(query) ||
                normalize(item.address).includes(query) ||
                normalize(item.section_name).includes(query) ||
                normalize(item.neighborhood).includes(query);
            const matchesCategory = category === "all" || normalize(item.category) === normalize(category);
            const matchesSection = section === "all" || String(item.section_name) === section;

            return validFalla && matchesQuery && matchesCategory && matchesSection;
        });

        if (special === "prizes") {
            items = items.filter((item) => normalize(item.prize_text) !== "sin premio registrado");
        }

        if (special === "favorites") {
            items = items.filter((item) => Boolean(item.is_favorite));
        }

        if (special === "nearby" && state.userLocation) {
            items = items
                .map((item) => ({
                    ...item,
                    distance: distanceKm(
                        state.userLocation.lat,
                        state.userLocation.lng,
                        Number(item.latitude || 0),
                        Number(item.longitude || 0)
                    ),
                }))
                .sort((left, right) => left.distance - right.distance);
        }

        return items;
    }

    function activeFilterSummary() {
        const labels = [];

        if (state.filters.category !== "all") {
            labels.push(capitalize(state.filters.category));
        }

        if (state.filters.section !== "all") {
            labels.push(state.filters.section);
        }

        if (state.filters.special === "prizes") {
            labels.push("Premiadas");
        } else if (state.filters.special === "nearby") {
            labels.push(state.userLocation ? "Cerca de ti" : "Proximidad");
        } else if (state.filters.special === "favorites") {
            labels.push("Favoritas");
        }

        if (state.filters.query.trim() !== "") {
            labels.push('"' + state.filters.query.trim() + '"');
        }

        return labels.length === 0 ? "Sin filtros activos" : labels.join(" | ");
    }

    function mapModeLabel() {
        if (state.filters.special === "nearby") {
            return "Cerca";
        }
        if (state.filters.special === "favorites") {
            return "Favoritas";
        }
        if (state.filters.special === "prizes") {
            return "Premios";
        }
        if (state.filters.category !== "all") {
            return capitalize(state.filters.category);
        }
        return "General";
    }

    function featuredFallasSource(visible) {
        const source = visible.length > 0 ? visible.slice() : state.fallas.slice();
        return source
            .sort((left, right) => {
                const leftPrize = normalize(left.prize_text) !== "sin premio registrado" ? 1 : 0;
                const rightPrize = normalize(right.prize_text) !== "sin premio registrado" ? 1 : 0;
                const leftFavorite = left.is_favorite ? 1 : 0;
                const rightFavorite = right.is_favorite ? 1 : 0;

                return (rightFavorite - leftFavorite) || (rightPrize - leftPrize);
            })
            .slice(0, 3);
    }

    function buildFeaturedFallaCard(item) {
        return `
            <article class="featured-falla-card">
                <div class="featured-falla-media">
                    <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">
                </div>
                <div class="featured-falla-body">
                    <div class="featured-falla-head">
                        <span class="favorite-badge">${escapeHtml(capitalize(item.category))}</span>
                        <strong>${escapeHtml(item.name)}</strong>
                        <p>${escapeHtml(item.neighborhood || item.address)}</p>
                    </div>
                    <div class="card-meta-row">
                        <span class="card-meta-pill">${escapeHtml(item.section_name)}</span>
                        <span class="card-meta-pill">${escapeHtml(item.prize_text)}</span>
                    </div>
                    <div class="card-actions">
                        <button class="is-primary" data-open-falla="${item.id}" type="button">Ver en mapa</button>
                        <button class="${item.is_favorite ? "is-active" : ""}" data-favorite-type="falla" data-id="${item.id}" type="button">${item.is_favorite ? "Guardada" : "Guardar"}</button>
                    </div>
                </div>
            </article>
        `;
    }

    function routePlanDefinitions() {
        const awarded = state.fallas.filter((item) => normalize(item.prize_text) !== "sin premio registrado");
        const family = state.fallas.filter((item) => normalize(item.category) === "infantil");
        const favoriteFallas = state.fallas.filter((item) => item.is_favorite);
        const principal = state.fallas.filter((item) => normalize(item.category) === "principal");
        const nearby = state.userLocation
            ? state.fallas
                .map((item) => ({
                    ...item,
                    distance: distanceKm(
                        state.userLocation.lat,
                        state.userLocation.lng,
                        Number(item.latitude || 0),
                        Number(item.longitude || 0)
                    ),
                }))
                .sort((left, right) => left.distance - right.distance)
            : [];

        return [
            {
                key: "prizes",
                title: "Ruta premiadas",
                subtitle: "Empieza por las fallas con mas reconocimiento.",
                count: awarded.length,
                items: awarded.slice(0, 3),
            },
            {
                key: "family",
                title: "Ruta infantil",
                subtitle: "Una seleccion amable para recorrer con calma.",
                count: family.length,
                items: family.slice(0, 3),
            },
            state.userLocation
                ? {
                    key: "nearby",
                    title: "Cerca de ti",
                    subtitle: "Ordena la experiencia segun tu posicion actual.",
                    count: nearby.length,
                    items: nearby.slice(0, 3),
                }
                : favoriteFallas.length > 0
                    ? {
                        key: "favorites",
                        title: "Tus favoritas",
                        subtitle: "Recupera rapidamente lo que ya has guardado.",
                        count: favoriteFallas.length,
                        items: favoriteFallas.slice(0, 3),
                    }
                    : {
                        key: "principal",
                        title: "Ruta principal",
                        subtitle: "Un arranque directo con las fallas grandes.",
                        count: principal.length,
                        items: principal.slice(0, 3),
                    },
        ];
    }

    function buildRoutePlanCard(plan) {
        const preview = plan.items.length > 0
            ? plan.items.map((item) => '<span>' + escapeHtml(truncate(item.name, 24)) + "</span>").join("")
            : "<span>Esperando contenido</span>";

        return `
            <article class="route-plan-card" data-plan="${escapeHtml(plan.key)}">
                <span class="route-plan-chip">Ruta</span>
                <strong>${escapeHtml(plan.title)}</strong>
                <p>${escapeHtml(plan.subtitle)}</p>
                <div class="route-plan-count">
                    <span>${escapeHtml(String(plan.count))} disponibles</span>
                </div>
                <div class="route-plan-preview">
                    ${preview}
                </div>
                <button class="primary-action" data-route-plan="${escapeHtml(plan.key)}" type="button">Activar ruta</button>
            </article>
        `;
    }

    function renderMapPanels(visible) {
        const totalFallas = state.fallas.length;
        const totalEvents = state.events.length;
        const totalFavorites = favoriteTotal();
        const featured = featuredFallasSource(visible);
        const plans = routePlanDefinitions();

        elements.heroFallaCount.textContent = String(totalFallas);
        elements.heroEventCount.textContent = String(totalEvents);
        elements.heroFavoriteCount.textContent = String(totalFavorites);
        elements.mapFavoriteCount.textContent = String(state.fallas.filter((item) => item.is_favorite).length);
        elements.mapEventCount.textContent = String(totalEvents);
        elements.mapModeLabel.textContent = mapModeLabel();
        elements.filterLabel.textContent = activeFilterSummary();
        elements.heroSummary.textContent = visible.length > 0
            ? visible.length + (visible.length === 1 ? " falla visible preparada para explorar." : " fallas visibles listas para tu recorrido.")
            : "No hay resultados con la combinacion actual. Limpia filtros o cambia la busqueda.";

        elements.featuredFallas.innerHTML = featured.length > 0
            ? featured.map(buildFeaturedFallaCard).join("")
            : `
                <article class="empty-card">
                    <strong>Sin fallas destacadas</strong>
                    <p>Carga nuevas fallas desde el panel y apareceran aqui como acceso rapido.</p>
                </article>
            `;

        elements.routePlans.innerHTML = plans.map(buildRoutePlanCard).join("");
    }

    function updateMapEmptyState(count) {
        elements.mapCount.textContent = count + (count === 1 ? " falla visible" : " fallas visibles");
        elements.mapEmpty.hidden = count !== 0;
    }

    function clearRouteLine() {
        if (state.routeLine) {
            state.map.removeLayer(state.routeLine);
            state.routeLine = null;
        }
    }

    function renderMap() {
        state.markersLayer.clearLayers();

        // Limpiar ruta anterior al volver a renderizar el mapa
        clearRouteLine();

        const visible = getFilteredFallas();
        updateMapEmptyState(visible.length);
        renderMapPanels(visible);

        if (state.selectedId > 0 && !visible.some((item) => Number(item.id) === Number(state.selectedId))) {
            closeSheet(true);
        }

        visible.forEach((item) => {
            if (!item.latitude || !item.longitude) {
                return;
            }

            const marker = L.marker([item.latitude, item.longitude], {
                icon: createMarkerIcon(item, Number(item.id) === Number(state.selectedId)),
            });
            marker.on("click", () => openFalla(item, true));
            marker.addTo(state.markersLayer);
        });

        if (visible.length === 0) {
            closeSheet(true);
        }

        return visible;
    }

    function buildTag(label, soft) {
        return '<span class="sheet-tag' + (soft ? " sheet-tag--soft" : "") + '">' + escapeHtml(label) + "</span>";
    }

     function openFalla(item, shouldFly) {
         state.selectedId = Number(item.id);
         renderMap();

         elements.sheetImage.src = item.image_url;
         elements.sheetImage.alt = item.name;
         elements.sheetTitle.textContent = item.name;
         elements.sheetDescription.textContent = item.description;
         elements.sheetPrize.textContent = item.prize_text;
         elements.sheetAddress.textContent = item.address;
         elements.sheetNeighborhood.textContent = item.neighborhood || "Valencia";
         elements.sheetArtist.textContent = item.artist_name || "Pendiente";
         // Almacenar coordenadas y nombre de falla en el botón de ruta para usarlas al hacer click
         elements.sheetRoute.dataset.routeLatitude = item.latitude;
         elements.sheetRoute.dataset.routeLongitude = item.longitude;
         elements.sheetRoute.dataset.routeName = item.name;
         // Mantener el href como fallback para navegadores sin soporte de geolocalización
         elements.sheetRoute.href = item.route_url;
         elements.sheetRoute.title = "Calcula y muestra una ruta real en el mapa";
         elements.sheetDetail.href = config.endpoints.detailBase + item.id;
         elements.sheetFavorite.classList.toggle("is-active", Boolean(item.is_favorite));
         elements.sheetFavorite.dataset.id = String(item.id);
         elements.sheetFavorite.dataset.type = "falla";
         elements.sheetTags.innerHTML = [
             buildTag(capitalize(item.category), false),
             buildTag(item.section_name, true),
             buildTag(item.year, true),
         ].join("");
         elements.sheet.dataset.state = "visible";

        if (shouldFly && item.latitude && item.longitude) {
            state.map.flyTo([item.latitude, item.longitude], Math.max(state.map.getZoom(), 15), {
                duration: 0.7,
            });
        }
    }

    function closeSheet(skipMapRender) {
        state.selectedId = 0;
        elements.sheet.dataset.state = "hidden";
        if (!skipMapRender) {
            renderMap();
        }
    }

    function buildAgendaCard(item) {
        const dateParts = splitDateParts(item.event_date);
        const accent = sanitizeColor(item.category_color);
        const linkedFalla = item.falla_name ? '<span class="card-meta-pill">Falla: ' + escapeHtml(item.falla_name) + "</span>" : "";
        const featuredLabel = item.is_featured ? '<span class="agenda-card-flag">Destacado</span>' : "";

        return `
            <article class="agenda-card agenda-card--premium" style="--agenda-accent: ${escapeHtml(accent)}">
                <div class="agenda-date-badge">
                    <strong>${escapeHtml(dateParts.day)}</strong>
                    <span>${escapeHtml(dateParts.month)}</span>
                </div>
                <div class="agenda-card-body">
                    <div class="agenda-card-head">
                        <div>
                            <div class="agenda-card-topline">
                                <span class="agenda-badge">${escapeHtml(item.category_name)}</span>
                                ${featuredLabel}
                            </div>
                            <strong>${escapeHtml(item.title)}</strong>
                            <p>${escapeHtml(item.description)}</p>
                        </div>
                        <button class="card-actions-button ${item.is_favorite ? "is-active" : ""}" data-favorite-type="event" data-id="${item.id}" type="button">${item.is_favorite ? "Guardado" : "Favorito"}</button>
                    </div>
                    <div class="card-meta-row">
                        <span class="card-meta-pill">${escapeHtml(dateParts.label)}</span>
                        <span class="card-meta-pill">${escapeHtml(item.start_time || "--:--")}${item.end_time ? " / " + escapeHtml(item.end_time) : ""}</span>
                        <span class="card-meta-pill">${escapeHtml(item.location_name)}</span>
                        ${linkedFalla}
                    </div>
                    <div class="card-actions">
                        <a class="is-primary" href="${escapeHtml(item.route_url)}" target="_blank" rel="noreferrer">Como llegar</a>
                        <button data-open-event-map="${item.id}" type="button">Abrir mapa</button>
                    </div>
                </div>
            </article>
        `;
    }

    function renderAgenda() {
        elements.agendaCount.textContent = String(state.events.length);

        if (state.events.length === 0) {
            elements.agendaList.innerHTML = `
                <article class="empty-card">
                    <strong>Sin eventos disponibles</strong>
                    <p>Cuando cargues actos en la base de datos apareceran aqui automaticamente.</p>
                </article>
            `;
            return;
        }

        elements.agendaList.innerHTML = state.events.map(buildAgendaCard).join("");
    }

    function buildFavoriteFallaCard(item) {
        return `
            <article class="favorite-card favorite-card--visual">
                <div class="favorite-visual-media">
                    <img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.name)}">
                </div>
                <div class="favorite-visual-body">
                    <div class="favorite-card-head">
                        <div>
                            <span class="favorite-badge">${escapeHtml(capitalize(item.category))}</span>
                            <strong>${escapeHtml(item.name)}</strong>
                        </div>
                        <button class="card-actions-button is-active" data-favorite-type="falla" data-id="${item.id}" type="button">Guardada</button>
                    </div>
                    <p>${escapeHtml(item.address)}</p>
                    <div class="card-meta-row">
                        <span class="card-meta-pill">${escapeHtml(item.section_name)}</span>
                        <span class="card-meta-pill">${escapeHtml(item.prize_text)}</span>
                    </div>
                    <div class="card-actions">
                        <button class="is-primary" data-open-falla="${item.id}" type="button">Ver en mapa</button>
                        <a href="${escapeHtml(config.endpoints.detailBase + item.id)}">Ver detalle</a>
                    </div>
                </div>
            </article>
        `;
    }

    function buildFavoriteEventCard(item) {
        const dateParts = splitDateParts(item.event_date);
        return `
            <article class="favorite-card favorite-card--event">
                <div class="favorite-card-head">
                    <div>
                        <span class="favorite-badge">${escapeHtml(item.category_name)}</span>
                        <strong>${escapeHtml(item.title)}</strong>
                    </div>
                    <button class="card-actions-button is-active" data-favorite-type="event" data-id="${item.id}" type="button">Guardado</button>
                </div>
                <p>${escapeHtml(item.location_name)}</p>
                <div class="card-meta-row">
                    <span class="card-meta-pill">${escapeHtml(dateParts.label)}</span>
                    <span class="card-meta-pill">${escapeHtml(item.start_time || "--:--")}</span>
                </div>
                <div class="card-actions">
                    <a class="is-primary" href="${escapeHtml(item.route_url)}" target="_blank" rel="noreferrer">Como llegar</a>
                </div>
            </article>
        `;
    }

    function renderFavorites() {
        const favoriteFallas = state.fallas.filter((item) => item.is_favorite);
        const favoriteEvents = state.events.filter((item) => item.is_favorite);

        elements.favoriteFallas.innerHTML = favoriteFallas.length > 0
            ? favoriteFallas.map(buildFavoriteFallaCard).join("")
            : `
                <article class="empty-card">
                    <strong>Aun no tienes fallas favoritas</strong>
                    <p>Guarda una falla desde el mapa o desde su detalle para verla aqui.</p>
                </article>
            `;

        elements.favoriteEvents.innerHTML = favoriteEvents.length > 0
            ? favoriteEvents.map(buildFavoriteEventCard).join("")
            : `
                <article class="empty-card">
                    <strong>Aun no tienes eventos favoritos</strong>
                    <p>Guarda actos desde la agenda para acceder rapido a su ruta.</p>
                </article>
            `;

        elements.profileFallaCount.textContent = String(favoriteFallas.length);
        elements.profileEventCount.textContent = String(favoriteEvents.length);
        elements.favoritesCount.textContent = String(favoriteFallas.length + favoriteEvents.length);
    }

    function renderProfile(profile) {
        const name = profile.name || "Invitado";

        elements.profileName.textContent = name;
        elements.profileEmail.textContent = profile.email || "Invitado sin correo";
        elements.profileNameInput.value = name;
        elements.profileAvatar.textContent = name.charAt(0).toUpperCase();
        elements.profileFallaCount.textContent = String(profile.favorites ? profile.favorites.fallas : 0);
        elements.profileEventCount.textContent = String(profile.favorites ? profile.favorites.events : 0);
    }

    function setActiveView(viewName) {
        elements.navButtons.forEach((button) => {
            button.classList.toggle("is-active", button.dataset.nav === viewName);
        });

        elements.views.forEach((view) => {
            view.classList.toggle("is-active", view.dataset.view === viewName);
        });

        if (viewName === "map" && state.map) {
            window.setTimeout(() => {
                state.map.invalidateSize();
            }, 120);
        }
    }

    async function updateFavorite(type, id) {
        const payload = await loadJson(config.endpoints.favorites, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                type: type,
                id: id,
            }),
        });

        if (type === "falla") {
            state.fallas = state.fallas.map((item) =>
                Number(item.id) === Number(id)
                    ? Object.assign({}, item, { is_favorite: payload.favorite })
                    : item
            );
        } else {
            state.events = state.events.map((item) =>
                Number(item.id) === Number(id)
                    ? Object.assign({}, item, { is_favorite: payload.favorite })
                    : item
            );
        }

        const selected = state.fallas.find((item) => Number(item.id) === Number(state.selectedId));
        if (selected) {
            openFalla(selected, false);
        } else {
            renderMap();
        }

        renderAgenda();
        renderFavorites();
    }

    function syncCategoryChips() {
        elements.categoryChips.forEach((chip) => {
            chip.classList.toggle("is-active", (chip.dataset.category || "all") === state.filters.category);
        });
    }

    function syncSpecialChips() {
        elements.specialChips.forEach((chip) => {
            chip.classList.toggle("is-active", (chip.dataset.special || "") === state.filters.special);
        });
    }

    function syncFilterControls() {
        elements.search.value = state.filters.query;
        elements.sectionFilter.value = state.filters.section;
        syncCategoryChips();
        syncSpecialChips();
    }

    function clearFilters() {
        state.filters = {
            query: "",
            category: "all",
            section: "all",
            special: "",
        };
        syncFilterControls();
        renderMap();
    }

    async function applyRoutePlan(planKey) {
        state.filters.query = "";
        state.filters.section = "all";

        if (planKey === "prizes") {
            state.filters.category = "all";
            state.filters.special = "prizes";
        } else if (planKey === "family") {
            state.filters.category = "infantil";
            state.filters.special = "";
        } else if (planKey === "nearby") {
            state.filters.category = "all";
            state.filters.special = "nearby";
            if (!state.userLocation) {
                await locateUser();
            }
        } else if (planKey === "favorites") {
            state.filters.category = "all";
            state.filters.special = "favorites";
        } else {
            state.filters.category = "principal";
            state.filters.special = "";
        }

        syncFilterControls();
        setActiveView("map");
        renderMap();

        // Dibujar la ruta despues del render para que no se elimine al repintar el mapa.
        const plans = routePlanDefinitions();
        const plan = plans.find((p) => p.key === planKey);
        if (plan && Array.isArray(plan.items) && plan.items.length > 0) {
            const coords = plan.items
                .map((it) => [Number(it.latitude || 0), Number(it.longitude || 0)])
                .filter((pair) => Number.isFinite(pair[0]) && Number.isFinite(pair[1]));

            if (coords.length >= 2) {
                clearRouteLine();
                state.routeLine = L.polyline(coords, {
                    color: "#3388ff",
                    weight: 4,
                    opacity: 0.9,
                }).addTo(state.map);
                state.map.fitBounds(state.routeLine.getBounds(), { padding: [50, 50] });
            }
        }
    }

    function bindFavoriteDelegation(container) {
        container.addEventListener("click", async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            const openButton = target.closest("[data-open-falla]");
            if (openButton instanceof HTMLElement) {
                const item = state.fallas.find((entry) => Number(entry.id) === Number(openButton.dataset.openFalla || 0));
                if (item) {
                    setActiveView("map");
                    openFalla(item, true);
                }
                return;
            }

            const favoriteButton = target.closest("[data-favorite-type]");
            if (favoriteButton instanceof HTMLElement) {
                await updateFavorite(favoriteButton.dataset.favoriteType || "falla", Number(favoriteButton.dataset.id || 0));
            }
        });
    }

    /**
     * Calcula una ruta real usando OSRM (OpenRouteService Routing Machine)
     * Retorna la geometría de la ruta como array de coordenadas [lat, lng]
     */
    async function calculateRoute(startLat, startLng, endLat, endLng, profile = 'foot') {
        try {
            // Validar coordenadas
            if (!Number.isFinite(startLat) || !Number.isFinite(startLng) || 
                !Number.isFinite(endLat) || !Number.isFinite(endLng)) {
                console.error("Coordenadas inválidas para calcular ruta");
                return null;
            }

            // Determinar perfil OSRM (walking o driving)
            const osrmProfile = profile === 'car' || profile === 'coche' || profile === 'driving'
                ? 'driving'
                : 'foot';

            // URL OSRM
            const url = `https://router.project-osrm.org/route/v1/${osrmProfile}/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson&steps=true`;

            const response = await fetch(url);
            if (!response.ok) {
                console.error("Error al llamar OSRM API:", response.status);
                return null;
            }

            const data = await response.json();
            if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
                console.error("OSRM no encontró ruta:", data.code);
                return null;
            }

            const route = data.routes[0];
            const coordinates = route.geometry.coordinates.map((coord) => [coord[1], coord[0]]); // Convertir [lng, lat] a [lat, lng]
            
            return {
                coordinates: coordinates,
                distance: route.distance, // metros
                duration: route.duration, // segundos
                steps: route.legs[0].steps || []
            };
        } catch (error) {
            console.error("Error calculando ruta:", error);
            return null;
        }
    }

    /**
     * Dibuja una ruta en el mapa
     */
    function drawRoute(routeData, color = '#3388ff') {
        if (!routeData || !routeData.coordinates || routeData.coordinates.length === 0) {
            console.error("Datos de ruta inválidos");
            return false;
        }

        try {
            // Limpiar ruta anterior
            clearRouteLine();

            // Dibujar polyline
            state.routeLine = L.polyline(routeData.coordinates, {
                color: color,
                weight: 5,
                opacity: 0.8,
                className: 'falla-route-line'
            }).addTo(state.map);

            // Ajustar vista para ver la ruta
            const bounds = state.routeLine.getBounds();
            state.map.fitBounds(bounds, {
                padding: [50, 50],
                maxZoom: 16
            });

            return true;
        } catch (error) {
            console.error("Error dibujando ruta:", error);
            return false;
        }
    }

    /**
     * Convierte metros a km con decimal
     */
    function metersToKm(meters) {
        return (meters / 1000).toFixed(2);
    }

    /**
     * Convierte segundos a formato "X h Y min" o "Y min"
     */
    function secondsToTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0) {
            return `${hours} h ${minutes} min`;
        }
        return `${minutes} min`;
    }

    /**
     * Inicia la ruta entre la posición del usuario y una falla
     * Busca la posición del usuario, calcula la ruta y la dibuja en el mapa
     */
    async function initiateRoute(fallaLatitude, fallaLongitude, fallaName, transportMode = 'foot') {
        if (!state.userLocation) {
            // Si no tenemos ubicación, pedirla al usuario
            await locateUser();
            if (!state.userLocation) {
                alert("No se pudo obtener tu ubicación. Activa geolocalización e intenta de nuevo.");
                return;
            }
        }

        // Mostrar estado de carga
        const sheetRoute = elements.sheetRoute;
        if (sheetRoute) {
            sheetRoute.textContent = "Calculando ruta...";
            sheetRoute.disabled = true;
        }

        try {
            // Calcular ruta
            const routeData = await calculateRoute(
                state.userLocation.lat,
                state.userLocation.lng,
                fallaLatitude,
                fallaLongitude,
                transportMode
            );

            if (!routeData) {
                throw new Error("No se pudo calcular la ruta");
            }

            // Dibujar ruta
            const drawn = drawRoute(routeData, '#2f67b1');
            if (!drawn) {
                throw new Error("No se pudo dibujar la ruta en el mapa");
            }

            // Actualizar información en el panel inferior
            const distanceKm = metersToKm(routeData.distance);
            const duration = secondsToTime(routeData.duration);
            const modeLabel = transportMode === 'car' || transportMode === 'coche' || transportMode === 'driving'
                ? '🚗 COCHE'
                : '🚶 A PIE';

            // Mostrar información en la consola (puedes adaptarla a un elemento UI si existe)
            console.log(`Ruta hacia ${fallaName}`);
            console.log(`Distancia: ${distanceKm} km`);
            console.log(`Duración: ${duration}`);
            console.log(`Modo: ${modeLabel}`);

            // Si existe un elemento para mostrar la información, actualizarlo
            // Por ahora, actualizamos el botón para indicar que la ruta está lista
            if (sheetRoute) {
                sheetRoute.textContent = `📍 ${distanceKm} km • ${duration}`;
                sheetRoute.title = `Ruta activada: ${fallaName}\nDistancia: ${distanceKm} km\nDuración: ${duration}\nModo: ${modeLabel}`;
            }
        } catch (error) {
            console.error("Error iniciando ruta:", error);
            alert("No se pudo calcular la ruta. Intenta nuevamente.");
            if (sheetRoute) {
                sheetRoute.textContent = "Iniciar ruta";
                sheetRoute.disabled = false;
            }
        }
    }

    function bindEvents() {
        elements.search.addEventListener("input", () => {
            state.filters.query = elements.search.value;
            renderMap();
        });

        elements.sectionFilter.addEventListener("change", () => {
            state.filters.section = elements.sectionFilter.value;
            renderMap();
        });

        elements.categoryChips.forEach((chip) => {
            chip.addEventListener("click", () => {
                state.filters.category = chip.dataset.category || "all";
                syncCategoryChips();
                renderMap();
            });
        });

        elements.specialChips.forEach((chip) => {
            chip.addEventListener("click", async () => {
                const nextSpecial = chip.dataset.special || "";
                state.filters.special = state.filters.special === nextSpecial ? "" : nextSpecial;

                if (state.filters.special === "nearby" && !state.userLocation) {
                    await locateUser();
                }

                syncSpecialChips();
                renderMap();
            });
        });

        elements.clearButtons.forEach((button) => {
            button.addEventListener("click", clearFilters);
        });

        elements.navButtons.forEach((button) => {
            button.addEventListener("click", () => {
                setActiveView(button.dataset.nav || "map");
            });
        });

        elements.jumpButtons.forEach((button) => {
            button.addEventListener("click", () => {
                setActiveView(button.dataset.viewJump || "favorites");
            });
        });

        elements.locateButtons.forEach((button) => {
            button.addEventListener("click", locateUser);
        });

        elements.resetMapButton.addEventListener("click", () => {
            state.map.flyTo([config.map.lat, config.map.lng], config.map.zoom, { duration: 0.6 });
        });

        elements.closeSheetButton.addEventListener("click", () => {
            closeSheet(false);
        });

        elements.sheetFavorite.addEventListener("click", async () => {
             const id = Number(elements.sheetFavorite.dataset.id || 0);
             if (id > 0) {
                 await updateFavorite("falla", id);
             }
         });

         // Event listener para el botón "Iniciar ruta"
         elements.sheetRoute.addEventListener("click", async (event) => {
             event.preventDefault();

             const latitude = Number(elements.sheetRoute.dataset.routeLatitude || 0);
             const longitude = Number(elements.sheetRoute.dataset.routeLongitude || 0);
             const name = elements.sheetRoute.dataset.routeName || "Destino";
             const mode = elements.sheetRoute.dataset.transportMode || "foot";

             if (!latitude || !longitude) {
                 console.error("Coordenadas de ruta inválidas");
                 alert("No se puede iniciar la ruta sin coordenadas válidas.");
                 return;
             }

             await initiateRoute(latitude, longitude, name, mode);
         });

         elements.routePlans.addEventListener("click", async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            const routeButton = target.closest("[data-route-plan]");
            if (routeButton instanceof HTMLElement) {
                await applyRoutePlan(routeButton.dataset.routePlan || "principal");
            }
        });

        elements.agendaList.addEventListener("click", async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            const favoriteButton = target.closest("[data-favorite-type]");
            if (favoriteButton instanceof HTMLElement) {
                await updateFavorite(favoriteButton.dataset.favoriteType || "event", Number(favoriteButton.dataset.id || 0));
                return;
            }

            const openMapButton = target.closest("[data-open-event-map]");
            if (openMapButton instanceof HTMLElement) {
                const eventId = Number(openMapButton.dataset.openEventMap || 0);
                const currentEvent = state.events.find((item) => Number(item.id) === eventId);

                if (currentEvent) {
                    setActiveView("map");

                    const linkedFalla = state.fallas.find((item) => normalize(item.name) === normalize(currentEvent.falla_name));
                    if (linkedFalla) {
                        openFalla(linkedFalla, true);
                    } else if (currentEvent.latitude && currentEvent.longitude) {
                        state.map.flyTo([currentEvent.latitude, currentEvent.longitude], 15, { duration: 0.6 });
                    }
                }
            }
        });

        bindFavoriteDelegation(elements.favoriteFallas);
        bindFavoriteDelegation(elements.featuredFallas);

        elements.favoriteEvents.addEventListener("click", async (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) {
                return;
            }

            const favoriteButton = target.closest("[data-favorite-type]");
            if (favoriteButton instanceof HTMLElement) {
                await updateFavorite("event", Number(favoriteButton.dataset.id || 0));
            }
        });

        elements.profileForm.addEventListener("submit", async (event) => {
            event.preventDefault();

            try {
                const payload = await loadJson(config.endpoints.profile, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        name: elements.profileNameInput.value,
                    }),
                });
                renderProfile(payload.profile);
                elements.profileFeedback.textContent = "Nombre actualizado correctamente.";
            } catch (error) {
                elements.profileFeedback.textContent = error.message || "No se pudo guardar el nombre.";
            }
        });
    }

    async function locateUser() {
        if (!navigator.geolocation) {
            return;
        }

        elements.locateButtons.forEach((button) => {
            button.disabled = true;
            button.classList.add("is-loading");
        });

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    state.userLocation = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                    };

                    if (state.userMarker) {
                        state.userMarker.remove();
                    }

                    state.userMarker = L.circleMarker([state.userLocation.lat, state.userLocation.lng], {
                        radius: 9,
                        color: "#2f67b1",
                        weight: 3,
                        fillColor: "#ffffff",
                        fillOpacity: 1,
                    }).addTo(state.map);

                    state.map.flyTo([state.userLocation.lat, state.userLocation.lng], 14, { duration: 0.6 });
                    renderMap();
                    resolve();
                },
                () => resolve(),
                {
                    enableHighAccuracy: true,
                    timeout: 8000,
                }
            );
        }).finally(() => {
            elements.locateButtons.forEach((button) => {
                button.disabled = false;
                button.classList.remove("is-loading");
            });
        });
    }

    async function init() {
        initMap();
        bindEvents();

        try {
            await loadData();
        } catch (error) {
            elements.mapEmpty.hidden = false;
            elements.mapEmpty.innerHTML = "<strong>No se pudo cargar la app</strong><p>Revisa la conexion con la base de datos o los endpoints PHP.</p>";
            elements.agendaList.innerHTML = "";
            elements.featuredFallas.innerHTML = "";
            elements.routePlans.innerHTML = "";
        }
    }

    init();
})();
