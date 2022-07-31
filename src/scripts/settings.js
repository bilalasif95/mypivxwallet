// 'use strict';
import { networkEnabledVar } from "../App";
// --- Default Settings
var debug = false;
var networkEnabled = true;

// Users need not look below here.
// ------------------------------
// Global Keystore / Wallet Information
// var publicKeyForNetwork;
// var privateKeyForTransactions;
// var walletAlreadyMade = 0;

// --- DOM Cache
// const domNetwork = document.getElementById('Network');
// const domDebug = document.getElementById('Debug');

// Display the default settings directly in the UI
// domNetwork.innerHTML = '<b> Network:</b> ' + (networkEnabled ? 'Enabled' : 'Disabled');
// domDebug.innerText = debug ? '<b>DEBUG MODE ON</b>' : '';

// --- Settings Functions
function toggleDebug() {
    debug = !debug;
    // domDebug.innerHTML = debug ? '<b>DEBUG MODE ON</b>' : '';
}

function toggleNetwork() {
    networkEnabled = networkEnabledVar;
    networkEnabled = !networkEnabled;
    // domNetwork.innerHTML = '<b> Network:</b> ' + (networkEnabled ? 'Enabled' : 'Disabled');
    return networkEnabled;
}

// Enable the network, return true if successful.
// function enableNetwork() {
//     if (!networkEnabled) return toggleNetwork();
//     return false;
// }

// Disable the network, return true if successful.
function disableNetwork() {
    if (networkEnabledVar) return !toggleNetwork();
    return false;
}

export { debug, networkEnabled, disableNetwork, toggleDebug, toggleNetwork };