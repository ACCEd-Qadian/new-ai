function queueSpeech(text) {
    if (!text.trim()) return;
    
    // Completely strip markdown and emojis safely
    let cleanText = text
      .replace(/[\*\_\#\`\~\>\[\]\(\)\{\}\"\'\@\$\%\^\&\=\+\\\|\/]/g, "") // remove symbols like **, #, @, etc.
      .replace(/(http|https):\/\/[^\s]+/g, "link") // remove long URLs
      .replace(/[\n\r]+/g, " ") // lines to space
      .replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '') // remove emojis
      .trim();

    return cleanText;
}

const test1 = "Hello! **This is bold**. #HashTag. Contact me at name@example.com! 🚀😊";
const test2 = "यहाँ कुछ हिंदी है! **ज़रूर**! 100%";
const test3 = "یہ ایک **اردو** جملہ ہے! @urdu #ai";
const test4 = "ਪੰਜਾਬੀ ਵਿੱਚ ਕੁਝ **ਟੈਕਸਟ**!";

console.log("Original 1:", test1);
console.log("Cleaned  1:", queueSpeech(test1));
console.log("Original 2:", test2);
console.log("Cleaned  2:", queueSpeech(test2));
console.log("Original 3:", test3);
console.log("Cleaned  3:", queueSpeech(test3));
console.log("Original 4:", test4);
console.log("Cleaned  4:", queueSpeech(test4));

