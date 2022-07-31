import './libs/noble-secp256k1.js';
import './libs/bn.js';
import './libs/secp256k1.js';
import './libs/crypto-min.js';
import './libs/crypto-sha256-hmac.js';
import './libs/crypto-sha256.js';
import './libs/jsbn.js';
import './libs/ripemd160.js';
import './libs/sha256.js'

import { Secp256k1 } from "./libs/secp256k1";
import { getPublicKey, bytesToHex } from "./libs/noble-secp256k1";
import jsSHA from "./libs/sha256";
import { ripemd160 } from "./libs/ripemd160";

/* chainparams */
const PUBKEY_ADDRESS = 30;
// const SECRET_KEY = 212;

// importScripts('libs/noble-secp256k1.js', 'libs/bn.js', 'libs/secp256k1.js', 'libs/crypto-min.js', 'libs/crypto-sha256-hmac.js', 'libs/crypto-sha256.js', 'libs/jsbn.js', 'libs/ripemd160.js', 'libs/sha256.js');

// const nSecp256k1 = nobleSecp256k1.default;

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
    j = 0;                           //reset the base58 digit iterator
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
// var from_b58 = function (
//   S           //Base58 encoded string input
// ) {
//   var d = [], //the array for storing the stream of decoded bytes
//     b = [],   //the result byte array that will be returned
//     i,        //the iterator variable for the base58 string
//     j,        //the iterator variable for the byte array (d)
//     c,        //the carry amount variable that is used to overflow from the current byte to the next byte
//     n;        //a temporary placeholder variable for the current byte
//   for (i in S) { //loop through each base58 character in the input string
//     j = 0;                             //reset the byte iterator
//     c = MAP_B58.indexOf(S[i]);           //set the initial carry amount equal to the current base58 digit
//     if (c < 0)                         //see if the base58 digit lookup is invalid (-1)
//       return undefined;                //if invalid base58 digit, bail out and return undefined
//     // eslint-disable-next-line no-unused-expressions
//     c || b.length ^ i ? i : b.push(0); //prepend the result array with a zero if the base58 digit is zero and non-zero characters haven't been seen yet (to ensure correct decode length)
//     while (j in d || c) {              //start looping through the bytes until there are no more bytes and no carry amount
//       n = d[j];                      //set the placeholder for the current byte
//       n = n ? n * 58 + c : c;        //shift the current byte 58 units and add the carry amount (or just add the carry amount if this is a new byte)
//       c = n >> 8;                    //find the new carry amount (1-byte shift of current byte value)
//       d[j] = n % 256;                //reset the current byte to the remainder (the carry amount will pass on the overflow)
//       j++                            //iterate to the next byte
//     }
//   }
//   while (j--)               //since the byte array is backwards, loop through it in reverse order
//     b.push(d[j]);           //append each byte to the result
//   return new Uint8Array(b); //return the final byte array in Uint8Array format
// }

// Cryptographic Random-Gen
function getSafeRand(nSize = 32) {
  return crypto.getRandomValues(new Uint8Array(nSize));
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

/* MPW constants */
const pubKeyHashNetworkLen = 21;
const pubChksum = 4;
const pubPrebaseLen = pubKeyHashNetworkLen + pubChksum;

const cKeypair = {
  'pub': '',
  'priv': new Uint8Array()
}

// Precompute buffers
const pubKeyHashNetwork = new Uint8Array(pubKeyHashNetworkLen);
pubKeyHashNetwork[0] = PUBKEY_ADDRESS;
const pubKeyPreBase = new Uint8Array(pubPrebaseLen);

while (true) {
  cKeypair.priv = getSafeRand();

  // Public Key Derivation
  const nPubkey = bytesToHex(getPublicKey(cKeypair.priv)).substr(2);
  const pubY = Secp256k1.uint256(nPubkey.substr(64), 16);
  const publicKeyBytesCompressed = Crypto.util.hexToBytes(nPubkey.substr(0, 64));
  publicKeyBytesCompressed.unshift(pubY.isEven() ? 0x02 : 0x03);
  // First pubkey SHA-256 Hash
  const pubKeyHashing = new jsSHA(0, 0, { "numRounds": 1 });
  pubKeyHashing.update(publicKeyBytesCompressed);
  // RIPEMD160 Hash + Network Encoding
  writeToUint8(pubKeyHashNetwork, ripemd160(pubKeyHashing.getHash(0)), 1);
  // Double SHA-256 Hash
  const pubKeyHashingS = new jsSHA(0, 0, { "numRounds": 2 });
  pubKeyHashingS.update(pubKeyHashNetwork);
  // Digest Hash, Slice Checksum & finish the prebase key
  writeToUint8(pubKeyPreBase, pubKeyHashNetwork, 0);
  writeToUint8(pubKeyPreBase, (pubKeyHashingS.getHash(0)).slice(0, 4), pubKeyHashNetworkLen);
  cKeypair.pub = to_b58(pubKeyPreBase);

  postMessage(cKeypair);
}