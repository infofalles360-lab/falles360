(function () {
    if (!window.FALLES_DETAIL) {
        return;
    }

    const config = window.FALLES_DETAIL;
    const falla = config.falla;
    const favoriteButton = document.getElementById("detailFavorite");

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

    function createMap() {
        if (!falla.latitude || !falla.longitude) {
            return;
        }

        const map = L.map("detailMap", {
            zoomControl: false,
            attributionControl: false,
        }).setView([falla.latitude, falla.longitude], 16);

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 19,
        }).addTo(map);

        L.control.zoom({ position: "bottomright" }).addTo(map);
        L.circleMarker([falla.latitude, falla.longitude], {
            radius: 10,
            color: "#ff6235",
            weight: 4,
            fillColor: "#fff8f1",
            fillOpacity: 1,
        }).addTo(map);
    }

    async function toggleFavorite() {
        const headers = new Headers({
            "Content-Type": "application/json",
        });
        const csrfToken = readCsrfToken();

        if (csrfToken) {
            headers.set("X-CSRF-Token", decodeURIComponent(csrfToken));
        }

        const response = await fetch(config.favoritesEndpoint, {
            method: "POST",
            credentials: "same-origin",
            headers,
            body: JSON.stringify({
                type: "falla",
                id: falla.id,
            }),
        });
        const payload = await response.json();

        if (!response.ok || !payload.ok) {
            return;
        }

        favoriteButton.classList.toggle("is-active", Boolean(payload.favorite));
    }

    favoriteButton.classList.toggle("is-active", Boolean(falla.is_favorite));
    favoriteButton.addEventListener("click", toggleFavorite);
    createMap();
})();
