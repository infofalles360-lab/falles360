window.FALLES360_WAITLIST = Object.assign(
  {
    endpoint: "https://formsubmit.co/info.falles360@gmail.com",
    countEndpoint: "",
    initialCount: 0,
    payloadFormat: "json",
    source: "github_pages_whitelist",
    privacyHref: "./privacy.html",
    landingHref: "./index.html",
    successTitle: "Ya estas dentro.",
    successMessage: "Solicitud recibida. Te hemos enviado una confirmacion; revisa tambien Spam o Promociones.",
    successHref: "https://infofalles360-lab.github.io/fallas360-whitelist/?enviado=1",
    formHref: "https://infofalles360-lab.github.io/fallas360-whitelist/",
  },
  window.FALLES360_WAITLIST || {},
);

// FormSubmit envia cada solicitud por email sin necesitar PHP ni base de datos.
