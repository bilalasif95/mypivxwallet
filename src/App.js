import './App.css';
import { withTranslation } from 'react-i18next'
import { createRef, useEffect, useState } from 'react';
// import { debug, networkEnabled, toggleDebug, toggleNetwork } from "./scripts/settings";
import { hasEncryptedWallet, decryptWallet, importWallet, generateWallet, encryptWallet } from "./scripts/wallet";
import { calculatefee, sendTransaction, getBlockCount } from "./scripts/network";
import { bitjs } from "./scripts/bitTrx";
import { createAlert } from "./scripts/misc";
// import { jdenticon } from "./scripts/libs/jdenticon.min";

const privateKeyRef = createRef();
const domGenKeyWarningRef = createRef();
const domEncryptWarningTxtRef = createRef();
const domEncryptBtnTxtRef = createRef();
const domEncryptPasswordBoxRef = createRef();
const domEncryptPasswordFirstRef = createRef();
const domEncryptPasswordSecondRef = createRef();
const guiViewKeyRef = createRef();
const domPrivateTxtRef = createRef();
const domGuiAddressRef = createRef();
const domGuiBalanceRef = createRef();
const domGuiBalanceBoxRef = createRef();
const domPrivateQrRef = createRef();
const domPublicQrRef = createRef();
const domModalQrLabelRef = createRef();
const domModalQRRef = createRef();
const domIdenticonRef = createRef();
const domGuiWalletRef = createRef();
const domPrefixRef = createRef();
const domGenerateWalletRef = createRef();
const domImportWalletRef = createRef();
const domImportWalletTextRef = createRef();
const domAccessWalletBtnRef = createRef();
const wToggleRef = createRef();
const domBalanceReloadRef = createRef();
const domBalanceReloadStakingRef = createRef();
const domGenVanityWalletRef = createRef();
const domAccessWalletRef = createRef();
const errorNoticeRef = createRef();
const domGuiBalanceStakingRef = createRef();
const domAvailToDelegateRef = createRef();
const domAvailToUndelegateRef = createRef();
const domGuiBalanceBoxStakingRef = createRef();
var networkEnabledVar = true;
var publicKeyForNetwork;

function App(props) {
  var privateKeyForTransactions;
  var addresschange;
  var totalSent;
  var valuechange;
  const { i18n } = props;
  const [debug, setDebug] = useState(false);
  const [networkEnabled, setNetworkEnabled] = useState(true);
  function toggleDebug() {
    setDebug(!debug);
  }
  function toggleNetwork() {
    setNetworkEnabled(!networkEnabled);
    networkEnabledVar = !networkEnabledVar
  }

  // Base58 Encoding Map
  const MAP_B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  function onLanguageChange(lang) {
    i18n.changeLanguage(lang)
  }
  const startRef = createRef();
  useEffect(() => {
    i18n.changeLanguage("en");
    startRef.current.click();
  }, []);


  //  IMPORTANT: CHAIN PARAMS BELOW, DO NOT EDIT UNLESS YOU'RE ABSOLUTELY CERTAIN YOU KNOW WHAT YOU'RE DOING

  // In most BTC-derived coins, the below parameters can be found in the 'src/chainparams.cpp' Mainnet configuration.
  // These below params share the same names as the CPP params, so finding and editing these is easy-peasy!

  /* chainparams */
  const PUBKEY_PREFIX = "D";
  // const PUBKEY_ADDRESS = 30;
  // const SECRET_KEY = 212;
  const COIN = 1e8;

  /* Internal tweaking parameters */
  // A new encryption password must be 'at least' this long.
  const MIN_PASS_LENGTH = 6;

  // Cool stuff
  const donationAddress = "DLabsktzGMnsK5K9uRTMCF6NoYNY6ET4Bb";

  // WALLET STATE DATA
  let cachedUTXOs = [];
  let arrDelegatedUTXOs = [];
  // let cachedBlockCount = 0;
  let cachedColdStakeAddr = "";

  // const nSecp256k1 = nobleSecp256k1.default;

  // Cached DOM elements
  // const domStart = document.getElementById("start");
  const domNavbarTogglerRef = createRef();
  // const domNavbarToggler = document.getElementById("navbarToggler");
  // const domGuiStaking = document.getElementById('guiStaking');
  // const domGuiWallet = document.getElementById('guiWallet');
  // const domNetwork = document.getElementById('Network');
  // const domDebug = document.getElementById('Debug');
  // const domBalanceReload = document.getElementById("balanceReload");
  // const domBalanceReloadStaking = document.getElementById("balanceReloadStaking");
  // const domGuiBalanceStaking = document.getElementById("guiBalanceStaking");
  // const domGuiBalanceBoxStaking = document.getElementById("guiBalanceBoxStaking");
  const domTxTab = document.getElementById("txTab");
  const domSimpleTXs = document.getElementById("simpleTransactions");
  const domSimpleTXsDropdown = document.getElementById("simpleTransactionsDropdown");
  const domAddress1s = document.getElementById("address1s");
  const domValue1s = document.getElementById("value1s");
  // const domGuiViewKey = document.getElementById('guiViewKey');
  // const domModalQR = document.getElementById('ModalQR');
  // const domModalQrLabel = document.getElementById('ModalQRLabel');
  const [prefix, setPrefix] = useState(PUBKEY_PREFIX);
  // const domWalletToggle = document.getElementById("wToggle");
  const domVanityUiButtonTxt = document.getElementById("vanButtonText");
  const domGenIt = document.getElementById("genIt");
  const domHumanReadable = document.getElementById("HumanReadable");
  const domTxOutput = document.getElementById("transactionFinal");
  const domReqDesc = document.getElementById('reqDesc');
  const domReqDisplay = document.getElementById('reqDescDisplay');
  // const domIdenticon = document.getElementById("identicon");

  // const domAvailToDelegate = document.getElementById('availToDelegate');
  // const domAvailToUndelegate = document.getElementById('availToUndelegate');

  function getBalance(updateGUI = false) {
    const nBalance = cachedUTXOs.reduce((a, b) => a + b.sats, 0);

    // Update the GUI too, if chosen
    if (updateGUI) {
      // Set the balance, and adjust font-size for large balance strings
      const nLen = (nBalance / COIN).toString().length;
      domGuiBalanceRef.current.innerText = (nBalance / COIN).toFixed(nLen >= 4 ? 0 : 2);
      domAvailToDelegateRef.current.innerText = "Available: ~" + (nBalance / COIN).toFixed(2) + " PIV";
    }

    return nBalance;
  }

  function getStakingBalance(updateGUI = false) {
    const nBalance = arrDelegatedUTXOs.reduce((a, b) => a + b.sats, 0);

    if (updateGUI) {
      // Set the balance, and adjust font-size for large balance strings
      domGuiBalanceStakingRef.current.innerText = Math.floor(nBalance / COIN);
      domGuiBalanceBoxStakingRef.current.style.fontSize = Math.floor(nBalance / COIN).toString().length >= 4 ? "large" : "x-large";
      domAvailToUndelegateRef.current.innerText = "Staking: ~" + (nBalance / COIN).toFixed(2) + " PIV";
    }

    return nBalance;
  }

  // URL-Query request processing
  const queryString = window.location.search;
  const urlParams = new URLSearchParams(queryString);
  let requestTo;
  let requestAmount;
  // Check for a payment request
  if (urlParams.has('pay') && urlParams.has('amount')) {
    requestTo = urlParams.get('pay');
    requestAmount = parseFloat(urlParams.get('amount'));
    console.log(requestTo + " " + requestAmount);
    // We have our payment request info, wait until the page is fully loaded then display the payment request via .onload
  }

  let audio = null;
  function playMusic() {
    if (audio === null)
      audio = new Audio('assets/music.mp3');
    if (audio.paused || audio.ended) {
      startDisco();
    } else {
      stopDisco();
    }
  }

  function startDisco() {
    audio.play();
    for (const domImg of document.getElementsByTagName('img')) {
      domImg.classList.add("discoFilter");
    }
  }

  function stopDisco() {
    audio.pause();
    for (const domImg of document.getElementsByTagName('img')) {
      domImg.classList.remove("discoFilter");
    }
  }

  function toClipboard(element, caller) {
    let nCopy = document.getElementById(element);
    caller = document.getElementById(caller);
    let nClipboard = document.getElementById('clipboard');
    nClipboard.value = nCopy.value || nCopy.innerHTML;
    nClipboard.select();
    nClipboard.setSelectionRange(0, 99999);
    if (!navigator.clipboard) {
      document.execCommand("copy");
    } else {
      navigator.clipboard.writeText(nCopy.innerHTML);
    }

    caller.className += " fa-check";
    caller.className = caller.className.replace(/ fa-clipboard/g, '');
    caller.style.cursor = "default";
    setTimeout(() => {
      caller.className += " fa-clipboard";
      caller.className = caller.className.replace(/ fa-check/g, '');
      caller.style.cursor = "pointer";
    }, 1000);
  }

  function openDonatePage() {
    domTxTab.click();
    if (domSimpleTXs.style.display === 'none')
      domSimpleTXsDropdown.click();
    domAddress1s.value = donationAddress;
    domValue1s.focus();
  }

  let viewPrivKey = false;
  function toggleKeyView() {
    viewPrivKey = !viewPrivKey;
    guiViewKeyRef.current.innerHTML = viewPrivKey ? 'Privkey QR' : 'Pubkey QR';
    domPrivateTxtRef.current.style.display = viewPrivKey ? 'block' : 'none';
    domPrivateQrRef.current.style.display = viewPrivKey ? 'block' : 'none';
    domPublicQrRef.current.style.display = !viewPrivKey ? 'block' : 'none';
  }

  function hideAllWalletOptions() {
    // Hide and Reset the Vanity address input
    setPrefix(PUBKEY_PREFIX);
    domPrefixRef.current.style.display = 'none';
    // Hide 'generate wallet'
    domGenerateWalletRef.current.style.display = 'none';
    // Hide 'import wallet'
    domImportWalletRef.current.style.display = 'none';
    // Hide 'vanity wallet'
    domGenVanityWalletRef.current.style.display = 'none';
    // Hide 'access wallet'
    domAccessWalletRef.current.style.display = 'none';
  }

  function toggleWallet() {
    var toggle = wToggleRef.current.innerHTML;
    // Hide and Reset the Vanity address input
    setPrefix(PUBKEY_PREFIX);
    domPrefixRef.current.style.display = 'none';
    if (toggle === i18n.t("Access My Wallet")) {
      domImportWalletRef.current.style.display = 'block';
      domAccessWalletBtnRef.current.style.display = 'none';
      // We have a local wallet! Display the decryption prompt
      if (hasEncryptedWallet()) {
        privateKeyRef.current.placeholder = i18n.t('Enter your wallet password');
        domImportWalletTextRef.current.innerText = i18n.t('Unlock Wallet');
      }
    } else {
      domGenerateWalletRef.current.style.display = 'block';
    }
  }

  function guiImportWallet() {
    if (hasEncryptedWallet()) {
      decryptWallet(i18n, privateKeyRef.current.value).then(hasWallet => {
        if (hasWallet) {
          hideAllWalletOptions();
        } else {
          domGenerateWalletRef.current.style.display = 'block';
        }
      }).catch(e => {
        domImportWalletRef.current.style.display = 'block';
      });
    } else {
      importWallet(i18n);
    }
  }

  function guiEncryptWallet() {
    // Show our inputs if we haven't already
    if (domEncryptPasswordBoxRef.current.style.display === 'none') {
      // Return the display to it's class form
      domEncryptPasswordBoxRef.current.style.display = '';
      domEncryptBtnTxtRef.current.innerText = i18n.t('Finish Encryption');
    } else {
      // Fetch our inputs, ensure they're of decent entropy + match eachother
      const strPass = domEncryptPasswordFirstRef.current.value,
        strPassRetype = domEncryptPasswordSecondRef.current.value;
      if (strPass.length < MIN_PASS_LENGTH) return createAlert(i18n, 'warning', 'That password is a little short!', "", "", 4000, "Use at least", MIN_PASS_LENGTH, "characters.");
      if (strPass !== strPassRetype) return createAlert(i18n, 'warning', "Your passwords don't match!", "", "", 2250);
      encryptWallet(i18n, strPass);
      createAlert(i18n, 'success', "Nice stuff, Armoured PIVian!", "You're Secured! 🔐", "", 5500);
    }
  }

  function checkVanity() {
    // Loosely check if the vanity address is valid
    if (!prefix.length) return setPrefix(PUBKEY_PREFIX);
    if (!prefix.startsWith(PUBKEY_PREFIX)) {
      // Prefix doesnt match, splice it into the string
      setPrefix(PUBKEY_PREFIX + domPrefixRef.current.value.substr(1));
    }
  }

  let isVanityGenerating = false;
  const arrWorkers = [];
  let vanUiUpdater;

  function stopSearch() {
    isVanityGenerating = false;
    for (let thread of arrWorkers) {
      thread.terminate();
    }
    while (arrWorkers.length) arrWorkers.pop();
    domPrefixRef.current.disabled = false;
    domVanityUiButtonTxt.innerText = i18n.t('Create A Vanity Wallet');
    clearInterval(vanUiUpdater);
  }

  async function generateVanityWallet() {
    if (isVanityGenerating) return stopSearch();
    if (typeof (Worker) === "undefined") return alert(i18n.t('browser'));
    // Generate a vanity address with the given prefix
    if (prefix.length === 0 || domPrefixRef.current.style.display === 'none') {
      // No prefix, display the intro!
      domPrefixRef.current.placeholder = 'Custom Prefix (' + PUBKEY_PREFIX + ' ...)';
      domPrefixRef.current.style.display = 'block';
      domGenKeyWarningRef.current.style.display = 'none';
      domPrivateTxtRef.current.innerHTML = "~";
      domGuiAddressRef.current.innerHTML = "~";
    } else {
      // Ensure the input is base58 compatible
      for (const char of prefix) {
        if (!MAP_B58.includes(char)) return alert(`${i18n.t('character')} ${char}${i18n.t('unsupported')}`);
      }
      // We also don't want users to be mining addresses for years... so cap the letters to four until the generator is more optimized
      if (prefix.length > 6) return alert(i18n.t('long_name'));
      isVanityGenerating = true;
      domPrefixRef.current.disabled = true;
      // Cache a lowercase equivilent for lower-entropy comparisons (a case-insensitive search is ALOT faster!) and strip accidental spaces
      const nInsensitivePrefix = prefix.toLowerCase().replace(/ /g, "");
      const nPrefixLen = nInsensitivePrefix.length;
      let attempts = 0;

      // Setup workers
      const nThreads = Math.max(Math.floor(window.navigator.hardwareConcurrency * 0.75), 1);
      console.log('Spawning ' + nThreads + ' vanity search threads!');
      while (arrWorkers.length < nThreads) {
        arrWorkers.push(new Worker("./scripts/vanitygen_worker.js"));
        arrWorkers[arrWorkers.length - 1].onmessage = (event) => checkResult(event.data);
      }

      // GUI Updater
      domVanityUiButtonTxt.innerText = 'Stop (Searched ' + attempts.toLocaleString('en-GB') + ' keys)';
      vanUiUpdater = setInterval(() => {
        domVanityUiButtonTxt.innerText = 'Stop (Searched ' + attempts.toLocaleString('en-GB') + ' keys)';
      }, 200);

      function checkResult(data) {
        attempts++;
        if (data.pub.substr(0, nPrefixLen).toLowerCase() === nInsensitivePrefix) {
          importWallet(data.priv, true);
          stopSearch();
          domGuiBalanceRef.current.innerHTML = "0";
          domGuiBalanceBoxRef.current.style.fontSize = "x-large";
          return console.log("VANITY: Found an address after " + attempts + " attempts!");
        }
      }
    }
  }
  function toggleDropDown(id) {
    const domID = document.getElementById(id);
    domID.style.display = domID.style.display === 'block' ? 'none' : 'block';
  }
  // function loadUnspendInputs() {
  //   if (publicKeyForNetwork) {
  //     getUnspentTransactions();
  //     domSimpleTXs.style.display = 'block';
  //     domGenIt.style.display = 'block';
  //   } else {
  //     alert(i18n.t('need_wallet'));
  //   }
  // }
  function undelegateGUI() {
    // Verify the amount
    const nAmount = Number(document.getElementById('undelegateAmount').value);
    if (nAmount < 0.01) return createAlert(i18n, 'warning', 'Minimum_amount', "", "", 2000);
    undelegate(nAmount);
  }
  function undelegate(value) {
    if (!publicKeyForNetwork) {
      if (hasEncryptedWallet())
        createAlert(i18n, 'warning', "Please unlock your wallet before sending transactions!", "", "", 3000);
      else
        createAlert(i18n, 'warning', "Please import/create your wallet before sending transactions!", "", "", 3250);
      return;
    }

    let nBalance = getStakingBalance() / COIN;
    if (value > nBalance) return alert(`${i18n.t('Balance is too small!')} (${nBalance} - ${value} = ${(nBalance - value).toFixed(8)})`);
    console.log("Constructing TX of value: " + value + " PIV");
    // Loop our cached UTXOs and construct a TX
    const cTx = bitjs.transaction();
    let txValue = 0;
    for (const UTXO of arrDelegatedUTXOs) {
      if (txValue > value) {
        // Required Coin Control value met, yahoo!
        console.log("Coin Control: TX Constructed! Selected " + cTx.inputs.length + " input(s) (" + txValue + " PIV)");
        break;
      }
      cTx.addinput(UTXO.id, UTXO.vout, UTXO.script);
      txValue += UTXO.sats / COIN;
      console.log("Coin Control: Selected CS input " + UTXO.id.substr(0, 6) + "(" + UTXO.vout + ")... (Added " + (UTXO.sats / COIN).toFixed(8) + " PIV - Total: " + txValue + ")");
    }
    const nFee = calculatefee(cTx.serialize().length);
    cTx.addoutput(publicKeyForNetwork, value);
    addresschange = publicKeyForNetwork;
    totalSent = (nFee + value).toFixed(8);
    valuechange = (txValue - parseFloat(totalSent)).toFixed(8);
    if (totalSent <= nBalance) {
      if (debug)
        domHumanReadable.innerHTML = "Balance: " + nBalance.toFixed(8) + "<br>Fee: " + nFee + "<br>To: " + publicKeyForNetwork + "<br>Sent: " + value + "<br>Change Address: " + addresschange + "<br>Change: " + valuechange;
      if (valuechange > 1.01) {
        // Enough change to resume cold staking, so we'll send the change back to the cold staking address
        // Ensure the user has an address set - if not, request one!
        if (!askForCSAddr()) return;
        // Sanity
        if (cachedColdStakeAddr.length !== 34 || !cachedColdStakeAddr.startsWith('S')) {
          askForCSAddr(true);
          return createAlert(i18n, 'success', 'undelegate_alert', "Staking Address set!");
        }
        cTx.addcoldstakingoutput(publicKeyForNetwork, cachedColdStakeAddr, valuechange);
        console.log('Re-delegated delegation spend change!');
      } else {
        // Not enough change to cold stake, so we'll just unstake everything
        cTx.addoutput(addresschange, valuechange);
        console.log('Spent all CS dust into redeem address!');
      }
      sendTransaction(i18n, cTx.sign(privateKeyForTransactions, 1, 'coldstake'), "<b>Delegation successfully spent!</b><br>Please wait for confirmations.");
      domGenIt.innerHTML = "Continue";
    } else {
      console.warn("Amount: " + value + "\nFee: " + nFee + "\nChange: " + valuechange + "\nTOTAL: " + totalSent);
      alert(i18n.t('You are trying to undelegate more than you have, don\'t forget blockchain fees! Removing ~0.001 PIV will do fine.'));
    }
  }
  function askForCSAddr(force = false) {
    if (force) cachedColdStakeAddr = null;
    if (cachedColdStakeAddr === "" || cachedColdStakeAddr === null) {
      cachedColdStakeAddr = prompt(i18n.t('cold_address'));
      if (cachedColdStakeAddr) return true;
    } else {
      return true;
    }
    return false;
  }
  function delegateGUI() {
    // Verify the amount
    const nAmount = Number(document.getElementById('delegateAmount').value);
    if (nAmount < 1) return createAlert(i18n, 'warning', 'minimum_staking', "", "", 2000);

    // Ensure the user has an address set - if not, request one!
    if (!askForCSAddr()) return;

    // Sanity
    if (cachedColdStakeAddr.length !== 34 || !cachedColdStakeAddr.startsWith('S')) {
      askForCSAddr(true);
      return createAlert(i18n, 'success', 'Now go ahead and stake!', "Staking Address set!");
    }
    delegate(nAmount, cachedColdStakeAddr);
  }
  function delegate(value, coldAddr) {
    if (!publicKeyForNetwork) {
      if (hasEncryptedWallet())
        alert(i18n.t("Please unlock your wallet before sending transactions!"));
      else
        alert(i18n.t("Please import/create your wallet before sending transactions!"));
      return;
    }
    let nBalance = getBalance() / COIN;
    if (value > nBalance) return alert(`${i18n.t('Balance is too small!')} (${nBalance} - ${value} = ${(nBalance - value).toFixed(8)})`);
    console.log("Constructing TX of value: " + value + " PIV");
    // Loop our cached UTXOs and construct a TX
    const cTx = bitjs.transaction();
    let txValue = 0;
    for (const UTXO of cachedUTXOs) {
      if (txValue > value) {
        // Required Coin Control value met, yahoo!
        console.log("Coin Control: TX Constructed! Selected " + cTx.inputs.length + " input(s) (" + txValue + " PIV)");
        break;
      }
      cTx.addinput(UTXO.id, UTXO.vout, UTXO.script);
      txValue += UTXO.sats / COIN;
      console.log("Coin Control: Selected input " + UTXO.id.substr(0, 6) + "(" + UTXO.vout + ")... (Added " + (UTXO.sats / COIN).toFixed(8) + " PIV - Total: " + txValue + ")");
    }
    const nFee = calculatefee(cTx.serialize().length);
    cTx.addcoldstakingoutput(publicKeyForNetwork, coldAddr, value);
    addresschange = publicKeyForNetwork;
    totalSent = (nFee + parseFloat(value)).toFixed(8);
    valuechange = (txValue - parseFloat(totalSent)).toFixed(8);
    if (totalSent <= nBalance) {
      if (debug)
        domHumanReadable.innerHTML = "Balance: " + nBalance.toFixed(8) + "<br>Fee: " + nFee + "<br>To: " + publicKeyForNetwork + "<br>Sent: " + value + "<br>Change Address: " + addresschange + "<br>Change: " + valuechange;
      cTx.addoutput(addresschange, valuechange); //Change Address
      sendTransaction(i18n, cTx.sign(privateKeyForTransactions, 1), "Please wait for confirmations, enjoy your staking!", "Delegation successful!");
      domGenIt.innerHTML = "Continue";
    } else {
      console.warn("Amount: " + value + "\nFee: " + nFee + "\nChange: " + valuechange + "\nTOTAL: " + totalSent);
      alert(i18n.t('undelegate_alert2'));
    }
  }

  // function preimage(value, hex) {
  //   if (!publicKeyForNetwork) {
  //     if (hasEncryptedWallet())
  //       alert(i18n.t("Please unlock your wallet before sending transactions!"));
  //     else
  //       alert(i18n.t("Please import/create your wallet before sending transactions!"));
  //     return;
  //   }
  //   let nBalance = getBalance() / COIN;
  //   if (value > nBalance) return alert(`${i18n.t('Balance is too small!')} (${nBalance} - ${value} = ${(nBalance - value).toFixed(8)})`);
  //   console.log("Constructing TX of value: " + value + " PIV");
  //   // Loop our cached UTXOs and construct a TX
  //   const cTx = bitjs.transaction();
  //   let txValue = 0;
  //   for (const UTXO of cachedUTXOs) {
  //     if (txValue > value) {
  //       // Required Coin Control value met, yahoo!
  //       console.log("Coin Control: TX Constructed! Selected " + cTx.inputs.length + " input(s) (" + txValue + " PIV)");
  //       break;
  //     }
  //     cTx.addinput(UTXO.id, UTXO.vout, UTXO.script);
  //     txValue += UTXO.sats / COIN;
  //     console.log("Coin Control: Selected input " + UTXO.id.substr(0, 6) + "(" + UTXO.vout + ")... (Added " + (UTXO.sats / COIN).toFixed(8) + " PIV - Total: " + txValue + ")");
  //   }
  //   const nFee = calculatefee(cTx.serialize().length);
  //   cTx.addpreimageoutput(hex, value);
  //   addresschange = publicKeyForNetwork;
  //   totalSent = (nFee + parseFloat(value)).toFixed(8);
  //   valuechange = (txValue - parseFloat(totalSent)).toFixed(8);
  //   if (totalSent <= nBalance) {
  //     if (debug)
  //       domHumanReadable.innerHTML = "Balance: " + nBalance.toFixed(8) + "<br>Fee: " + nFee + "<br>To: " + publicKeyForNetwork + "<br>Sent: " + value + "<br>Change Address: " + addresschange + "<br>Change: " + valuechange;
  //     cTx.addoutput(addresschange, valuechange); //Change Address
  //     sendTransaction(i18n, cTx.sign(privateKeyForTransactions, 1));
  //     domGenIt.innerHTML = "Continue";
  //   } else {
  //     console.warn("Amount: " + value + "\nFee: " + nFee + "\nChange: " + valuechange + "\nTOTAL: " + totalSent);
  //     createAlert(i18n, 'warning', 'You are trying to send more than you have!', "", "", 2500);
  //   }
  // }

  function createSimpleTransation() {
    if (!networkEnabled) return alert(i18n.t("offline_send"));
    if (!publicKeyForNetwork) {
      if (hasEncryptedWallet())
        createAlert(i18n, 'warning', "Please unlock your wallet before sending transactions!", "", "", 2500);
      else
        createAlert(i18n, 'warning', "Please import/create your wallet before sending transactions!", "", "", 2500);
      return;
    }
    const address = domAddress1s.value;
    let value = Number(domValue1s.value);
    if (domGenIt.innerHTML === 'Continue') {
      domGenIt.innerHTML = 'Send Transaction';
      domTxOutput.innerHTML = '';
      domHumanReadable.innerHTML = "";
      domValue1s.value = "";
      domAddress1s.value = "";
      domReqDesc.value = '';
      domReqDisplay.style.display = 'none';
      return;
    }
    let nBalance = getBalance() / COIN;
    if (value > nBalance) return alert(`${i18n.t('Balance is too small!')} (${nBalance} - ${value} = ${(nBalance - value).toFixed(8)})`);
    console.log("Constructing TX of value: " + value + " PIV");
    // Loop our cached UTXOs and construct a TX
    const cTx = bitjs.transaction();
    let txValue = 0;
    for (const UTXO of cachedUTXOs) {
      if (txValue >= value) {
        // Required Coin Control value met, yahoo!
        console.log("Coin Control: TX Constructed! Selected " + cTx.inputs.length + " input(s) (" + txValue + " PIV)");
        break;
      }
      cTx.addinput(UTXO.id, UTXO.vout, UTXO.script);
      txValue += UTXO.sats / COIN;
      console.log("Coin Control: Selected input " + UTXO.id.substr(0, 6) + "(" + UTXO.vout + ")... (Added " + (UTXO.sats / COIN).toFixed(8) + " PIV - Total: " + txValue + ")");
    }

    const nFee = calculatefee(cTx.serialize().length);
    const fNoChange = value >= (nBalance - nFee);
    if (fNoChange) {
      // We're sending alot! So we've got to deduct the fee from the send amount. There's not enough change to pay it with!
      value = Number((value - nFee).toFixed(8));
    }

    if (address !== '' && value !== '') {
      cTx.addoutput(address, value); // Sending to this address
      addresschange = publicKeyForNetwork;
      totalSent = (nFee + parseFloat(value)).toFixed(8);
      valuechange = fNoChange ? 0 : (txValue - parseFloat(totalSent)).toFixed(8);
      if (totalSent <= nBalance) {
        if (debug)
          domHumanReadable.innerHTML = "Balance: " + nBalance.toFixed(8) + "<br>Fee: " + nFee + "<br>To: " + address + "<br>Sent: " + value + (fNoChange ? "" : "<br>Change Address: " + addresschange + "<br>Change: " + valuechange);
        if (!fNoChange) {
          cTx.addoutput(addresschange, valuechange); // Change Output
        }
        sendTransaction(i18n, cTx.sign(privateKeyForTransactions, 1));
        domGenIt.innerHTML = "Continue";
      } else {
        console.warn("Amount: " + value + "\nFee: " + nFee + (fNoChange ? "" : "\nChange: " + valuechange) + "\nTOTAL: " + totalSent);
        createAlert(i18n, 'warning', "You're trying to send more than you have!", "", "", 2500);
      }
    } else {
      console.log("No address or value");
    }
  }
  function createRawTransaction() {
    //advanced transaction creation and signing
    const cTx = bitjs.transaction();
    const txid = document.getElementById("prevTrxHash").value;
    const index = document.getElementById("index").value;
    const script = document.getElementById("script").value;
    cTx.addinput(txid, index, script);
    var address = document.getElementById("address1").value;
    var value = document.getElementById("value1").value;
    cTx.addoutput(address, value);
    address = document.getElementById("address2").value;
    value = document.getElementById("value2").value;
    cTx.addoutput(address, value);
    const wif = document.getElementById("wif").value;
    document.getElementById("rawTrx").value = cTx.sign(wif, 1); //SIGHASH_ALL DEFAULT 1
  }
  function openTab(evt, tabName) {
    var i, tabcontent, tablinks;
    tabcontent = document.getElementsByClassName("tabcontent");
    for (i = 0; i < tabcontent.length; i++) {
      tabcontent[i].style.display = "none";
    }
    tablinks = document.getElementsByClassName("tablinks");
    for (i = 0; i < tablinks.length; i++) {
      tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    if (!evt.currentTarget.className.includes("active"))
      evt.currentTarget.className += " active";

    // Close the navbar if it's not already closed
    if (!domNavbarTogglerRef.current.className.includes("collapsed"))
      domNavbarTogglerRef.current.click();

    // Close the navbar if it's not already closed
    // if (!domNavbarToggler.className.includes("collapsed"))
    //   domNavbarToggler.click();
  }
  // domStart.click();

  function refreshChainData() {
    // If in offline mode: don't sync ANY data or connect to the internet
    if (!networkEnabled) return console.warn(i18n.t('offline_mode'));

    // Update identicon
    domIdenticonRef.current.dataset.jdenticonValue = publicKeyForNetwork;

    // jdenticon();

    // Play reload anim
    domBalanceReloadRef.current.className += " playAnim";
    domBalanceReloadStakingRef.current.className += " playAnim";
    // Fetch block count + UTXOs
    getBlockCount(i18n);
  }

  useEffect(() => {
    if (networkEnabled) {
      getBlockCount(i18n);
    }
  }, [networkEnabled])
  window.onload = (() => {
    // Configure Identicon
    // jdenticon.configure({
    //   saturation: {
    //     color: 0.8
    //   }
    // });

    // Configure payment processor
    if (requestTo && requestAmount) {
      // Open 'Create Transaction' menu
      domTxTab.click();
      if (domSimpleTXs.style.display === 'none')
        domSimpleTXsDropdown.click();
      // Pre-fill inputs
      domAddress1s.value = requestTo;
      domValue1s.value = requestAmount;
      // Payment request 'desc' is optional
      if (urlParams.has('desc')) {
        domReqDisplay.style.display = 'block';
        domReqDesc.value = urlParams.get('desc');
      } else {
        domReqDesc.value = '';
        domReqDisplay.style.display = 'none';
      }
    }
  });

  setInterval(refreshChainData, 15000);

  return (
    <div id="page-container" className="home-hero">
      <div id="content-wrap">

        {/* NAVBAR */}
        <nav className="navbar navbar-expand-lg sticky-top navbar-dark navbarSpecial">
          <div className="container">
            <img onClick={() => playMusic()} className="nav-logo navbar-brand noselect" src='../assets/logo.png' alt="PIVX" />
            <button ref={domNavbarTogglerRef} id="navbarToggler" className="navbar-toggler collapsed" type="button" data-toggle="collapse" data-target="#navbarNav"
              aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
              <span className="navbar-toggler-icon"></span>
            </button>
            <div className="collapse navbar-collapse noselect" id="navbarNav">

              {/* MAIN NAVBAR */}
              <ul className="navbar-nav mr-auto ptr">
                <li className="nav-item"><a ref={startRef} href="/#" id='start' className="nav-link tablinks" onClick={(event) => openTab(event, 'home')}>{i18n.t('Intro')}</a></li>
                <li className="nav-item"><a className="nav-link tablinks" href="/#" onClick={(event) => openTab(event, 'keypair')}>{i18n.t('Dashboard')}</a></li>
                <li className="nav-item"><a id="txTab" className="nav-link tablinks" href="/#" onClick={(event) => openTab(event, 'Transaction')}>{i18n.t('Send')}</a></li>
                <li className="nav-item"><a id="txTab" className="nav-link tablinks" href="/#" onClick={(event) => openTab(event, 'StakingTab')}>{i18n.t('Stake')}</a></li>
                <li className="nav-item"><a className="nav-link tablinks" href="/#" onClick={(event) => openTab(event, 'Settings')}>{i18n.t('Settings')}</a></li>
              </ul>
              {/* Language drop down */}
              <select onChange={(e) => onLanguageChange(e.target.value)} className="locale-switcher">
                <option value="en">English</option>
                <option value="de">German</option>
              </select>

              {/* SIDE NAVBAR */}
              <div className="form-inline my-2 my-lg-0">
                <ul className="navbar-nav mr-auto ptr">
                  <li className="nav-item"><a className="nav-link tablinks active" href="/#" id="Network"><b>{i18n.t('Network')}: </b>{networkEnabled ? i18n.t('Enabled') : i18n.t('Disabled')}</a></li>
                  <li className="nav-item"><a className="nav-link tablinks active" href="/#" id="Debug">{debug ? <b>{i18n.t('debug_on')}</b> : ''}</a></li>
                </ul>
              </div>

            </div>
          </div>
        </nav>
        {/* NAVBAR */}


        {/* WARNING MESSAGE */}
        <div className="warning-message" id='outdated'>
          <div className="container">
            <p>{i18n.t('WARNING')}{i18n.t('warning_msg')} <a href='https://github.com/PIVX-Labs/MyPIVXWallet/releases'>{i18n.t('MyPIVXWallet Github')}</a>
            </p>
          </div>
        </div>
        {/* WARNING MESSAGE */}


        {/* QR MODAL */}
        <div className="modal fade" id="qrModal" tabIndex="-1" role="dialog" aria-labelledby="qrModalLabel" aria-hidden="true">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="qrModalLabel">{i18n.t('Address_QR')}</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body center-text">
                <p ref={domModalQrLabelRef} id="ModalQRLabel" className="modal-label"></p>
                <div ref={domModalQRRef} id="ModalQR" className="auto-fit"></div>
              </div>
            </div>
          </div>
        </div>
        <br />
        {/* QR MODAL */}

        <div className="container">
          <div className="row no-gutters">
            <div className='col-md-12 rm-pd'>
              <div id="home" className="tabcontent">

                {/* PIVX TITLE SECTION */}
                <div className="col-md-12 title-section float-left rm-pd">
                  <h1 className="pivx-bold-title center-text "><span>{i18n.t('Welcome to')}</span></h1><h1 className="pivx-bold-title center-text"><span> {i18n.t('My PIVX Wallet')}</span></h1>
                </div>
                {/* PIVX TITLE SECTION */}

                {/* PIVX FEATURE SECTION */}
                <div className="col-md-12 features-section float-left rm-pd intro-page">

                  {/* PIVX FEATURE */}
                  <div className="col-md-8 float-right pivx-feature-father">
                    <div className="col-md-11 pivx-feature-interior ">

                      <div className="col-md-12 feature-icon">
                        <img src="https://pivx.org/build/images/content/img_governance.png" alt="PIVX Governance" />
                      </div>

                      <h4>{i18n.t('Be your own Bank')}</h4>
                      <h5><span>{i18n.t('no custody1')}</span><b><span>{i18n.t('no custody2')}</span></b><span>{i18n.t('no custody3')}</span>
                      </h5>
                      <span onClick={() => window.location.href = 'https://forum.pivx.org/threads/mypivxwallet-an-easy-open-source-self-sovereign-pivx-wallet.873/'} className="purple-icon-link ptr">
                        {i18n.t('KNOW MORE')}<span className="link-icon link-icon-suffix"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                      </span>
                    </div>
                  </div>
                  {/* PIVX FEATURE  */}



                  {/* PIVX FEATURE  */}
                  <div className="col-md-8 float-left pivx-feature-father">
                    <div className="col-md-11 pivx-feature-interior">

                      <div className="col-md-12 feature-icon">
                        <img src="https://pivx.org/build/images/content/img_pos.png" alt="PIVX Proof of Stake (PoS)" />
                      </div>

                      <h4>{i18n.t('Universal and Portable')}</h4>
                      <h5>{i18n.t('secure address')}</h5>
                      <span onClick={() => window.location.href = 'https://forum.pivx.org/threads/mypivxwallet-an-easy-open-source-self-sovereign-pivx-wallet.873/'} className="purple-icon-link ptr">
                        {i18n.t('KNOW MORE')}<span className="link-icon link-icon-suffix"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                      </span>
                    </div>
                  </div>
                  {/* PIVX FEATURE  */}

                  {/* PIVX FEATURE  */}
                  <div className="col-md-8 float-right pivx-feature-father">
                    <div className="col-md-11 pivx-feature-interior">

                      <div className="col-md-12 feature-icon">
                        <img src="https://pivx.org/build/images/content/img_privacy.png" alt="PIVX Privacy" className="smaller-feature" />
                      </div>

                      <h4>{i18n.t("Don't trust")}</h4>
                      <h5>{i18n.t("open-source")}</h5>
                      <span onClick={() => window.location.href = 'https://forum.pivx.org/threads/mypivxwallet-an-easy-open-source-self-sovereign-pivx-wallet.873/'} className="purple-icon-link ptr">
                        {i18n.t('KNOW MORE')}<span className="link-icon link-icon-suffix"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                      </span>
                    </div>
                  </div>
                  {/* PIVX FEATURE  */}

                  {/* PIVX FEATURE  */}
                  <div className="col-md-8 float-left pivx-feature-father">
                    <div className="col-md-11 pivx-feature-interior">

                      <div className="col-md-12 feature-icon">
                        <img src="https://pivx.org/build/images/content/img_slider_bars.png" alt="PIVX Bar Chart" className="smaller-feature" />
                      </div>

                      <h4>{i18n.t('For the community')}</h4>
                      <h5>{i18n.t('built with love')}</h5>
                      <span onClick={() => window.location.href = 'https://forum.pivx.org/threads/mypivxwallet-an-easy-open-source-self-sovereign-pivx-wallet.873/'} className="purple-icon-link ptr">
                        {i18n.t('KNOW MORE')}<span className="link-icon link-icon-suffix"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                      </span>
                    </div>
                  </div>
                  {/* PIVX FEATURE  */}

                </div>
                {/* PIVX FEATURE SECTION  */}

                {/* PIVX DONATION SECTION  */}
                <div className="col-md-12 donation-section float-left rm-pd text-center">
                  <button className="pivx-button-big" onClick={() => openDonatePage()}>
                    <span className="buttoni-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 70"><path d="M3.497 25.717C1.401 25.588 0 23.847 0 21.753v-2.535c0-.775.149-1.593.925-1.593h22.719c2.173 0 3.941 1.861 3.941 4.034 0 2.174-1.769 3.988-3.941 3.988l-20.207.048c-.02 0 .08.023.06.022z"></path><path d="M5.229 69.625C4.455 69.625 4 68.494 4 67.719V38.661c0-1.911 1.447-3.731 3.258-3.989.175-.029.285-.047.483-.047h21.525c7.137 0 12.751-5.86 12.751-13.027 0-7.096-5.528-12.841-12.586-13.177-.002 0-.671.016-1.41.016l-20.335.066C5.529 8.373 4 6.652 4 4.558V2.023C4 1.247 4.407.625 5.183.625h24.059c11.57 0 20.654 9.546 20.706 21.104 0 9.378-6.307 17.727-15.337 20.311-1.622.445-3.122.705-4.735.778L12 42.842v22.485c0 2.156-2.141 4.298-4.235 4.298H5.229z"></path></svg></span>
                    <span className="buttoni-text">{i18n.t('Donate')}</span>
                    <span className="buttoni-arrow"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                  </button>

                </div>
                {/* PIVX DONATION SECTION  */}

              </div>


              {/* KEYPAIR SECTION  */}
              <div id="keypair" className="tabcontent">

                {/* PIVX TITLE SECTION  */}
                <div className="col-md-12 title-section rm-pd">
                  <h3 className="pivx-bold-title center-text">{i18n.t('Dashboard')}</h3>
                </div>
                {/* PIVX TITLE SECTION  */}



                {/* GENERATE WALLET  */}
                <div ref={domGenerateWalletRef} id='generateWallet' className="dashboard-item">
                  <div className="container">

                    <div className="coinstat-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><path d="M15.059 43.898h-3.196a.827.827 0 000 1.653h3.196a.826.826 0 100-1.653zM38.851 8.781a.826.826 0 00-1.42.577v4.015H13.847a.827.827 0 100 1.654h24.411c.457 0 .826-.37.826-.827v-2.805l5.548 5.707-5.548 5.389V19.27a.826.826 0 00-.826-.826H15.5a.826.826 0 000 1.653h9.419v3.881a.826.826 0 101.653 0v-3.881h10.859v4.35a.828.828 0 001.402.594l7.545-7.328a.826.826 0 00.016-1.169l-7.543-7.763zM9.99 13.372a.827.827 0 100 1.654h.661a.827.827 0 000-1.654H9.99zm38.792 12.895h-.771a.826.826 0 100 1.653h.771a.827.827 0 000-1.653z"></path><path d="M45.035 26.267H20.68V21.89a.827.827 0 00-1.403-.593l-7.543 7.327a.827.827 0 00-.016 1.169l7.543 7.76a.824.824 0 00.904.19.829.829 0 00.516-.767v-3.988h4.239v6.943H1.988V7.641h22.931v3.941a.826.826 0 001.653 0v-6.01A4.667 4.667 0 0021.91.91H4.997A4.667 4.667 0 00.335 5.572v34.803a.81.81 0 00-.099.383c0 .14.038.27.099.384v3.445a4.668 4.668 0 004.662 4.663h16.912a4.668 4.668 0 004.662-4.663V32.988h14.276a.826.826 0 100-1.653H19.853a.827.827 0 00-.827.827v2.779l-5.548-5.708 5.548-5.388v3.248c0 .456.37.827.827.827h25.182a.826.826 0 000-1.653zM4.997 2.563h16.912c1.66 0 3.009 1.35 3.009 3.009v.416H1.988v-.416a3.013 3.013 0 013.009-3.009zm16.912 45.034H4.997a3.013 3.013 0 01-3.009-3.01v-3.002h22.931v3.002a3.014 3.014 0 01-3.01 3.01z"></path></svg>
                    </div>

                    <div className="col-md-12 dashboard-title">
                      <h3 className="pivx-bold-title-smaller"><span>{i18n.t('Create')}</span></h3><h3 className="pivx-bold-title-smaller">{i18n.t('New Wallet')}</h3>
                      <p>{i18n.t('create new wallet')}</p>
                    </div>


                    <button className="pivx-button-big" onClick={() => generateWallet(i18n)}>
                      <span className="buttoni-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 70"><path d="M3.497 25.717C1.401 25.588 0 23.847 0 21.753v-2.535c0-.775.149-1.593.925-1.593h22.719c2.173 0 3.941 1.861 3.941 4.034 0 2.174-1.769 3.988-3.941 3.988l-20.207.048c-.02 0 .08.023.06.022z"></path><path d="M5.229 69.625C4.455 69.625 4 68.494 4 67.719V38.661c0-1.911 1.447-3.731 3.258-3.989.175-.029.285-.047.483-.047h21.525c7.137 0 12.751-5.86 12.751-13.027 0-7.096-5.528-12.841-12.586-13.177-.002 0-.671.016-1.41.016l-20.335.066C5.529 8.373 4 6.652 4 4.558V2.023C4 1.247 4.407.625 5.183.625h24.059c11.57 0 20.654 9.546 20.706 21.104 0 9.378-6.307 17.727-15.337 20.311-1.622.445-3.122.705-4.735.778L12 42.842v22.485c0 2.156-2.141 4.298-4.235 4.298H5.229z"></path></svg></span>
                      <span className="buttoni-text">{i18n.t('create a new wallet')}</span>
                      <span className="buttoni-arrow"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                    </button>
                  </div>
                </div>
                {/* GENERATE WALLET  */}
                <br />

                {/* WALLET FUNCTIONALITIES  */}

                {/* WARNING  */}
                <div ref={domGenKeyWarningRef} id='genKeyWarning' style={{ display: 'none' }} className="alert alert-danger col-md-12" role="alert">
                  <div style={{ maxWidth: '100%' }}>
                    <p ref={domEncryptWarningTxtRef} id="encryptWarningText" className="center-text"><b>{i18n.t('WARNING')}</b>{i18n.t('save you keys')}<br />
                      {i18n.t('encrypt')}</p>
                  </div>
                  <div ref={domEncryptPasswordBoxRef} id="encryptPassword" style={{ display: 'none', maxWidth: '100%' }}>
                    <input ref={domEncryptPasswordFirstRef} className="center-text" style={{ width: '100%', fontFamily: 'monospace' }} type="password" id="newPassword" placeholder={i18n.t("Enter Password")} />
                    <input ref={domEncryptPasswordSecondRef} className="center-text" style={{ width: '100%', fontFamily: 'monospace' }} type="password" id="newPasswordRetype" placeholder={i18n.t("Re-type Password")} />
                  </div>
                  <button className="pivx-button-big" onClick={() => guiEncryptWallet()} style={{ float: 'none', margin: '0 auto', display: 'block' }}>
                    <span className="buttoni-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path d="M85.967 10.65l-32.15-9.481a13.466 13.466 0 00-7.632 0l-32.15 9.48C11.661 11.351 10 13.567 10 16.042v26.623c0 12.321 3.67 24.186 10.609 34.31 6.774 9.885 16.204 17.49 27.264 21.99a5.612 5.612 0 004.251 0c11.061-4.5 20.491-12.104 27.266-21.99C86.329 66.85 90 54.985 90 42.664V16.042a5.656 5.656 0 00-4.033-5.392zM69 68.522C69 70.907 67.03 72 64.584 72H34.092C31.646 72 30 70.907 30 68.522v-23.49C30 42.647 31.646 41 34.092 41H37v-9.828C37 24.524 41.354 18.5 49.406 18.5 57.37 18.5 62 24.066 62 31.172V41h2.584C67.03 41 69 42.647 69 45.032v23.49zM58 41v-9.828c0-4.671-3.708-8.472-8.5-8.472-4.791 0-8.5 3.8-8.5 8.472V41h17z"></path></svg></span>

                    <span ref={domEncryptBtnTxtRef} className="buttoni-text" id="encryptButton">{i18n.t('Set Password')}</span>

                    <span className="buttoni-arrow"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                  </button>

                </div>
                {/* WARNING  */}
                <br />

                {/* WALLET FEATURES  */}
                <div ref={domGuiWalletRef} id="guiWallet" style={{ display: 'none' }}>
                  <div id="bcg-wallet-box">
                    <div id="headline-balance">
                      <div id="balance-box" className="large-box">
                        <div id="window-icon-piv">
                          <div id="piv-ring"></div>
                          <div id="number-piv">
                            <p ref={domGuiBalanceBoxRef} id="guiBalanceBox"><b ref={domGuiBalanceRef} id="guiBalance">~</b> PIV</p>
                          </div>
                        </div>
                        <div id="bal-title">
                          <h3 className="noselect balance-title">{i18n.t('balance')} &nbsp;&nbsp;<span ref={domBalanceReloadRef} id="balanceReload" className="reload noselect" onClick={() => refreshChainData()}>&#x21bb;</span></h3>
                        </div>
                      </div>
                    </div>
                    {/* WALLET FEATURE  */}
                    <div id="big-frame-address">
                      <div id="address-box" className="large-box">
                        <div id="title-address-box">
                          <h3 className="noselect addr-title">{i18n.t('address')}</h3>
                        </div>
                        <div id="box-info-address">
                          <div id="ring">
                            <canvas ref={domIdenticonRef} id="identicon" className="innerShadow" width="65" height="65" data-jdenticon-value=""></canvas>
                          </div>
                          <div id="address-info">
                            <b ref={domGuiAddressRef} id="guiAddress">~</b>
                            <b id="guiQRButton">
                              <i data-toggle="modal" data-target="#qrModal" className="fas fa-qrcode fa-stacked-ptr"></i>
                              <i onClick={() => toClipboard('guiAddress', 'guiAddressCopy')} id="guiAddressCopy" className="fas fa-clipboard fa-stacked-ptr"></i>
                            </b>
                          </div>
                        </div>
                        <div id="pubkey-padd">
                          <div id="pubkey-box" className="col-md-4 desktop-pubkey">
                            <div ref={domPrivateQrRef} id="PrivateQR" className="margin-padded-qr" style={{ display: 'none' }}><img src="" alt="PrivateQR" width="82" height="82" /></div>
                            <div ref={domPublicQrRef} id="PublicQR" className="margin-padded-qr" style={{ display: 'block' }}><img src="" alt="PublicQR" width="82" height="82" /></div>
                            <textarea ref={domPrivateTxtRef} id="PrivateTxt" style={{ display: 'none' }} disabled="" className="form-control private-key-area"></textarea>
                            <button className="pivx-button-big" onClick={() => toggleKeyView()}>
                              <span className="buttoni-icon"><i className="far fa-eye fa-tiny-margin"></i></span>
                              <span className="buttoni-text" ref={guiViewKeyRef} id="guiViewKey">{i18n.t('QR')}</span>
                              <span className="buttoni-arrow"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* WALLET FEATURES  */}

                {/* WALLET FUNCTIONALITIES  */}

                {/* GENERATE VANITY WALLET  */}
                <div ref={domGenVanityWalletRef} id='generateVanityWallet' className="dashboard-item">
                  <div className="container">

                    <div className="coinstat-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><path d="M45.936 22.101c-1.321-4.06-2.976-6.808-3.045-6.922a.754.754 0 00-1.39.506c.003.016.193 1.655-1.762 3.08-.671.49-1.896.378-2.569-.234-.828-.753-.744-2.081.237-3.738C40.95 8.818 35.582 1.034 35.352.707a.757.757 0 00-1.369.35c-.002.022-.264 2.274-1.601 4.499-1.747 2.906-4.447 4.417-8.026 4.491-5.056.105-8.143 1.798-9.843 3.201-1.885 1.556-2.542 3.111-2.569 3.176a.755.755 0 00.525 1.022c1.916.45 2.546 1.966 2.503 3.127-.038 1.027-.636 2.314-2.201 2.563-1.112.176-1.965-.002-2.535-.532-1.144-1.063-.975-3.236-.973-3.256a.755.755 0 00-1.232-.65c-4.492 3.706-6.797 10.581-5.735 17.109.468 2.875 1.59 5.545 3.247 7.724 1.854 2.437 4.333 4.266 7.372 5.434a.754.754 0 10.542-1.408C6.292 44.8 4.323 38.86 3.787 35.563a18.666 18.666 0 01.711-8.828c.754-2.28 1.901-4.258 3.354-5.803.154.907.518 1.99 1.352 2.77.928.866 2.208 1.176 3.805.922 2.001-.317 3.396-1.923 3.472-3.997.06-1.631-.775-3.485-2.732-4.342.97-1.445 3.855-4.591 10.639-4.732 5.173-.107 7.922-2.926 9.317-5.272.666-1.12 1.09-2.23 1.356-3.125.397.746.855 1.708 1.234 2.79 1.136 3.235 1.072 5.953-.187 8.077-1.94 3.273-.615 5.022.044 5.622 1.212 1.102 3.219 1.252 4.475.337.998-.728 1.583-1.517 1.924-2.229a37.385 37.385 0 011.962 4.852c1.156 3.565 2.237 8.886.819 13.997-1.352 4.873-4.731 8.762-10.044 11.56a.755.755 0 00.704 1.335c5.698-3.001 9.331-7.206 10.796-12.5 1.519-5.484.375-11.128-.852-14.896z"></path><path d="M40.953 11.943a.754.754 0 101.459-.376l-.294-1.143a.756.756 0 00-1.462.377l.297 1.142zM25.17 33.984a.848.848 0 000-1.694h-6.537a.117.117 0 00-.117.118v.729c0 .454.358.825.805.853l5.849-.006z"></path><path d="M26.779 27.343h-6.921a.117.117 0 00-.118.117v.73a.86.86 0 00.805.853l5.883-.015c.219 0 .419.007.419.007a4.106 4.106 0 013.896 4.103 4.083 4.083 0 01-3.957 4.08h-6.192c-.041 0-.083 0-.124.009a.838.838 0 00-.715.775v8.363c0 .066.055.115.117.115h.729a.859.859 0 00.854-.807v-6.651c0-.057.055-.105.109-.105l5.346-.008a6.014 6.014 0 001.334-.213 5.788 5.788 0 004.205-5.567 5.81 5.81 0 00-5.67-5.786z"></path></svg>
                    </div>

                    <div className="col-md-12 dashboard-title">
                      <h3 className="pivx-bold-title-smaller"><span>{i18n.t('Create a new')}</span></h3><h3 className="pivx-bold-title-smaller">{i18n.t('Vanity Wallet')}</h3>
                      <span className="badge badge-warning">{i18n.t('Experimental')}</span>
                      <p><span>{i18n.t('customized prefix')}</span></p>
                    </div>


                    <input ref={domPrefixRef} style={{ display: 'none' }} value={prefix} type="text" id='prefix' placeholder={i18n.t("Address Prefix")} onKeyUp={() => checkVanity()} onChange={() => checkVanity()} />

                    <button className="pivx-button-big" onClick={() => generateVanityWallet()}>
                      <span className="buttoni-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 70"><path d="M3.497 25.717C1.401 25.588 0 23.847 0 21.753v-2.535c0-.775.149-1.593.925-1.593h22.719c2.173 0 3.941 1.861 3.941 4.034 0 2.174-1.769 3.988-3.941 3.988l-20.207.048c-.02 0 .08.023.06.022z"></path><path d="M5.229 69.625C4.455 69.625 4 68.494 4 67.719V38.661c0-1.911 1.447-3.731 3.258-3.989.175-.029.285-.047.483-.047h21.525c7.137 0 12.751-5.86 12.751-13.027 0-7.096-5.528-12.841-12.586-13.177-.002 0-.671.016-1.41.016l-20.335.066C5.529 8.373 4 6.652 4 4.558V2.023C4 1.247 4.407.625 5.183.625h24.059c11.57 0 20.654 9.546 20.706 21.104 0 9.378-6.307 17.727-15.337 20.311-1.622.445-3.122.705-4.735.778L12 42.842v22.485c0 2.156-2.141 4.298-4.235 4.298H5.229z"></path></svg></span>

                      <span className="buttoni-text" id="vanButtonText">{i18n.t('Create A Vanity Wallet')}</span>

                      <span className="buttoni-arrow"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                    </button>
                  </div>
                </div>
                {/* GENERATE VANITY WALLET  */}
                <br />

                {/* ACCESS WALLET  */}
                <div ref={domAccessWalletRef} id="accessWallet" className="dashboard-item" style={{ marginBottom: '100px' }}>
                  <div className="container">

                    <div className="coinstat-icon">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 50"><path d="M33.722 29.626c-5.494 1.373-8.848 6.96-7.475 12.456a10.2 10.2 0 004.679 6.316 10.212 10.212 0 007.778 1.159 10.21 10.21 0 006.317-4.681 10.205 10.205 0 001.156-7.776c-1.372-5.494-6.959-8.847-12.455-7.474zm10.063 14.511a8.77 8.77 0 01-5.433 4.022 8.771 8.771 0 01-6.685-.994 8.778 8.778 0 01-4.024-5.433c-1.182-4.725 1.702-9.529 6.427-10.71a8.832 8.832 0 012.141-.265c3.958 0 7.569 2.684 8.57 6.692a8.776 8.776 0 01-.996 6.688z"></path><path d="M26.835 47.111H10.727v-3.539h13.229a.72.72 0 000-1.439H10.727v-3.46h12.787a.72.72 0 100-1.439H8.292v-3.461h17.216a.718.718 0 100-1.439h-7.512V30.5a.515.515 0 10-1.028 0v1.834h-6.24v-3.423h1.042V30.5a.514.514 0 101.028 0v-1.589h1.671V30.5a.514.514 0 101.028 0v-1.589h14.946a.72.72 0 100-1.439h-4.227v-10.61c0-1.086.136-2.098.355-3.031a9.03 9.03 0 001.901.037c1.952-.177 3.519-1.027 4.527-2.46C35.914 7.268 34.3.841 34.229.569a.718.718 0 00-.857-.521c-.112.025-2.776.646-5.324 2.137-3.532 2.069-5.09 4.802-4.508 7.905a.72.72 0 101.414-.266c-.464-2.477.812-4.624 3.797-6.38 1.605-.945 3.308-1.524 4.237-1.799.117.638.268 1.65.301 2.813.052 1.771-.161 4.271-1.466 6.124-.762 1.081-1.919 1.704-3.44 1.85a7.342 7.342 0 01-1.397-.002c1.253-3.551 3.606-5.621 3.639-5.647a.72.72 0 10-.936-1.094c-.156.133-3.046 2.654-4.317 7.018a.617.617 0 00-.046.129c-.007.027-.008.054-.012.081a14.777 14.777 0 00-.535 3.948v3.502a20.63 20.63 0 00-1.5-1.928c.199-.761.804-3.777-1.522-5.652-3.09-2.491-9.616-1.796-9.892-1.766a.719.719 0 00-.609.926c.12.388 2.883 9.168 8.321 9.168.205 0 .414-.012.626-.038a.72.72 0 00-.174-1.43c-1.896.231-3.704-1.017-5.368-3.71-.819-1.326-1.401-2.698-1.725-3.553a24.135 24.135 0 012.563.002c2.438.137 4.289.663 5.354 1.521 1.149.926 1.27 2.31 1.189 3.25-1.439-1.353-2.536-1.932-2.619-1.975a.719.719 0 10-.659 1.28c.034.018 3.374 1.782 6.015 6.661v4.352H10.007a.72.72 0 00-.72.72v4.142H7.572a.72.72 0 00-.72.72v4.897a.72.72 0 00.72.721h1.716v9.155c0 .398.322.72.72.72h16.828a.72.72 0 10-.001-1.439zM45.188 9.529a.72.72 0 00.721-.72v-.642a.72.72 0 00-1.441 0v.643a.72.72 0 00.72.719zm0 4.407a.72.72 0 00.721-.72v-.642a.72.72 0 00-1.441 0v.642c0 .397.322.72.72.72zm-2.525-2.525h.644a.72.72 0 000-1.439h-.644a.718.718 0 100 1.439zm4.406 0h.643a.72.72 0 100-1.439h-.643a.72.72 0 100 1.439zm-9.245 10.11a.721.721 0 00.721-.72v-.643a.72.72 0 00-1.44 0v.642a.72.72 0 00.719.721zm0 4.405a.72.72 0 00.721-.719v-.642a.72.72 0 10-1.44 0v.642a.72.72 0 00.719.719zm-2.523-2.524h.643a.72.72 0 000-1.44h-.643a.72.72 0 100 1.44zm4.406 0h.643a.72.72 0 000-1.44h-.643a.72.72 0 100 1.44zm-34.7-4.7a.72.72 0 00-.72.72v.642a.72.72 0 001.44 0v-.642a.72.72 0 00-.72-.72zm0 4.406a.72.72 0 00-.72.72v.642a.72.72 0 001.44 0v-.642a.72.72 0 00-.72-.72zm-1.882-1.881h-.642a.72.72 0 100 1.439h.642a.72.72 0 100-1.439zm4.407 1.439a.72.72 0 100-1.439h-.643a.72.72 0 100 1.439h.643z"></path><circle cx="47.213" cy="21.709" r=".92"></circle><circle cx="47.424" cy="30.334" r=".92"></circle><circle cx="5.033" cy="11.611" r=".92"></circle><path d="M19.612 29.966v.536a.514.514 0 101.028 0v-.536a.514.514 0 10-1.028 0zm-6.879 5.193v.759a.514.514 0 001.028 0v-.759a.515.515 0 00-.514-.515.516.516 0 00-.514.515zm-2.49 0v.759a.514.514 0 001.028 0v-.759a.515.515 0 00-.514-.515.516.516 0 00-.514.515zm5.189 0v.241a.514.514 0 001.028 0v-.241a.515.515 0 00-.514-.515.516.516 0 00-.514.515zm17.816 4.022c-.298.103-.597-.061-.717-.354l-.145-.354c-.047-.108-.073-.233.036-.275l3.179-1.313a.608.608 0 01.465 1.123l-2.828 1.173c-.001.002.013-.002.01 0z"></path><path d="M36.024 45.227c-.107.04-.237-.092-.279-.197l-1.68-4.067c-.11-.266-.013-.605.227-.744.022-.017.037-.024.064-.037l3.014-1.241c.997-.411 1.446-1.556 1.031-2.561a1.987 1.987 0 00-2.521-1.114l-.195.082-2.843 1.182a.583.583 0 01-.742-.339l-.147-.355c-.046-.106-.024-.219.086-.263l3.366-1.389c1.621-.668 3.441.143 4.114 1.759a3.21 3.21 0 01-1.592 4.11l-2.499 1.035 1.298 3.146c.125.3-.053.727-.347.847l-.355.146z"></path></svg>
                    </div>

                    <div className="col-md-12 dashboard-title">
                      <h3 className="pivx-bold-title-smaller"><span>{i18n.t('Go to')}</span></h3><h3 className="pivx-bold-title-smaller">{i18n.t('My Wallet')}</h3>
                      <p><span>{i18n.t('private key')}
                      </span><br />
                        <span style={{ opacity: 0.75, fontSize: 'small' }}>{i18n.t('MPW developers')}</span>
                      </p>
                    </div>

                    {/* IMPORT WALLET  */}
                    <input className="hide-element" type="text" id="clipboard" />
                    <div ref={domImportWalletRef} id='importWallet' style={{ display: 'none' }}>
                      <input ref={privateKeyRef} type="password" id='privateKey' placeholder={i18n.t("Private Key")} />
                      <button className="pivx-button-big" onClick={() => guiImportWallet()}>
                        <span className="buttoni-icon"><i className="fas fa-file-upload fa-tiny-margin"></i></span>
                        <span ref={domImportWalletTextRef} className="buttoni-text" id="importWalletText">{i18n.t('Import Wallet')}</span>
                        <span className="buttoni-arrow"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                      </button>
                    </div>
                    {/* IMPORT WALLET  */}

                    <button ref={domAccessWalletBtnRef} className="pivx-button-big" id="accessWalletBtn" onClick={() => toggleWallet()}>
                      <span className="buttoni-icon"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 50 70"><path d="M3.497 25.717C1.401 25.588 0 23.847 0 21.753v-2.535c0-.775.149-1.593.925-1.593h22.719c2.173 0 3.941 1.861 3.941 4.034 0 2.174-1.769 3.988-3.941 3.988l-20.207.048c-.02 0 .08.023.06.022z"></path><path d="M5.229 69.625C4.455 69.625 4 68.494 4 67.719V38.661c0-1.911 1.447-3.731 3.258-3.989.175-.029.285-.047.483-.047h21.525c7.137 0 12.751-5.86 12.751-13.027 0-7.096-5.528-12.841-12.586-13.177-.002 0-.671.016-1.41.016l-20.335.066C5.529 8.373 4 6.652 4 4.558V2.023C4 1.247 4.407.625 5.183.625h24.059c11.57 0 20.654 9.546 20.706 21.104 0 9.378-6.307 17.727-15.337 20.311-1.622.445-3.122.705-4.735.778L12 42.842v22.485c0 2.156-2.141 4.298-4.235 4.298H5.229z"></path></svg></span>

                      <span className="buttoni-text" ref={wToggleRef} id='wToggle'>{i18n.t('Access My Wallet')}</span>

                      <span className="buttoni-arrow"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                    </button>
                  </div>
                </div>
                {/* ACESSS WALLET  */}
                <br />


                <br />

              </div>
              {/* KEYPAIR SECTION  */}

              <div id="StakingTab" className="tabcontent">
                {/* STAKING FEATURES  */}
                <p id="info" className="minor-notif-subtext"><b><span>{i18n.t('New Feature')}</span></b><br /><span className="minor-notif-subtext" style={{ opacity: 0.9 }}>{i18n.t('MPW cold staking')}</span></p>
                <div className="add-frame" style={{ width: '95%' }}>
                  <div className="staking-banner-top">
                    <div id="staking-rectangle" className="col-md-4">
                      <div id="pivx-price-box">
                        <div id="icon-box-piv">
                          <div id="piv-price" className="staking-piv-icon"></div>
                        </div>
                        <div id="piv-price-amount">
                          <p ref={domGuiBalanceBoxStakingRef} id="guiBalanceBoxStaking"><b ref={domGuiBalanceStakingRef} id="guiBalanceStaking">~</b> PIV</p>
                        </div>
                      </div>
                      <div id="staking-box">
                        <h3 id="stake-title" className="noselect" ><span>{i18n.t('Staking')} </span>&nbsp;&nbsp;<span ref={domBalanceReloadStakingRef} id="balanceReloadStaking" className="reload noselect" onClick={() => refreshChainData()}>&#x21bb;</span></h3>
                      </div>
                    </div>
                  </div>
                  <br />
                  <div className="staking-banner-bottom">
                    <div className="stake-box large-box col-md-5">
                      <h5 ref={domAvailToDelegateRef} id="availToDelegate" className="stake-balances">{i18n.t('Available 0')}</h5>
                      <textarea id="delegateAmount" className="stake-input form-control private-key-area"></textarea>
                      <div className="button-padd">
                        <button className="pivx-button-big" onClick={() => delegateGUI()}>
                          <span className="buttoni-icon"><i className="far fa-eye fa-tiny-margin"></i></span>
                          <span className="buttoni-text">{i18n.t('Delegate')}</span>
                          <span className="buttoni-arrow"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                        </button>
                      </div>
                    </div>
                    <div className="stake-box large-box col-md-5">
                      <h5 ref={domAvailToUndelegateRef} id="availToUndelegate" className="stake-balances">{i18n.t('Staking 0')}</h5>
                      <textarea id="undelegateAmount" className="stake-input form-control private-key-area"></textarea>
                      <div className="button-padd">
                        <button className="pivx-button-big" onClick={() => undelegateGUI()}>
                          <span className="buttoni-icon"><i className="far fa-eye fa-tiny-margin"></i></span>
                          <span className="buttoni-text">{i18n.t('Undelegate')}</span>
                          <span className="buttoni-arrow"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* STAKING FEATURES  */}
                </div>
              </div>



              <div id="Transaction" className="tabcontent">

                {/* PIVX TITLE SECTION  */}
                <div className="col-md-12 title-section float-left rm-pd">
                  <h3 className=" center-text">{i18n.t('Create')}</h3><h3 className="pivx-bold-title center-text"> {i18n.t('Transaction')}</h3>
                </div>
                <br />
                {/* PIVX TITLE SECTION  */}

                <div ref={errorNoticeRef} id='errorNotice' className="col-md-12 float-left"></div>
                <div className="col-md-12">
                  <p id="communication" className="center-text">{i18n.t('no shielded')}</p>
                </div>
                <div className='max-width' style={{ clear: 'both' }}>
                  <div id="simpleTransactionsDropdown" className="bold-trans" onClick={() => toggleDropDown("simpleTransactions")}>{i18n.t('Create Simple Transactions')}<span
                    style={{ float: 'right' }}>▼</span></div>
                  <div id='simpleTransactions' style={{ display: 'block' }}>
                    <br />
                    <label>{i18n.t('address')}</label><br />
                    <input className="center-text" style={{ width: '100%', fontFamily: 'monospace' }} type="text" id="address1s" />
                    <br />
                    <label>{i18n.t('Amount')}</label><br />
                    <input className="center-text" type="number" min="0" id="value1s" />
                    <div id="reqDescDisplay" style={{ display: 'none' }}>
                      <label>{i18n.t('Description (from the merchant)')}</label><br />
                      <input className="center-text" type="text" disabled id="reqDesc" />
                    </div>
                    <br />
                    <div id='HumanReadable'></div>
                    <br />
                    <button className="pivx-button-big" onClick={() => createSimpleTransation()}>
                      <span className="buttoni-icon"><i className="fas fa-paper-plane fa-tiny-margin"></i></span>
                      <span className="buttoni-text" id="genIt">{i18n.t('Send Transaction')}</span>
                      <span className="buttoni-arrow"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                    </button>
                  </div>
                  <div id='transactionFinal'></div>
                </div>
                <br />
                <div className='max-width' style={{ clear: 'both' }}>
                  <div onClick={() => toggleDropDown("advTransactions")} className="bold-trans">{i18n.t('Create Manual Transactions')}
                    <span style={{ float: 'right' }}>▼</span></div>
                  <div id='advTransactions' style={{ display: 'none' }}>
                    <br />
                    <h3>{i18n.t('Inputs')}</h3>
                    <label>{i18n.t('Trx Hash')}</label><br />
                    <input type="text" id="prevTrxHash" />
                    <label>{i18n.t('Index')}</label><br />
                    <input type="text" id="index" />
                    <label>{i18n.t('Script')}</label><br />
                    <input type="text" id="script" /><br /><br />
                    <h3>{i18n.t('Outputs')}</h3>
                    <label>{i18n.t('Output address 1')}</label><br />
                    <input type="text" id="address1" />
                    <label>{i18n.t('Amount')}</label><br />
                    <input type="text" id="value1" />
                    <br />
                    <label>{i18n.t('Output address 2')}</label><br />
                    <input type="text" id="address2" />
                    <label>{i18n.t('Amount')}</label><br />
                    <input type="text" id="value2" /><br /><br />
                    <h3>{i18n.t('WIF Key')}</h3>
                    <label>{i18n.t('key')}</label><br />
                    <input type="text" id="wif" />
                    <br /><br />
                    <p style={{ padding: '5px 0 15px' }}>{i18n.t('Warning2')}</p>
                    <button className="pivx-button-big" onClick={() => createRawTransaction()}>
                      <span className="buttoni-icon"><i className="fas fa-paper-plane fa-tiny-margin"></i></span>
                      <span className="buttoni-text">{i18n.t('Create Raw Signed Transction')}</span>
                      <span className="buttoni-arrow"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                    </button>
                    <br /><br /><br />
                    <h4 id="signed-raw">{i18n.t('Signed Raw Transaction')}</h4>
                    <textarea rows="15" cols="70" id="rawTrx"></textarea>
                    <p>{i18n.t("Don't understand")}</p>
                    <p><a target='_blank' rel="noreferrer" href='https://github.com/PIVX-Labs/MyPIVXWallet#transaction'>{i18n.t('English Tutorial Here')}</a></p>
                    <p>{i18n.t('Advanced Details')}</p><p>{i18n.t('locktime')}</p>
                  </div>
                </div>
              </div>
              <div id="Settings" className="tabcontent">
                {/* <form action="javascript:setExplorer()"> */}
                <label htmlFor="explorer">{i18n.t('Choose an explorer')}</label><br />
                <select id="explorer" className="form-control" name="explorer">
                  <option value="cryptoid">https://chainz.cryptoid.info/pivx</option>
                  <option value="custom">{i18n.t('custom (In Development)')}</option>
                </select>
                <br />
                <button id="submit-button" className="pivx-button-big" type="submit">
                  <span className="buttoni-icon"><i className="fas fa-paper-plane fa-tiny-margin"></i></span>
                  <span className="buttoni-text">{i18n.t('Submit')}</span>
                  <span className="buttoni-arrow"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                </button>
                {/* </form> */}
                <br />

                <button className="pivx-button-big" onClick={() => toggleDebug()}>
                  <span className="buttoni-icon"><i className="fas fa-bug fa-tiny-margin"></i></span>
                  <span className="buttoni-text">{i18n.t('Toggle Debug Mode')}</span>
                  <span className="buttoni-arrow"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                </button>
                <button className="pivx-button-big" onClick={() => toggleNetwork()}>
                  <span className="buttoni-icon"><i className="fas fa-network-wired fa-tiny-margin"></i></span>
                  <span className="buttoni-text">{i18n.t('Toggle Networking Mode')}</span>
                  <span className="buttoni-arrow"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M23.328 16.707L13.121 26.914a.5.5 0 01-.707 0l-2.828-2.828a.5.5 0 010-.707L16.964 16 9.586 8.621a.5.5 0 010-.707l2.828-2.828a.5.5 0 01.707 0l10.207 10.207a1 1 0 010 1.414z"></path></svg></span>
                </button>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alert */}

      <div className="alertPositioning">
      </div>
      <footer id="foot">
        <div className="footer">
          <div id='dcfooter'>
            {i18n.t('© MIT 2022 - Built with 💜 by PIVX Labs -')} <b style={{ cursor: 'pointer' }} onClick={() => openDonatePage()}>{i18n.t('Donate!')}</b><br /><a href="https://github.com/PIVX-Labs/MyPIVXWallet">MyPIVXWallet</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default withTranslation()(App);
export { privateKeyRef, errorNoticeRef, domGuiBalanceBoxStakingRef, domAvailToUndelegateRef, domAvailToDelegateRef, domGuiBalanceStakingRef, networkEnabledVar, publicKeyForNetwork, domGenKeyWarningRef, domBalanceReloadRef, domBalanceReloadStakingRef, domPrivateTxtRef, guiViewKeyRef, domGuiAddressRef, domGuiBalanceRef, domGuiBalanceBoxRef, domPrivateQrRef, domPublicQrRef, domModalQrLabelRef, domModalQRRef, domIdenticonRef, domGuiWalletRef, domPrefixRef, domGenerateWalletRef, domImportWalletRef, domGenVanityWalletRef, domAccessWalletRef };
export const domAddress1s = document.getElementById("address1s");
export const domTxOutput = document.getElementById("transactionFinal");
export const domSimpleTXs = document.getElementById("simpleTransactions");
export const domValue1s = document.getElementById("value1s");