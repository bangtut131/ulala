const fs = require('fs');
try {
    const content = fs.readFileSync('debug_id_84_error.txt', 'utf8'); // Or try 'ucs2' if UTF-16
    console.log(content.substring(0, 2000));
} catch (e) {
    console.log("Failed to read utf8, trying ucs2");
    const content2 = fs.readFileSync('debug_id_84_error.txt', 'ucs2');
    console.log(content2.substring(0, 2000));
}
