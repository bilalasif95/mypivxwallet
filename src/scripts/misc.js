// 'use strict';

// Alert - Do NOT display arbitrary / external errors, the use of `.innerHTML` allows for input styling at this cost.
// Supported types: success, info, warning
import { qrcode } from "./libs/qrcode";

export function createAlert(i18n, type, message, boldMessage, textWithBold, textWithBoldMessage, timeout = 0, extraMessage, MIN_PASS_LENGTH, text, dynamicValue, dynamicValueMessage, dynamicValueForExtraMessage, extraDynamicValue, extraDynamicValueMessage) {
    // DOM Cache
    const domAlertPos = document.getElementsByClassName("alertPositioning")[0];

    const domAlert = document.createElement("div");
    domAlert.classList.add("alertpop");
    domAlert.classList.add(type);
    // domAlert.classList.add("alertpop " + type);
    // Message
    domAlert.innerHTML = boldMessage ? `<b>${i18n.t(boldMessage)}</b><br/>${i18n.t(message)}` : textWithBold ? `<b>${i18n.t(textWithBoldMessage)}</b> ${i18n.t(textWithBold)}<br/>${i18n.t(message)}` : extraMessage ? `${i18n.t(message)}<br/>${i18n.t(extraMessage)} <b>${MIN_PASS_LENGTH} ${i18n.t(text)}</b>` : dynamicValue ? `<b>${i18n.t(dynamicValueMessage)}</b><br/>${i18n.t(message, { name: dynamicValue })}` : extraDynamicValue ? `<b>${i18n.t(dynamicValueMessage)}</b><br/>${i18n.t(message, { name: dynamicValueForExtraMessage })} ${i18n.t(extraDynamicValueMessage, { name: extraDynamicValue })}` : i18n.t(message);
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

// Generates and sets a QRCode image from a string and dom element
export function createQR(strData = '', domImg) {
    // QRCode class consists of 'typeNumber' & 'errorCorrectionLevel'
    const cQR = qrcode(4, 'L');
    cQR.addData(strData);
    cQR.make();
    domImg.innerHTML = cQR.createImgTag();
    domImg.firstChild.style.borderRadius = '8px';
}