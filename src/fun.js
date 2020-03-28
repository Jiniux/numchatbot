const jimp = require('jimp');

fry = (buffer, params) => new Promise((rs, rj) => {
    const brightness = parseFloat(params[0] || 0) 
    const contrast = parseFloat(params[1] || 0)

    jimp.read(buffer)
        .then(img => {
            img.brightness(brightness).contrast(contrast, async (err, out) => {
                if (err) rj(err)
                else rs(await out.getBufferAsync(jimp.MIME_JPEG)
                                .catch(rj))  
            })
        })
        .catch(rj);
})

module.exports = { fry }