/*jslint browser:true*/
/*jslint devel:true*/
/*jslint nomen: true*/
/*jslint node: true*/
/*jslint regexp: true*/
/*global btoa, AES_Init, AES_Done, AES_Encrypt, AES_Decrypt*/

/*
* Encrypt a char code array with the specified key
* @param key The key to use for encryption
* @param charCodeArray The char code array to crypt
* @return The encrypted string
*/
"use strict";

function encryptCharCode(key, charCodeArray) {
    AES_Init();

    AES_Encrypt(charCodeArray, key);
    var i, result;
    result = "";
    for (i = 0; i < charCodeArray.length; i += 1) { result += String.fromCharCode(charCodeArray[i]); }

    AES_Done();
    return result;
}

/*
* Encrypt the selected string
* @param key The key to use for encryption
* @param string The string to encrypt
* @return Encrypted string
*/
function encryptString(key, string) {
    var splitString, splitStringCharCode, encryptedString, i;

    splitString = string.match(/.{1,16}/g);
    splitStringCharCode = [];

    encryptedString = "";

    for (i = 0; i < splitString.length; i += 1) {
        splitStringCharCode = splitString[i].split('').map(function (c) { return c.charCodeAt(0); });
        encryptedString += encryptCharCode(key, splitStringCharCode);
    }

    return encryptedString;
}

/*
* Decrypt a char code array with the specified key
* @param key The key to use for decryption
* @param charCodeArray The char code array to decrypt
* @return The decrypted string
*/
function decryptCharCode(key, charCodeArray) {
    var result, i;
    AES_Init();

    AES_Decrypt(charCodeArray, key);
    result = "";
    for (i = 0; i < charCodeArray.length; i += 1) { result += String.fromCharCode(charCodeArray[i]); }

    AES_Done();
    return result;
}

/*
* Decrypt the selected string
* @param key The key to use for decryption
* @param string The string to decrypt
* @return Encrypted string
*/
function decryptString(key, string) {
    var tempEncrypted, i, decryptedString, splitStringCharCode;
    tempEncrypted = string.match(/.{1,16}/g);
    decryptedString = "";

    for (i = 0; i < tempEncrypted.length; i += 1) {
        splitStringCharCode = tempEncrypted[i].split('').map(function (c) { return c.charCodeAt(0); });
        decryptedString += decryptCharCode(key, splitStringCharCode);
    }

    decryptedString = decryptedString.split(String.fromCharCode(0))[0];
    return decryptedString;
}

/*
* Generate a AES 32bits key
* @return The key as array
*/
function generateKey() {
    var key, i;
    key = new Array(32);
    for (i = 0; i < 32; i += 1) { key[i] = Math.floor((Math.random() * 255)); }
    return key;
}

/*
* Generate a key and make sure it can be use for a correct decryption
* @param decodedString The script to test
* @return The key who will be use to crypt and decrpyt
*/
function getGoodEncryptionKey(decodedString) {
    var splitString, splitStringCharCode, actualKey, encryptedString, i, decryptedString, tempEncrypted;
    splitString = decodedString.match(/.{1,16}/g);
    splitStringCharCode = [];

    do {
        encryptedString = "";
        actualKey = generateKey();

        for (i = 0; i < splitString.length; i += 1) {
            splitStringCharCode = splitString[i].split('').map(function (c) { return c.charCodeAt(0); });
            encryptedString += encryptCharCode(actualKey, splitStringCharCode);
        }

        tempEncrypted = encryptedString.match(/.{1,16}/g);
        decryptedString = "";

        for (i = 0; i < tempEncrypted.length; i += 1) {
            splitStringCharCode = tempEncrypted[i].split('').map(function (c) { return c.charCodeAt(0); });
            decryptedString += decryptCharCode(actualKey, splitStringCharCode);
        }

        decryptedString = decryptedString.split(String.fromCharCode(0))[0];
    } while (decodedString !== decryptedString);

    return actualKey;
}

var aesLoad = true;
