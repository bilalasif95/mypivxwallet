// 'use strict';

// Alert - Do NOT display arbitrary / external errors, the use of `.innerHTML` allows for input styling at this cost.
// Supported types: success, info, warning
export function createAlert(i18n, type, message, boldMessage, textWithBold, textWithBoldMessage, timeout = 0, extraMessage, MIN_PASS_LENGTH, text) {
    // DOM Cache
    const domAlertPos = document.getElementsByClassName("alertPositioning")[0];

    const domAlert = document.createElement("div");
    domAlert.className = "alertpop " + type;
    // Message
    domAlert.innerHTML = boldMessage ? `<b>${i18n.t(boldMessage)}</b><br/>${i18n.t(message)}` : textWithBold ? `<b>${i18n.t(textWithBoldMessage)}</b> ${i18n.t(textWithBold)}<br/>${i18n.t(message)}` : extraMessage ? `${i18n.t(message)}<br/>${i18n.t(extraMessage)} <b>${MIN_PASS_LENGTH} ${i18n.t(text)}</b>` : i18n.t(message);
    domAlert.destroy = () => {
        // Fully destroy timers + DOM elements, no memory leaks!
        clearTimeout(domAlert.timer);
        domAlert.style.opacity = "0";
        setTimeout(() => {
            domAlert.remove();
        }, 600);
    }
    // On Click: Delete alert from DOM after close animation.
    domAlert.addEventListener("click", domAlert.destroy);
    // On Timeout: Delete alert from DOM after a period of inactive time.
    if (timeout > 0) domAlert.timer = setTimeout(domAlert.destroy, timeout);
    domAlertPos.appendChild(domAlert);
}