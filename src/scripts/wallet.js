import { privateKeyRef, domGuiAddressRef, domGuiWalletRef, domPrivateTxtRef, domPrivateQrRef, domPublicQrRef, domModalQrLabelRef, domModalQRRef, guiViewKeyRef, domIdenticonRef, domGenKeyWarningRef, domPrefixRef, domGenerateWalletRef, domImportWalletRef, domGenVanityWalletRef, domAccessWalletRef, domGuiBalanceRef, domGuiBalanceBoxRef } from "../../src/App";
import { debug, networkEnabled } from "../scripts/settings";
import { getPublicKey, bytesToHex } from "./libs/noble-secp256k1";
import { uint256 } from "./libs/secp256k1";
import jsSHA from "./libs/sha256";
import { ripemd160 } from "./libs/ripemd160";
import { qrcode } from "./libs/qrcode";
// import { jdenticon } from "./libs/jdenticon.min";
import { getUnspentTransactions } from "./network";
import { encrypt, decrypt } from "./libs/aes-gcm";

// Base58 Encoding Map
const MAP_B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

// ByteArray to B58
var to_b58 = function (
  B           //Uint8Array raw byte input
) {
  var d = [], //the array for storing the stream of base58 digits
    s = "",   //the result string variable that will be returned
    i,        //the iterator variable for the byte input
    j,        //the iterator variable for the base58 digit array (d)
    c,        //the carry amount variable that is used to overflow from the current base58 digit to the next base58 digit
    n;        //a temporary placeholder variable for the current base58 digit
  for (i in B) { //loop through each byte in the input stream
    j = 0;                         //reset the base58 digit iterator
    c = B[i];                        //set the initial carry amount equal to the current byte amount
    s += c || s.length ^ i ? "" : 1; //prepend the result string with a "1" (0 in base58) if the byte stream is zero and non-zero bytes haven't been seen yet (to ensure correct decode length)
    while (j in d || c) {             //start looping through the digits until there are no more digits and no carry amount
      n = d[j];                    //set the placeholder for the current base58 digit
      n = n ? n * 256 + c : c;     //shift the current base58 one byte and add the carry amount (or just add the carry amount if this is a new digit)
      c = n / 58 | 0;              //find the new carry amount (floored integer of current digit divided by 58)
      d[j] = n % 58;               //reset the current base58 digit to the remainder (the carry amount will pass on the overflow)
      j++                          //iterate to the next base58 digit
    }
  }
  while (j--)        //since the base58 digits are backwards, loop through them in reverse order
    s += MAP_B58[d[j]];  //lookup the character associated with each base58 digit
  return s;          //return the final base58 string
}
//B58 to ByteArray
var from_b58 = function (
  S           //Base58 encoded string input
) {
  var d = [], //the array for storing the stream of decoded bytes
    b = [],   //the result byte array that will be returned
    i,        //the iterator variable for the base58 string
    j,        //the iterator variable for the byte array (d)
    c,        //the carry amount variable that is used to overflow from the current byte to the next byte
    n;        //a temporary placeholder variable for the current byte
  for (i in S) { //loop through each base58 character in the input string
    j = 0;                             //reset the byte iterator
    c = MAP_B58.indexOf(S[i]);           //set the initial carry amount equal to the current base58 digit
    if (c < 0)                         //see if the base58 digit lookup is invalid (-1)
      return undefined;                //if invalid base58 digit, bail out and return undefined
    // eslint-disable-next-line no-unused-expressions
    c || b.length ^ i ? i : b.push(0); //prepend the result array with a zero if the base58 digit is zero and non-zero characters haven't been seen yet (to ensure correct decode length)
    while (j in d || c) {              //start looping through the bytes until there are no more bytes and no carry amount
      n = d[j];                      //set the placeholder for the current byte
      n = n ? n * 58 + c : c;        //shift the current byte 58 units and add the carry amount (or just add the carry amount if this is a new byte)
      c = n >> 8;                    //find the new carry amount (1-byte shift of current byte value)
      d[j] = n % 256;                //reset the current byte to the remainder (the carry amount will pass on the overflow)
      j++                            //iterate to the next byte
    }
  }
  while (j--)               //since the byte array is backwards, loop through it in reverse order
    b.push(d[j]);           //append each byte to the result
  return new Uint8Array(b); //return the final byte array in Uint8Array format
}

/* MPW constants */
const pubKeyHashNetworkLen = 21;
const pubChksum = 4;
const pubPrebaseLen = pubKeyHashNetworkLen + pubChksum;

var walletAlreadyMade = 0;
var privateKeyForTransactions;
var publicKeyForNetwork;
var viewPrivKey;
const SECRET_KEY = 212;
const PUBKEY_ADDRESS = 30;
// const nSecp256k1 = nobleSecp256k1.default;
// document.getElementById('dcfooter').innerHTML = '© MIT 2022 - Built with 💜 by PIVX Labs - <b style=\'cursor:pointer\' onclick=\'openDonatePage()\'>Donate!</b><br><a href="https://github.com/PIVX-Labs/MyPIVXWallet">MyPIVXWallet</a>';
// Wallet Import
export function importWallet(i18n, newWif = false, raw = false) {
  if (walletAlreadyMade !== 0) {
    var walletConfirm = window.confirm(i18n.t("Do you really want to import a new address? If you haven't saved the last private key, the key will get LOST forever alongside ANY funds with it."));
  } else {
    walletConfirm = true;
  }
  if (walletConfirm) {
    walletAlreadyMade++;
    if (raw) {
      const pkNetBytesLen = newWif.length + 2;
      const pkNetBytes = new Uint8Array(pkNetBytesLen);
      // Network Encoding
      pkNetBytes[0] = SECRET_KEY;           // Private key prefix (1 byte)
      writeToUint8(pkNetBytes, newWif, 1);  // Private key bytes  (32 bytes)
      pkNetBytes[pkNetBytesLen - 1] = 1;    // Leading digit      (1 byte)
      // Double SHA-256 hash
      // const shaObj = new jsSHA(0, 0, { "numRounds": 2 });
      const shaObj = 0;
      shaObj.update(pkNetBytes);
      // WIF Checksum
      const checksum = shaObj.getHash(0).slice(0, 4);
      const keyWithChecksum = new Uint8Array(pkNetBytesLen + checksum.length);
      writeToUint8(keyWithChecksum, pkNetBytes, 0);
      writeToUint8(keyWithChecksum, checksum, pkNetBytesLen);
      newWif = to_b58(keyWithChecksum);
    }
    // Wallet Import Format to Private Key
    const privkeyWIF = newWif || privateKeyRef.current.value;
    privateKeyForTransactions = privkeyWIF;
    if (!newWif) privateKeyRef.current.value = "";
    const byteArryConvert = from_b58(privkeyWIF);
    const droplfour = byteArryConvert.slice(0, byteArryConvert.length - 4);
    const key = droplfour.slice(1, droplfour.length);
    const privkeyBytes = key.slice(0, key.length - 1);
    if (debug) {
      // WIF to Private Key
      console.log(bytesToHex(privkeyWIF));
      console.log(bytesToHex(byteArryConvert));
      console.log(bytesToHex(droplfour));
      console.log(bytesToHex(privkeyBytes));
    }
    // Public Key Derivation
    let nPubkey = bytesToHex(getPublicKey(privkeyBytes)).substr(2);
    const pubY = uint256(nPubkey.substr(64), 16);
    nPubkey = nPubkey.substr(0, 64);
    const publicKeyBytesCompressed = Crypto.util.hexToBytes(nPubkey);
    publicKeyBytesCompressed.unshift(pubY.isEven() ? 0x02 : 0x03);
    // First pubkey SHA-256 hash
    const pubKeyHashing = new jsSHA(0, 0, { "numRounds": 1 });
    pubKeyHashing.update(publicKeyBytesCompressed);
    // RIPEMD160 hash
    const pubKeyHashRipemd160 = ripemd160(pubKeyHashing.getHash(0));
    // Network Encoding
    const pubKeyHashNetwork = new Uint8Array(pubKeyHashNetworkLen);
    pubKeyHashNetwork[0] = PUBKEY_ADDRESS;
    writeToUint8(pubKeyHashNetwork, pubKeyHashRipemd160, 1);
    // Double SHA-256 hash
    const pubKeyHashingS = new jsSHA(0, 0, { "numRounds": 2 });
    pubKeyHashingS.update(pubKeyHashNetwork);
    const pubKeyHashingSF = pubKeyHashingS.getHash(0);
    // Checksum
    const checksumPubKey = pubKeyHashingSF.slice(0, 4);
    // Public key pre-base58
    const pubKeyPreBase = new Uint8Array(pubPrebaseLen);
    writeToUint8(pubKeyPreBase, pubKeyHashNetwork, 0);
    writeToUint8(pubKeyPreBase, checksumPubKey, pubKeyHashNetworkLen);
    // Encode as Base58 human-readable network address
    publicKeyForNetwork = to_b58(pubKeyPreBase);

    // Display Text
    domGuiAddressRef.current.innerHTML = publicKeyForNetwork;
    domGuiWalletRef.current.style.display = 'block';
    domPrivateTxtRef.current.value = privkeyWIF;
    domGuiAddressRef.current.innerHTML = publicKeyForNetwork;

    // QR Codes
    // Private Key
    const typeNumber = 4;
    const errorCorrectionLevel = 'L';
    const qrPriv = qrcode(typeNumber, errorCorrectionLevel);
    qrPriv.addData(privkeyWIF);
    qrPriv.make();
    domPrivateQrRef.current.innerHTML = qrPriv.createImgTag();
    domPrivateQrRef.current.firstChild.style.borderRadius = '8px';

    // Public Key
    const qrPub = qrcode(typeNumber, errorCorrectionLevel);
    qrPub.addData('pivx:' + publicKeyForNetwork);
    qrPub.make();
    domPublicQrRef.current.innerHTML = qrPub.createImgTag();
    domPublicQrRef.current.firstChild.style.borderRadius = '8px';
    // Pubkey Modal
    domModalQrLabelRef.current.innerHTML = 'pivx:' + publicKeyForNetwork;
    domModalQRRef.current.innerHTML = qrPub.createImgTag();
    domModalQRRef.current.firstChild.style.width = "100%";
    domModalQRRef.current.firstChild.style.height = "auto";
    domModalQRRef.current.firstChild.style.imageRendering = "crisp-edges";
    document.getElementById('clipboard').value = publicKeyForNetwork;

    // Set view key as public and refresh QR code
    viewPrivKey = true;
    viewPrivKey = !viewPrivKey;
    guiViewKeyRef.current.innerHTML = viewPrivKey ? 'Privkey QR' : 'Pubkey QR';
    domPrivateTxtRef.current.style.display = viewPrivKey ? 'block' : 'none';
    domPrivateQrRef.current.style.display = viewPrivKey ? 'block' : 'none';
    domPublicQrRef.current.style.display = !viewPrivKey ? 'block' : 'none';

    // Update identicon
    domIdenticonRef.current.dataset.jdenticonValue = publicKeyForNetwork;
    // jdenticon();

    if (!newWif) {
      // Hide the encryption warning
      domGenKeyWarningRef.current.style.display = 'block';
    }
    // Load UTXOs from explorer
    if (networkEnabled)
      getUnspentTransactions(i18n);

    // Hide all wallet starter options
    hideAllWalletOptions();
  }
}

const PUBKEY_PREFIX = "D";

function hideAllWalletOptions() {
  // Hide and Reset the Vanity address input
  domPrefixRef.current.value = PUBKEY_PREFIX;
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

// Writes a sequence of Array-like bytes into a location within a Uint8Array
function writeToUint8(arr, bytes, pos) {
  const arrLen = arr.length;
  // Sanity: ensure an overflow cannot occur, if one is detected, somewhere in MPW's state could be corrupted.
  if ((arrLen - pos) - bytes.length < 0) {
    const strERR = 'CRITICAL: Overflow detected (' + ((arrLen - pos) - bytes.length) + '), possible state corruption, backup and refresh advised.';
    alert(strERR);
    throw Error(strERR);
  }
  let i = 0;
  while (pos < arrLen)
    arr[pos++] = bytes[i++];
}

// Cryptographic Random-Gen
function getSafeRand(nSize = 32) {
  return crypto.getRandomValues(new Uint8Array(nSize));
}

// Wallet Generation
export async function generateWallet(i18n, noUI = false) {
  if (walletAlreadyMade !== 0 && !noUI) {
    var walletConfirm = window.confirm(i18n.t("Do you really want to generate a new address? If you haven't saved the last private key the key will get lost forever and any funds with it."));
  } else {
    walletConfirm = true;
  }
  if (walletConfirm) {
    walletAlreadyMade++;
    const pkBytes = getSafeRand();
    // Private Key Generation
    const pkNetBytesLen = pkBytes.length + 2;
    const pkNetBytes = new Uint8Array(pkNetBytesLen);
    // Network Encoding
    pkNetBytes[0] = SECRET_KEY;           // Private key prefix (1 byte)
    writeToUint8(pkNetBytes, pkBytes, 1); // Private key bytes  (32 bytes)
    pkNetBytes[pkNetBytesLen - 1] = 1;    // Leading digit      (1 byte)
    // Double SHA-256 hash
    const shaObj = new jsSHA(0, 0, { "numRounds": 2 });
    shaObj.update(pkNetBytes);
    // WIF Checksum
    const checksum = shaObj.getHash(0).slice(0, 4);
    const keyWithChecksum = new Uint8Array(pkNetBytesLen + checksum.length);
    writeToUint8(keyWithChecksum, pkNetBytes, 0);
    writeToUint8(keyWithChecksum, checksum, pkNetBytesLen);
    // Encode as Base58 human-readable WIF
    privateKeyForTransactions = to_b58(keyWithChecksum);

    // Public Key Derivation
    let nPubkey = bytesToHex(getPublicKey(pkBytes)).substr(2);
    const pubY = uint256(nPubkey.substr(64), 16);
    nPubkey = nPubkey.substr(0, 64);
    const publicKeyBytesCompressed = Crypto.util.hexToBytes(nPubkey);
    publicKeyBytesCompressed.unshift(pubY.isEven() ? 0x02 : 0x03);
    // First pubkey SHA-256 hash
    const pubKeyHashing = new jsSHA(0, 0, { "numRounds": 1 });
    pubKeyHashing.update(publicKeyBytesCompressed);
    // RIPEMD160 hash
    const pubKeyHashRipemd160 = ripemd160(pubKeyHashing.getHash(0));
    // Network Encoding
    const pubKeyHashNetwork = new Uint8Array(pubKeyHashNetworkLen);
    pubKeyHashNetwork[0] = PUBKEY_ADDRESS;
    writeToUint8(pubKeyHashNetwork, pubKeyHashRipemd160, 1);
    // Double SHA-256 hash
    const pubKeyHashingS = new jsSHA(0, 0, { "numRounds": 2 });
    pubKeyHashingS.update(pubKeyHashNetwork);
    const pubKeyHashingSF = pubKeyHashingS.getHash(0);
    // Checksum
    const checksumPubKey = pubKeyHashingSF.slice(0, 4);
    // Public key pre-base58
    const pubKeyPreBase = new Uint8Array(pubPrebaseLen);
    writeToUint8(pubKeyPreBase, pubKeyHashNetwork, 0);
    writeToUint8(pubKeyPreBase, checksumPubKey, pubKeyHashNetworkLen);
    // Encode as Base58 human-readable network address
    publicKeyForNetwork = to_b58(pubKeyPreBase);

    // Debug Console
    if (debug) {
      console.log("Private Key")
      console.log(pkNetBytes)
      console.log("Private key plus Net Prefix and Leading Digits")
      console.log(bytesToHex(pkNetBytes))
      console.log("Double SHA-256 Hash")
      console.log(shaObj.getHash(0))
      console.log('CheckSum')
      console.log(checksum)
      console.log('Key With CheckSum')
      console.log(keyWithChecksum)
      console.log('Private Key')
      console.log(privateKeyForTransactions)
      console.log('Public Key')
      console.log(publicKeyBytesCompressed)
      console.log('Public Key Extended')
      // console.log(bytesToHex(pubkeyExt))
      console.log('SHA256 Public Key')
      console.log(pubKeyHashing.getHash("HEX"))
      console.log('RIPEMD160 Public Key')
      console.log(pubKeyHashRipemd160)
      console.log('PubKeyHash w/NetworkBytes')
      console.log(pubKeyHashNetwork)
      console.log('2x SHA256 Public Key Secound Time')
      console.log(pubKeyHashingSF)
      console.log("CheckSum Public Key")
      console.log(checksumPubKey)
      console.log("Pub Key with Checksum")
      console.log(pubKeyPreBase)
      console.log('Public Key Base 64')
      console.log(publicKeyForNetwork)
    }
    if (!noUI) {
      // Display Text
      domGenKeyWarningRef.current.style.display = 'block';
      domPrivateTxtRef.current.value = privateKeyForTransactions;
      domGuiAddressRef.current.innerHTML = publicKeyForNetwork;
      // New address... so there definitely won't be a balance
      domGuiBalanceRef.current.innerHTML = "0";
      domGuiBalanceBoxRef.current.style.fontSize = "x-large";
      // QR Codes
      const typeNumber = 4;
      const errorCorrectionLevel = 'L';
      const qrPriv = qrcode(typeNumber, errorCorrectionLevel);
      qrPriv.addData(privateKeyForTransactions);
      qrPriv.make();
      domPrivateQrRef.current.innerHTML = qrPriv.createImgTag();
      domPrivateQrRef.current.firstChild.style.borderRadius = '8px';
      const qrPub = qrcode(typeNumber, errorCorrectionLevel);
      qrPub.addData('pivx:' + publicKeyForNetwork);
      qrPub.make();
      domPublicQrRef.current.innerHTML = qrPub.createImgTag();
      domPublicQrRef.current.style.display = 'block';
      domPublicQrRef.current.firstChild.style.borderRadius = '8px';
      domModalQrLabelRef.current.innerHTML = 'pivx:' + publicKeyForNetwork;
      domModalQRRef.current.innerHTML = qrPub.createImgTag();
      domModalQRRef.current.firstChild.style.width = "100%";
      domModalQRRef.current.firstChild.style.height = "auto";
      domModalQRRef.current.firstChild.style.imageRendering = "crisp-edges";
      document.getElementById('clipboard').value = publicKeyForNetwork;
      // Update identicon
      domIdenticonRef.current.dataset.jdenticonValue = publicKeyForNetwork;
      // jdenticon();
      domGuiWalletRef.current.style.display = 'block';
      viewPrivKey = false;
      hideAllWalletOptions();
    }
    return { 'pubkey': publicKeyForNetwork, 'privkey': privateKeyForTransactions };
  }
}

// async function benchmark(quantity) {
//   let i = 0;
//   const nStartTime = Date.now();
//   while (i < quantity) {
//     await generateWallet(true);
//     i++;
//   }
//   const nEndTime = Date.now();
//   console.log("Time taken to generate " + i + " addresses: " + (nEndTime - nStartTime).toFixed(2) + 'ms');
// }

export async function encryptWallet(i18n, strPassword = '') {
  // Encrypt the wallet WIF with AES-GCM and a user-chosen password - suitable for browser storage
  let encWIF = await encrypt(i18n, privateKeyForTransactions, strPassword);
  if (typeof encWIF !== "string") return false;
  // Set the encrypted wallet in localStorage
  localStorage.setItem("encwif", encWIF);
  // Hide the encryption warning
  domGenKeyWarningRef.current.style.display = 'none';
}

export async function decryptWallet(i18n, strPassword = '') {
  // Check if there's any encrypted WIF available, if so, prompt to decrypt it
  let encWif = localStorage.getItem("encwif");
  if (!encWif || encWif.length < 1) {
    console.log("No local encrypted wallet found!");
    return false;
  }
  let decWif = await decrypt(i18n, encWif, strPassword);
  if (!decWif || decWif === "decryption failed!") {
    if (decWif === "decryption failed!")
      alert("Incorrect password!");
    return false;
  }
  importWallet(decWif);
  return true;
}

export function hasEncryptedWallet() {
  return localStorage.getItem("encwif") ? true : false;
}