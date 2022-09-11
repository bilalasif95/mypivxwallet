// 'use strict';

import { networkEnabled, disableNetwork } from "./settings";
import { createAlert } from "./misc";
import { domBalanceReloadRef, domGuiAddressRef, domBalanceReloadStakingRef, domGuiBalanceRef, domAvailToDelegateRef, domGuiBalanceStakingRef, domGuiBalanceBoxStakingRef, domAvailToUndelegateRef, domAddress1s, domTxOutput, domSimpleTXs, domValue1s, cExplorer } from "../App";
import { publicKeyForNetwork } from "./wallet";
import axios from "axios";

function networkError(i18n) {
  if (disableNetwork()) {
    createAlert(i18n, 'warning', "You can attempt re-connect via the Settings.", "", "Failed to synchronize!", "Please try again later.");
  }
}

let cachedBlockCount = 0;
if (networkEnabled) {
  var getBlockCount = function (i18n) {
    axios.get(cExplorer.url + "/api/v2/api").then((response) => {
      const data = response.data;
      // If the block count has changed, refresh all of our data!
      domBalanceReloadRef.current.className = domBalanceReloadRef.current.className.replace(/ playAnim/g, "");
      domBalanceReloadStakingRef.current.className = domBalanceReloadStakingRef.current.className.replace(/ playAnim/g, "");
      if (data.backend.blocks > cachedBlockCount) {
        console.log("New block detected! " + cachedBlockCount + " --> " + data.backend.blocks);
        if (publicKeyForNetwork)
          getUTXOs(i18n);
      }
      cachedBlockCount = data.backend.blocks;
    }).catch(() => {
      networkError(i18n);
    })
  }
  const COIN = 1e8;
  // var getUnspentTransactions = function (i18n) {
  //   axios.get("https://chainz.cryptoid.info/pivx/api.dws?q=unspent&active=" + domGuiAddressRef.current.innerHTML + "&key=fb4fd0981734").then((response) => {
  //     const data = response.data
  //     let cachedUTXOs = [];
  //     if (!data.unspent_outputs || data.unspent_outputs.length === 0) {
  //       console.log('No unspent Transactions');
  //       errorNoticeRef.current.innerHTML = `<div class="alert alert-danger" role="alert"><h4>${i18n.t("Note")}</h4><h5>${i18n.t("You don't have any funds, get some coins first!")}</h5></div>`;
  //     } else {
  //       errorNoticeRef.current.innerHTML = '';
  //       // Standardize the API UTXOs into a simplified MPW format
  //       data.unspent_outputs.map(cUTXO => cachedUTXOs.push({
  //         'id': cUTXO.tx_hash,
  //         'vout': cUTXO.tx_ouput_n,
  //         'sats': cUTXO.value,
  //         'script': cUTXO.script
  //       }));
  //       // Update the GUI with the newly cached UTXO set
  //       function getBalance(updateGUI) {
  //         const nBalance = cachedUTXOs.reduce((a, b) => a + b.sats, 0);

  //         // Update the GUI too, if chosen
  //         if (updateGUI) {
  //           // Set the balance, and adjust font-size for large balance strings
  //           const nLen = (nBalance / COIN).toString().length;
  //           domGuiBalanceRef.current.innerText = (nBalance / COIN).toFixed(nLen >= 4 ? 0 : 2);
  //           domAvailToDelegateRef.current.innerText = "Available: ~" + (nBalance / COIN).toFixed(2) + " PIV";
  //         }

  //         return nBalance;
  //       }
  //       getBalance(true);
  //     }
  //   }).catch(() => {
  //     networkError(i18n);
  //   })
  //   // In parallel, fetch Cold Staking UTXOs
  //   getDelegatedUTXOs(i18n);
  // }
  var arrUTXOsToValidate = [];
  let cachedUTXOs = [];
  let arrDelegatedUTXOs = [];

  var getBalance = (updateGUI) => {
    const nBalance = cachedUTXOs.reduce((a, b) => a + b.sats, 0);

    // Update the GUI too, if chosen
    if (updateGUI) {
      // Set the balance, and adjust font-size for large balance strings
      const nLen = (nBalance / COIN).toFixed(2).length;
      domGuiBalanceRef.current.innerText = (nBalance / COIN).toFixed(nLen >= 6 ? 0 : 2);
      domAvailToDelegateRef.current.innerText = "Available: ~" + (nBalance / COIN).toFixed(2) + " PIV";
    }

    return nBalance;
  }

  var getStakingBalance = (updateGUI) => {
    const nBalance = arrDelegatedUTXOs.reduce((a, b) => a + b.sats, 0);

    if (updateGUI) {
      // Set the balance, and adjust font-size for large balance strings
      domGuiBalanceStakingRef.current.innerText = Math.floor(nBalance / COIN);
      domGuiBalanceBoxStakingRef.current.style.fontSize = Math.floor(nBalance / COIN).toString().length >= 4 ? "large" : "x-large";
      domAvailToUndelegateRef.current.innerText = "Staking: ~" + (nBalance / COIN).toFixed(2) + " PIV";
    }

    return nBalance;
  }

  var acceptUTXO = (i18n) => {
    // Cancel if the queue is empty: no wasting precious bandwidth & CPU cycles!
    if (!arrUTXOsToValidate.length) return;

    // var arrUTXOsToSearch = [];
    // let arrDelegatedUTXOs = [];
    // var searchUTXO = function (i18n) {
    //   if (!arrUTXOsToSearch.length) return;
    axios.get(cExplorer.url + "/api/v2/tx-specific/" + arrUTXOsToValidate[0].txid).then((response) => {
      const data = response.data

      for (const cVout of data.vout) {
        // TODO: Determine if this is useful or not? I don't remember what this is, or why I added it.
        if (cVout.spent) continue;
        // if (cVout.scriptPubKey.type === 'coldstake' && cVout.scriptPubKey.addresses.includes(domGuiAddressRef.current.innerHTML)) {
        //   if (!arrDelegatedUTXOs.find(a => a.id === data.txid && a.vout === cVout.n)) {
        //     arrDelegatedUTXOs.push({
        //       'id': data.txid,
        //       'vout': cVout.n,
        //       'sats': Number(cVout.value * COIN),
        //       'script': cVout.scriptPubKey.hex
        //     });
        //   }

        // Search for our address
        if (!cVout.scriptPubKey.addresses) continue;
        if (!cVout.scriptPubKey.addresses.includes(publicKeyForNetwork)) continue;

        // Convert to MPW format
        const cUTXO = {
          'id': data.txid,
          'vout': cVout.n,
          'sats': cVout.value * COIN,
          'script': cVout.scriptPubKey.hex
        }

        // Determine the UTXO type, and use it accordingly
        if (cVout.scriptPubKey.type === 'pubkeyhash') {
          // P2PKH type (Pay-To-Pub-Key-Hash)
          cachedUTXOs.push(cUTXO);
        } else
          if (cVout.scriptPubKey.type === 'coldstake') {
            // Cold Stake type
            arrDelegatedUTXOs.push(cUTXO);
          }
      }
      // arrUTXOsToSearch.shift();

      // Shift the queue and update the UI
      getBalance(true);
      getStakingBalance(true);
      // if (arrUTXOsToSearch.length) searchUTXO(i18n);

      // Loop validation until queue is empty
      arrUTXOsToValidate.shift();
      if (arrUTXOsToValidate.length) acceptUTXO(i18n);
    }).catch(() => {
      networkError(i18n);
    })
  }

  // var getDelegatedUTXOs = function (i18n) {
  //   if (arrUTXOsToSearch.length) return;

  var getUTXOs = (i18n) => {
    // Don't fetch UTXOs if we're already scanning for them!
    if (arrUTXOsToValidate.length) return;
    axios.get(cExplorer.url + "/api/v2/utxo/" + domGuiAddressRef.current.innerHTML).then((response) => {
      arrUTXOsToValidate = response.data;
      // arrDelegatedUTXOs = [];
      // searchUTXO(i18n);

      // Clear our UTXOs and begin accepting refreshed ones (TODO: build an efficient 'set merge' algo)
      cachedUTXOs = []; arrDelegatedUTXOs = [];
      acceptUTXO(i18n);
    }).catch(() => {
      networkError(i18n);
    })
  }

  var sendTransaction = function (i18n, hex, msg = '', boldMessage) {
    axios.get(cExplorer.url + "/api/v2/sendtx/" + hex).then((response) => {
      const data = response.data;
      if (data.result && data.result.length === 64) {
        console.log('Transaction sent! ' + data.result);
        const donationAddress = "DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb";
        if (domAddress1s.value !== donationAddress)
          domTxOutput.innerHTML = ('<h4 style="color:green; font-family:mono !important;">' + data.result + '</h4>');
        else
          domTxOutput.innerHTML = ('<h4 style="color:green">' + i18n.t('thank_you') + '💜💜💜<br><span style="font-family:mono !important">' + data.result + '</span></h4>');
        domSimpleTXs.style.display = 'none';
        domAddress1s.value = '';
        domValue1s.innerHTML = '';
        createAlert(i18n, 'success', msg || 'Transaction sent!', boldMessage, "", "", msg ? (1250 + (msg.length * 50)) : 1500);
      } else {
        console.log('Error sending transaction: ' + data.result);
        createAlert(i18n, 'warning', 'Transaction Failed!', "", "", "", 1250);
        // Attempt to parse and prettify JSON (if any), otherwise, display the raw output.
        let strError = data.error;
        try {
          strError = JSON.stringify(JSON.parse(data), null, 4);
          console.log('parsed');
        } catch (e) { console.log('no parse!'); console.log(e); }
        domTxOutput.innerHTML = '<h4 style="color:red;font-family:mono !important;"><pre style="color: inherit;">' + strError + "</pre></h4>";
      }
    }).catch(() => {
      networkError(i18n);
    })
  }

  var calculatefee = function (bytes) {
    // TEMPORARY: Hardcoded fee per-byte
    return (bytes * 50) / COIN; // 50 sat/byte
  }
}

export { getUTXOs, getBalance, getStakingBalance, calculatefee, sendTransaction, getBlockCount };