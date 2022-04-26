// 'use strict';

// Alert - Do NOT display arbitrary / external errors, the use of `.innerHTML` allows for input styling at this cost.
// Supported types: success, info, warning
export function createAlert(i18n, type, message, boldMessage, textWithBold) {
    // DOM Cache
    const domAlertPos = document.getElementsByClassName("alertPositioning")[0];

    const domAlert = document.createElement("div");
    domAlert.className = "alertpop " + type;
    // Message
    domAlert.innerHTML = boldMessage ? `<b>${i18n.t(boldMessage)}</b><br/>${i18n.t(message)}` : textWithBold ? `<b>${i18n.t(boldMessage)}</b> ${i18n.t(textWithBold)}<br/>${i18n.t(message)}` : i18n.t(message);
    // On Click: Delete alert from DOM after close animation
    domAlert.addEventListener("click", () => {
        domAlert.style.opacity = "0";
        setTimeout(() => {
            domAlert.remove();
        }, 600);
    });
    domAlertPos.appendChild(domAlert);
}