/*
* Encrypt a char code array with the specified key
* @param key The key to use for encryption
* @param charCodeArray The char code array to crypt
* @return The encrypted string
*/
function EncryptCharCode(key, charCodeArray){
    AES_Init();

    AES_Encrypt(charCodeArray, key);
    var result = "";
    for (var i = 0; i < charCodeArray.length; i++)
        result += String.fromCharCode(charCodeArray[i]);

    AES_Done();
    return result;
}

/*
* Encrypt the selected string
* @param key The key to use for encryption
* @param string The string to encrypt
* @return Encrypted string
*/
function EncryptString(key, string){
    var splitString = string.match(/.{1,16}/g);
    var splitStringCharCode = [];

    var encryptString = "";

    for (var i = 0; i < splitString.length; i++){
        splitStringCharCode = splitString[i].split ('').map (function (c) { return c.charCodeAt (0); });
        encryptString += EncryptCharCode(key, splitStringCharCode);
    }

    return encryptString;
}

/*
* Decrypt a char code array with the specified key
* @param key The key to use for decryption
* @param charCodeArray The char code array to decrypt
* @return The decrypted string
*/
function DecryptCharCode(key, charCodeArray){
    AES_Init();

    AES_Decrypt(charCodeArray, key);
    var result = "";
    for (var i = 0; i < charCodeArray.length; i++)
        result += String.fromCharCode(charCodeArray[i]);

    AES_Done();
    return result;
}

/*
* Decrypt the selected string
* @param key The key to use for decryption
* @param string The string to decrypt
* @return Encrypted string
*/
function DecryptString(key, string){
    var tempEncrypted = string.match(/.{1,16}/g);
    var decryptString = "";

    for (var i = 0; i < tempEncrypted.length; i++){
        splitStringCharCode = tempEncrypted[i].split ('').map (function (c) { return c.charCodeAt (0); });
        decryptString += DecryptCharCode(key, splitStringCharCode);
    }

    decryptString = decryptString.split(String.fromCharCode(0))[0];
    return decryptString;
}

/*
* Generate a AES 32bits key
* @return The key as array
*/
function GenerateKey(){
    var key = new Array(32);
    for(var i = 0; i < 32; i++)
        key[i] = Math.floor((Math.random() * 255));
    return key;
}

/*
* Generate a key and make sure it can be use for a correct decryption
* @param decodedString The script to test
* @return The key who will be use to crypt and decrpyt
*/
function GetGoodEncryptionKey(decodedString){
    var splitString = decodedString.match(/.{1,16}/g);
    var splitStringCharCode = [];
    var actualKey;

    do {
        var encryptString = "";
        actualKey = GenerateKey();

        for (var i = 0; i < splitString.length; i++){
            splitStringCharCode = splitString[i].split ('').map (function (c) { return c.charCodeAt (0); });
            encryptString += EncryptCharCode(actualKey, splitStringCharCode);
        }

        var tempEncrypted = encryptString.match(/.{1,16}/g);
        var decryptString = "";

        for (var i = 0; i < tempEncrypted.length; i++){
            splitStringCharCode = tempEncrypted[i].split ('').map (function (c) { return c.charCodeAt (0); });
            decryptString += DecryptCharCode(actualKey, splitStringCharCode);
        }

        decryptString = decryptString.split(String.fromCharCode(0))[0];
    } while (decodedString != decryptString);

    return actualKey;
}

var aesLoad = true;
