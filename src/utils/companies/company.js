var path = require('path');
const {  documentExtract } = require('../utils.js');



const readPaymentgSupport = (filePath, isRequest = false) => new Promise((resolve, reject) => {
  try {
    let ext = path.extname(filePath);
    let jsonCliente = {};
    let arrayTextLine = [];

    if (ext === '.png' || ext === '.jpeg' || ext === '.jpg') {

      (async () => {
        let jsonToRead = await documentExtract(filePath, isRequest);
        if (jsonToRead != "error") {

      


          /**
           * sacamos todas las lineas leidas
           */
          for (const block of jsonToRead.Blocks) {
            if (block.BlockType == 'LINE') {
              let strTop = block.Geometry.BoundingBox.Top.toString().substring(0, 6);
              let pos = -1;

              for (let index = 0; index < arrayTextLine.length; index++) {
                const element = arrayTextLine[index];
                if (Math.abs(element.top - parseFloat(strTop)) < 0.005) {
                  pos = index;
                  break;
                }
              }

              if (pos !== -1) {
                arrayTextLine[pos].arrayText.push({ top: strTop, text: block.Text, left: block.Geometry.BoundingBox.Left.toFixed(2), confidence: block.Confidence });
              } else {
                let newElem = {}
                newElem.top = parseFloat(strTop)
                newElem.arrayText = [{ top: ":::" + strTop, text: block.Text, left: block.Geometry.BoundingBox.Left.toFixed(2), confidence: block.Confidence }]
                arrayTextLine.push(newElem);
              }
            
            }
          }


        } else
          jsonCliente = false;

        (jsonToRead) ? resolve(arrayTextLine) : resolve(false)

      })();
    }
  } catch (error) {
    console.log("ERROR");
    console.log(error);
    resolve(false);
  }

});




module.exports = { readPaymentgSupport };